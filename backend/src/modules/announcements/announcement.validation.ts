import { z } from "zod";

export const listAnnouncementsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  batchId: z.string().optional(),
  courseId: z.string().optional(),
  search: z.string().trim().optional(),
  status: z.enum(["PUBLISHED", "DRAFT", "ALL"]).optional().default("ALL"),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).trim(),
  body: z.string().min(1).trim(),
  type: z.enum(["GENERAL", "CLASS", "ASSIGNMENT", "URGENT"]).default("GENERAL"),
  status: z.enum(["PUBLISHED", "DRAFT"]).default("PUBLISHED"),
  batchId: z.string().optional(),
  courseId: z.string().optional(),
});

export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsQuerySchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
