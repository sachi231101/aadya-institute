import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { AppError } from "../../middlewares/error.middleware";
import { classSessionRepository } from "./class-session.repository";
import { CreateClassSessionDto, UpdateClassSessionDto, QueryClassSessionsDto } from "./class-session.types";
import { resolveOptionalMasterFields } from "../masters/master-resolve.service";
import { buildMeta } from "../../utils/pagination";
import { getRecordingRetentionMs } from "../recordings/recording-retention.service";
import { googleRecordingQueue } from "../../queues/google-recording.queue";
import { hasBranchAccess } from "../../utils/branch-isolation.util";
import {
  assertCanStartLiveSession,
  canExposeMeetingJoinUrl,
  getSessionHostPhase,
  toSessionDateKey,
} from "../../utils/session-window.util";

async function applyClassSessionMasters(
  instituteId: string,
  data: CreateClassSessionDto | UpdateClassSessionDto,
  branchId?: string
) {
  const result = { ...data } as CreateClassSessionDto & UpdateClassSessionDto;

  if (data.classroomMasterId !== undefined) {
    if (!data.classroomMasterId) {
      result.classroomMasterId = undefined;
      result.roomNo = result.roomNo;
    } else {
      const classroom = await resolveOptionalMasterFields({
        instituteId,
        entityType: "classroom",
        masterRecordId: data.classroomMasterId,
        branchId,
      });
      if (classroom) {
        result.roomNo = classroom.label;
        result.classroomMasterId = classroom.masterId;
      }
    }
  }

  if (data.timeslotMasterId !== undefined) {
    if (!data.timeslotMasterId) {
      result.timeslotMasterId = undefined;
    } else {
      const timeslot = await resolveOptionalMasterFields({
        instituteId,
        entityType: "timeslot",
        masterRecordId: data.timeslotMasterId,
        branchId,
      });
      if (timeslot) {
        result.timeslotMasterId = timeslot.masterId;
        // Keep timetable grids aligned: fill clock times from Time Slot Master when missing.
        const masterData = timeslot.data as { startTime?: unknown; endTime?: unknown } | undefined;
        if (
          (!result.startTime || String(result.startTime).trim() === "") &&
          typeof masterData?.startTime === "string"
        ) {
          result.startTime = masterData.startTime;
        }
        if (
          (!result.endTime || String(result.endTime).trim() === "") &&
          typeof masterData?.endTime === "string"
        ) {
          result.endTime = masterData.endTime;
        }
      }
    }
  }

  // Normalize empty optional FK strings
  if (result.batchCourseId === "") result.batchCourseId = undefined;
  if (result.batchModuleId === "") result.batchModuleId = undefined;
  if (result.classroomMasterId === "") result.classroomMasterId = undefined;
  if (result.timeslotMasterId === "") result.timeslotMasterId = undefined;

  return result;
}

const assertNoFacultyConflict = async (options: {
  instituteId: string;
  facultyId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  excludeId?: string;
}) => {
  const conflict = await classSessionRepository.findFacultyConflict(options);
  if (conflict) {
    const conflictTitle = conflict.title?.trim();
    throw new AppError(
      conflictTitle
        ? `This time slot is already assigned (${conflictTitle} at ${conflict.startTime}–${conflict.endTime}). Choose another slot or faculty.`
        : `This time slot is already assigned for this faculty (${options.startTime}–${options.endTime} on this date). Choose another slot.`,
      409,
      "CLASS_SESSION_TIME_CONFLICT"
    );
  }
};

export const classSessionService = {
  getSessions: async (instituteId: string, branchId?: string, filters?: QueryClassSessionsDto) => {
    const result = await classSessionRepository.findMany(instituteId, branchId, filters);
    return {
      data: result.data,
      meta: buildMeta(result.total, result.page, result.limit),
    };
  },

  getSessionById: async (id: string, instituteId: string) => {
    const session = await classSessionRepository.findById(id, instituteId);
    if (!session) {
      throw new AppError("Class session not found", 404);
    }
    return session;
  },

  createSession: async (instituteId: string, data: CreateClassSessionDto) => {
    const batch = await prisma.batch.findFirst({
      where: { id: data.batchId, instituteId },
      select: { id: true, branchId: true, facultyId: true },
    });
    if (!batch) {
      throw new AppError("Batch not found", 404);
    }

    const faculty = await prisma.faculty.findFirst({
      where: { id: data.facultyId, instituteId },
      select: { id: true, branchId: true },
    });
    if (!faculty) {
      throw new AppError("Faculty not found", 404);
    }

    const branchId = data.branchId || batch.branchId || faculty.branchId;
    if (!branchId) {
      throw new AppError("Branch is required to schedule a class", 400);
    }

    await assertNoFacultyConflict({
      instituteId,
      facultyId: data.facultyId,
      scheduledDate: data.scheduledDate,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    const enriched = await applyClassSessionMasters(instituteId, { ...data, branchId }, branchId);
    return classSessionRepository.create(instituteId, enriched);
  },

  updateSession: async (id: string, instituteId: string, data: UpdateClassSessionDto) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new AppError("Class session not found", 404);
    }

    const facultyId = data.facultyId || existing.facultyId;
    const scheduledDate =
      data.scheduledDate ||
      (existing.scheduledDate instanceof Date
        ? existing.scheduledDate.toISOString().slice(0, 10)
        : String(existing.scheduledDate).slice(0, 10));
    const startTime = data.startTime || existing.startTime;
    const endTime = data.endTime || existing.endTime;

    if (
      facultyId &&
      (data.facultyId || data.scheduledDate || data.startTime || data.endTime)
    ) {
      await assertNoFacultyConflict({
        instituteId,
        facultyId,
        scheduledDate,
        startTime,
        endTime,
        excludeId: id,
      });
    }

    const enriched = await applyClassSessionMasters(instituteId, data, existing.branchId);
    const updated = await classSessionRepository.update(id, instituteId, enriched);

    const scheduleChanged = Boolean(
      data.scheduledDate || data.startTime || data.endTime
    );
    if (scheduleChanged) {
      const oldDate =
        existing.scheduledDate instanceof Date
          ? existing.scheduledDate.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : String(existing.scheduledDate).slice(0, 10);
      const newDate = new Date(scheduledDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const stamp = `${scheduledDate}:${startTime}`;
      setImmediate(async () => {
        try {
          const { triggerNotification } = await import("../whatsapp/whatsapp.service");
          const { NotificationEvent, buildIdempotencyKey } = await import(
            "../whatsapp/whatsapp.constants"
          );
          const session = await classSessionRepository.findById(id, instituteId);
          const enrollments = session?.batch?.enrollments || [];
          for (const enr of enrollments) {
            if (!enr.student) continue;
            await triggerNotification({
              instituteId,
              studentId: enr.student.id,
              event: NotificationEvent.CLASS_RESCHEDULED,
              idempotencyKey: buildIdempotencyKey.CLASS_RESCHEDULED(
                enr.student.id,
                id,
                stamp
              ),
              templateParams: {
                student_name: enr.student.user?.name || "Student",
                batch_name: session?.batch?.name || "Batch",
                old_date: oldDate,
                new_date: newDate,
                old_time: existing.startTime,
                new_time: startTime,
              },
              metadata: { classSessionId: id },
            });
          }
        } catch (err) {
          logger.error({ err, id }, "[class-session] CLASS_RESCHEDULED notify failed");
        }
      });
    }

    return updated;
  },

  startLiveClass: async (id: string, instituteId: string, meetingUrl?: string) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new AppError("Class session not found", 404);
    }

    const dateKey = toSessionDateKey(existing.scheduledDate);
    const status = String(existing.sessionStatus || "").toUpperCase();

    assertCanStartLiveSession({
      sessionStatus: status,
      dateKey,
      startTime: existing.startTime,
      endTime: existing.endTime,
    });

    // In-window reconnect while already LIVE — return without rewriting status/timestamps.
    if (status === "LIVE") {
      return {
        session: existing,
        notifiedStudentsCount: 0,
        notifiedStudents: [],
        alreadyLive: true,
      };
    }

    const updatedSession = await classSessionRepository.startLive(id, instituteId, meetingUrl);

    // Send targeted instant notifications to all actively enrolled students of this specific batch
    const enrollments = updatedSession.batch?.enrollments || [];
    const courseName = updatedSession.batch?.course?.name || updatedSession.title || "Live Class";
    const facultyName = updatedSession.faculty?.user?.name || "Faculty Instructor";
    const batchName = updatedSession.batch?.name || "Batch";
    const timeStr = `${updatedSession.startTime} – ${updatedSession.endTime}`;
    const activeMeetUrl = updatedSession.meetingUrl || meetingUrl || undefined;

    let notifiedCount = 0;
    const notificationPromises = enrollments.map(async (enr) => {
      const student = enr.student;
      if (!student) return;

      try {
        await prisma.notification.create({
          data: {
            instituteId,
            branchId: updatedSession.branchId,
            userId: student.userId || undefined,
            studentId: student.id,
            title: "🔴 LIVE CLASS STARTED",
            message: `Your class is live now!\nCourse: ${courseName}\nFaculty: ${facultyName}\nTime: ${timeStr}`,
            type: "CLASS_SESSION" as any,
            link: activeMeetUrl,
            event: "LIVE_CLASS_STARTED",
            channel: "IN_APP",
            status: "DELIVERED",
            sentAt: new Date(),
            metadata: {
              classSessionId: updatedSession.id,
              meetingUrl: activeMeetUrl,
              courseName,
              batchName,
              facultyName,
              scheduledDate: toSessionDateKey(updatedSession.scheduledDate),
              startTime: updatedSession.startTime,
              endTime: updatedSession.endTime,
            },
          },
        });
        notifiedCount++;
      } catch (err) {
        logger.error({ err, studentId: student.id }, "Failed to create live class notification for student");
      }
    });

    await Promise.allSettled(notificationPromises);

    return {
      session: updatedSession,
      notifiedStudentsCount: notifiedCount || enrollments.length,
      notifiedStudents: enrollments.map((e) => ({
        id: e.student?.id,
        name: e.student?.user?.name,
      })),
    };
  },

  endLiveClass: async (id: string, instituteId: string) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new AppError("Class session not found", 404);
    }

    // Idempotent: already ended — return current state without re-running side effects.
    if (existing.sessionStatus === "COMPLETED") {
      return {
        session: existing,
        recording: existing.recording,
        syncQueued: false,
        recordingStatus: existing.recording?.recordingStatus ?? null,
        message: "Class session already ended.",
        alreadyCompleted: true,
      };
    }

    if (existing.sessionStatus !== "LIVE") {
      throw new AppError("Class is not live", 400);
    }

    const session = await classSessionRepository.endLive(id, instituteId);

    // Auto-create or ensure Recording metadata entry exists with configured retention.
    let recording = session.recording;
    if (!recording) {
      const retentionMs = await getRecordingRetentionMs(instituteId);
      const expiresAt = new Date(Date.now() + retentionMs);

      try {
        recording = await prisma.recording.create({
          data: {
            classSessionId: session.id,
            storageKey: `recordings/${session.id}/google-meet-live.mp4`,
            startedAt: session.actualStartTime || new Date(),
            endedAt: session.actualEndTime || new Date(),
            expiresAt,
            status: "ACTIVE",
            recordingStatus: "PENDING",
          },
        });
      } catch (err) {
        logger.error({ err, classSessionId: session.id }, "Failed to create recording record upon ending class");
      }
    }

    // Immediately enqueue Drive sync so recordings appear without waiting for the 10m cron.
    let organizerUserId = existing.googleMeetSpace?.organizerUserId ?? null;
    if (!organizerUserId && existing.googleMeetSpace) {
      // Meet space row should always have organizer; fall back to institute Google connection owner.
      try {
        const { findConnectionByInstituteId } = await import(
          "../google-workspace/google-workspace.repository"
        );
        const instituteConn = await findConnectionByInstituteId(instituteId);
        organizerUserId = instituteConn?.userId ?? null;
      } catch (err) {
        logger.warn({ err, classSessionId: session.id }, "Could not resolve institute Google organizer for sync");
      }
    }

    const syncQueued =
      Boolean(organizerUserId) &&
      Boolean(recording) &&
      recording?.recordingStatus !== "AVAILABLE" &&
      recording?.recordingStatus !== "DELETED" &&
      recording?.recordingStatus !== "EXPIRED";

    let enqueueError: string | null = null;
    if (syncQueued && organizerUserId) {
      try {
        await googleRecordingQueue.add(
          "sync-session-recording",
          {
            classSessionId: session.id,
            instituteId,
            userId: organizerUserId,
            pollAttempt: 0,
            enqueuedAtMs: Date.now(),
          },
          {
            jobId: `sync-recording-${session.id}`,
            removeOnComplete: true,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 10000,
            },
          }
        );
      } catch (err) {
        enqueueError =
          err instanceof Error ? err.message : "Failed to enqueue recording sync";
        logger.error(
          { err, classSessionId: session.id },
          "Failed to enqueue google recording sync after end-live"
        );
      }
    } else if (!existing.googleMeetSpace) {
      logger.info(
        { classSessionId: session.id },
        "end-live: no Google Meet space linked — recording sync not queued"
      );
    } else if (!organizerUserId) {
      logger.warn(
        { classSessionId: session.id },
        "end-live: Meet space has no organizerUserId and no institute Google connection — sync not queued"
      );
    }

    return {
      session,
      recording,
      syncQueued: syncQueued && !enqueueError,
      recordingStatus: recording?.recordingStatus ?? null,
      message: enqueueError
        ? "Class ended, but recording sync could not be queued. Check Redis/workers and try Refresh sync from Class Recordings."
        : syncQueued
          ? "Class ended. Recording sync was queued in the background and will appear when Google Drive finishes processing."
          : recording?.recordingStatus === "AVAILABLE"
            ? "Class session ended successfully. Recording is already available."
            : existing.googleMeetSpace
              ? "Class session ended successfully. Recording sync was not queued (missing Google organizer)."
              : "Class session ended successfully.",
    };
  },

  getActiveLiveSessions: async (
    instituteId: string,
    branchId?: string,
    batchIds?: string[],
    facultyId?: string,
    branchIds?: string[],
    now?: Date
  ) => {
    const sessions = await classSessionRepository.findActiveLiveSessions(
      instituteId,
      branchId,
      batchIds,
      facultyId,
      branchIds
    );

    // Only sessions still inside the Asia/Kolkata half-open window [start, end).
    // Stuck DB LIVE after end time must not appear on Live Classes.
    return sessions.filter((session) => {
      if (!session.scheduledDate || !session.startTime || !session.endTime) {
        return false;
      }
      return (
        getSessionHostPhase({
          dateKey: toSessionDateKey(session.scheduledDate),
          startTime: session.startTime,
          endTime: session.endTime,
          now,
        }) === "during"
      );
    });
  },

  cancelSession: async (id: string, instituteId: string) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new AppError("Class session not found", 404);
    }
    const updated = await classSessionRepository.update(id, instituteId, { status: "CANCELLED" });

    try {
      const { triggerNotification } = await import("../whatsapp/whatsapp.service");
      const { NotificationEvent, buildIdempotencyKey } = await import(
        "../whatsapp/whatsapp.constants"
      );
      const session = await prisma.classSession.findFirst({
        where: { id, batch: { instituteId } },
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
      });
      if (session?.batch) {
        const classDate = session.scheduledDate
          ? new Date(session.scheduledDate).toLocaleDateString("en-IN")
          : "";
        for (const enrollment of session.batch.enrollments) {
          const student = enrollment.student;
          if (!student?.user) continue;
          await triggerNotification({
            instituteId,
            studentId: student.id,
            event: NotificationEvent.CLASS_CANCELLED,
            idempotencyKey: buildIdempotencyKey.CLASS_CANCELLED(student.id, session.id),
            templateParams: {
              student_name: student.user.name ?? "Student",
              batch_name: session.batch.name ?? "Batch",
              class_date: classDate,
              start_time: session.startTime ?? "",
            },
            metadata: { classSessionId: session.id },
          });
        }
      }
    } catch (err) {
      logger.error({ err, id }, "[class-session] CLASS_CANCELLED notify failed");
    }

    return updated;
  },

  deleteSession: async (id: string, instituteId: string) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new AppError("Class session not found", 404);
    }
    return classSessionRepository.delete(id);
  },

  getSessionMeeting: async (currentUser: any, id: string) => {
    const session = await prisma.classSession.findUnique({
      where: { id },
      include: {
        batch: {
          include: {
            enrollments: {
              where: { status: "ACTIVE" },
            },
          },
        },
        faculty: true,
        googleMeetSpace: true,
      },
    });

    if (!session || session.batch.instituteId !== currentUser.instituteId) {
      const err: any = new Error("Class session not found");
      err.statusCode = 404;
      throw err;
    }

    const roles: string[] = (currentUser.roles || []).map((r: string) => String(r).toUpperCase());
    const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
    const isCenterManager = roles.includes("CENTER_MANAGER");
    const isFaculty = roles.includes("FACULTY");
    const isStudent = roles.includes("STUDENT");

    if (!isAdmin) {
      const userAuth = {
        id: currentUser.id || currentUser.userId,
        userId: currentUser.userId || currentUser.id,
        instituteId: currentUser.instituteId,
        branchId: currentUser.branchId,
        allowedBranchIds: currentUser.allowedBranchIds,
        roles,
        permissions: [],
        name: "",
      };

      if (isFaculty && !isCenterManager) {
        // Pure faculty: assigned to this session only (same ownership as start-live)
        const faculty = await prisma.faculty.findFirst({
          where: { userId: currentUser.id || currentUser.userId },
        });

        const isAssignedFaculty = faculty && faculty.id === session.facultyId;
        if (!isAssignedFaculty) {
          const err: any = new Error("You are not authorized to access this class meeting");
          err.statusCode = 403;
          throw err;
        }
      } else if (isStudent && !isCenterManager) {
        // Student access: allowed if actively enrolled in this batch
        const student = await prisma.student.findFirst({
          where: {
            userId: currentUser.id || currentUser.userId,
            instituteId: currentUser.instituteId,
          },
        });

        if (!student) {
          const err: any = new Error("Student profile not found");
          err.statusCode = 403;
          throw err;
        }

        const isEnrolled = session.batch.enrollments.some((e: any) => e.studentId === student.id);
        if (!isEnrolled) {
          const err: any = new Error("You are not enrolled in this class session's batch");
          err.statusCode = 403;
          throw err;
        }
      } else {
        // Center Manager / Counsellor / Staff: enforce branch isolation
        const branchAllowed = hasBranchAccess(userAuth, session.branchId);
        if (!branchAllowed) {
          const err: any = new Error("Class session not found");
          err.statusCode = 404;
          throw err;
        }
      }
    }

    const rawMeetingUrl = session.meetingUrl || session.googleMeetSpace?.meetingUri || null;
    const rawMeetingCode =
      session.googleMeetSpace?.meetingCode ||
      (rawMeetingUrl ? rawMeetingUrl.split("/").pop() : undefined);

    // Join fields only while LIVE and still inside the Asia/Kolkata window.
    // Admin/SUPER_ADMIN may still see history URLs. Stuck LIVE after end → redact.
    const dateKey = toSessionDateKey(session.scheduledDate);
    const inJoinWindow = canExposeMeetingJoinUrl({
      sessionStatus: session.sessionStatus,
      dateKey,
      startTime: session.startTime,
      endTime: session.endTime,
    });
    const canSeeJoinFields = inJoinWindow || isAdmin;
    const meetingUrl = canSeeJoinFields ? rawMeetingUrl : null;
    const meetingCode = canSeeJoinFields ? rawMeetingCode : undefined;

    return {
      classSessionId: session.id,
      title: session.title,
      scheduledDate: session.scheduledDate,
      startTime: session.startTime,
      endTime: session.endTime,
      mode: session.mode,
      meetingUrl,
      meetingCode,
      spaceName: session.googleMeetSpace?.spaceName,
      recordingEnabled: session.googleMeetSpace?.recordingEnabled ?? false,
      sessionStatus: session.sessionStatus,
    };
  },

  getMeetSpaceForSession: async (currentUser: any, id: string) => {
    const session = await prisma.classSession.findUnique({
      where: { id },
      include: {
        batch: {
          include: {
            enrollments: {
              where: { status: "ACTIVE" },
            },
          },
        },
        googleMeetSpace: {
          include: {
            organizer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!session || session.batch.instituteId !== currentUser.instituteId) {
      const err: any = new Error("Class session not found");
      err.statusCode = 404;
      throw err;
    }

    const roles: string[] = (currentUser.roles || []).map((r: string) => String(r).toUpperCase());
    const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
    const isFaculty = roles.includes("FACULTY");
    const isStudent = roles.includes("STUDENT");

    if (!isAdmin) {
      const userAuth = {
        id: currentUser.id || currentUser.userId,
        userId: currentUser.userId || currentUser.id,
        instituteId: currentUser.instituteId,
        branchId: currentUser.branchId,
        allowedBranchIds: currentUser.allowedBranchIds,
        roles,
        permissions: [],
        name: "",
      };

      let isAuthorized = false;

      if (isFaculty) {
        const faculty = await prisma.faculty.findFirst({
          where: { userId: currentUser.id || currentUser.userId },
        });
        if (faculty && faculty.id === session.facultyId) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && isStudent) {
        const student = await prisma.student.findFirst({
          where: {
            userId: currentUser.id || currentUser.userId,
            instituteId: currentUser.instituteId,
          },
        });
        if (student && session.batch.enrollments.some((e: any) => e.studentId === student.id)) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        const branchAllowed = hasBranchAccess(userAuth, session.branchId);
        if (!branchAllowed) {
          const err: any = new Error("Class session not found");
          err.statusCode = 404;
          throw err;
        }

        if (isFaculty || isStudent) {
          const err: any = new Error("You are not authorized to access this class meeting");
          err.statusCode = 403;
          throw err;
        }
      }
    }

    if (!session.googleMeetSpace) {
      const err: any = new Error("No Google Meet space linked to this class session");
      err.statusCode = 404;
      throw err;
    }

    return session.googleMeetSpace;
  },
};
