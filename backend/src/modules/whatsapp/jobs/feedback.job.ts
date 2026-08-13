import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { triggerNotification } from "../whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp.constants";

/**
 * Sends feedback request notifications to enrolled students 10–15 minutes after a class session ends.
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
            where: { status: "ACTIVE" },
            include: { student: { include: { user: true } } },
          },
        },
      },
    },
  });

  logger.info(`[feedback-job] ${sessions.length} sessions need feedback requests`);

  for (const session of sessions) {
    for (const enrollment of session.batch.enrollments) {
      const student = enrollment.student;
      if (!student.user?.phone) continue;

      const idempotencyKey = buildIdempotencyKey.FEEDBACK_REQUESTED(student.id, session.id);

      await triggerNotification({
        instituteId: session.batch.instituteId,
        studentId: student.id,
        event: NotificationEvent.FEEDBACK_REQUESTED,
        idempotencyKey,
        templateParams: {
          student_name: student.user.name ?? "Student",
          batch_name: session.batch.name ?? "Batch",
          session_id: session.id.slice(-6),
        },
        metadata: {
          classSessionId: session.id,
          batchId: session.batchId,
        },
      });
    }
  }
};
