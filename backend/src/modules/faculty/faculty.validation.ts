import { z } from "zod";

export const createFacultySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().min(10, "Phone must be at least 10 characters").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  employeeCode: z.string().min(1, "Employee code is required").max(20).toUpperCase(),
  specialization: z.string().optional(),
  branchId: z.string().min(1, "Branch ID is required"),
});

export const updateFacultySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  specialization: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
});

export const listFacultyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  branchId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
}).partial();

export type CreateFacultyDto = z.infer<typeof createFacultySchema>;
export type UpdateFacultyDto = z.infer<typeof updateFacultySchema>;
export type ListFacultyQuery = z.infer<typeof listFacultyQuerySchema>;
