import { z } from "zod";

export const queryPaymentsSchema = z.object({
  search: z.string().optional(),
  method: z.string().optional(),
  status: z.enum(["ALL", "SUCCESS", "PENDING", "FAILED"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(50),
});

export const createPaymentSchema = z.object({
  studentName: z.string().min(1, "Student name is required"),
  admissionNo: z.string().min(1, "Admission number is required"),
  courseName: z.string().min(1, "Course name is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().optional(),
  method: z.string().optional(),
  paymentModeMasterId: z.string().optional(),
  bankAccountMasterId: z.string().optional(),
  feeHeadMasterId: z.string().optional(),
  transactionRef: z.string().optional(),
  status: z.enum(["SUCCESS", "PENDING", "FAILED"]).optional().default("SUCCESS"),
  notes: z.string().optional(),
  studentId: z.string().optional(),
  admissionId: z.string().optional(),
  pendingFeeId: z.string().optional(),
}).refine((d) => d.paymentModeMasterId || d.method, {
  message: "paymentModeMasterId or method is required",
});

export const queryPendingFeesSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ALL", "OVERDUE", "DUE_SOON", "PARTIAL", "PAID"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(50),
});

export const collectPendingFeeSchema = z.object({
  amountPaidNow: z.number().positive("Amount paid now must be positive"),
  method: z.string().optional(),
  paymentModeMasterId: z.string().optional(),
  feeHeadMasterId: z.string().optional(),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
}).refine((d) => d.paymentModeMasterId || d.method, {
  message: "paymentModeMasterId or method is required",
});

export const queryFeePlansSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  branchId: z.string().optional(),
  courseId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"]).optional(),
  search: z.string().trim().optional(),
});

export const createFeePlanSchema = z.object({
  name: z.string().min(1).trim(),
  code: z.string().optional(),
  branchId: z.string().optional(),
  courseId: z.string().optional(),
  totalAmount: z.number().positive(),
  planType: z.enum(["FULL_PAYMENT", "INSTALLMENT"]).optional().default("FULL_PAYMENT"),
  installments: z.array(z.object({
    installmentNo: z.number().int().positive(),
    amount: z.number().positive(),
    dueDays: z.number().int().nonnegative(),
  })).optional(),
  description: z.string().optional(),
});

export const updateFeePlanSchema = createFeePlanSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"]).optional(),
});

export const queryReceiptsSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(50),
  branchId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
