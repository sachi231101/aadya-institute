/**
 * Notification repository — all Prisma access for notification data.
 *
 * @module modules/notifications/notification.repository
 */
import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

// ─── Idempotency ─────────────────────────────────────────────────────────────

export const checkIdempotency = async (key: string): Promise<boolean> => {
  const existing = await prisma.notificationIdempotency.findUnique({ where: { key } });
  return !!existing;
};

export const createIdempotencyKey = async (key: string): Promise<boolean> => {
  try {
    await prisma.notificationIdempotency.create({ data: { key } });
    return true;
  } catch {
    return false;
  }
};

export const deleteIdempotencyKey = async (key: string): Promise<void> => {
  await prisma.notificationIdempotency.deleteMany({ where: { key } });
};

// ─── Templates ───────────────────────────────────────────────────────────────

export const findTemplateByEvent = async (event: string) => {
  return prisma.notificationTemplate.findFirst({
    where: { event, status: "ACTIVE" },
  });
};

export const findTemplateById = async (id: string) => {
  return prisma.notificationTemplate.findUnique({ where: { id } });
};

export const findAllTemplates = async (status?: string) => {
  return prisma.notificationTemplate.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "asc" },
  });
};

export const createTemplate = async (data: {
  name: string;
  event: string;
  providerTemplateName: string;
  language?: string;
  variables: string[];
}) => {
  return prisma.notificationTemplate.create({
    data: {
      name: data.name,
      event: data.event,
      providerTemplateName: data.providerTemplateName,
      language: data.language ?? "en",
      variables: data.variables as unknown as Prisma.InputJsonValue,
      status: "ACTIVE",
    },
  });
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
  return prisma.notificationTemplate.update({
    where: { id },
    data: {
      ...data,
      ...(data.variables ? { variables: data.variables as unknown as Prisma.InputJsonValue } : {}),
    },
  });
};

// ─── Rules ───────────────────────────────────────────────────────────────────

export const findRuleByEvent = async (event: string, channel = "WHATSAPP") => {
  return prisma.notificationRule.findFirst({
    where: { event, channel },
  });
};

export const findAllRules = async () => {
  return prisma.notificationRule.findMany({ orderBy: { createdAt: "asc" } });
};

export const upsertRule = async (data: {
  event: string;
  channel?: string;
  enabled: boolean;
  configuration?: Record<string, unknown>;
}) => {
  return prisma.notificationRule.upsert({
    where: { event_channel: { event: data.event, channel: data.channel ?? "WHATSAPP" } },
    create: {
      event: data.event,
      channel: data.channel ?? "WHATSAPP",
      enabled: data.enabled,
      configuration: (data.configuration ?? {}) as unknown as Prisma.InputJsonValue,
    },
    update: {
      enabled: data.enabled,
      configuration: (data.configuration ?? {}) as unknown as Prisma.InputJsonValue,
    },
  });
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const createNotification = async (data: {
  instituteId: string;
  userId?: string;
  studentId?: string;
  event: string;
  channel?: string;
  templateId?: string;
  metadata?: Record<string, unknown>;
  scheduledAt?: Date;
}) => {
  return prisma.notification.create({
    data: {
      instituteId: data.instituteId,
      userId: data.userId,
      studentId: data.studentId,
      event: data.event,
      channel: data.channel ?? "WHATSAPP",
      templateId: data.templateId,
      status: "PENDING",
      metadata: (data.metadata ?? {}) as unknown as Prisma.InputJsonValue,
      scheduledAt: data.scheduledAt,
    },
  });
};

export const findNotificationById = async (id: string) => {
  return prisma.notification.findUnique({
    where: { id },
    include: {
      template: true,
      student: { include: { user: true } },
      user: true,
    },
  });
};

export const findNotifications = async (params: {
  instituteId: string;
  branchId?: string;
  studentId?: string;
  event?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
}) => {
  const { page, limit, instituteId, branchId, studentId, event, status, fromDate, toDate } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.NotificationWhereInput = {
    instituteId,
    ...(studentId ? { studentId } : {}),
    ...(event ? { event } : {}),
    ...(status ? { status } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
    ...(branchId
      ? {
          student: {
            batchEnrollments: {
              some: {
                batch: { branchId },
              },
            },
          },
        }
      : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { template: true },
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
};

export const updateNotificationStatus = async (
  id: string,
  data: {
    status: string;
    providerMessageId?: string;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
    retryCount?: number;
  }
) => {
  return prisma.notification.update({ where: { id }, data });
};

export const findNotificationByProviderId = async (providerMessageId: string) => {
  return prisma.notification.findFirst({ where: { providerMessageId } });
};

export const markNotificationQueued = async (id: string) => {
  return prisma.notification.update({
    where: { id },
    data: { status: "QUEUED" },
  });
};
