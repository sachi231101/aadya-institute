export type NotificationType =
  | "ADMISSION"
  | "PAYMENT"
  | "ATTENDANCE"
  | "DISCONTINUATION_RISK"
  | "CLASS_SESSION"
  | "ASSIGNMENT"
  | "AI_CALL"
  | "SYSTEM";

export type CenterManagerModule =
  | "dashboard"
  | "students"
  | "counsellor"
  | "faculty"
  | "fees"
  | "admissions"
  | "courses"
  | "settings";

export type FacultyModule =
  | "dashboard"
  | "courses"
  | "students"
  | "schedule"
  | "assignments"
  | "reports"
  | "settings";

export type StudentModule =
  | "dashboard"
  | "attendance"
  | "schedule"
  | "assignments"
  | "recordings"
  | "settings";

export interface NotificationItem {
  id: string;
  userId?: string | null;
  instituteId: string;
  branchId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  module?: string;
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: any;
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
  module?: string;
  link?: string;
  metadata?: any;
}

export interface NotificationQueryFilters {
  page?: number;
  limit?: number;
  type?: NotificationType;
  module?: string;
  role?: string;
  unreadOnly?: boolean;
  search?: string;
}
