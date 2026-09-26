import { z } from "zod";

const applicationFieldsSchema = z.object({
  applicantName: z.string().min(2, "Applicant name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(8, "Phone number must be at least 8 digits"),
  courseId: z.string().min(1, "Course is required"),
  leadId: z.string().optional(),
  branchId: z.string().optional(),
  feeStatus: z.enum(["PAID", "PENDING"]).optional(),
  applicationFee: z.coerce.number().min(0, "Fee must be 0 or more").optional().nullable(),
  paymentModeMasterId: z.string().optional().nullable(),
  paymentRef: z.string().optional().nullable(),
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "ADMITTED"]).optional(),
  notes: z.string().optional(),
  rejectReason: z.string().optional(),
});

const requirePaidFeeFields = (
  data: {
    feeStatus?: string;
    applicationFee?: number | null;
    paymentModeMasterId?: string | null;
  },
  ctx: z.RefinementCtx
) => {
  if (data.feeStatus !== "PAID") return;
  if (
    data.applicationFee === undefined ||
    data.applicationFee === null ||
    Number.isNaN(Number(data.applicationFee))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Application fee amount is required when marked as paid",
      path: ["applicationFee"],
    });
  }
  if (!data.paymentModeMasterId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payment mode is required when marked as paid",
      path: ["paymentModeMasterId"],
    });
  }
};

export const createApplicationSchema = applicationFieldsSchema.superRefine(requirePaidFeeFields);

export const updateApplicationSchema = applicationFieldsSchema.partial().superRefine((data, ctx) => {
  if (data.feeStatus === "PAID") {
    requirePaidFeeFields(
      {
        feeStatus: data.feeStatus,
        applicationFee: data.applicationFee,
        paymentModeMasterId: data.paymentModeMasterId,
      },
      ctx
    );
  }
  if (data.status === "REJECTED" && !data.rejectReason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reject reason is required",
      path: ["rejectReason"],
    });
  }
});

export const queryApplicationsSchema = z.object({
  search: z.string().optional(),
  feeStatus: z.string().optional(),
  status: z.string().optional(),
  courseId: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

export const createApplicationActivitySchema = z.object({
  type: z.enum(["NOTE_ADDED", "STATUS_CHANGED", "FEE_STATUS_CHANGED", "CREATED"]).optional(),
  title: z.string().optional(),
  description: z.string().min(1, "Note is required"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const installmentItemSchema = z.object({
  installmentNo: z.coerce.number().int().min(1),
  dueDate: z.string().min(1),
  amount: z.coerce.number().min(0),
});

const termsAcceptanceItemSchema = z.object({
  masterId: z.string().min(1),
  name: z.string().min(1),
});

export const createAdmissionSchema = z.object({
  studentName: z.string().min(2, "Student name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(8, "Phone number must be at least 8 digits"),
  courseId: z.string().min(1, "Course is required"),
  batchId: z.string().optional().or(z.literal("")),
  studentId: z.string().optional(),
  applicationId: z.string().optional(),
  leadId: z.string().optional(),
  branchId: z.string().optional(),
  feePlan: z.enum(["FULL_PAYMENT", "INSTALLMENT"]).optional(),
  status: z.enum(["CONFIRMED", "PROVISIONAL", "CANCELLED", "PENDING", "ACTIVE", "COMPLETED"]).optional(),
  notes: z.string().optional(),
  totalFee: z.coerce.number().optional(),
  amountPaid: z.coerce.number().optional(),
  paymentMethod: z.enum(["UPI", "NET_BANKING", "CARD", "CASH", "CHEQUE"]).optional(),
  transactionRef: z.string().optional(),
  admissionDate: z.string().optional(),
  installments: z.array(installmentItemSchema).optional(),
  feeLines: z
    .array(
      z.object({
        feeHeadMasterId: z.string().min(1),
        amount: z.coerce.number().positive(),
        installments: z.array(installmentItemSchema).optional(),
      })
    )
    .optional(),
  sourceMasterId: z.string().optional(),
  statusMasterId: z.string().optional(),
  paymentModeMasterId: z.string().optional(),
  areaMasterId: z.string().optional(),
  concessionHeadMasterId: z.string().optional(),
  termsAcceptance: z.array(termsAcceptanceItemSchema).optional(),
  sendCredentials: z.boolean().optional(),
});

export const updateAdmissionSchema = createAdmissionSchema.partial();

export const queryAdmissionsSchema = z.object({
  search: z.string().optional(),
  courseId: z.string().optional(),
  status: z.string().optional(),
  batchId: z.string().optional(),
  branchId: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

/** Staff picker for "Admission taken by" — scoped to a branch. */
export const admissionStaffOptionsQuerySchema = z.object({
  branchId: z.string().min(1, "branchId is required"),
});
