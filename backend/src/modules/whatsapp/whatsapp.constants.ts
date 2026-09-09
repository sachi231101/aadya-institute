/**
 * WhatsApp System Automation V1 — events, statuses, skip reasons, catalog.
 *
 * @module modules/whatsapp/whatsapp.constants
 */

/** V1 system automations (controlled enum — frontend cannot invent types). */
export enum NotificationEvent {
  // Admissions
  STUDENT_WELCOME = "STUDENT_WELCOME",
  STUDENT_BATCH_ASSIGNED = "STUDENT_BATCH_ASSIGNED",
  STUDENT_CREDENTIALS = "STUDENT_CREDENTIALS",

  // Fees
  FEE_DUE_REMINDER = "FEE_DUE_REMINDER",
  FEE_OVERDUE_REMINDER = "FEE_OVERDUE_REMINDER",
  PAYMENT_CONFIRMATION = "PAYMENT_CONFIRMATION",

  // Classes
  CLASS_REMINDER = "CLASS_REMINDER",
  CLASS_CANCELLED = "CLASS_CANCELLED",
  RECORDING_AVAILABLE = "RECORDING_AVAILABLE",

  // Academics
  ASSIGNMENT_CREATED = "ASSIGNMENT_CREATED",
  EXAM_REMINDER = "EXAM_REMINDER",
  RESULT_PUBLISHED = "RESULT_PUBLISHED",

  // Legacy (still accepted by engine if rules exist; not shown in V1 catalog UI)
  FIRST_CLASS = "FIRST_CLASS",
  MODULE_START = "MODULE_START",
  STUDENT_ABSENT = "STUDENT_ABSENT",
  FEEDBACK_REQUESTED = "FEEDBACK_REQUESTED",
  /** @deprecated Use STUDENT_WELCOME */
  ADMISSION_CREATED = "ADMISSION_CREATED",
  /** @deprecated Use STUDENT_BATCH_ASSIGNED */
  BATCH_ASSIGNED = "BATCH_ASSIGNED",
}

/** Events exposed in Communication → WhatsApp → Automations. */
export const SYSTEM_AUTOMATION_EVENTS = [
  NotificationEvent.STUDENT_WELCOME,
  NotificationEvent.STUDENT_BATCH_ASSIGNED,
  NotificationEvent.STUDENT_CREDENTIALS,
  NotificationEvent.FEE_DUE_REMINDER,
  NotificationEvent.FEE_OVERDUE_REMINDER,
  NotificationEvent.PAYMENT_CONFIRMATION,
  NotificationEvent.CLASS_REMINDER,
  NotificationEvent.CLASS_CANCELLED,
  NotificationEvent.RECORDING_AVAILABLE,
  NotificationEvent.ASSIGNMENT_CREATED,
  NotificationEvent.EXAM_REMINDER,
  NotificationEvent.RESULT_PUBLISHED,
] as const;

export type SystemAutomationEvent = (typeof SYSTEM_AUTOMATION_EVENTS)[number];

export const NOTIFICATION_EVENTS = Object.values(NotificationEvent);

/** Map legacy event names to V1 events. */
export const LEGACY_EVENT_ALIASES: Record<string, NotificationEvent> = {
  ADMISSION_CREATED: NotificationEvent.STUDENT_WELCOME,
  BATCH_ASSIGNED: NotificationEvent.STUDENT_BATCH_ASSIGNED,
};

export function normalizeAutomationEvent(event: string): string {
  return LEGACY_EVENT_ALIASES[event] ?? event;
}

export enum NotificationStatus {
  PENDING = "PENDING",
  QUEUED = "QUEUED",
  SENDING = "SENDING",
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  SKIPPED = "SKIPPED",
}

export enum NotificationChannel {
  WHATSAPP = "WHATSAPP",
}

export enum SkipReason {
  GLOBAL_AUTOMATION_DISABLED = "GLOBAL_AUTOMATION_DISABLED",
  AUTOMATION_DISABLED = "AUTOMATION_DISABLED",
  TEMPLATE_MISSING = "TEMPLATE_MISSING",
  TEMPLATE_INACTIVE = "TEMPLATE_INACTIVE",
  PROVIDER_NOT_CONNECTED = "PROVIDER_NOT_CONNECTED",
  MSG91_NOT_CONFIGURED = "MSG91_NOT_CONFIGURED",
  MSG91_AUTH_FAILED = "MSG91_AUTH_FAILED",
  INVALID_PHONE = "INVALID_PHONE",
  MISSING_VARIABLE = "MISSING_VARIABLE",
  DUPLICATE_NOTIFICATION = "DUPLICATE_NOTIFICATION",
  RECIPIENT_OPTED_OUT = "RECIPIENT_OPTED_OUT",
  RECIPIENT_NOT_FOUND = "RECIPIENT_NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  PROVIDER_REJECTED = "PROVIDER_REJECTED",
  BULK_IMPORT_SUPPRESSED = "BULK_IMPORT_SUPPRESSED",
  OTHER = "OTHER",
}

export const NON_RETRIABLE_ERROR_CODES = new Set([
  "INVALID_PHONE",
  "TEMPLATE_NOT_FOUND",
  "TEMPLATE_PAUSED",
  "CAMPAIGN_NOT_FOUND",
  "WHATSAPP_NOT_ENABLED",
  "UNAUTHORIZED",
  "INVALID_API_KEY",
  "PROVIDER_NOT_CONNECTED",
  "MSG91_CONFIGURATION_MISSING",
  "MSG91_AUTHENTICATION_FAILED",
  "MSG91_TEMPLATE_NOT_FOUND",
  "MSG91_TEMPLATE_REJECTED",
  "MSG91_INVALID_RECIPIENT",
]);

export type AutomationCategory = "ADMISSIONS" | "FEES" | "CLASSES" | "ACADEMICS";

export interface SystemAutomationMeta {
  event: SystemAutomationEvent;
  category: AutomationCategory;
  label: string;
  description: string;
  timingLabel: string;
  recipientLabel: string;
  sampleVariables: Record<string, string>;
  defaultConfiguration?: Record<string, unknown>;
}

export const SYSTEM_AUTOMATION_CATALOG: SystemAutomationMeta[] = [
  {
    event: NotificationEvent.STUDENT_WELCOME,
    category: "ADMISSIONS",
    label: "Student Welcome",
    description: "Send WhatsApp when a student admission is confirmed.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      organization_name: "Aadya Institute",
      course_name: "Full Stack Development",
      admission_no: "ADM-2026-001",
    },
  },
  {
    event: NotificationEvent.STUDENT_BATCH_ASSIGNED,
    category: "ADMISSIONS",
    label: "Batch Assigned",
    description: "Notify student when they are assigned to a batch.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      course_name: "Full Stack Development",
    },
  },
  {
    event: NotificationEvent.STUDENT_CREDENTIALS,
    category: "ADMISSIONS",
    label: "Student Credentials",
    description: "Send portal login credentials to the student.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      student_code: "STU-001",
      password: "Aadya@123",
      portal_url: "https://portal.aadya.in/login",
    },
  },
  {
    event: NotificationEvent.FEE_DUE_REMINDER,
    category: "FEES",
    label: "Fee Due Reminder",
    description: "Remind student before a fee installment is due.",
    timingLabel: "1 day before due date",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      amount: "15000",
      due_date: "15 Sep 2026",
      course_name: "Full Stack Development",
    },
    defaultConfiguration: { daysBeforeDue: 1 },
  },
  {
    event: NotificationEvent.FEE_OVERDUE_REMINDER,
    category: "FEES",
    label: "Fee Overdue Reminder",
    description: "Remind student when a fee installment is overdue.",
    timingLabel: "Daily while overdue",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      amount: "15000",
      due_date: "10 Sep 2026",
      course_name: "Full Stack Development",
    },
  },
  {
    event: NotificationEvent.PAYMENT_CONFIRMATION,
    category: "FEES",
    label: "Payment Confirmation",
    description: "Confirm successful fee payment via WhatsApp.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      amount: "15000",
      receipt_no: "RCP-001",
      course_name: "Full Stack Development",
    },
  },
  {
    event: NotificationEvent.CLASS_REMINDER,
    category: "CLASSES",
    label: "Class Reminder",
    description: "Remind enrolled students before a scheduled class.",
    timingLabel: "2 hours before",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      start_time: "10:00 AM",
      classroom: "Lab 2",
    },
    defaultConfiguration: { offsetMinutes: -120 },
  },
  {
    event: NotificationEvent.CLASS_CANCELLED,
    category: "CLASSES",
    label: "Class Cancelled",
    description: "Notify students when a class session is cancelled.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      class_date: "12 Sep 2026",
      start_time: "10:00 AM",
    },
  },
  {
    event: NotificationEvent.RECORDING_AVAILABLE,
    category: "CLASSES",
    label: "Recording Available",
    description: "Notify students when a class recording is ready.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      class_title: "React Hooks",
    },
  },
  {
    event: NotificationEvent.ASSIGNMENT_CREATED,
    category: "ACADEMICS",
    label: "Assignment Created",
    description: "Notify students when a new assignment is published.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      assignment_title: "Build a Todo App",
      due_date: "20 Sep 2026",
    },
  },
  {
    event: NotificationEvent.EXAM_REMINDER,
    category: "ACADEMICS",
    label: "Exam Reminder",
    description: "Remind students before an upcoming exam.",
    timingLabel: "1 day before",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      exam_name: "Module 1 Assessment",
      exam_date: "18 Sep 2026",
      start_time: "11:00 AM",
    },
    defaultConfiguration: { daysBefore: 1 },
  },
  {
    event: NotificationEvent.RESULT_PUBLISHED,
    category: "ACADEMICS",
    label: "Result Published",
    description: "Notify students when exam results are published.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    sampleVariables: {
      student_name: "Rahul Sharma",
      exam_name: "Module 1 Assessment",
      score: "42",
      max_score: "50",
    },
  },
];

export const getAutomationMeta = (event: string): SystemAutomationMeta | undefined =>
  SYSTEM_AUTOMATION_CATALOG.find((a) => a.event === event);

/**
 * Idempotency key builders per event.
 */
export const buildIdempotencyKey = {
  [NotificationEvent.CLASS_REMINDER]: (studentId: string, sessionId: string, date: string) =>
    `CLASS_REMINDER:${studentId}:${sessionId}:${date}`,

  [NotificationEvent.CLASS_CANCELLED]: (studentId: string, sessionId: string) =>
    `CLASS_CANCELLED:${studentId}:${sessionId}`,

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

  [NotificationEvent.STUDENT_WELCOME]: (studentId: string, admissionId: string) =>
    `STUDENT_WELCOME:${studentId}:${admissionId}`,

  [NotificationEvent.ADMISSION_CREATED]: (studentId: string, admissionId: string) =>
    `STUDENT_WELCOME:${studentId}:${admissionId}`,

  [NotificationEvent.STUDENT_BATCH_ASSIGNED]: (studentId: string, batchId: string) =>
    `STUDENT_BATCH_ASSIGNED:${studentId}:${batchId}`,

  [NotificationEvent.BATCH_ASSIGNED]: (studentId: string, batchId: string) =>
    `STUDENT_BATCH_ASSIGNED:${studentId}:${batchId}`,

  [NotificationEvent.STUDENT_CREDENTIALS]: (studentId: string, stamp: string) =>
    `STUDENT_CREDENTIALS:${studentId}:${stamp}`,

  [NotificationEvent.RECORDING_AVAILABLE]: (studentId: string, recordingId: string) =>
    `RECORDING_AVAILABLE:${studentId}:${recordingId}`,

  [NotificationEvent.FEE_DUE_REMINDER]: (studentId: string, pendingFeeId: string, date: string) =>
    `FEE_DUE_REMINDER:${studentId}:${pendingFeeId}:${date}`,

  [NotificationEvent.FEE_OVERDUE_REMINDER]: (studentId: string, pendingFeeId: string, date: string) =>
    `FEE_OVERDUE_REMINDER:${studentId}:${pendingFeeId}:${date}`,

  [NotificationEvent.PAYMENT_CONFIRMATION]: (studentId: string, paymentId: string) =>
    `PAYMENT_CONFIRMATION:${studentId}:${paymentId}`,

  [NotificationEvent.EXAM_REMINDER]: (studentId: string, examId: string, date: string) =>
    `EXAM_REMINDER:${studentId}:${examId}:${date}`,

  [NotificationEvent.RESULT_PUBLISHED]: (studentId: string, attemptId: string) =>
    `RESULT_PUBLISHED:${studentId}:${attemptId}`,
};
