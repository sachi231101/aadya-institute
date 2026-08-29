import { z } from "zod";

export const submitFeedbackSchema = z.object({
  classSessionId: z.string().min(1),
  studentId: z.string().min(1),
  facultyId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const listFeedbackQuerySchema = z.object({
  classSessionId: z.string().optional(),
  studentId: z.string().optional(),
  facultyId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const facultyRatingsQuerySchema = z.object({
  facultyId: z.string().optional(),
  batchId: z.string().optional(),
  branchId: z.string().optional(),
});

export type SubmitFeedbackDto = z.infer<typeof submitFeedbackSchema>;
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;
export type FacultyRatingsQuery = z.infer<typeof facultyRatingsQuerySchema>;
