import { z } from "zod";

export const createAssignmentSchema = z.object({
  classSessionId: z.string().min(1, "Class session is required"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const queryAssignmentSchema = z.object({
  batchId: z.string().optional(),
  classSessionId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
