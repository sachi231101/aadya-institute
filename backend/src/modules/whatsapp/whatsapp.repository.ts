/**
 * WhatsApp & Notification repository — database operations via Prisma.
 *
 * @module modules/whatsapp/whatsapp.repository
 */
import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";
import type {
  NotificationListResponse,
  UnreadCountResponse,
  CreateNotificationPayload,
  NotificationQueryFilters,
  NotificationType,
} from "./whatsapp.types";
import {
  SYSTEM_AUTOMATION_EVENTS,
  SYSTEM_AUTOMATION_CATALOG,
  NotificationChannel,
} from "./whatsapp.constants";

// ─── Idempotency ─────────────────────────────────────────────────────────────

export const createIdempotencyKey = async (
  key: string,
  instituteId?: string
): Promise<boolean> => {
  try {
    await prisma.notificationIdempotency.create({
      data: { key, instituteId: instituteId ?? null },
    });
    return true;
  } catch {
    return false;
  }
};

export const deleteIdempotencyKey = async (key: string): Promise<void> => {
  await prisma.notificationIdempotency.deleteMany({ where: { key } });
};

// ─── Automation config ───────────────────────────────────────────────────────

export const getOrCreateAutomationConfig = async (instituteId: string) => {
  const existing = await prisma.whatsAppAutomationConfig.findUnique({
    where: { instituteId },
  });
  if (existing) return existing;
  return prisma.whatsAppAutomationConfig.create({
    data: { instituteId, enabled: false },
  });
};

export const updateAutomationConfig = async (
  instituteId: string,
  enabled: boolean,
  updatedById?: string
) => {
  await getOrCreateAutomationConfig(instituteId);
  return prisma.whatsAppAutomationConfig.update({
    where: { instituteId },
    data: { enabled, updatedById: updatedById ?? null },
  });
};

/** Ensure disabled rules exist for every V1 system automation. */
export const ensureInstituteAutomationRules = async (instituteId: string) => {
  await getOrCreateAutomationConfig(instituteId);

  for (const event of SYSTEM_AUTOMATION_EVENTS) {
    const meta = SYSTEM_AUTOMATION_CATALOG.find((c) => c.event === event);
    await prisma.notificationRule.upsert({
      where: {
        instituteId_event_channel: {
          instituteId,
          event,
          channel: NotificationChannel.WHATSAPP,
        },
      },
      create: {
        instituteId,
        event,
        channel: NotificationChannel.WHATSAPP,
        enabled: false,
        configuration: (meta?.defaultConfiguration ?? {}) as Prisma.InputJsonValue,
      },
      update: {},
    });
  }
};

// ─── Templates ───────────────────────────────────────────────────────────────

export const findTemplateByEvent = async (instituteId: string, event: string) => {
  return prisma.notificationTemplate.findFirst({
    where: { instituteId, event, status: "ACTIVE" },
  });
};

export const findTemplateById = async (id: string, instituteId?: string) => {
  return prisma.notificationTemplate.findFirst({
    where: { id, ...(instituteId ? { instituteId } : {}) },
  });
};

export const findAllTemplates = async (instituteId: string, status?: string) => {
  return prisma.notificationTemplate.findMany({
    where: { instituteId, ...(status ? { status } : {}) },
    orderBy: { updatedAt: "desc" },
  });
};

export const createTemplate = async (data: {
  instituteId: string;
  name: string;
  event: string;
  providerTemplateName: string;
  language?: string;
  variables: string[];
  category?: string;
  body?: string;
  status?: string;
}) => {
  return prisma.notificationTemplate.create({
    data: {
      instituteId: data.instituteId,
      name: data.name,
      event: data.event,
      providerTemplateName: data.providerTemplateName,
      language: data.language ?? "en",
      variables: data.variables as unknown as Prisma.InputJsonValue,
      category: data.category ?? null,
      body: data.body ?? null,
      status: data.status ?? "ACTIVE",
    },
  });
};

export const updateTemplate = async (
  id: string,
  instituteId: string,
  data: Partial<{
    name: string;
    event: string;
    providerTemplateName: string;
    language: string;
    variables: string[];
    status: string;
    category: string;
    body: string;
  }>
) => {
  return prisma.notificationTemplate.updateMany({
    where: { id, instituteId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.event !== undefined ? { event: data.event } : {}),
      ...(data.providerTemplateName !== undefined
        ? { providerTemplateName: data.providerTemplateName }
        : {}),
      ...(data.language !== undefined ? { language: data.language } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.body !== undefined ? { body: data.body } : {}),
      ...(data.variables
        ? { variables: data.variables as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });
};

export const deleteTemplate = async (id: string, instituteId: string) => {
  return prisma.notificationTemplate.deleteMany({ where: { id, instituteId } });
};

// ─── Rules ───────────────────────────────────────────────────────────────────

export const findRuleByEvent = async (
  instituteId: string,
  event: string,
  channel = "WHATSAPP"
) => {
  return prisma.notificationRule.findFirst({
    where: { instituteId, event, channel },
    include: { template: true },
  });
};

export const findAllRules = async (instituteId: string) => {
  await ensureInstituteAutomationRules(instituteId);
  return prisma.notificationRule.findMany({
    where: { instituteId },
    include: { template: true },
    orderBy: { event: "asc" },
  });
};

export const upsertRule = async (data: {
  instituteId: string;
  event: string;
  channel?: string;
  enabled: boolean;
  templateId?: string | null;
  configuration?: Record<string, unknown>;
}) => {
  const channel = data.channel ?? "WHATSAPP";
  return prisma.notificationRule.upsert({
    where: {
      instituteId_event_channel: {
        instituteId: data.instituteId,
        event: data.event,
        channel,
      },
    },
    create: {
      instituteId: data.instituteId,
      event: data.event,
      channel,
      enabled: data.enabled,
      templateId: data.templateId ?? null,
      configuration: (data.configuration ?? {}) as unknown as Prisma.InputJsonValue,
    },
    update: {
      enabled: data.enabled,
      ...(data.templateId !== undefined ? { templateId: data.templateId } : {}),
      ...(data.configuration !== undefined
        ? { configuration: data.configuration as unknown as Prisma.InputJsonValue }
        : {}),
    },
    include: { template: true },
  });
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const createNotification = async (data: {
  instituteId: string;
  userId?: string;
  studentId?: string;
  branchId?: string;
  event: string;
  channel?: string;
  templateId?: string;
  metadata?: Record<string, unknown>;
  scheduledAt?: Date;
  status?: string;
  skipReason?: string;
  isTest?: boolean;
  title?: string;
  message?: string;
}) => {
  return prisma.notification.create({
    data: {
      instituteId: data.instituteId,
      userId: data.userId,
      studentId: data.studentId,
      branchId: data.branchId,
      event: data.event,
      channel: data.channel ?? "WHATSAPP",
      templateId: data.templateId,
      status: data.status ?? "PENDING",
      skipReason: data.skipReason,
      isTest: data.isTest ?? false,
      title: data.title,
      message: data.message,
      metadata: (data.metadata ?? {}) as unknown as Prisma.InputJsonValue,
      scheduledAt: data.scheduledAt,
    },
  });
};

export const findNotificationById = async (id: string, instituteId?: string) => {
  return prisma.notification.findFirst({
    where: { id, ...(instituteId ? { instituteId } : {}) },
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
  channel?: string;
  isTest?: boolean;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
}) => {
  const {
    page,
    limit,
    instituteId,
    branchId,
    studentId,
    event,
    status,
    channel,
    isTest,
    search,
    fromDate,
    toDate,
  } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.NotificationWhereInput = {
    instituteId,
    ...(channel ? { channel } : {}),
    ...(studentId ? { studentId } : {}),
    ...(event ? { event } : {}),
    ...(status ? { status } : {}),
    ...(typeof isTest === "boolean" ? { isTest } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { message: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
            { errorMessage: { contains: search, mode: "insensitive" } },
            { skipReason: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(branchId
      ? {
          OR: [
            { branchId },
            {
              student: {
                batchEnrollments: {
                  some: { batch: { branchId } },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        template: true,
        student: { include: { user: { select: { name: true, phone: true } } } },
        user: { select: { name: true, phone: true } },
      },
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
    skipReason?: string;
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

export class NotificationRepository {
  static async listNotifications(
    instituteId: string,
    userId: string,
    filters: NotificationQueryFilters = {}
  ): Promise<NotificationListResponse> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const whereCondition: Prisma.NotificationWhereInput = {
      instituteId,
      OR: [{ userId }, { userId: null }],
      channel: { not: "WHATSAPP" },
    };

    if (filters.type) whereCondition.type = filters.type;
    if (filters.unreadOnly) whereCondition.isRead = false;
    if (filters.search) {
      whereCondition.AND = [
        {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { message: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [total, notifications, unreadCount] = await Promise.all([
      prisma.notification.count({ where: whereCondition }),
      prisma.notification.findMany({
        where: whereCondition,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: {
          instituteId,
          OR: [{ userId }, { userId: null }],
          isRead: false,
          channel: { not: "WHATSAPP" },
        },
      }),
    ]);

    if (total === 0 && !filters.search && !filters.type) {
      await this.seedInitialNotifications(instituteId, userId);
      return this.listNotifications(instituteId, userId, filters);
    }

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        instituteId: n.instituteId,
        branchId: n.branchId,
        title: n.title ?? "",
        message: n.message ?? "",
        type: n.type as NotificationType,
        link: n.link,
        isRead: n.isRead,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getUnreadCount(instituteId: string, userId: string): Promise<UnreadCountResponse> {
    const unreadCount = await prisma.notification.count({
      where: {
        instituteId,
        OR: [{ userId }, { userId: null }],
        isRead: false,
        channel: { not: "WHATSAPP" },
      },
    });
    return { unreadCount };
  }

  static async markAsRead(notificationId: string, _userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId },
    });
    if (!notification) throw new Error("Notification not found");

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
    return {
      id: updated.id,
      isRead: updated.isRead,
      readAt: updated.readAt?.toISOString(),
    };
  }

  static async markAllAsRead(instituteId: string, userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        instituteId,
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true, count: result.count };
  }

  static async createNotification(payload: CreateNotificationPayload) {
    return prisma.notification.create({
      data: {
        userId: payload.userId || null,
        instituteId: payload.instituteId,
        branchId: payload.branchId || null,
        title: payload.title,
        message: payload.message,
        type: payload.type || "SYSTEM",
        link: payload.link || null,
        isRead: false,
        channel: "IN_APP",
      },
    });
  }

  static async deleteNotification(notificationId: string, _userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId },
    });
    if (!notification) throw new Error("Notification not found");
    await prisma.notification.delete({ where: { id: notificationId } });
    return { success: true, message: "Notification deleted" };
  }

  private static async seedInitialNotifications(instituteId: string, userId: string) {
    const now = new Date();
    const initialEvents = [
      {
        title: "New Admission Confirmed",
        message: "Student Rahul Sharma has completed enrollment for Full-Stack Web Development batch.",
        type: "ADMISSION" as NotificationType,
        link: "/admin/students",
        createdAt: new Date(now.getTime() - 1000 * 60 * 12),
      },
      {
        title: "Fee Payment Received",
        message: "Received ₹25,000 via UPI for Installment #1 from Priya Patel.",
        type: "PAYMENT" as NotificationType,
        link: "/admin/fees/payments",
        createdAt: new Date(now.getTime() - 1000 * 60 * 45),
      },
    ];

    for (const item of initialEvents) {
      await prisma.notification.create({
        data: {
          instituteId,
          userId,
          title: item.title,
          message: item.message,
          type: item.type,
          link: item.link,
          isRead: false,
          createdAt: item.createdAt,
          channel: "IN_APP",
        },
      });
    }
  }
}
