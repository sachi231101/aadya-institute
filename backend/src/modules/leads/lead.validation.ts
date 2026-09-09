import { z } from "zod";
import { isValidIndianPhone, normalizePhone } from "../../utils/phone";

export const LeadSourceEnum = z.enum([
  "ONLINE",
  "OFFLINE",
  "WALK_IN",
  "PHONE_CALL",
  "WHATSAPP",
  "INSTAGRAM",
  "FACEBOOK",
  "GOOGLE",
  "REFERRAL",
  "AI_CALLING",
  "OTHER"
]);

export const LeadStageEnum = z.enum([
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
  "CONVERTED",
  "LOST"
]);

export const LeadStatusEnum = z.enum([
  "ACTIVE",
  "CONVERTED",
  "LOST",
  "ARCHIVED"
]);

export const LeadLostReasonEnum = z.enum([
  "PRICE_HIGH",
  "NOT_INTERESTED",
  "JOINED_COMPETITOR",
  "NO_RESPONSE",
  "COURSE_NOT_AVAILABLE",
  "LOCATION_ISSUE",
  "TIMING_ISSUE",
  "OTHER"
]);

export const FollowUpTypeEnum = z.enum([
  "CALL",
  "WHATSAPP",
  "MEETING",
  "REMINDER"
]);

export const FollowUpStatusEnum = z.enum([
  "PENDING",
  "COMPLETED",
  "MISSED",
  "CANCELLED"
]);

export const LeadActivityTypeEnum = z.enum([
  "LEAD_CREATED",
  "LEAD_ASSIGNED",
  "STAGE_CHANGED",
  "NOTE_ADDED",
  "FOLLOW_UP_CREATED",
  "FOLLOW_UP_COMPLETED",
  "FOLLOW_UP_MISSED",
  "CALL_COMPLETED",
  "SCORE_UPDATED",
  "WHATSAPP_SENT",
  "CONVERTED",
  "MARKED_LOST",
  "ARCHIVED",
  "MERGED",
]);

export const CallTypeEnum = z.enum(["AI", "MANUAL"]);
export const CallHistoryCallTypeFilterEnum = z.enum(["ALL", "AI", "MANUAL"]);
export const CallHistoryViewEnum = z.enum(["queue", "active", "results"]);
export const ScoreBandEnum = z.enum(["hot", "warm", "cold", "unscored"]);

export const createLeadSchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(2, "Name must be at least 2 characters").max(100)
  ),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .refine(isValidIndianPhone, "Invalid Indian phone number")
    .transform(normalizePhone),
  email: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
      z.string().email("Invalid email format").optional().or(z.literal(""))
    )
    .transform((val) => (val && val.trim().length > 0 ? val : undefined)),
  interestedIn: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1, "Interested in is required")
  ),
  courseId: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined),
      z.string().optional()
    ),
  branchId: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined),
      z.string().optional()
    ),
  assignedCounsellorId: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined),
      z.string().optional()
    ),
  sourceMasterId: z.string().optional(),
  source: z.string().optional(),
  leadTypeMasterId: z.string().optional(),
  stageMasterId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  notes: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined),
      z.string().optional()
    ),
});

export const updateLeadSchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(2).max(100).optional()
  ),
  phoneNumber: z
    .string()
    .refine(isValidIndianPhone, "Invalid Indian phone number")
    .transform(normalizePhone)
    .optional(),
  email: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
      z.string().email("Invalid email format").optional().or(z.literal(""))
    )
    .transform((val) => (val && val.trim().length > 0 ? val : undefined)),
  interestedIn: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1).optional()
  ),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  notes: z.string().optional(),
  sourceMasterId: z.string().optional(),
  leadTypeMasterId: z.string().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  courseId: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined),
      z.string().optional()
    ),
});

export const assignLeadSchema = z.object({
  counsellorId: z.string().min(1, "Counsellor ID is required"),
  notes: z.string().optional(),
});

export const bulkAssignLeadsSchema = z.object({
  leadIds: z.array(z.string().min(1)).min(1).max(100),
  counsellorId: z.string().min(1, "Counsellor ID is required"),
  notes: z.string().optional(),
});

export const mergeLeadsSchema = z.object({
  primaryLeadId: z.string().min(1),
  duplicateLeadId: z.string().min(1),
}).refine((d) => d.primaryLeadId !== d.duplicateLeadId, {
  message: "primaryLeadId and duplicateLeadId must be different",
});

export const updateLeadScoreSchema = z.object({
  leadScore: z.number().int().min(0).max(100).nullable().optional(),
  admissionProbability: z.number().int().min(0).max(100).nullable().optional(),
  nextBestAction: z.string().trim().max(500).nullable().optional(),
}).refine(
  (d) =>
    d.leadScore !== undefined ||
    d.admissionProbability !== undefined ||
    d.nextBestAction !== undefined,
  { message: "At least one of leadScore, admissionProbability, nextBestAction is required" }
);

export const updateLeadTagsSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(50)).max(20),
});

export const createManualCallLogSchema = z.object({
  leadId: z.string().min(1),
  status: z.string().trim().min(1).optional().default("COMPLETED"),
  duration: z.coerce.number().int().min(0).optional().default(0),
  outcome: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  qualification: z.string().trim().max(200).nullable().optional(),
  sentiment: z.string().trim().max(100).nullable().optional(),
  nextAction: z.string().trim().max(500).nullable().optional(),
  interestStatus: z.string().trim().max(100).nullable().optional(),
  startedAt: z.string().or(z.date()).optional().transform((val) => (val ? new Date(val) : undefined)),
  endedAt: z.string().or(z.date()).optional().transform((val) => (val ? new Date(val) : undefined)),
});

export const changeLeadStageSchema = z.object({
  stage: z.string().optional(),
  stageMasterId: z.string().optional(),
  notes: z.string().optional(),
}).refine((d) => d.stageMasterId || d.stage, {
  message: "stageMasterId or stage is required",
});

export const markLeadLostSchema = z.object({
  reason: LeadLostReasonEnum,
  notes: z.string().optional(),
});

export const convertLeadSchema = z.object({
  courseId: z.string().optional(),
  batchId: z.string().optional(),
  feePlan: z.enum(["FULL_PAYMENT", "INSTALLMENT"]).optional().default("INSTALLMENT"),
  notes: z.string().optional(),
  createStudentUser: z.boolean().optional().default(true),
});

export const createApplicationFromLeadSchema = z.object({
  courseId: z.string().optional(),
  branchId: z.string().optional(),
  feeStatus: z.string().optional(),
  notes: z.string().optional(),
});

export const createFollowUpSchema = z.object({
  type: FollowUpTypeEnum.optional().default("CALL"),
  scheduledAt: z.string().or(z.date()).transform((val) => new Date(val)),
  notes: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  counsellorId: z.string().optional(),
});

export const updateFollowUpSchema = z.object({
  status: FollowUpStatusEnum.optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  scheduledAt: z
    .string()
    .or(z.date())
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const addActivitySchema = z.object({
  type: LeadActivityTypeEnum.optional().default("NOTE_ADDED"),
  title: z.string().min(1, "Title is required").trim(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const queryCallHistorySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  branchId: z.string().optional(),
  leadId: z.string().optional(),
  studentId: z.string().optional(),
  status: z.string().optional(),
  statuses: z.string().optional(),
  callType: CallHistoryCallTypeFilterEnum.optional().default("ALL"),
  view: CallHistoryViewEnum.optional(),
});

export const queryLeadsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  stage: z.string().optional(),
  stageMasterId: z.string().optional(),
  status: LeadStatusEnum.optional(),
  source: z.string().optional(),
  sourceMasterId: z.string().optional(),
  assignedCounsellorId: z.string().optional(),
  courseId: z.string().optional(),
  branchId: z.string().optional(),
  priority: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  followUpFrom: z.string().optional(),
  followUpTo: z.string().optional(),
  scoreBand: ScoreBandEnum.optional(),
  unassigned: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => (v === true || v === "true" ? true : v === false || v === "false" ? false : undefined)),
  tag: z.string().trim().optional(),
});
