import { z } from "zod";

export const createStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().min(10, "Phone must be at least 10 characters").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  studentCode: z.string().min(1, "Student code is required").max(30).toUpperCase(),
  dateOfBirth: z.string().optional(),
  qualification: z.string().optional(),
  branchId: z.string().min(1, "Branch ID is required"),
});

export const updateStudentSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  dateOfBirth: z.string().optional(),
  qualification: z.string().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "COMPLETED", "DISCONTINUED", "CANCELLED"]).optional(),
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
