import { z } from "zod";

export const TargetPeriodEnum = z.enum([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "CUSTOM",
]);

export const TargetStatusEnum = z.enum([
  "DRAFT",
  "PUBLISHED",
  "ACTIVE",
  "COMPLETED",
  "LOCKED",
  "CANCELLED",
]);

export const TargetMetricEnum = z.enum([
  "LEADS_CREATED",
  "LEADS_CONTACTED",
  "FOLLOW_UPS",
  "QUALIFIED_LEADS",
  "COUNSELLING_SESSIONS",
  "DEMO_SESSIONS",
  "ADMISSIONS",
  "CONVERTED_LEADS",
  "ADMISSION_REVENUE",
  "FEE_COLLECTION",
]);

export const TargetTypeEnum = z.enum(["INDIVIDUAL", "BRANCH"]);

export const IncentiveTypeEnum = z.enum(["FIXED", "SLAB", "PERCENTAGE"]);

export const IncentiveStatusEnum = z.enum([
  "CALCULATED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "PAYROLL_PROCESSED",
  "PAID",
  "CANCELLED",
]);

const IncentiveSlabSchema = z.object({
  minPercent: z.number().min(0, "Minimum percent must be at least 0"),
  maxPercent: z.number().min(0, "Maximum percent must be at least 0"),
  amount: z.number().min(0, "Amount must be at least 0"),
});

const IncentivePercentageTierSchema = z.object({
  minPercent: z.number().min(0, "Minimum percent must be at least 0"),
  maxPercent: z.number().min(0, "Maximum percent must be at least 0"),
  ratePercent: z.number().min(0, "Rate percent must be at least 0"),
});

const IncentiveRuleInputSchema = z.object({
  incentiveType: IncentiveTypeEnum,
  fixedAmount: z.number().min(0).optional(),
  slabs: z.array(IncentiveSlabSchema).optional(),
  percentages: z.array(IncentivePercentageTierSchema).optional(),
});

export const CreateTargetPlanSchema = z
  .object({
    branchId: z.string().optional(),
    name: z.string().min(2, "Plan name must be at least 2 characters").max(100),
    description: z.string().max(500).optional(),
    periodType: TargetPeriodEnum.default("MONTHLY"),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "Start date must be before or equal to end date",
    path: ["startDate"],
  });

export const UpdateTargetPlanSchema = z.object({
  branchId: z.string().optional(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  periodType: TargetPeriodEnum.optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  status: TargetStatusEnum.optional(),
});

export const CreateTargetSchema = z
  .object({
    branchId: z.string().optional(),
    targetPlanId: z.string().optional(),
    userId: z.string().optional(),
    title: z.string().min(2, "Title must be at least 2 characters").max(120),
    targetType: TargetTypeEnum.default("INDIVIDUAL"),
    metric: TargetMetricEnum,
    targetValue: z.number().positive("Target value must be greater than zero"),
    unit: z.string().default("COUNT"),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()),
    incentiveRule: IncentiveRuleInputSchema.optional(),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "Start date must be before or equal to end date",
    path: ["startDate"],
  });

export const UpdateTargetSchema = z.object({
  branchId: z.string().optional(),
  userId: z.string().optional(),
  title: z.string().min(2).max(120).optional(),
  targetType: TargetTypeEnum.optional(),
  metric: TargetMetricEnum.optional(),
  targetValue: z.number().positive().optional(),
  unit: z.string().optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  status: TargetStatusEnum.optional(),
  incentiveRule: IncentiveRuleInputSchema.optional(),
});

export const QueryTargetsSchema = z.object({
  branchId: z.string().optional(),
  targetPlanId: z.string().optional(),
  userId: z.string().optional(),
  metric: TargetMetricEnum.optional(),
  status: TargetStatusEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const QueryIncentivesSchema = z.object({
  branchId: z.string().optional(),
  userId: z.string().optional(),
  targetId: z.string().optional(),
  targetPlanId: z.string().optional(),
  status: IncentiveStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ApproveIncentiveSchema = z.object({
  approvedAmount: z.number().min(0, "Approved amount cannot be negative").optional(),
  notes: z.string().max(500).optional(),
});

export const RejectIncentiveSchema = z.object({
  reason: z.string().min(3, "Rejection reason must be at least 3 characters").max(500),
});
