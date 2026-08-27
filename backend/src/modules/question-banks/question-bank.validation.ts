import { z } from 'zod';

export const createQuestionBankSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  courseId: z.string().optional(),
  branchId: z.string().optional(),
});

export const updateQuestionBankSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  courseId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const questionBankQuerySchema = z.object({
  search: z.string().optional(),
  courseId: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
