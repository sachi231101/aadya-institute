import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { triggerNotification } from "../whatsapp.service";
import {
  NotificationEvent,
  NotificationChannel,
  buildIdempotencyKey,
  getAutomationMeta,
} from "../whatsapp.constants";

const DEFAULT_OFFSET_MINUTES = -120;
const WINDOW_HALF_MINUTES = 15;

const resolveOffsetMinutes = (configuration: unknown): number => {
  const raw = Number(
    configuration &&
      typeof configuration === "object" &&
      "offsetMinutes" in configuration
      ? (configuration as { offsetMinutes?: unknown }).offsetMinutes
      : undefined
  );
  if (Number.isFinite(raw) && raw !== 0) {
    return raw > 0 ? -Math.abs(raw) : raw;
  }
  const fallback = Number(
    getAutomationMeta(NotificationEvent.CLASS_REMINDER)?.defaultConfiguration?.offsetMinutes
  );
  return Number.isFinite(fallback) ? fallback : DEFAULT_OFFSET_MINUTES;
};

const resolveIncludeFaculty = (configuration: unknown): boolean => {
  if (configuration && typeof configuration === "object" && "includeFaculty" in configuration) {
    return Boolean((configuration as { includeFaculty?: unknown }).includeFaculty);
  }
  return Boolean(
    getAutomationMeta(NotificationEvent.CLASS_REMINDER)?.defaultConfiguration?.includeFaculty
  );
};

/**
 * Enqueues WhatsApp class reminders using each institute's configured offset
 * (default: 2 hours before class). Optionally also notifies session faculty.
 */
export const classReminderJob = async (): Promise<void> => {
  const now = new Date();

  const rules = await prisma.notificationRule.findMany({
    where: {
      event: NotificationEvent.CLASS_REMINDER,
      channel: NotificationChannel.WHATSAPP,
      enabled: true,
    },
    select: { instituteId: true, configuration: true },
  });

  const offsetByInstitute = new Map<string, number>();
  const includeFacultyByInstitute = new Map<string, boolean>();
  let minOffset = DEFAULT_OFFSET_MINUTES;

  for (const rule of rules) {
    const offset = resolveOffsetMinutes(rule.configuration);
    offsetByInstitute.set(rule.instituteId, offset);
    includeFacultyByInstitute.set(rule.instituteId, resolveIncludeFaculty(rule.configuration));
    if (offset < minOffset) minOffset = offset;
  }
  if (offsetByInstitute.size === 0) {
    minOffset = DEFAULT_OFFSET_MINUTES;
  }

  const maxAbs = Math.max(
    Math.abs(minOffset),
    ...[...offsetByInstitute.values()].map((o) => Math.abs(o)),
    Math.abs(DEFAULT_OFFSET_MINUTES)
  );
  const windowStart = new Date(now.getTime() + 30 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + (maxAbs + WINDOW_HALF_MINUTES) * 60 * 1000);

  const sessions = await prisma.classSession.findMany({
    where: {
      scheduledDate: { gte: windowStart, lte: windowEnd },
      status: "ACTIVE",
    },
    include: {
      faculty: { include: { user: true } },
      classroomMaster: { select: { name: true } },
      batch: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              student: { include: { user: true } },
            },
          },
        },
      },
    },
  });

  logger.info(`[class-reminder] Found ${sessions.length} sessions in upcoming window`);

  for (const session of sessions) {
    const instituteId = session.batch.instituteId;
    const offsetMinutes = offsetByInstitute.get(instituteId) ?? DEFAULT_OFFSET_MINUTES;
    const includeFaculty = includeFacultyByInstitute.get(instituteId) ?? false;
    const minutesUntil = (session.scheduledDate.getTime() - now.getTime()) / (60 * 1000);

    if (Math.abs(minutesUntil - Math.abs(offsetMinutes)) > WINDOW_HALF_MINUTES) {
      continue;
    }

    const dateStr = session.scheduledDate.toISOString().split("T")[0];
    const batchName = session.batch.name ?? "Batch";
    const startTime = session.startTime ?? "scheduled time";
    const classroom = session.classroomMaster?.name ?? session.roomNo ?? "";

    for (const enrollment of session.batch.enrollments) {
      const student = enrollment.student;
      if (!student.user?.phone) continue;

      await triggerNotification({
        instituteId,
        studentId: student.id,
        event: NotificationEvent.CLASS_REMINDER,
        idempotencyKey: buildIdempotencyKey.CLASS_REMINDER(student.id, session.id, dateStr),
        templateParams: {
          student_name: student.user.name ?? "Student",
          batch_name: batchName,
          start_time: startTime,
          classroom,
        },
        metadata: {
          classSessionId: session.id,
          batchId: session.batchId,
          offsetMinutes,
          recipientRole: "STUDENT",
        },
      });
    }

    if (includeFaculty && session.faculty?.user) {
      const facultyUser = session.faculty.user;
      if (facultyUser.phone) {
        await triggerNotification({
          instituteId,
          userId: facultyUser.id,
          event: NotificationEvent.CLASS_REMINDER,
          idempotencyKey: buildIdempotencyKey.CLASS_REMINDER(
            `faculty:${session.faculty.id}`,
            session.id,
            dateStr
          ),
          templateParams: {
            student_name: facultyUser.name ?? "Faculty",
            batch_name: batchName,
            start_time: startTime,
            classroom,
          },
          metadata: {
            classSessionId: session.id,
            batchId: session.batchId,
            offsetMinutes,
            facultyId: session.faculty.id,
            recipientRole: "FACULTY",
          },
        });
      }
    }
  }
};
