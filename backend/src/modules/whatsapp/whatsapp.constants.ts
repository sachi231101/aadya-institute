/**
 * WhatsApp Notification constants — events, statuses, channels, and idempotency keys.
 *
 * @module modules/whatsapp/whatsapp.constants
 */

export enum NotificationEvent {
  // Class & Session events
  CLASS_REMINDER = "CLASS_REMINDER",
  FIRST_CLASS = "FIRST_CLASS",
  MODULE_START = "MODULE_START",

  // Attendance events
  STUDENT_ABSENT = "STUDENT_ABSENT",

  // Feedback events
  FEEDBACK_REQUESTED = "FEEDBACK_REQUESTED",

  // Assignment events
  ASSIGNMENT_CREATED = "ASSIGNMENT_CREATED",

  // Admissions & Enrollment events
  ADMISSION_CREATED = "ADMISSION_CREATED",
  BATCH_ASSIGNED = "BATCH_ASSIGNED",

  // Recording events
  RECORDING_AVAILABLE = "RECORDING_AVAILABLE",
}

export const NOTIFICATION_EVENTS = Object.values(NotificationEvent);

export enum NotificationStatus {
  PENDING = "PENDING",       // Created, not yet queued
  QUEUED = "QUEUED",         // Added to BullMQ
  SENDING = "SENDING",       // Worker is actively calling provider
  SENT = "SENT",             // Provider accepted the message
  DELIVERED = "DELIVERED",   // WhatsApp delivered to recipient device
  READ = "READ",             // Recipient opened the message
  FAILED = "FAILED",         // Final failure (no more retries)
  CANCELLED = "CANCELLED",   // Manually cancelled or skipped
}

export enum NotificationChannel {
  WHATSAPP = "WHATSAPP",
}

/**
 * Non-retriable provider error codes (HTTP 400 / business errors).
 * Do NOT retry these — mark immediately as FAILED.
 */
export const NON_RETRIABLE_ERROR_CODES = new Set([
  "INVALID_PHONE",
  "TEMPLATE_NOT_FOUND",
  "TEMPLATE_PAUSED",
  "CAMPAIGN_NOT_FOUND",
  "WHATSAPP_NOT_ENABLED",
  "UNAUTHORIZED",
  "INVALID_API_KEY",
]);

/**
 * Idempotency key builders per event.
 * Ensures duplicate notifications are never queued.
 */
export const buildIdempotencyKey = {
  [NotificationEvent.CLASS_REMINDER]: (studentId: string, sessionId: string, date: string) =>
    `CLASS_REMINDER:${studentId}:${sessionId}:${date}`,

  [NotificationEvent.FIRST_CLASS]: (studentId: string, sessionId: string) =>
    `FIRST_CLASS:${studentId}:${sessionId}`,

  [NotificationEvent.MODULE_START]: (studentId: string, batchModuleId: string) =>
    `MODULE_START:${studentId}:${batchModuleId}`,

  [NotificationEvent.STUDENT_ABSENT]: (studentId: string, sessionId: string) =>
    `STUDENT_ABSENT:${studentId}:${sessionId}`,

  [NotificationEvent.FEEDBACK_REQUESTED]: (studentId: string, sessionId: string) =>
    `FEEDBACK_REQUESTED:${studentId}:${sessionId}`,

  [NotificationEvent.ASSIGNMENT_CREATED]: (studentId: string, assignmentId: string) =>
    `ASSIGNMENT_CREATED:${studentId}:${assignmentId}`,

  [NotificationEvent.ADMISSION_CREATED]: (studentId: string, admissionId: string) =>
    `ADMISSION_CREATED:${studentId}:${admissionId}`,

  [NotificationEvent.BATCH_ASSIGNED]: (studentId: string, batchId: string) =>
    `BATCH_ASSIGNED:${studentId}:${batchId}`,

  [NotificationEvent.RECORDING_AVAILABLE]: (studentId: string, recordingId: string) =>
    `RECORDING_AVAILABLE:${studentId}:${recordingId}`,
};
