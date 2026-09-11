import { z } from "zod";

export const queryPaymentsSchema = z.object({
  search: z.string().optional(),
  method: z.string().optional(),
  paymentModeMasterId: z.string().optional(),
  feeHeadMasterId: z.string().optional(),
  status: z.enum(["ALL", "SUCCESS", "PENDING", "FAILED", "VOID"]).optional(),
  branchId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(50),
});

const allocationSchema = z.object({
  pendingFeeId: z.string().min(1),
  amount: z.number().positive(),
});

export const createPaymentSchema = z
  .object({
    studentId: z.string().min(1, "Student is required"),
    studentName: z.string().optional(),
    admissionNo: z.string().optional(),
    courseName: z.string().optional(),
    amount: z.number().positive("Amount must be greater than 0"),
    lateFee: z.number().nonnegative().optional(),
    date: z.string().optional(),
    method: z.string().optional(),
    paymentModeMasterId: z.string().optional(),
    bankAccountMasterId: z.string().optional(),
    feeHeadMasterId: z.string().optional(),
    transactionRef: z.string().optional(),
    status: z.enum(["SUCCESS", "PENDING", "FAILED"]).optional().default("SUCCESS"),
    notes: z.string().optional(),
    admissionId: z.string().optional(),
    pendingFeeId: z.string().optional(),
    allocations: z.array(allocationSchema).optional(),
    sendWhatsAppReceipt: z.boolean().optional(),
  })
  .refine((d) => d.paymentModeMasterId || d.method, {
    message: "paymentModeMasterId or method is required",
  });

export const queryPendingFeesSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ALL", "OVERDUE", "DUE_SOON", "PARTIAL", "PAID", "UNPAID"]).optional(),
  branchId: z.string().optional(),
  studentId: z.string().optional(),
  feeHeadMasterId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(50),
});

export const collectPendingFeeSchema = z
  .object({
    amountPaidNow: z.number().positive("Amount paid now must be positive"),
    method: z.string().optional(),
    paymentModeMasterId: z.string().optional(),
    feeHeadMasterId: z.string().optional(),
    transactionRef: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((d) => d.paymentModeMasterId || d.method, {
    message: "paymentModeMasterId or method is required",
  });

export const createChargesSchema = z.object({
  studentId: z.string().min(1),
  admissionId: z.string().optional(),
  charges: z
    .array(
      z.object({
        feeHeadMasterId: z.string().min(1),
        amount: z.number().positive(),
        dueDate: z.string().optional(),
        installmentNo: z.number().int().positive().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1),
});

export const createChargeSchema = z.object({
  studentId: z.string().min(1),
  feeHeadMasterId: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().optional(),
  admissionId: z.string().optional(),
  installmentNo: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const planInstallmentSchema = z.object({
  installmentNo: z.number().int().positive(),
  amount: z.number().positive(),
  dueDays: z.number().int().nonnegative(),
});

const planLineSchema = z.object({
  feeHeadMasterId: z.string().min(1),
  feeHeadCode: z.string().optional(),
  amount: z.number().positive(),
  installments: z.array(planInstallmentSchema).optional(),
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
  installments: z.array(z.union([planInstallmentSchema, planLineSchema])).optional(),
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
  feeHeadMasterId: z.string().optional(),
});

export const studentFeeStatementParamsSchema = z.object({
  studentId: z.string().min(1),
});

export const queryFeeStudentsSchema = z.object({
  search: z.string().optional(),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
  status: z.enum(["ALL", "Paid", "Overdue", "Partial", "Pending", "None"]).optional(),
  branchId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const queryStudentInvoicesSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(["ALL", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"])
    .optional(),
  studentId: z.string().optional(),
  branchId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(50),
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().optional(),
});

export const invoiceIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const createOtherInvoiceSchema = z.object({
  studentId: z.string().min(1),
  reference: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  discount: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  adjustments: z.number().optional(),
  takenByName: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        quantity: z.number().positive().default(1),
        unitPrice: z.number().nonnegative(),
        discount: z.number().nonnegative().optional(),
        discountType: z.enum(["FLAT", "PERCENT"]).optional().default("FLAT"),
        tax: z.number().nonnegative().optional(),
        taxPercent: z.number().nonnegative().optional(),
        feeHeadMasterId: z.string().optional(),
      })
    )
    .min(1),
  payment: z
    .object({
      amount: z.number().positive(),
      paymentModeMasterId: z.string().optional(),
      method: z.string().optional(),
      bankAccountMasterId: z.string().optional(),
      transactionRef: z.string().optional(),
      transactionDate: z.string().optional(),
      transactionStatus: z.string().optional(),
      narration: z.string().optional(),
      tds: z.number().nonnegative().optional(),
    })
    .optional(),
});

export const queryOtherInvoicesSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(["ALL", "DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"])
    .optional(),
  studentId: z.string().optional(),
  branchId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(50),
});

export const paymentIdParamsSchema = z.object({
  id: z.string().min(1),
});
