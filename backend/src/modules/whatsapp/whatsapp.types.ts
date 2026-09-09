/**
 * Types for the WhatsApp notification module.
 *
 * @module modules/whatsapp/whatsapp.types
 */

export interface SendWhatsAppTemplateOptions {
  /** Phone number in E.164 format (+91XXXXXXXXXX) or international without + */
  phone: string;
  /** Recipient display name for personalisation */
  name: string;
  /** Provider template name (MSG91 approved template name) */
  campaignName: string;
  /** Ordered variable values matching the template placeholders ({{1}}, {{2}}, ...) */
  templateParams: string[];
  /** MSG91 template language code (default en) */
  language?: string;
  /** MSG91 template namespace when required by the WABA */
  namespace?: string;
  /** Internal notification id — passed as CRQID for webhook correlation */
  notificationId?: string;
  /** Optional media for templates with a media header */
  media?: {
    url: string;
    filename: string;
  };
  /** When set, resolve MSG91 credentials from institute Integration (else env). */
  instituteId?: string;
}

export interface SendWhatsAppResult {
  /** Provider-assigned message ID (for delivery tracking via webhook) */
  providerMessageId: string;
}

/**
 * WhatsApp provider interface.
 *
 * Provider implementations (MSG91, etc.) must implement this.
 */
export interface IWhatsAppProvider {
  sendTemplate(options: SendWhatsAppTemplateOptions): Promise<SendWhatsAppResult>;
}

export interface TriggerNotificationInput {
  instituteId: string;
  studentId?: string;
  userId?: string;
  event: string;
  templateParams: Record<string, string>;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationFilters {
  branchId?: string;
  studentId?: string;
  event?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

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
