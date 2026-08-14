/**
 * WhatsApp service — channel abstraction layer and notification triggering logic.
 *
 * @module modules/whatsapp/whatsapp.service
 */
import { isValidIndianPhone, normalizePhone } from "../../utils/phone";
import { logger } from "../../config/logger";
import { aiSensyProvider } from "./integrations/aisensy.provider";
import type {
  IWhatsAppProvider,
  SendWhatsAppTemplateOptions,
  SendWhatsAppResult,
  TriggerNotificationInput,
  NotificationListResponse,
  UnreadCountResponse,
  CreateNotificationPayload,
  NotificationQueryFilters,
} from "./whatsapp.types";
import * as repo from "./whatsapp.repository";
import { whatsappQueue } from "./whatsapp.queue";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { NotificationEvent, NotificationStatus } from "./whatsapp.constants";
import { getBranchScopeFilter, hasBranchAccess } from "../../utils/branch-isolation.util";
import type { AuthUser } from "../auth/auth.types";
import { buildMeta } from "../../utils/pagination";

class WhatsAppService {
  constructor(private readonly provider: IWhatsAppProvider) {}

  /**
   * Send a WhatsApp template message via the configured provider.
   */
  async sendTemplate(options: SendWhatsAppTemplateOptions): Promise<SendWhatsAppResult> {
    const rawPhone = options.phone.replace(/^\+/, "").replace(/^91/, "");

    if (!isValidIndianPhone(rawPhone)) {
      const err = new Error(`Invalid Indian phone number: ${options.phone}`) as any;
      err.code = "INVALID_PHONE";
      err.nonRetriable = true;
      throw err;
    }

    const normalizedPhone = normalizePhone(options.phone);
    logger.debug(
      { campaign: options.campaignName, phone: normalizedPhone },
      "[whatsapp] Sending template"
    );

    return this.provider.sendTemplate({ ...options, phone: normalizedPhone });
  }

  /**
   * Send a test WhatsApp message (ADMIN only).
   */
  async sendTestMessage(
    phone: string,
    name: string,
    campaignName: string,
    templateParams: string[]
  ): Promise<SendWhatsAppResult> {
    return this.sendTemplate({ phone, name, campaignName, templateParams });
  }
}

/** Singleton with AiSensy provider */
export const whatsAppService = new WhatsAppService(aiSensyProvider);

/**
 * Main entry point for triggering a business notification.
 */
export const triggerNotification = async (input: TriggerNotificationInput) => {
  const { instituteId, studentId, userId, event, templateParams, metadata } = input;
  const key = input.idempotencyKey;

  // 1. Check Notification Rule
  const rule = await repo.findRuleByEvent(event, "WHATSAPP");
  if (rule && !rule.enabled) {
    logger.info({ event }, "[whatsapp.service] Notification rule disabled — skipping");
    return null;
  }

  // 2. Find Active Template
  const template = await repo.findTemplateByEvent(event);
  if (!template) {
    logger.warn({ event }, "[whatsapp.service] No active template found for event");
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
    logger.warn({ studentId, userId, event }, "[whatsapp.service] Recipient user not found — skipping");
    return null;
  }

  if (!recipientUser.phone) {
    logger.warn({ targetUserId, event }, "[whatsapp.service] Recipient has no phone number — skipping");
    return null;
  }

  if (recipientUser.whatsappEnabled === false) {
    logger.info({ targetUserId, event }, "[whatsapp.service] Recipient opted out of WhatsApp — skipping");
    return null;
  }

  // 4. Idempotency Check
  if (key) {
    const isNew = await repo.createIdempotencyKey(key);
    if (!isNew) {
      logger.info({ key, event }, "[whatsapp.service] Duplicate idempotency key — skipping notification creation");
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
    logger.error({ notificationId: notification.id, event, err }, "[whatsapp.service] Failed to enqueue WhatsApp notification");
    throw err;
  }

  await repo.markNotificationQueued(notification.id);

  logger.info(
    { notificationId: notification.id, event, recipientPhone: recipientUser.phone },
    "[whatsapp.service] Notification queued successfully"
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
 * Manually resend a notification.
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

  await repo.updateNotificationStatus(id, {
    status: NotificationStatus.QUEUED,
    errorMessage: undefined,
  });

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

const canAccessNotification = (currentUser: AuthUser, notification: any): boolean => {
  if (currentUser.roles.includes("ADMIN")) return true;

  const targetBranchId =
    notification.student?.branchId ??
    notification.user?.branchId ??
    (notification.metadata as any)?.branchId;

  if (!targetBranchId) return false;

  return hasBranchAccess(currentUser, targetBranchId);
};

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

import { NotificationRepository as CanonicalNotificationRepo } from "../notifications/notification.repository";

export class NotificationService {
  static async getNotifications(
    instituteId: string,
    userId: string,
    filters: NotificationQueryFilters,
    userRoles: string[] = [],
    userBranchId?: string | null
  ): Promise<NotificationListResponse> {
    return CanonicalNotificationRepo.listNotifications(instituteId, userId, filters, userRoles, userBranchId);
  }

  static async getUnreadCount(
    instituteId: string,
    userId: string,
    userRoles: string[] = [],
    userBranchId?: string | null
  ): Promise<UnreadCountResponse> {
    return CanonicalNotificationRepo.getUnreadCount(instituteId, userId, userRoles, userBranchId);
  }

  static async markAsRead(notificationId: string, userId: string) {
    return CanonicalNotificationRepo.markAsRead(notificationId, userId);
  }

  static async markAllAsRead(
    instituteId: string,
    userId: string,
    userRoles: string[] = [],
    userBranchId?: string | null
  ) {
    return CanonicalNotificationRepo.markAllAsRead(instituteId, userId, userRoles, userBranchId);
  }

  static async createNotification(payload: CreateNotificationPayload) {
    if (!payload.title || !payload.message || !payload.instituteId) {
      throw new Error("Title, message, and instituteId are required");
    }
    return CanonicalNotificationRepo.createNotification(payload);
  }

  static async deleteNotification(notificationId: string, userId: string) {
    return CanonicalNotificationRepo.deleteNotification(notificationId, userId);
  }
}
