import { z } from "zod";

export const createCourseSchema = z.object({
  name: z.string().min(2, "Course name must be at least 2 characters"),
  code: z.string().min(2, "Course code must be at least 2 characters"),
  description: z.string().optional(),
  duration: z.number().int().positive().optional(),
  category: z.string().optional(),
  mode: z.string().optional(),
  level: z.string().optional(),
  totalHours: z.number().int().positive().optional(),
  fee: z.number().nonnegative().optional(),
  // Optional: single-branch institutes are auto-assigned in the service.
  branchIds: z.array(z.string().min(1)).min(1, "Select at least one branch").optional().default([]),
});

export const updateCourseSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).optional(),
  description: z.string().optional(),
  duration: z.number().int().positive().optional(),
  category: z.string().optional(),
  mode: z.string().optional(),
  level: z.string().optional(),
  totalHours: z.number().int().positive().optional(),
  fee: z.number().nonnegative().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"]).optional(),
  branchIds: z.array(z.string().min(1)).min(1, "Select at least one branch").optional(),
});
