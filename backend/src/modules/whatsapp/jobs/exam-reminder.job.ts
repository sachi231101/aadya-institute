import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { triggerNotification } from "../whatsapp.service";
import {
  NotificationEvent,
  NotificationChannel,
  buildIdempotencyKey,
  getAutomationMeta,
} from "../whatsapp.constants";

const DEFAULT_DAYS_BEFORE = 1;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const resolveDaysBefore = (configuration: unknown): number => {
  const raw = Number(
    configuration &&
      typeof configuration === "object" &&
      "daysBefore" in configuration
      ? (configuration as { daysBefore?: unknown }).daysBefore
      : undefined
  );
  if (Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
  const fallback = Number(
    getAutomationMeta(NotificationEvent.EXAM_REMINDER)?.defaultConfiguration?.daysBefore
  );
  return Number.isFinite(fallback) && fallback >= 0 ? Math.floor(fallback) : DEFAULT_DAYS_BEFORE;
};

/**
 * Remind students N days before a scheduled exam (configurable per institute; default 1).
 */
export const examReminderJob = async (): Promise<void> => {
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);

  const rules = await prisma.notificationRule.findMany({
    where: {
      event: NotificationEvent.EXAM_REMINDER,
      channel: NotificationChannel.WHATSAPP,
      enabled: true,
    },
    select: { instituteId: true, configuration: true },
  });

  const daysByInstitute = new Map<string, number>();
  let maxDays = DEFAULT_DAYS_BEFORE;
  for (const rule of rules) {
    const days = resolveDaysBefore(rule.configuration);
    daysByInstitute.set(rule.instituteId, days);
    if (days > maxDays) maxDays = days;
  }

  const windowStart = new Date(now.getTime() + 0.5 * MS_PER_DAY);
  const windowEnd = new Date(now.getTime() + (maxDays + 0.5) * MS_PER_DAY);

  const exams = await prisma.exam.findMany({
    where: {
      status: { in: ["PUBLISHED", "SCHEDULED"] },
      startAt: { gte: windowStart, lte: windowEnd },
    },
    include: {
      studentAssignments: {
        include: {
          student: { include: { user: true } },
        },
      },
    },
    take: 100,
  });

  logger.info(`[exam-reminder] Found ${exams.length} exams in upcoming window (maxDays=${maxDays})`);

  for (const exam of exams) {
    const daysBefore =
      daysByInstitute.get(exam.instituteId) ?? DEFAULT_DAYS_BEFORE;
    if (!exam.startAt) continue;

    const daysUntil = (exam.startAt.getTime() - now.getTime()) / MS_PER_DAY;
    // Match within ~4 hours of the target day offset
    if (Math.abs(daysUntil - daysBefore) > 0.2) continue;

    for (const assignment of exam.studentAssignments) {
      const student = assignment.student;
      if (!student?.user?.phone) continue;

      await triggerNotification({
        instituteId: exam.instituteId,
        studentId: student.id,
        event: NotificationEvent.EXAM_REMINDER,
        idempotencyKey: buildIdempotencyKey.EXAM_REMINDER(student.id, exam.id, dateKey),
        templateParams: {
          student_name: student.user.name ?? "Student",
          exam_name: exam.name,
          exam_date: exam.startAt
            ? new Date(exam.startAt).toLocaleDateString("en-IN")
            : "scheduled date",
          start_time: exam.startAt
            ? new Date(exam.startAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
        },
        metadata: { examId: exam.id, daysBefore },
      });
    }
  }
};
