/**
 * Assignment due reminder job — 1 day before (configurable per institute rule).
 */
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
    getAutomationMeta(NotificationEvent.ASSIGNMENT_DUE_REMINDER)?.defaultConfiguration?.daysBefore
  );
  return Number.isFinite(fallback) ? fallback : DEFAULT_DAYS_BEFORE;
};

export const assignmentDueReminderJob = async (): Promise<void> => {
  const rules = await prisma.notificationRule.findMany({
    where: {
      event: NotificationEvent.ASSIGNMENT_DUE_REMINDER,
      channel: NotificationChannel.WHATSAPP,
      enabled: true,
    },
  });
  if (rules.length === 0) return;

  const maxDays = Math.max(...rules.map((r) => resolveDaysBefore(r.configuration)), DEFAULT_DAYS_BEFORE);
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + maxDays + 1);

  const assignments = await prisma.assignment.findMany({
    where: {
      status: "ACTIVE",
      dueDate: { gte: now, lte: windowEnd },
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

  logger.info(`[assignment-due] Found ${assignments.length} assignments in upcoming window`);

  for (const assignment of assignments) {
    if (!assignment.dueDate || !assignment.batch) continue;
    const instituteId = assignment.batch.instituteId;
    const rule = rules.find((r) => r.instituteId === instituteId);
    if (!rule) continue;
    const daysBefore = resolveDaysBefore(rule.configuration);
    const due = new Date(assignment.dueDate);
    const target = new Date(due);
    target.setDate(target.getDate() - daysBefore);
    const todayKey = now.toISOString().slice(0, 10);
    if (target.toISOString().slice(0, 10) !== todayKey) continue;

    const dueLabel = due.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    for (const enr of assignment.batch.enrollments) {
      const student = enr.student;
      if (!student) continue;
      await triggerNotification({
        instituteId,
        studentId: student.id,
        event: NotificationEvent.ASSIGNMENT_DUE_REMINDER,
        idempotencyKey: buildIdempotencyKey.ASSIGNMENT_DUE_REMINDER(
          student.id,
          assignment.id,
          todayKey
        ),
        templateParams: {
          student_name: student.user?.name || "Student",
          assignment_title: assignment.title || "Assignment",
          due_date: dueLabel,
        },
        metadata: { assignmentId: assignment.id },
      });
    }
  }
};
