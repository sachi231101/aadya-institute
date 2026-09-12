import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { buildMeta } from "../../utils/pagination";
import { createAuditLog } from "../../utils/audit-log.util";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import * as repo from "./recording.repository";
import type { AuthUser } from "../auth/auth.types";
import type { CreateRecordingDTO, RecordingQueryDTO } from "./recording.types";
import { getRecordingRetentionMs } from "./recording-retention.service";
import {
  resolveGoogleAuthClient,
  syncSessionRecordings,
} from "../google-workspace/google-workspace.service";
import {
  deleteDriveFile,
  setRestrictedViewerPermission,
} from "../../integrations/google/google.drive.client";

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

  let batchIds: string[] | undefined = undefined;
  let facultyId: string | undefined = undefined;

  const roles = (currentUser.roles || []).map((r) => String(r).toUpperCase());
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  const isFaculty =
    roles.includes("FACULTY") &&
    !isAdmin &&
    !roles.includes("CENTER_MANAGER");
  const isStudent =
    roles.includes("STUDENT") && !isAdmin && !roles.includes("FACULTY");

  // Faculty list is scoped by assigned session facultyId (not JWT branchId),
  // so branch mismatch cannot hide PENDING/PROCESSING sync rows.
  const branchId = isAdmin || isFaculty
    ? undefined
    : (currentUser.branchId ?? undefined);

  // Student scope: Strictly restrict to batches in which student has ACTIVE enrollment
  if (isStudent) {
    const student = await prisma.student.findFirst({
      where: {
        userId: currentUser.id || currentUser.userId!,
        instituteId: currentUser.instituteId,
      },
      include: {
        batchEnrollments: { where: { status: "ACTIVE" } },
      },
    });

    if (!student || student.batchEnrollments.length === 0) {
      return { data: [], meta: buildMeta(0, page, limit) };
    }

    const enrolledBatchIds = student.batchEnrollments.map((e) => e.batchId);
    if (query.batchId) {
      if (!enrolledBatchIds.includes(query.batchId)) {
        return { data: [], meta: buildMeta(0, page, limit) };
      }
      batchIds = [query.batchId];
    } else {
      batchIds = enrolledBatchIds;
    }
  }

  // Faculty scope: only recordings for class sessions assigned to this faculty
  if (isFaculty) {
    const faculty = await prisma.faculty.findFirst({
      where: { userId: currentUser.id || currentUser.userId! },
      select: { id: true },
    });
    if (!faculty) {
      return { data: [], meta: buildMeta(0, page, limit) };
    }
    facultyId = faculty.id;
  }

  const { recordings, total } = await repo.findRecordings({
    instituteId: currentUser.instituteId,
    branchId,
    batchId: query.batchId,
    batchIds,
    facultyId,
    courseId: query.courseId,
    classSessionId: query.classSessionId,
    status: query.status,
    recordingStatus: query.recordingStatus,
    startDate: query.startDate,
    endDate: query.endDate,
    skip,
    take: limit,
  });

  return { data: recordings, meta: buildMeta(total, page, limit) };
};

export const getRecordingById = async (currentUser: AuthUser, id: string) => {
  const recording = await repo.findRecordingById(id);
  if (!recording) throw new AppError("Recording not found", 404);

  const session = recording.classSession;
  const batch = session?.batch;

  if (!batch || batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Recording not found", 404);
  }

  const roles = (currentUser.roles || []).map((r) => String(r).toUpperCase());
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  const isCenterManager = roles.includes("CENTER_MANAGER");
  const isFaculty = roles.includes("FACULTY") && !isAdmin && !isCenterManager;
  const isStudent = roles.includes("STUDENT") && !isAdmin && !roles.includes("FACULTY");

  // Assigned faculty may access their session recordings even if JWT branchId
  // differs from the batch (same rule as list + Meet sync).
  if (isFaculty) {
    const faculty = await prisma.faculty.findFirst({
      where: { userId: currentUser.id || currentUser.userId! },
      select: { id: true },
    });
    if (!faculty || session.facultyId !== faculty.id) {
      throw new AppError("Recording not found", 404);
    }
    return recording;
  }

  // Branch isolation for non-ADMIN staff (center managers, etc.).
  if (!isAdmin) {
    const allowedBranchIds = new Set(
      [currentUser.branchId, ...(currentUser.allowedBranchIds || [])].filter(
        (branchId): branchId is string => Boolean(branchId)
      )
    );
    if (
      allowedBranchIds.size > 0 &&
      !allowedBranchIds.has(batch.branchId)
    ) {
      throw new AppError("Recording not found", 404);
    }
    if (isCenterManager && allowedBranchIds.size === 0) {
      throw new AppError("Recording not found", 404);
    }
  }

  // Student enrollment check
  if (isStudent) {
    const student = await prisma.student.findFirst({
      where: {
        userId: currentUser.id || currentUser.userId!,
        instituteId: currentUser.instituteId,
      },
    });

    if (!student) {
      throw new AppError("Recording not found", 404);
    }

    const isEnrolled = batch.enrollments?.some((e) => e.studentId === student.id);
    if (!isEnrolled) {
      throw new AppError("Recording not found", 404);
    }
  }

  return recording;
};

export const getRecordingAccess = async (currentUser: AuthUser, id: string) => {
  const recording = await getRecordingById(currentUser, id);
  const now = new Date();

  if (
    recording.status !== "ACTIVE" ||
    recording.recordingStatus === "DELETED"
  ) {
    throw new AppError(
      "This recording has been deleted.",
      410,
      "RECORDING_EXPIRED"
    );
  }
  if (
    recording.recordingStatus === "EXPIRED" ||
    recording.expiresAt.getTime() <= now.getTime()
  ) {
    if (recording.recordingStatus !== "EXPIRED") {
      await prisma.recording.update({
        where: { id: recording.id },
        data: { recordingStatus: "EXPIRED" },
      });
    }
    throw new AppError(
      "This recording has expired.",
      410,
      "RECORDING_EXPIRED"
    );
  }
  if (
    recording.recordingStatus !== "AVAILABLE" ||
    !recording.playbackUrl
  ) {
    throw new AppError(
      "This recording is still being processed.",
      409,
      "RECORDING_NOT_READY"
    );
  }

  const isStudent =
    currentUser.roles.includes("STUDENT") &&
    !currentUser.roles.includes("ADMIN") &&
    !currentUser.roles.includes("FACULTY");
  if (
    isStudent &&
    recording.storageProvider === "GOOGLE_DRIVE" &&
    recording.googleDriveFileId
  ) {
    if (!currentUser.email) {
      throw new AppError(
        "A Google-compatible email address is required to view this recording.",
        403,
        "INSUFFICIENT_GOOGLE_PERMISSIONS"
      );
    }
    const { authClient, connection } = await resolveGoogleAuthClient(
      currentUser,
      recording.classSession?.googleMeetSpace?.organizerUserId
    );
    const integration = await prisma.integration.findUnique({
      where: {
        instituteId_type: {
          instituteId: currentUser.instituteId,
          type: "GOOGLE_WORKSPACE",
        },
      },
      select: { configuration: true },
    });
    const configuration =
      integration?.configuration &&
      typeof integration.configuration === "object" &&
      !Array.isArray(integration.configuration)
        ? (integration.configuration as Record<string, unknown>)
        : {};
    const workspaceDomain =
      typeof configuration.workspaceDomain === "string"
        ? configuration.workspaceDomain
        : typeof configuration.domain === "string"
          ? configuration.domain
          : null;

    try {
      await setRestrictedViewerPermission(
        authClient,
        recording.googleDriveFileId,
        workspaceDomain
          ? { domain: workspaceDomain }
          : { emailAddress: currentUser.email, expiresAt: recording.expiresAt }
      );
    } catch (error: unknown) {
      if (
        error instanceof AppError &&
        (error.statusCode === 401 || error.statusCode === 403)
      ) {
        await prisma.googleWorkspaceConnection.updateMany({
          where: { userId: connection.userId },
          data: { status: "REAUTH_REQUIRED" },
        });
      }
      throw error;
    }
  }

  await createAuditLog({
    userId: currentUser.id || currentUser.userId!,
    instituteId: currentUser.instituteId,
    action: "CLASS_RECORDING_ACCESS",
    entityType: "Recording",
    entityId: recording.id,
    newData: {
      classSessionId: recording.classSession?.id,
      recordingStatus: recording.recordingStatus,
    },
  });

  return {
    recordingId: recording.id,
    classSessionId: recording.classSession?.id,
    title: recording.classSession?.title,
    playbackUrl: recording.playbackUrl,
    googleDriveFileId: recording.googleDriveFileId,
    storageProvider: recording.storageProvider,
    recordingStatus: recording.recordingStatus,
    duration: recording.duration,
    startedAt: recording.startedAt,
    endedAt: recording.endedAt,
    expiresAt: recording.expiresAt,
  };
};

export const createRecording = async (currentUser: AuthUser, dto: CreateRecordingDTO) => {
  const session = await prisma.classSession.findUnique({
    where: { id: dto.classSessionId },
    include: { batch: true },
  });

  if (!session || session.batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Class session not found", 404);
  }

  if (currentUser.roles.includes("FACULTY") && !currentUser.roles.includes("ADMIN") && !currentUser.roles.includes("CENTER_MANAGER")) {
    const faculty = await prisma.faculty.findUnique({ where: { userId: currentUser.id || currentUser.userId! } });
    if (!faculty || faculty.id !== session.facultyId) {
      throw new AppError("You can only upload recordings for your own class sessions", 403);
    }
  }

  const retentionMs = await getRecordingRetentionMs(currentUser.instituteId);
  const recordingStartedAt = dto.startedAt
    ? new Date(dto.startedAt)
    : new Date();
  const expiresAt = new Date(recordingStartedAt.getTime() + retentionMs);
  const recordingStatus =
    !dto.recordingStatus || dto.recordingStatus === "READY"
      ? "AVAILABLE"
      : dto.recordingStatus;

  const recording = await repo.createRecording({
    classSessionId: session.id,
    storageKey: dto.storageKey || "",
    googleConferenceRecordId: dto.googleConferenceRecordId,
    googleRecordingId: dto.googleRecordingId,
    googleDriveFileId: dto.googleDriveFileId,
    playbackUrl: dto.playbackUrl,
    recordingStatus,
    storageProvider: dto.storageProvider || "GOOGLE_DRIVE",
    duration: dto.duration,
    startedAt: recordingStartedAt,
    endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
    expiresAt,
    metadata: dto.metadata,
  });

  setImmediate(() => {
    triggerRecordingNotifications(recording.id);
  });

  await createAuditLog({
    userId: currentUser.id || currentUser.userId!,
    instituteId: currentUser.instituteId,
    action: "CLASS_RECORDING_CREATED",
    entityType: "Recording",
    entityId: recording.id,
    newData: {
      classSessionId: session.id,
      recordingStatus: recording.recordingStatus,
      googleRecordingId: dto.googleRecordingId,
    },
  });

  return recording;
};

export const deleteRecording = async (currentUser: AuthUser, id: string) => {
  const existing = await getRecordingById(currentUser, id);

  if (currentUser.roles.includes("FACULTY") && !currentUser.roles.includes("ADMIN") && !currentUser.roles.includes("CENTER_MANAGER")) {
    const faculty = await prisma.faculty.findUnique({ where: { userId: currentUser.id || currentUser.userId! } });
    if (!faculty || faculty.id !== existing.classSession?.facultyId) {
      throw new AppError("You can only delete recordings of your own class sessions", 403);
    }
  }

  await deleteGoogleDriveRecording(currentUser, existing);
  await repo.deleteRecording(id);

  await createAuditLog({
    userId: currentUser.id || currentUser.userId!,
    instituteId: currentUser.instituteId,
    action: "CLASS_RECORDING_DELETED",
    entityType: "Recording",
    entityId: id,
    oldData: { classSessionId: existing.classSession?.id },
  });

  return { id, deleted: true };
};

const deleteGoogleDriveRecording = async (
  currentUser: AuthUser,
  recording: Awaited<ReturnType<typeof getRecordingById>>
) => {
  if (
    recording.storageProvider !== "GOOGLE_DRIVE" ||
    !recording.googleDriveFileId
  ) {
    return;
  }

  const { authClient, connection } = await resolveGoogleAuthClient(
    currentUser,
    recording.classSession?.googleMeetSpace?.organizerUserId
  );
  let result: Awaited<ReturnType<typeof deleteDriveFile>>;
  try {
    result = await deleteDriveFile(authClient, recording.googleDriveFileId);
  } catch (error: unknown) {
    if (
      error instanceof AppError &&
      (error.statusCode === 401 || error.statusCode === 403)
    ) {
      await prisma.googleWorkspaceConnection.updateMany({
        where: { userId: connection.userId },
        data: { status: "REAUTH_REQUIRED" },
      });
    }
    throw error;
  }

  await createAuditLog({
    userId: currentUser.id || currentUser.userId!,
    instituteId: currentUser.instituteId,
    action: "GOOGLE_DRIVE_RECORDING_DELETED",
    entityType: "Recording",
    entityId: recording.id,
    newData: {
      googleDriveFileId: recording.googleDriveFileId,
      alreadyDeleted: result.alreadyDeleted,
    },
  });
};

export const syncRecording = async (currentUser: AuthUser, id: string) => {
  const recording = await getRecordingById(currentUser, id);
  return syncSessionRecordings(currentUser, recording.classSessionId);
};

export const expireRecording = async (currentUser: AuthUser, id: string) => {
  const recording = await getRecordingById(currentUser, id);

  if (recording.recordingStatus === "DELETED") {
    return recording;
  }

  await deleteGoogleDriveRecording(currentUser, recording);
  const expired = await prisma.recording.update({
    where: { id: recording.id },
    data: {
      recordingStatus: "DELETED",
      status: "INACTIVE",
      deletedAt: new Date(),
      expiresAt:
        recording.expiresAt.getTime() <= Date.now()
          ? recording.expiresAt
          : new Date(),
    },
  });

  await createAuditLog({
    userId: currentUser.id || currentUser.userId!,
    instituteId: currentUser.instituteId,
    action: "CLASS_RECORDING_EXPIRED",
    entityType: "Recording",
    entityId: recording.id,
    oldData: { recordingStatus: recording.recordingStatus },
    newData: {
      recordingStatus: expired.recordingStatus,
      deletedAt: expired.deletedAt,
    },
  });

  return expired;
};
