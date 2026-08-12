import { z } from "zod";

export const createModuleSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  name: z.string().min(2, "Module name must be at least 2 characters"),
  code: z.string().optional(),
  description: z.string().optional(),
  sequence: z.number().int().optional(),
  duration: z.number().int().positive().optional(),
});

export const updateModuleSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  sequence: z.number().int().optional(),
  duration: z.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"]).optional(),
});

export const addTopicSchema = z.object({
  title: z.string().min(2, "Topic title must be at least 2 characters"),
  durationHours: z.number().int().positive().optional().default(4),
  description: z.string().optional(),
});
