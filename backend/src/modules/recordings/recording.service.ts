import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { buildMeta } from "../../utils/pagination";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import * as repo from "./recording.repository";
import type { AuthUser } from "../auth/auth.types";
import type { CreateRecordingDTO, RecordingQueryDTO } from "./recording.types";

/**
 * Default recording retention: 1 month (AGENTS.md Section 31).
 */
const DEFAULT_RECORDING_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Send RECORDING_AVAILABLE WhatsApp notifications to all ACTIVE enrolled students
 * of the recording's batch. Non-blocking — failures are logged, not thrown.
 */
const triggerRecordingNotifications = async (recordingId: string) => {
  try {
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        classSession: {
          include: {
            batch: {
              include: {
                enrollments: {
                  where: { status: "ACTIVE" },
                  include: { student: { include: { user: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!recording) return;

    const session = recording.classSession;
    const expiryDate = recording.expiresAt.toISOString().split("T")[0];

    for (const enrollment of session.batch.enrollments) {
      const student = enrollment.student;
      if (!student.user?.phone) continue;

      await triggerNotification({
        instituteId: session.batch.instituteId,
        studentId: student.id,
        event: NotificationEvent.RECORDING_AVAILABLE,
        idempotencyKey: buildIdempotencyKey.RECORDING_AVAILABLE(student.id, recording.id),
        templateParams: {
          student_name: student.user.name ?? "Student",
          batch_name: session.batch.name ?? "Batch",
          session_title: session.title ?? "Class session",
          expiry_date: expiryDate,
        },
        metadata: {
          recordingId: recording.id,
          classSessionId: session.id,
          batchId: session.batchId,
        },
      });
    }
  } catch (err) {
    logger.error({ err, recordingId }, "[recordings] Failed to trigger recording notification");
  }
};

export const getRecordings = async (currentUser: AuthUser, query: RecordingQueryDTO) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const branchId = currentUser.roles.includes("ADMIN") ? undefined : (currentUser.branchId ?? undefined);

  const { recordings, total } = await repo.findRecordings({
    instituteId: currentUser.instituteId,
    branchId,
    batchId: query.batchId,
    classSessionId: query.classSessionId,
    status: query.status,
    skip,
    take: limit,
  });

  return { data: recordings, meta: buildMeta(total, page, limit) };
};

export const getRecordingById = async (currentUser: AuthUser, id: string) => {
  const recording = await repo.findRecordingById(id);
  if (!recording) throw new AppError("Recording not found", 404);

  const batch = recording.classSession?.batch;
  if (!batch || batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Recording not found", 404);
  }

  if (!currentUser.roles.includes("ADMIN") && currentUser.branchId && batch.branchId !== currentUser.branchId) {
    throw new AppError("Recording not found", 404);
  }
  return recording;
};

export const createRecording = async (currentUser: AuthUser, dto: CreateRecordingDTO) => {
  const session = await prisma.classSession.findUnique({
    where: { id: dto.classSessionId },
    include: { batch: true },
  });

  if (!session || session.batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Class session not found", 404);
  }

  if (currentUser.roles.includes("FACULTY")) {
    const faculty = await prisma.faculty.findUnique({ where: { userId: currentUser.id } });
    if (!faculty || faculty.id !== session.facultyId) {
      throw new AppError("You can only upload recordings for your own class sessions", 403);
    }
  }

  const expiresAt = new Date(Date.now() + DEFAULT_RECORDING_RETENTION_MS);

  const recording = await repo.createRecording({
    classSessionId: session.id,
    storageKey: dto.storageKey,
    duration: dto.duration,
    startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
    endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
    expiresAt,
  });

  setImmediate(() => {
    triggerRecordingNotifications(recording.id);
  });

  return recording;
};

export const deleteRecording = async (currentUser: AuthUser, id: string) => {
  const existing = await getRecordingById(currentUser, id);

  if (currentUser.roles.includes("FACULTY")) {
    const faculty = await prisma.faculty.findUnique({ where: { userId: currentUser.id } });
    if (!faculty || faculty.id !== existing.classSession?.facultyId) {
      throw new AppError("You can only delete recordings of your own class sessions", 403);
    }
  }

  await repo.deleteRecording(id);
  return { id, deleted: true };
};
