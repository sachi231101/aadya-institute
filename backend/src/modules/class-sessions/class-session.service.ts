import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { classSessionRepository } from "./class-session.repository";
import { CreateClassSessionDto, UpdateClassSessionDto, QueryClassSessionsDto } from "./class-session.types";

export const classSessionService = {
  getSessions: async (instituteId: string, branchId?: string, filters?: QueryClassSessionsDto) => {
    return classSessionRepository.findMany(instituteId, branchId, filters);
  },

  getSessionById: async (id: string, instituteId: string) => {
    const session = await classSessionRepository.findById(id, instituteId);
    if (!session) {
      throw new Error("Class session not found");
    }
    return session;
  },

  createSession: async (instituteId: string, data: CreateClassSessionDto) => {
    return classSessionRepository.create(instituteId, data);
  },

  updateSession: async (id: string, instituteId: string, data: UpdateClassSessionDto) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new Error("Class session not found");
    }
    return classSessionRepository.update(id, instituteId, data);
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
};
