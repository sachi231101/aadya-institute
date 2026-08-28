import { z } from 'zod';

export const createExamSchema = z.object({
  name: z.string().min(1, 'Exam name is required').max(200),
  description: z.string().optional(),
  instructions: z.string().optional(),
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
  branchId: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive('Duration must be positive'),
  passingMarks: z.coerce.number().min(0, 'Passing marks must be >= 0').optional(),
  attemptsAllowed: z.coerce.number().int().positive().optional(),
  examType: z.enum(['ONLINE', 'OFFLINE']).optional(),
  negativeMarkingEnabled: z.boolean().optional(),
  showResults: z.boolean().optional(),
  randomizeQuestions: z.boolean().optional(),
  randomizeOptions: z.boolean().optional(),
  proctoringEnabled: z.boolean().optional(),
  fullscreenRequired: z.boolean().optional(),
  maxWarnings: z.coerce.number().int().min(0).optional(),
  examTermMasterId: z.string().optional(),
});

export const updateExamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
  branchId: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  passingMarks: z.coerce.number().min(0).optional(),
  attemptsAllowed: z.coerce.number().int().positive().optional(),
  examType: z.enum(['ONLINE', 'OFFLINE']).optional(),
  negativeMarkingEnabled: z.boolean().optional(),
  showResults: z.boolean().optional(),
  randomizeQuestions: z.boolean().optional(),
  randomizeOptions: z.boolean().optional(),
  proctoringEnabled: z.boolean().optional(),
  fullscreenRequired: z.boolean().optional(),
  maxWarnings: z.coerce.number().int().min(0).optional(),
  examTermMasterId: z.string().optional(),
});

export const scheduleExamSchema = z.object({
  startAt: z.string().datetime({ message: 'startAt must be a valid ISO datetime' }),
  endAt: z.string().datetime({ message: 'endAt must be a valid ISO datetime' }),
}).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  { message: 'endAt must be after startAt', path: ['endAt'] }
);

export const addQuestionToExamSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  displayOrder: z.coerce.number().int().min(0).optional(),
  marksOverride: z.coerce.number().positive().optional(),
});

export const reorderQuestionsSchema = z.object({
  questions: z.array(z.object({
    questionId: z.string(),
    displayOrder: z.coerce.number().int().min(0),
  })).min(1, 'At least one question is required'),
});

export const assignBatchSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
});

export const examQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
  batchId: z.string().optional(),
  createdById: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
