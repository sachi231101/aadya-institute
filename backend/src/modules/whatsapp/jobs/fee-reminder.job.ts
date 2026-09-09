import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { triggerNotification } from "../whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp.constants";

/**
 * Daily fee due / overdue WhatsApp reminders.
 * Respects global + per-automation toggles via the automation engine.
 */
export const feeReminderJob = async (): Promise<void> => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(startOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
  endOfTomorrow.setHours(0, 0, 0, 0);

  const dateKey = startOfToday.toISOString().slice(0, 10);

  const pending = await prisma.pendingFee.findMany({
    where: {
      status: { in: ["DUE_SOON", "PARTIAL", "OVERDUE"] },
      dueAmount: { gt: 0 },
      dueDate: { lte: endOfTomorrow },
    },
    take: 500,
  });

  logger.info(`[fee-reminder] Processing ${pending.length} pending fee rows`);

  for (const fee of pending) {
    if (!fee.studentId) continue;

    const due = new Date(fee.dueDate);
    due.setHours(0, 0, 0, 0);
    const isOverdue = due < startOfToday;
    const isDueSoon = due >= startOfToday && due < endOfTomorrow;

    const event = isOverdue
      ? NotificationEvent.FEE_OVERDUE_REMINDER
      : isDueSoon
        ? NotificationEvent.FEE_DUE_REMINDER
        : null;
    if (!event) continue;

    const student = await prisma.student.findUnique({
      where: { id: fee.studentId },
      include: { user: true },
    });
    if (!student?.user) continue;

    const idempotencyKey =
      event === NotificationEvent.FEE_OVERDUE_REMINDER
        ? buildIdempotencyKey.FEE_OVERDUE_REMINDER(student.id, fee.id, dateKey)
        : buildIdempotencyKey.FEE_DUE_REMINDER(student.id, fee.id, dateKey);

    await triggerNotification({
      instituteId: fee.instituteId,
      studentId: student.id,
      event,
      idempotencyKey,
      templateParams: {
        student_name: student.user.name ?? fee.studentName ?? "Student",
        amount: String(fee.dueAmount),
        due_date: due.toLocaleDateString("en-IN"),
        course_name: fee.courseName ?? "Course",
      },
      metadata: { pendingFeeId: fee.id },
    });
  }
};
