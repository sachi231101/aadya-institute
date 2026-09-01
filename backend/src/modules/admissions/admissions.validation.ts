import { z } from "zod";

export const createEnquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(8, "Phone number must be at least 8 digits"),
  courseId: z.string().min(1, "Course is required"),
  source: z.enum(["WEBSITE", "WHATSAPP", "WALK_IN", "REFERRAL", "SOCIAL_MEDIA"]).optional(),
  status: z.enum(["NEW", "IN_PROGRESS", "FOLLOW_UP", "CONVERTED", "REJECTED"]).optional(),
  counselorNotes: z.string().optional(),
  assignedToId: z.string().optional(),
});

export const updateEnquirySchema = createEnquirySchema.partial();

export const queryEnquiriesSchema = z.object({
  search: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  courseId: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

export const createApplicationSchema = z.object({
  applicantName: z.string().min(2, "Applicant name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(8, "Phone number must be at least 8 digits"),
  courseId: z.string().min(1, "Course is required"),
  enquiryId: z.string().optional(),
  feeStatus: z.enum(["PAID", "PENDING"]).optional(),
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "ADMITTED"]).optional(),
  notes: z.string().optional(),
});

export const updateApplicationSchema = createApplicationSchema.partial();

export const queryApplicationsSchema = z.object({
  search: z.string().optional(),
  feeStatus: z.string().optional(),
  status: z.string().optional(),
  courseId: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

const installmentItemSchema = z.object({
  installmentNo: z.coerce.number().int().min(1),
  dueDate: z.string().min(1),
  amount: z.coerce.number().min(0),
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
  sourceMasterId: z.string().optional(),
  statusMasterId: z.string().optional(),
  paymentModeMasterId: z.string().optional(),
  areaMasterId: z.string().optional(),
  concessionHeadMasterId: z.string().optional(),
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

export const convertEnquirySchema = z.object({
  feeStatus: z.enum(["PAID", "PENDING"]).optional(),
  notes: z.string().optional(),
});

export const convertApplicationSchema = z.object({
  batchId: z.string().optional(),
  feePlan: z.enum(["FULL_PAYMENT", "INSTALLMENT"]).optional(),
  notes: z.string().optional(),
  totalFee: z.coerce.number().optional(),
  amountPaid: z.coerce.number().optional(),
  installments: z.array(installmentItemSchema).optional(),
});
