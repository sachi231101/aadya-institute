import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { triggerNotification } from "../whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp.constants";
import {
  derivePendingStatus,
  overdueDaysFromDueDate,
  startOfDay,
} from "../../fees/fee-balance.util";

/**
 * Sync OVERDUE / overdueDays on open pending fee rows, then send due/overdue WhatsApp reminders.
 */
export const feeReminderJob = async (): Promise<void> => {
  const now = new Date();
  const startOfToday = startOfDay(now);
  const endOfTomorrow = new Date(startOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);

  const dateKey = startOfToday.toISOString().slice(0, 10);

  // Sync status for non-PAID open rows before sending reminders
  const openRows = await prisma.pendingFee.findMany({
    where: {
      status: { not: "PAID" },
      dueAmount: { gt: 0 },
    },
    take: 2000,
  });

  let synced = 0;
  for (const row of openRows) {
    const status = derivePendingStatus(row.dueAmount, row.dueDate, row.amountPaid, startOfToday);
    const overdueDays =
      status === "OVERDUE" ? overdueDaysFromDueDate(row.dueDate, startOfToday) : 0;
    if (row.status !== status || row.overdueDays !== overdueDays) {
      await prisma.pendingFee.update({
        where: { id: row.id },
        data: { status, overdueDays },
      });
      synced += 1;
    }
  }
  logger.info(`[fee-reminder] Synced status on ${synced}/${openRows.length} pending fee rows`);

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

    const due = startOfDay(new Date(fee.dueDate));
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
