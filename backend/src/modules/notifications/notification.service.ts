import { NotificationRepository } from "./notification.repository";
import type {
  NotificationListResponse,
  UnreadCountResponse,
  CreateNotificationPayload,
  NotificationQueryFilters,
} from "./notification.types";

export class NotificationService {
  /**
   * List notifications for user with role & branch isolation
   */
  static async getNotifications(
    instituteId: string,
    userId: string,
    filters: NotificationQueryFilters,
    userRoles: string[] = [],
    userBranchId?: string | null
  ): Promise<NotificationListResponse> {
    return NotificationRepository.listNotifications(
      instituteId,
      userId,
      filters,
      userRoles,
      userBranchId
    );
  }

  /**
   * Get unread count with role & branch isolation
   */
  static async getUnreadCount(
    instituteId: string,
    userId: string,
    userRoles: string[] = [],
    userBranchId?: string | null
  ): Promise<UnreadCountResponse> {
    return NotificationRepository.getUnreadCount(
      instituteId,
      userId,
      userRoles,
      userBranchId
    );
  }

  /**
   * Mark single notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    return NotificationRepository.markAsRead(notificationId, userId);
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(
    instituteId: string,
    userId: string,
    userRoles: string[] = [],
    userBranchId?: string | null
  ) {
    return NotificationRepository.markAllAsRead(
      instituteId,
      userId,
      userRoles,
      userBranchId
    );
  }

  /**
   * Create notification helper
   */
  static async createNotification(payload: CreateNotificationPayload) {
    if (!payload.title || !payload.message || !payload.instituteId) {
      throw new Error("Title, message, and instituteId are required");
    }
    return NotificationRepository.createNotification(payload);
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    return NotificationRepository.deleteNotification(notificationId, userId);
  }
}
