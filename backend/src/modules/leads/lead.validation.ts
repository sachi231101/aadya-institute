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
  "WHATSAPP_SENT",
  "CONVERTED",
  "MARKED_LOST"
]);

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
  source: LeadSourceEnum.default("WALK_IN"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
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
});

export const assignLeadSchema = z.object({
  counsellorId: z.string().min(1, "Counsellor ID is required"),
  notes: z.string().optional(),
});

export const changeLeadStageSchema = z.object({
  stage: LeadStageEnum,
  notes: z.string().optional(),
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

export const createFollowUpSchema = z.object({
  type: FollowUpTypeEnum.optional().default("CALL"),
  scheduledAt: z.string().or(z.date()).transform((val) => new Date(val)),
  notes: z.string().optional(),
});

export const updateFollowUpSchema = z.object({
  status: FollowUpStatusEnum.optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
});

export const addActivitySchema = z.object({
  type: LeadActivityTypeEnum.optional().default("NOTE_ADDED"),
  title: z.string().min(1, "Title is required").trim(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const queryLeadsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  stage: LeadStageEnum.optional(),
  status: LeadStatusEnum.optional(),
  source: LeadSourceEnum.optional(),
  assignedCounsellorId: z.string().optional(),
  courseId: z.string().optional(),
  branchId: z.string().optional(),
  priority: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  followUpFrom: z.string().optional(),
  followUpTo: z.string().optional(),
});
