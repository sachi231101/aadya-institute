import { z } from "zod";

export const createAssignmentSchema = z.object({
  classSessionId: z.string().min(1, "Class session is required").optional(),
  batchId: z.string().min(1).optional(),
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
}).refine((d) => !!d.classSessionId || !!d.batchId, {
  message: "Class session or batch is required",
  path: ["classSessionId"],
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
  facultyId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const gradeSubmissionSchema = z.object({
  marks: z.coerce.number().min(0, "Marks must be >= 0"),
  feedback: z.string().optional().or(z.literal("")),
});

export const submitAssignmentSchema = z.object({
  fileKey: z.string().min(1, "File reference is required"),
  notes: z.string().optional().or(z.literal("")),
});
