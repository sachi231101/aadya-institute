import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { triggerNotification } from "../whatsapp.service";
import {
  NotificationEvent,
  NotificationChannel,
  buildIdempotencyKey,
  getAutomationMeta,
} from "../whatsapp.constants";
import {
  derivePendingStatus,
  overdueDaysFromDueDate,
  startOfDay,
} from "../../fees/fee-balance.util";
import { toMoneyNumber } from "../../fees/fee-money.util";

const DEFAULT_DAYS_BEFORE_DUE = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const resolveDaysBeforeDue = (configuration: unknown): number => {
  const raw = Number(
    configuration &&
      typeof configuration === "object" &&
      "daysBeforeDue" in configuration
      ? (configuration as { daysBeforeDue?: unknown }).daysBeforeDue
      : undefined
  );
  if (Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
  const fallback = Number(getAutomationMeta(NotificationEvent.FEE_DUE_REMINDER)?.defaultConfiguration?.daysBeforeDue);
  return Number.isFinite(fallback) && fallback >= 0 ? Math.floor(fallback) : DEFAULT_DAYS_BEFORE_DUE;
};

const calendarDaysUntil = (due: Date, today: Date): number =>
  Math.round((due.getTime() - today.getTime()) / MS_PER_DAY);

/**
 * Sync OVERDUE / overdueDays on open pending fee rows, then send due/overdue WhatsApp reminders.
 * Fee Due Reminder sends on the configured day before due (default: 3 days before).
 */
export const feeReminderJob = async (): Promise<void> => {
  const now = new Date();
  const startOfToday = startOfDay(now);
  const dateKey = startOfToday.toISOString().slice(0, 10);

  const dueRules = await prisma.notificationRule.findMany({
    where: {
      event: NotificationEvent.FEE_DUE_REMINDER,
      channel: NotificationChannel.WHATSAPP,
    },
    select: { instituteId: true, configuration: true, enabled: true },
  });

  const daysBeforeByInstitute = new Map<string, number>();
  let maxDaysBefore = DEFAULT_DAYS_BEFORE_DUE;
  for (const rule of dueRules) {
    const days = resolveDaysBeforeDue(rule.configuration);
    daysBeforeByInstitute.set(rule.instituteId, days);
    if (days > maxDaysBefore) maxDaysBefore = days;
  }

  const endOfDueWindow = new Date(startOfToday);
  endOfDueWindow.setDate(endOfDueWindow.getDate() + maxDaysBefore + 1);

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
    const dueAmount = toMoneyNumber(row.dueAmount);
    const amountPaid = toMoneyNumber(row.amountPaid);
    const status = derivePendingStatus(dueAmount, row.dueDate, amountPaid, startOfToday);
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
      dueAmount: { gt: 0 },
      OR: [
        { status: "OVERDUE" },
        {
          status: { in: ["DUE_SOON", "PARTIAL"] },
          dueDate: { gte: startOfToday, lt: endOfDueWindow },
        },
      ],
    },
    take: 500,
  });

  logger.info(
    `[fee-reminder] Processing ${pending.length} pending fee rows (daysBeforeDue default=${DEFAULT_DAYS_BEFORE_DUE}, maxWindow=${maxDaysBefore})`
  );

  for (const fee of pending) {
    if (!fee.studentId) continue;

    const due = startOfDay(new Date(fee.dueDate));
    const daysUntil = calendarDaysUntil(due, startOfToday);
    const daysBeforeDue =
      daysBeforeByInstitute.get(fee.instituteId) ?? DEFAULT_DAYS_BEFORE_DUE;

    const event =
      daysUntil < 0
        ? NotificationEvent.FEE_OVERDUE_REMINDER
        : daysUntil === daysBeforeDue
          ? NotificationEvent.FEE_DUE_REMINDER
          : null;
    if (!event) continue;

    const student = await prisma.student.findUnique({
      where: { id: fee.studentId },
      include: { user: true },
    });
    if (!student?.user) {
      logger.info(`[fee-reminder] Skip pendingFee=${fee.id}: student user not found`);
      continue;
    }
    if (!student.user.phone) {
      logger.info(
        `[fee-reminder] Skip pendingFee=${fee.id} student=${student.id}: no phone on user`
      );
      continue;
    }

    const idempotencyKey =
      event === NotificationEvent.FEE_OVERDUE_REMINDER
        ? buildIdempotencyKey.FEE_OVERDUE_REMINDER(student.id, fee.id, dateKey)
        : buildIdempotencyKey.FEE_DUE_REMINDER(student.id, fee.id, dateKey);

    const notification = await triggerNotification({
      instituteId: fee.instituteId,
      studentId: student.id,
      event,
      idempotencyKey,
      templateParams: {
        student_name: student.user.name ?? fee.studentName ?? "Student",
        amount: String(toMoneyNumber(fee.dueAmount)),
        due_date: due.toLocaleDateString("en-IN"),
        course_name: fee.courseName ?? "Course",
        fee_head: fee.feeHead ?? "Fee",
      },
      metadata: {
        pendingFeeId: fee.id,
        daysUntilDue: daysUntil,
        daysBeforeDue,
        feeHead: fee.feeHead,
      },
    });

    if (notification?.status === "SKIPPED") {
      logger.info(
        `[fee-reminder] Skipped pendingFee=${fee.id}: ${notification.skipReason ?? "unknown"}`
      );
    }
  }
};
