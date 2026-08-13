import { z } from "zod";

export const queryPaymentsSchema = z.object({
  search: z.string().optional(),
  method: z.enum(["ALL", "UPI", "NET_BANKING", "CARD", "CASH", "CHEQUE"]).optional(),
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
  method: z.enum(["UPI", "NET_BANKING", "CARD", "CASH", "CHEQUE"]),
  transactionRef: z.string().optional(),
  status: z.enum(["SUCCESS", "PENDING", "FAILED"]).optional().default("SUCCESS"),
  notes: z.string().optional(),
  studentId: z.string().optional(),
  admissionId: z.string().optional(),
  pendingFeeId: z.string().optional(),
});

export const queryPendingFeesSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ALL", "OVERDUE", "DUE_SOON", "PARTIAL", "PAID"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(50),
});

export const collectPendingFeeSchema = z.object({
  amountPaidNow: z.number().positive("Amount paid now must be positive"),
  method: z.enum(["UPI", "NET_BANKING", "CARD", "CASH", "CHEQUE"]),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
});
