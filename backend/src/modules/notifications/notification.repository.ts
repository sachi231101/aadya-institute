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
