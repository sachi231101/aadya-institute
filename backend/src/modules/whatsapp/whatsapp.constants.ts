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
  BATCH_TRANSFERRED = "BATCH_TRANSFERRED",
  COURSE_COMPLETED = "COURSE_COMPLETED",

  // Fees
  FEE_DUE_REMINDER = "FEE_DUE_REMINDER",
  FEE_OVERDUE_REMINDER = "FEE_OVERDUE_REMINDER",
  PAYMENT_CONFIRMATION = "PAYMENT_CONFIRMATION",
  PARTIAL_PAYMENT_CONFIRMATION = "PARTIAL_PAYMENT_CONFIRMATION",
  FEE_RECEIPT = "FEE_RECEIPT",
  CONCESSION_APPLIED = "CONCESSION_APPLIED",

  // Classes
  CLASS_REMINDER = "CLASS_REMINDER",
  CLASS_CANCELLED = "CLASS_CANCELLED",
  CLASS_RESCHEDULED = "CLASS_RESCHEDULED",
  RECORDING_AVAILABLE = "RECORDING_AVAILABLE",
  FIRST_CLASS = "FIRST_CLASS",
  MODULE_START = "MODULE_START",
  STUDENT_ABSENT = "STUDENT_ABSENT",
  FEEDBACK_REQUESTED = "FEEDBACK_REQUESTED",
  LEAVE_STATUS_UPDATED = "LEAVE_STATUS_UPDATED",

  // Academics
  ASSIGNMENT_CREATED = "ASSIGNMENT_CREATED",
  ASSIGNMENT_DUE_REMINDER = "ASSIGNMENT_DUE_REMINDER",
  ASSIGNMENT_GRADED = "ASSIGNMENT_GRADED",
  EXAM_REMINDER = "EXAM_REMINDER",
  RESULT_PUBLISHED = "RESULT_PUBLISHED",

  // Risk / engagement
  DISCONTINUATION_RISK = "DISCONTINUATION_RISK",
  BIRTHDAY_GREETING = "BIRTHDAY_GREETING",

  // Leads / counsellor
  LEAD_FOLLOWUP_REMINDER = "LEAD_FOLLOWUP_REMINDER",
  DEMO_SCHEDULED = "DEMO_SCHEDULED",
  AI_CALL_SUMMARY_READY = "AI_CALL_SUMMARY_READY",

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
  NotificationEvent.BATCH_TRANSFERRED,
  NotificationEvent.COURSE_COMPLETED,
  NotificationEvent.FEE_DUE_REMINDER,
  NotificationEvent.FEE_OVERDUE_REMINDER,
  NotificationEvent.PAYMENT_CONFIRMATION,
  NotificationEvent.PARTIAL_PAYMENT_CONFIRMATION,
  NotificationEvent.FEE_RECEIPT,
  NotificationEvent.CONCESSION_APPLIED,
  NotificationEvent.CLASS_REMINDER,
  NotificationEvent.CLASS_CANCELLED,
  NotificationEvent.CLASS_RESCHEDULED,
  NotificationEvent.RECORDING_AVAILABLE,
  NotificationEvent.FIRST_CLASS,
  NotificationEvent.MODULE_START,
  NotificationEvent.STUDENT_ABSENT,
  NotificationEvent.FEEDBACK_REQUESTED,
  NotificationEvent.LEAVE_STATUS_UPDATED,
  NotificationEvent.ASSIGNMENT_CREATED,
  NotificationEvent.ASSIGNMENT_DUE_REMINDER,
  NotificationEvent.ASSIGNMENT_GRADED,
  NotificationEvent.EXAM_REMINDER,
  NotificationEvent.RESULT_PUBLISHED,
  NotificationEvent.DISCONTINUATION_RISK,
  NotificationEvent.BIRTHDAY_GREETING,
  NotificationEvent.LEAD_FOLLOWUP_REMINDER,
  NotificationEvent.DEMO_SCHEDULED,
  NotificationEvent.AI_CALL_SUMMARY_READY,
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
  "MSG91_NUMBER_FETCH_FAILED",
]);

export type AutomationCategory =
  | "ADMISSIONS"
  | "FEES"
  | "CLASSES"
  | "ACADEMICS"
  | "RISK"
  | "ENGAGEMENT"
  | "LEADS";

/** How admins can customize send timing in Automations UI. */
export type AutomationTimingMode =
  | "immediate" // optional delayMinutes after event (0 = now)
  | "hours_before" // offsetMinutes before event (stored negative)
  | "days_before_due" // daysBeforeDue for fee installments
  | "days_before" // daysBefore for exams / assignment due
  | "fixed"; // not editable (e.g. daily overdue)

export interface SystemAutomationMeta {
  event: SystemAutomationEvent;
  category: AutomationCategory;
  label: string;
  description: string;
  timingLabel: string;
  recipientLabel: string;
  sampleVariables: Record<string, string>;
  defaultConfiguration?: Record<string, unknown>;
  timingMode?: AutomationTimingMode;
}

export const SYSTEM_AUTOMATION_CATALOG: SystemAutomationMeta[] = [
  {
    event: NotificationEvent.STUDENT_WELCOME,
    category: "ADMISSIONS",
    label: "Student Welcome",
    description: "Send WhatsApp when a student admission is confirmed.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
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
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      course_name: "Full Stack Development",
      batch_date: "15 Sep 2026",
      batch_start_date: "15 Sep 2026",
      time_slot: "10:00 AM - 12:00 PM",
    },
  },
  {
    event: NotificationEvent.STUDENT_CREDENTIALS,
    category: "ADMISSIONS",
    label: "Student Credentials",
    description: "Send portal login credentials to the student.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      student_code: "STU-001",
      password: "Aadya@123",
      portal_url: "https://portal.aadya.in/login",
    },
  },
  {
    event: NotificationEvent.BATCH_TRANSFERRED,
    category: "ADMISSIONS",
    label: "Batch Transfer",
    description: "Notify student when they are transferred to another batch.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      from_batch_name: "FS-MWF-Morning",
      to_batch_name: "FS-TTS-Evening",
      course_name: "Full Stack Development",
      batch_date: "20 Sep 2026",
    },
  },
  {
    event: NotificationEvent.COURSE_COMPLETED,
    category: "ADMISSIONS",
    label: "Course Completed",
    description: "Congratulate student when course/batch status is marked completed.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      course_name: "Full Stack Development",
      batch_name: "FS-MWF-Morning",
    },
  },
  {
    event: NotificationEvent.FEE_DUE_REMINDER,
    category: "FEES",
    label: "Fee Due Reminder",
    description: "Remind student before a fee installment is due.",
    timingLabel: "3 days before due date",
    recipientLabel: "Student",
    timingMode: "days_before_due",
    sampleVariables: {
      student_name: "Rahul Sharma",
      amount: "15000",
      due_date: "15 Sep 2026",
      course_name: "Full Stack Development",
    },
    defaultConfiguration: { daysBeforeDue: 3 },
  },
  {
    event: NotificationEvent.FEE_OVERDUE_REMINDER,
    category: "FEES",
    label: "Fee Overdue Reminder",
    description: "Remind student when a fee installment is overdue.",
    timingLabel: "Daily while overdue",
    recipientLabel: "Student",
    timingMode: "fixed",
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
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      amount: "15000",
      receipt_no: "RCP-001",
      course_name: "Full Stack Development",
    },
  },
  {
    event: NotificationEvent.PARTIAL_PAYMENT_CONFIRMATION,
    category: "FEES",
    label: "Partial Payment Confirmation",
    description: "Confirm a partial fee payment and remaining balance.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      amount: "5000",
      remaining_amount: "10000",
      receipt_no: "RCP-001",
      course_name: "Full Stack Development",
    },
  },
  {
    event: NotificationEvent.FEE_RECEIPT,
    category: "FEES",
    label: "Fee Receipt",
    description: "Send fee receipt details after a successful payment.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      amount: "15000",
      receipt_no: "RCP-001",
      payment_date: "15 Sep 2026",
      course_name: "Full Stack Development",
    },
  },
  {
    event: NotificationEvent.CONCESSION_APPLIED,
    category: "FEES",
    label: "Concession Applied",
    description: "Notify student when a fee concession or scholarship is applied.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      concession_amount: "2000",
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
    timingMode: "hours_before",
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      start_time: "10:00 AM",
      classroom: "Lab 2",
    },
    defaultConfiguration: { offsetMinutes: -120, includeFaculty: false },
  },
  {
    event: NotificationEvent.CLASS_CANCELLED,
    category: "CLASSES",
    label: "Class Cancelled",
    description: "Notify students when a class session is cancelled.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      class_date: "12 Sep 2026",
      start_time: "10:00 AM",
    },
  },
  {
    event: NotificationEvent.CLASS_RESCHEDULED,
    category: "CLASSES",
    label: "Class Rescheduled",
    description: "Notify students when class date or time is changed.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      old_date: "12 Sep 2026",
      new_date: "13 Sep 2026",
      old_time: "10:00 AM",
      new_time: "11:00 AM",
    },
  },
  {
    event: NotificationEvent.RECORDING_AVAILABLE,
    category: "CLASSES",
    label: "Recording Available",
    description: "Notify students when a class recording is ready.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      class_title: "React Hooks",
    },
  },
  {
    event: NotificationEvent.FIRST_CLASS,
    category: "CLASSES",
    label: "First Class",
    description: "Send rules, regulations, and joining instructions for the first class.",
    timingLabel: "Around first class",
    recipientLabel: "Student",
    timingMode: "fixed",
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      start_time: "10:00 AM",
      classroom: "Lab 2",
    },
  },
  {
    event: NotificationEvent.MODULE_START,
    category: "CLASSES",
    label: "Module Start",
    description: "Notify students when a new batch module is about to start.",
    timingLabel: "Around module start",
    recipientLabel: "Student",
    timingMode: "fixed",
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      module_name: "React Fundamentals",
    },
  },
  {
    event: NotificationEvent.STUDENT_ABSENT,
    category: "RISK",
    label: "Absence Alert",
    description: "Notify student when marked ABSENT for a class.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      date: "15 Sep 2026",
    },
  },
  {
    event: NotificationEvent.FEEDBACK_REQUESTED,
    category: "ENGAGEMENT",
    label: "Feedback Request",
    description: "Ask students for class feedback after the session ends.",
    timingLabel: "After class",
    recipientLabel: "Student",
    timingMode: "fixed",
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      class_title: "React Hooks",
      feedback_link: "https://portal.aadya.in/feedback",
    },
  },
  {
    event: NotificationEvent.LEAVE_STATUS_UPDATED,
    category: "CLASSES",
    label: "Leave Marked",
    description: "Confirm when attendance is marked as LEAVE for a class.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      date: "15 Sep 2026",
      status: "LEAVE",
    },
  },
  {
    event: NotificationEvent.ASSIGNMENT_CREATED,
    category: "ACADEMICS",
    label: "Assignment Created",
    description: "Notify students when a new assignment is published.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      assignment_title: "Build a Todo App",
      due_date: "20 Sep 2026",
    },
  },
  {
    event: NotificationEvent.ASSIGNMENT_DUE_REMINDER,
    category: "ACADEMICS",
    label: "Assignment Due Reminder",
    description: "Remind students before an assignment due date.",
    timingLabel: "1 day before",
    recipientLabel: "Student",
    timingMode: "days_before",
    defaultConfiguration: { daysBefore: 1 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      assignment_title: "Build a Todo App",
      due_date: "20 Sep 2026",
    },
  },
  {
    event: NotificationEvent.ASSIGNMENT_GRADED,
    category: "ACADEMICS",
    label: "Assignment Graded",
    description: "Notify student when assignment marks/feedback are published.",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      assignment_title: "Build a Todo App",
      marks: "42",
      max_marks: "50",
    },
  },
  {
    event: NotificationEvent.EXAM_REMINDER,
    category: "ACADEMICS",
    label: "Exam Reminder",
    description: "Remind students before an upcoming exam.",
    timingLabel: "1 day before",
    recipientLabel: "Student",
    timingMode: "days_before",
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
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      exam_name: "Module 1 Assessment",
      score: "42",
      max_score: "50",
    },
  },
  {
    event: NotificationEvent.DISCONTINUATION_RISK,
    category: "RISK",
    label: "Discontinuation Risk",
    description: "Alert after 3 consecutive theory absences (student).",
    timingLabel: "Immediately",
    recipientLabel: "Student",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      student_name: "Rahul Sharma",
      batch_name: "FS-MWF-Morning",
      consecutive_absences: "3",
    },
  },
  {
    event: NotificationEvent.BIRTHDAY_GREETING,
    category: "ENGAGEMENT",
    label: "Birthday Greeting",
    description: "Send birthday wishes to students on their date of birth.",
    timingLabel: "On birthday",
    recipientLabel: "Student",
    timingMode: "fixed",
    sampleVariables: {
      student_name: "Rahul Sharma",
      organization_name: "Aadya Institute",
    },
  },
  {
    event: NotificationEvent.LEAD_FOLLOWUP_REMINDER,
    category: "LEADS",
    label: "Lead Follow-up Reminder",
    description: "Remind counsellor of upcoming lead follow-ups.",
    timingLabel: "Same day / due",
    recipientLabel: "Counsellor",
    timingMode: "fixed",
    sampleVariables: {
      counsellor_name: "Priya",
      lead_name: "Amit Kumar",
      followup_time: "4:00 PM",
      lead_phone: "9876543210",
    },
  },
  {
    event: NotificationEvent.DEMO_SCHEDULED,
    category: "LEADS",
    label: "Demo / Counselling Scheduled",
    description: "Confirm demo or counselling appointment to the lead.",
    timingLabel: "Immediately",
    recipientLabel: "Lead",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      lead_name: "Amit Kumar",
      scheduled_at: "16 Sep 2026 4:00 PM",
      course_name: "Full Stack Development",
      counsellor_name: "Priya",
    },
  },
  {
    event: NotificationEvent.AI_CALL_SUMMARY_READY,
    category: "LEADS",
    label: "AI Call Summary Ready",
    description: "Notify counsellor when an AI call completes with a summary.",
    timingLabel: "Immediately",
    recipientLabel: "Counsellor",
    timingMode: "immediate",
    defaultConfiguration: { delayMinutes: 0 },
    sampleVariables: {
      counsellor_name: "Priya",
      lead_name: "Amit Kumar",
      call_status: "COMPLETED",
      summary: "Interested in weekend batch; requested fee details.",
    },
  },
];

export const getAutomationMeta = (event: string): SystemAutomationMeta | undefined =>
  SYSTEM_AUTOMATION_CATALOG.find((a) => a.event === event);

/** Build a human-readable timing label from rule configuration. */
export const formatAutomationTimingLabel = (
  event: string,
  configuration?: Record<string, unknown> | null
): string => {
  const meta = getAutomationMeta(event);
  const cfg = {
    ...(meta?.defaultConfiguration || {}),
    ...(configuration || {}),
  };
  const mode = meta?.timingMode || "fixed";

  if (mode === "immediate") {
    const delay = Number(cfg.delayMinutes);
    if (Number.isFinite(delay) && delay > 0) {
      if (delay % 60 === 0) {
        const hours = delay / 60;
        return hours === 1 ? "1 hour after event" : `${hours} hours after event`;
      }
      return `${delay} minutes after event`;
    }
    return "Immediately";
  }

  if (mode === "hours_before") {
    const offset = Number(cfg.offsetMinutes);
    const minutesBefore = Number.isFinite(offset) ? Math.abs(offset) : 120;
    if (minutesBefore % 60 === 0) {
      const hours = minutesBefore / 60;
      return hours === 1 ? "1 hour before" : `${hours} hours before`;
    }
    return `${minutesBefore} minutes before`;
  }

  if (mode === "days_before_due") {
    const days = Number(cfg.daysBeforeDue);
    const n = Number.isFinite(days) && days >= 0 ? Math.floor(days) : 3;
    return n === 1 ? "1 day before due date" : `${n} days before due date`;
  }

  if (mode === "days_before") {
    const days = Number(cfg.daysBefore);
    const n = Number.isFinite(days) && days >= 0 ? Math.floor(days) : 1;
    return n === 1 ? "1 day before" : `${n} days before`;
  }

  return meta?.timingLabel || "Scheduled";
};

/**
 * Idempotency key builders per event.
 */
export const buildIdempotencyKey = {
  [NotificationEvent.CLASS_REMINDER]: (recipientId: string, sessionId: string, date: string) =>
    `CLASS_REMINDER:${recipientId}:${sessionId}:${date}`,

  [NotificationEvent.CLASS_CANCELLED]: (studentId: string, sessionId: string) =>
    `CLASS_CANCELLED:${studentId}:${sessionId}`,

  [NotificationEvent.CLASS_RESCHEDULED]: (studentId: string, sessionId: string, stamp: string) =>
    `CLASS_RESCHEDULED:${studentId}:${sessionId}:${stamp}`,

  [NotificationEvent.FIRST_CLASS]: (studentId: string, sessionId: string) =>
    `FIRST_CLASS:${studentId}:${sessionId}`,

  [NotificationEvent.MODULE_START]: (studentId: string, batchModuleId: string) =>
    `MODULE_START:${studentId}:${batchModuleId}`,

  [NotificationEvent.STUDENT_ABSENT]: (studentId: string, sessionId: string) =>
    `STUDENT_ABSENT:${studentId}:${sessionId}`,

  [NotificationEvent.FEEDBACK_REQUESTED]: (studentId: string, sessionId: string) =>
    `FEEDBACK_REQUESTED:${studentId}:${sessionId}`,

  [NotificationEvent.LEAVE_STATUS_UPDATED]: (studentId: string, sessionId: string) =>
    `LEAVE_STATUS_UPDATED:${studentId}:${sessionId}`,

  [NotificationEvent.ASSIGNMENT_CREATED]: (studentId: string, assignmentId: string) =>
    `ASSIGNMENT_CREATED:${studentId}:${assignmentId}`,

  [NotificationEvent.ASSIGNMENT_DUE_REMINDER]: (studentId: string, assignmentId: string, date: string) =>
    `ASSIGNMENT_DUE_REMINDER:${studentId}:${assignmentId}:${date}`,

  [NotificationEvent.ASSIGNMENT_GRADED]: (studentId: string, submissionId: string) =>
    `ASSIGNMENT_GRADED:${studentId}:${submissionId}`,

  [NotificationEvent.STUDENT_WELCOME]: (studentId: string, admissionId: string) =>
    `STUDENT_WELCOME:${studentId}:${admissionId}`,

  [NotificationEvent.ADMISSION_CREATED]: (studentId: string, admissionId: string) =>
    `STUDENT_WELCOME:${studentId}:${admissionId}`,

  [NotificationEvent.STUDENT_BATCH_ASSIGNED]: (studentId: string, batchId: string) =>
    `STUDENT_BATCH_ASSIGNED:${studentId}:${batchId}`,

  [NotificationEvent.BATCH_ASSIGNED]: (studentId: string, batchId: string) =>
    `STUDENT_BATCH_ASSIGNED:${studentId}:${batchId}`,

  [NotificationEvent.BATCH_TRANSFERRED]: (studentId: string, fromBatchId: string, toBatchId: string) =>
    `BATCH_TRANSFERRED:${studentId}:${fromBatchId}:${toBatchId}`,

  [NotificationEvent.COURSE_COMPLETED]: (studentId: string, stamp: string) =>
    `COURSE_COMPLETED:${studentId}:${stamp}`,

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

  [NotificationEvent.PARTIAL_PAYMENT_CONFIRMATION]: (studentId: string, paymentId: string) =>
    `PARTIAL_PAYMENT_CONFIRMATION:${studentId}:${paymentId}`,

  [NotificationEvent.FEE_RECEIPT]: (studentId: string, paymentId: string) =>
    `FEE_RECEIPT:${studentId}:${paymentId}`,

  [NotificationEvent.CONCESSION_APPLIED]: (studentId: string, stamp: string) =>
    `CONCESSION_APPLIED:${studentId}:${stamp}`,

  [NotificationEvent.EXAM_REMINDER]: (studentId: string, examId: string, date: string) =>
    `EXAM_REMINDER:${studentId}:${examId}:${date}`,

  [NotificationEvent.RESULT_PUBLISHED]: (studentId: string, attemptId: string) =>
    `RESULT_PUBLISHED:${studentId}:${attemptId}`,

  [NotificationEvent.DISCONTINUATION_RISK]: (studentId: string, batchId: string, date: string) =>
    `DISCONTINUATION_RISK:${studentId}:${batchId}:${date}`,

  [NotificationEvent.BIRTHDAY_GREETING]: (studentId: string, date: string) =>
    `BIRTHDAY_GREETING:${studentId}:${date}`,

  [NotificationEvent.LEAD_FOLLOWUP_REMINDER]: (counsellorUserId: string, followUpId: string, date: string) =>
    `LEAD_FOLLOWUP_REMINDER:${counsellorUserId}:${followUpId}:${date}`,

  [NotificationEvent.DEMO_SCHEDULED]: (leadId: string, followUpId: string) =>
    `DEMO_SCHEDULED:${leadId}:${followUpId}`,

  [NotificationEvent.AI_CALL_SUMMARY_READY]: (callId: string) =>
    `AI_CALL_SUMMARY_READY:${callId}`,
};
