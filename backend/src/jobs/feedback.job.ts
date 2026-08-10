import { whatsappQueue } from "../queues/whatsapp.queue";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

/**
 * Sends feedback request to students after a class session ends.
 */
export const feedbackJob = async (): Promise<void> => {
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

  const sessions = await prisma.classSession.findMany({
    where: {
      actualEndTime: { gte: fifteenMinsAgo, lte: tenMinsAgo },
      status: "ACTIVE",
    },
    include: {
      batch: {
        include: {
          enrollments: {
            include: { student: { include: { user: true } } },
          },
        },
      },
    },
  });

  logger.info(`[feedback-job] ${sessions.length} sessions need feedback requests`);

  for (const session of sessions) {
    for (const enrollment of session.batch.enrollments) {
      const phone = enrollment.student.user?.phone;
      if (!phone) continue;

      await whatsappQueue.add("feedback-request", {
        to: phone,
        message: `⭐ How was your class today? Reply 1–5 to rate your session. (Session #${session.id.slice(-6)})`,
      });
    }
  }
};
