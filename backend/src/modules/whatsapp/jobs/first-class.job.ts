import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { triggerNotification } from "../whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp.constants";

/**
 * Sends the "Rules & Regulations" WhatsApp message for a batch's FIRST class.
 */
export const firstClassJob = async (): Promise<void> => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const sessions = await prisma.classSession.findMany({
    where: {
      scheduledDate: { gte: now, lte: windowEnd },
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
    orderBy: { scheduledDate: "asc" },
  });

  for (const session of sessions) {
    const earliest = await prisma.classSession.findFirst({
      where: { batchId: session.batchId, status: "ACTIVE" },
      orderBy: { scheduledDate: "asc" },
    });

    if (!earliest || earliest.id !== session.id) continue;

    const startDate = session.scheduledDate.toISOString().split("T")[0];

    logger.info(
      { sessionId: session.id, batchId: session.batchId },
      "[first-class] Sending first-class rules message to enrolled students"
    );

    for (const enrollment of session.batch.enrollments) {
      const student = enrollment.student;
      if (!student.user?.phone) continue;

      const idempotencyKey = buildIdempotencyKey.FIRST_CLASS(student.id, session.id);

      await triggerNotification({
        instituteId: session.batch.instituteId,
        studentId: student.id,
        event: NotificationEvent.FIRST_CLASS,
        idempotencyKey,
        templateParams: {
          student_name: student.user.name ?? "Student",
          batch_name: session.batch.name ?? "Batch",
          start_date: startDate,
          start_time: session.startTime ?? "scheduled time",
          location: session.roomNo ?? "Aadya Institute",
        },
        metadata: {
          classSessionId: session.id,
          batchId: session.batchId,
        },
      });
    }
  }
};
