import { api } from "./api";

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

export interface NotificationFilters {
  page?: number;
  limit?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
  search?: string;
}

export const notificationsApi = {
  getNotifications: async (filters: NotificationFilters = {}): Promise<NotificationListResponse> => {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit));
    if (filters.type) params.append("type", filters.type);
    if (filters.unreadOnly) params.append("unreadOnly", "true");
    if (filters.search) params.append("search", filters.search);

    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data.data;
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await api.get("/notifications/unread-count");
    return response.data.data;
  },

  markAsRead: async (notificationId: string) => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch("/notifications/read-all");
    return response.data.data;
  },

  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data.data;
  },
};
