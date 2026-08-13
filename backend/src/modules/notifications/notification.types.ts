export type NotificationType =
  | "ADMISSION"
  | "PAYMENT"
  | "ATTENDANCE"
  | "DISCONTINUATION_RISK"
  | "CLASS_SESSION"
  | "ASSIGNMENT"
  | "AI_CALL"
  | "SYSTEM";

export interface NotificationItem {
  id: string;
  userId?: string | null;
  instituteId: string;
  branchId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface CreateNotificationPayload {
  userId?: string;
  instituteId: string;
  branchId?: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

export interface NotificationQueryFilters {
  page?: number;
  limit?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
  search?: string;
}
