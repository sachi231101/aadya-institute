/**
 * Notification service — business logic for creating, queuing, listing,
 * template management, rule management, and manual resending.
 *
 * @module modules/notifications/notification.service
 */

import * as repo from "./notification.repository";
import { whatsappQueue } from "../../queues/whatsapp.queue";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { env } from "../../config/env";
import {
  NotificationEvent,
  NotificationStatus,
  buildIdempotencyKey,
} from "./notification.constants";
import { getBranchScopeFilter, hasBranchAccess } from "../../utils/branch-isolation.util";
import type { AuthUser } from "../auth/auth.types";
import { buildMeta } from "../../utils/pagination";

export interface TriggerNotificationInput {
  instituteId: string;
  studentId?: string;
  userId?: string;
  event: NotificationEvent | string;
  templateParams: Record<string, string>;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Main entry point for triggering a business notification.
 *
 * Steps:
 * 1. Check if the NotificationRule for this event & channel (WHATSAPP) is enabled.
 * 2. Find active template for this event.
 * 3. Verify recipient student/user phone number & `whatsappEnabled` preference.
 * 4. Idempotency check: if key already exists, return existing/skip.
 * 5. Create Notification record with status PENDING.
 * 6. Add to BullMQ `whatsappQueue`, then mark QUEUED.
 *
 * If queueing fails (e.g., Redis is offline) the notification is marked FAILED so
 * it never stays stuck in QUEUED and can be retried via the resend endpoint.
 */
export const triggerNotification = async (input: TriggerNotificationInput) => {
  const { instituteId, studentId, userId, event, templateParams, metadata } = input;
  const key = input.idempotencyKey;

  // 1. Check Notification Rule
  const rule = await repo.findRuleByEvent(event, "WHATSAPP");
  if (rule && !rule.enabled) {
    logger.info({ event }, "[notification.service] Notification rule disabled — skipping");
    return null;
  }

  // 2. Find Active Template (before idempotency, so a missing template doesn't burn the key)
  const template = await repo.findTemplateByEvent(event);
  if (!template) {
    logger.warn({ event }, "[notification.service] No active template found for event");
    return null;
  }

  // 3. Verify Recipient
  let targetUserId = userId;
  let targetStudentId = studentId;
  let recipientUser: { phone?: string | null; whatsappEnabled?: boolean; name?: string } | null = null;

  if (targetStudentId) {
    const student = await prisma.student.findUnique({
      where: { id: targetStudentId },
      include: { user: true },
    });
    if (student?.user) {
      recipientUser = student.user;
      targetUserId = student.user.id;
    }
  } else if (targetUserId) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    recipientUser = user;
  }

  if (!recipientUser) {
    logger.warn({ studentId, userId, event }, "[notification.service] Recipient user not found — skipping");
    return null;
  }

  if (!recipientUser.phone) {
    logger.warn({ targetUserId, event }, "[notification.service] Recipient has no phone number — skipping");
    return null;
  }

  if (recipientUser.whatsappEnabled === false) {
    logger.info({ targetUserId, event }, "[notification.service] Recipient opted out of WhatsApp — skipping");
    return null;
  }

  // 4. Idempotency Check (unique key guards concurrent duplicate triggers)
  if (key) {
    const isNew = await repo.createIdempotencyKey(key);
    if (!isNew) {
      logger.info({ key, event }, "[notification.service] Duplicate idempotency key — skipping notification creation");
      return null;
    }
  }

  // 5. Create Notification Record
  let notification;
  try {
    notification = await repo.createNotification({
      instituteId,
      userId: targetUserId,
      studentId: targetStudentId,
      event,
      channel: "WHATSAPP",
      templateId: template.id,
      metadata: {
        ...metadata,
        templateParams,
        recipientPhone: recipientUser.phone,
        recipientName: recipientUser.name,
      },
    });
  } catch (err) {
    if (key) await repo.deleteIdempotencyKey(key).catch(() => {});
    throw err;
  }

  // 6. Add to BullMQ, then mark QUEUED
  const maxRetries = env.WHATSAPP_MAX_RETRIES;
  try {
    await whatsappQueue.add(
      "send-whatsapp",
      { notificationId: notification.id },
      {
        attempts: maxRetries,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
      }
    );
  } catch (err: any) {
    const errorMsg = `Queue unavailable: ${err?.message ?? "unknown error"}`;
    await repo.updateNotificationStatus(notification.id, {
      status: NotificationStatus.FAILED,
      failedAt: new Date(),
      errorMessage: errorMsg,
    });
    if (key) await repo.deleteIdempotencyKey(key).catch(() => {});
    logger.error({ notificationId: notification.id, event, err }, "[notification.service] Failed to enqueue WhatsApp notification");
    throw err;
  }

  await repo.markNotificationQueued(notification.id);

  logger.info(
    { notificationId: notification.id, event, recipientPhone: recipientUser.phone },
    "[notification.service] Notification queued successfully"
  );

  return notification;
};

/**
 * List notifications with branch isolation and pagination.
 */
export const getNotifications = async (
  currentUser: AuthUser,
  query: {
    branchId?: string;
    studentId?: string;
    event?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const scope = getBranchScopeFilter(currentUser, query.branchId);

  // If student role, lock to own studentId
  let filterStudentId = query.studentId;
  if (currentUser.roles.includes("STUDENT")) {
    const student = await prisma.student.findFirst({ where: { userId: currentUser.id } });
    if (student) filterStudentId = student.id;
  }

  const { notifications, total } = await repo.findNotifications({
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    studentId: filterStudentId,
    event: query.event,
    status: query.status,
    fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
    toDate: query.toDate ? new Date(query.toDate) : undefined,
    page,
    limit,
  });

  const meta = buildMeta(total, page, limit);
  return { data: notifications, meta };
};

/**
 * Get notification by ID with RBAC/branch check.
 */
export const getNotificationById = async (currentUser: AuthUser, id: string) => {
  const notification = await repo.findNotificationById(id);
  if (!notification) return null;

  if (notification.instituteId !== currentUser.instituteId) return null;

  if (!canAccessNotification(currentUser, notification)) return null;

  return notification;
};

/**
 * Manually resend a notification (ADMIN & CENTER_MANAGER).
 */
export const resendNotification = async (currentUser: AuthUser, id: string) => {
  const notification = await repo.findNotificationById(id);
  if (!notification) {
    throw new Error("Notification not found");
  }

  if (notification.instituteId !== currentUser.instituteId) {
    throw new Error("Unauthorized institute access");
  }

  if (!canAccessNotification(currentUser, notification)) {
    throw new Error("Forbidden — notification belongs to another branch");
  }

  // Reset status to QUEUED
  await repo.updateNotificationStatus(id, {
    status: NotificationStatus.QUEUED,
    errorMessage: undefined,
  });

  // Enqueue job (revert to FAILED if the queue is unavailable)
  try {
    await whatsappQueue.add(
      "send-whatsapp",
      { notificationId: notification.id },
      {
        attempts: env.WHATSAPP_MAX_RETRIES,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
      }
    );
  } catch (err: any) {
    const errorMsg = `Queue unavailable: ${err?.message ?? "unknown error"}`;
    await repo.updateNotificationStatus(id, {
      status: NotificationStatus.FAILED,
      failedAt: new Date(),
      errorMessage: errorMsg,
    });
    throw new Error(errorMsg);
  }

  return repo.findNotificationById(id);
};

/**
 * Branch-level access check for a notification record.
 * ADMIN has institute-wide access; non-admin roles are locked to their branch.
 */
const canAccessNotification = (currentUser: AuthUser, notification: any): boolean => {
  if (currentUser.roles.includes("ADMIN")) return true;

  const targetBranchId =
    notification.student?.branchId ??
    notification.user?.branchId ??
    (notification.metadata as any)?.branchId;

  if (!targetBranchId) return false;

  return hasBranchAccess(currentUser, targetBranchId);
};

// ─── Template Management ──────────────────────────────────────────────────────

export const listTemplates = async () => {
  return repo.findAllTemplates();
};

export const createTemplate = async (data: {
  name: string;
  event: string;
  providerTemplateName: string;
  language?: string;
  variables: string[];
}) => {
  return repo.createTemplate(data);
};

export const updateTemplate = async (
  id: string,
  data: Partial<{
    name: string;
    event: string;
    providerTemplateName: string;
    language: string;
    variables: string[];
    status: string;
  }>
) => {
  return repo.updateTemplate(id, data);
};

export const toggleTemplateStatus = async (id: string, status: "ACTIVE" | "INACTIVE") => {
  return repo.updateTemplate(id, { status });
};

// ─── Rule Management ──────────────────────────────────────────────────────────

export const listRules = async () => {
  return repo.findAllRules();
};

export const upsertRule = async (data: {
  event: string;
  channel?: string;
  enabled: boolean;
  configuration?: Record<string, unknown>;
}) => {
  return repo.upsertRule(data);
};
