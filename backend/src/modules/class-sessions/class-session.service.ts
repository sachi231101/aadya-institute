import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { classSessionRepository } from "./class-session.repository";
import { CreateClassSessionDto, UpdateClassSessionDto, QueryClassSessionsDto } from "./class-session.types";
import { resolveOptionalMasterFields } from "../masters/master-resolve.service";
import { buildMeta } from "../../utils/pagination";

async function applyClassSessionMasters(
  instituteId: string,
  data: CreateClassSessionDto | UpdateClassSessionDto,
  branchId?: string
) {
  const result = { ...data } as CreateClassSessionDto & UpdateClassSessionDto;

  if (data.classroomMasterId) {
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

  if (data.timeslotMasterId) {
    const timeslot = await resolveOptionalMasterFields({
      instituteId,
      entityType: "timeslot",
      masterRecordId: data.timeslotMasterId,
      branchId,
    });
    if (timeslot) {
      result.timeslotMasterId = timeslot.masterId;
    }
  }

  return result;
}

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
      throw new Error("Class session not found");
    }
    return session;
  },

  createSession: async (instituteId: string, data: CreateClassSessionDto) => {
    const enriched = await applyClassSessionMasters(instituteId, data, data.branchId);
    return classSessionRepository.create(instituteId, enriched);
  },

  updateSession: async (id: string, instituteId: string, data: UpdateClassSessionDto) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new Error("Class session not found");
    }
    const enriched = await applyClassSessionMasters(instituteId, data, existing.branchId);
    return classSessionRepository.update(id, instituteId, enriched);
  },

  startLiveClass: async (id: string, instituteId: string, meetingUrl?: string) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new Error("Class session not found");
    }

    const updatedSession = await classSessionRepository.startLive(id, instituteId, meetingUrl);

    // Send targeted instant notifications to all actively enrolled students of this specific batch
    const enrollments = updatedSession.batch?.enrollments || [];
    const courseName = updatedSession.batch?.course?.name || updatedSession.title || "Live Class";
    const facultyName = updatedSession.faculty?.user?.name || "Faculty Instructor";
    const batchName = updatedSession.batch?.name || "Batch";
    const timeStr = `${updatedSession.startTime} – ${updatedSession.endTime}`;
    const activeMeetUrl = updatedSession.meetingUrl || meetingUrl || `https://meet.google.com/aady-${updatedSession.batchId.slice(0, 4)}`;

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
      throw new Error("Class session not found");
    }

    const session = await classSessionRepository.endLive(id, instituteId);

    // Auto-create or ensure Recording metadata entry exists with 30-day retention
    let recording = session.recording;
    if (!recording) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      try {
        recording = await prisma.recording.create({
          data: {
            classSessionId: session.id,
            storageKey: `recordings/${session.id}/google-meet-live.mp4`,
            startedAt: session.actualStartTime || new Date(),
            endedAt: session.actualEndTime || new Date(),
            expiresAt,
            status: "ACTIVE",
          },
        });
      } catch (err) {
        logger.error({ err, classSessionId: session.id }, "Failed to create recording record upon ending class");
      }
    }

    return {
      session,
      recording,
      message: "Class session ended successfully and recording linked.",
    };
  },

  getActiveLiveSessions: async (
    instituteId: string,
    branchId?: string,
    batchIds?: string[],
    facultyId?: string
  ) => {
    return classSessionRepository.findActiveLiveSessions(instituteId, branchId, batchIds, facultyId);
  },

  cancelSession: async (id: string, instituteId: string) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new Error("Class session not found");
    }
    return classSessionRepository.update(id, instituteId, { status: "CANCELLED" });
  },

  deleteSession: async (id: string, instituteId: string) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new Error("Class session not found");
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

    // Branch isolation for non-ADMIN
    if (
      !currentUser.roles.includes("ADMIN") &&
      currentUser.branchId &&
      session.branchId !== currentUser.branchId
    ) {
      const err: any = new Error("Class session not found");
      err.statusCode = 404;
      throw err;
    }

    // Role-specific authorization
    const isStudent = currentUser.roles.includes("STUDENT");
    const isFaculty = currentUser.roles.includes("FACULTY");

    if (isStudent && !currentUser.roles.includes("ADMIN") && !currentUser.roles.includes("CENTER_MANAGER")) {
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

      // Check active enrollment in this session's batch
      const isEnrolled = session.batch.enrollments.some((e: any) => e.studentId === student.id);
      if (!isEnrolled) {
        const err: any = new Error("You are not enrolled in this class session's batch");
        err.statusCode = 403;
        throw err;
      }
    } else if (isFaculty && !currentUser.roles.includes("ADMIN") && !currentUser.roles.includes("CENTER_MANAGER")) {
      const faculty = await prisma.faculty.findUnique({
        where: { userId: currentUser.id || currentUser.userId },
      });

      if (!faculty || faculty.id !== session.facultyId) {
        const err: any = new Error("You are not authorized to access this class meeting");
        err.statusCode = 403;
        throw err;
      }
    }

    const meetingUrl = session.meetingUrl || session.googleMeetSpace?.meetingUri;

    return {
      classSessionId: session.id,
      title: session.title,
      scheduledDate: session.scheduledDate,
      startTime: session.startTime,
      endTime: session.endTime,
      mode: session.mode,
      meetingUrl,
      meetingCode: session.googleMeetSpace?.meetingCode || (meetingUrl ? meetingUrl.split("/").pop() : undefined),
      spaceName: session.googleMeetSpace?.spaceName,
      recordingEnabled: session.googleMeetSpace?.recordingEnabled ?? false,
      sessionStatus: session.sessionStatus,
    };
  },

  getMeetSpaceForSession: async (currentUser: any, id: string) => {
    const session = await prisma.classSession.findUnique({
      where: { id },
      include: {
        batch: true,
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

    if (
      !currentUser.roles.includes("ADMIN") &&
      currentUser.branchId &&
      session.branchId !== currentUser.branchId
    ) {
      const err: any = new Error("Class session not found");
      err.statusCode = 404;
      throw err;
    }

    if (!session.googleMeetSpace) {
      const err: any = new Error("No Google Meet space linked to this class session");
      err.statusCode = 404;
      throw err;
    }

    return session.googleMeetSpace;
  },
};
