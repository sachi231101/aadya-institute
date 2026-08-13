import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { triggerNotification } from "../modules/notifications/notification.service";
import { NotificationEvent, buildIdempotencyKey } from "../modules/notifications/notification.constants";

/**
 * Enqueues WhatsApp class reminders ~2 hours before scheduled class start time.
 * Uses idempotency keys to ensure students only receive 1 reminder per session.
 */
export const classReminderJob = async (): Promise<void> => {
  const now = new Date();
  // 2 hour window: 1h 45m to 2h 15m from now
  const windowStart = new Date(now.getTime() + 105 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 135 * 60 * 1000);

  const sessions = await prisma.classSession.findMany({
    where: {
      scheduledDate: { gte: windowStart, lte: windowEnd },
      status: "ACTIVE",
    },
    include: {
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

  logger.info(`[class-reminder] Found ${sessions.length} sessions starting in ~2 hours`);

  for (const session of sessions) {
    const dateStr = session.scheduledDate.toISOString().split("T")[0];

    for (const enrollment of session.batch.enrollments) {
      const student = enrollment.student;
      if (!student.user?.phone) continue;

      const idempotencyKey = buildIdempotencyKey.CLASS_REMINDER(student.id, session.id, dateStr);

      await triggerNotification({
        instituteId: session.batch.instituteId,
        studentId: student.id,
        event: NotificationEvent.CLASS_REMINDER,
        idempotencyKey,
        templateParams: {
          student_name: student.user.name ?? "Student",
          batch_name: session.batch.name ?? "Batch",
          start_time: session.startTime ?? "scheduled time",
        },
        metadata: {
          classSessionId: session.id,
          batchId: session.batchId,
        },
      });
    }
  }
};
