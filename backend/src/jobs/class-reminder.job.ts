import { whatsappQueue } from "../queues/whatsapp.queue";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

/**
 * Enqueues WhatsApp reminders for class sessions scheduled in the next 30 minutes.
 */
export const classReminderJob = async (): Promise<void> => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);

  const sessions = await prisma.classSession.findMany({
    where: {
      scheduledDate: { gte: now, lte: windowEnd },
      status: "ACTIVE",
    },
    include: {
      batch: {
        include: {
          enrollments: {
            include: {
              student: { include: { user: true } },
            },
          },
        },
      },
    },
  });

  logger.info(`[class-reminder] Found ${sessions.length} upcoming sessions`);

  for (const session of sessions) {
    for (const enrollment of session.batch.enrollments) {
      const phone = enrollment.student.user?.phone;
      if (!phone) continue;

      await whatsappQueue.add("class-reminder", {
        to: phone,
        message: `📚 Reminder: Your class starts at ${session.startTime} today. Don't miss it!`,
      });
    }
  }
};
