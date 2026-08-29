import { z } from "zod";

export const createStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone must be at least 10 characters").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  studentCode: z.string().max(30).toUpperCase().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  qualification: z.string().optional().or(z.literal("")),
  qualificationMasterId: z.string().optional(),
  areaMasterId: z.string().optional(),
  branchId: z.string().min(1, "Branch ID is required"),
  courseId: z.string().optional().or(z.literal("")),
  batchId: z.string().optional().or(z.literal("")),
  totalFee: z.coerce.number().optional(),
  feePlan: z.enum(["FULL_PAYMENT", "INSTALLMENT"]).optional(),
  downPayment: z.coerce.number().optional(),
  gender: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
});

export const updateStudentSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(10).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  qualification: z.string().optional().or(z.literal("")),
  qualificationMasterId: z.string().optional().or(z.literal("")),
  areaMasterId: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "ON_LEAVE", "COMPLETED", "DISCONTINUED", "CANCELLED", "DRAFT"]).optional(),
  branchId: z.string().min(1).optional(),
  gender: z.string().optional().or(z.literal("")),
  bloodGroup: z.string().optional().or(z.literal("")),
  guardianName: z.string().optional().or(z.literal("")),
  guardianPhone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  pincode: z.string().optional().or(z.literal("")),
  courseId: z.string().optional().or(z.literal("")),
  batchId: z.string().optional().or(z.literal("")),
  admissionStatus: z.enum(["CONFIRMED", "PROVISIONAL", "CANCELLED", "PENDING", "ACTIVE", "COMPLETED"]).optional(),
  feePlan: z.enum(["FULL_PAYMENT", "INSTALLMENT"]).optional(),
  totalFee: z.coerce.number().optional(),
  downPayment: z.coerce.number().optional(),
  notes: z.string().optional().or(z.literal("")),
});

export const listStudentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  branchId: z.string().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "COMPLETED", "DISCONTINUED", "CANCELLED"]).optional(),
}).partial();

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
export type ListStudentQuery = z.infer<typeof listStudentQuerySchema>;
