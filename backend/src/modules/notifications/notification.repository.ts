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
import { prisma } from "../../config/database";
import type {
  NotificationListResponse,
  UnreadCountResponse,
  CreateNotificationPayload,
  NotificationQueryFilters,
  NotificationType,
} from "./notification.types";

export class NotificationRepository {
  /**
   * Fetch notifications list with filters and pagination
   */
  static async listNotifications(
    instituteId: string,
    userId: string,
    filters: NotificationQueryFilters = {}
  ): Promise<NotificationListResponse> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const whereCondition: any = {
      instituteId,
      OR: [
        { userId: userId },
        { userId: null },
      ],
    };

    if (filters.type) {
      whereCondition.type = filters.type;
    }

    if (filters.unreadOnly) {
      whereCondition.isRead = false;
    }

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
          OR: [{ userId: userId }, { userId: null }],
          isRead: false,
        },
      }),
    ]);

    // If zero notifications exist in database, seed initial system notifications
    if (total === 0 && !filters.search && !filters.type) {
      await this.seedInitialNotifications(instituteId, userId);
      return this.listNotifications(instituteId, userId, filters);
    }

    const formattedItems = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      instituteId: n.instituteId,
      branchId: n.branchId,
      title: n.title,
      message: n.message,
      type: n.type as NotificationType,
      link: n.link,
      isRead: n.isRead,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    }));

    return {
      notifications: formattedItems,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get total unread count for user header badge
   */
  static async getUnreadCount(instituteId: string, userId: string): Promise<UnreadCountResponse> {
    const unreadCount = await prisma.notification.count({
      where: {
        instituteId,
        OR: [{ userId: userId }, { userId: null }],
        isRead: false,
      },
    });

    return { unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      id: updated.id,
      isRead: updated.isRead,
      readAt: updated.readAt?.toISOString(),
    };
  }

  /**
   * Mark all unread notifications as read
   */
  static async markAllAsRead(instituteId: string, userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        instituteId,
        OR: [{ userId: userId }, { userId: null }],
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true, count: result.count };
  }

  /**
   * Create a new notification (used by event triggers)
   */
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
      },
    });
  }

  /**
   * Delete a notification entry
   */
  static async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true, message: "Notification deleted" };
  }

  /**
   * Seed realistic initial system notifications
   */
  private static async seedInitialNotifications(instituteId: string, userId: string) {
    const now = new Date();
    const initialEvents = [
      {
        title: "New Admission Confirmed",
        message: "Student Rahul Sharma has completed enrollment for Full-Stack Web Development batch.",
        type: "ADMISSION" as NotificationType,
        link: "/admin/students",
        createdAt: new Date(now.getTime() - 1000 * 60 * 12), // 12 mins ago
      },
      {
        title: "Fee Payment Received",
        message: "Received ₹25,000 via UPI for Installment #1 from Priya Patel.",
        type: "PAYMENT" as NotificationType,
        link: "/admin/fees/payments",
        createdAt: new Date(now.getTime() - 1000 * 60 * 45), // 45 mins ago
      },
      {
        title: "Attendance Risk Alert",
        message: "Student Vikram Singh missed 3 consecutive theory classes in Data Science batch.",
        type: "DISCONTINUATION_RISK" as NotificationType,
        link: "/admin/students/attendance",
        createdAt: new Date(now.getTime() - 1000 * 60 * 180), // 3 hours ago
      },
      {
        title: "AI Voice Call Completed",
        message: "Lead Ananya Roy indicated high admission intent during Sarvam AI automated call.",
        type: "AI_CALL" as NotificationType,
        link: "/admin/admissions/enquiries",
        createdAt: new Date(now.getTime() - 1000 * 60 * 360), // 6 hours ago
      },
      {
        title: "Class Session Scheduled",
        message: "New Class Session 'React Hooks & State Management' scheduled for tomorrow 10:00 AM.",
        type: "CLASS_SESSION" as NotificationType,
        link: "/admin/courses/batches",
        createdAt: new Date(now.getTime() - 1000 * 60 * 720), // 12 hours ago
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
        },
      });
    }
  }
}
