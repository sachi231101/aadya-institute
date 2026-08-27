import { z } from 'zod';

const questionOptionSchema = z.object({
  optionText: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean(),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

export const createQuestionSchema = z.object({
  questionType: z.enum(['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER', 'NUMERICAL', 'FILL_BLANK']),
  questionText: z.string().min(1, 'Question text is required'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  marks: z.coerce.number().positive('Marks must be positive').optional(),
  negativeMarks: z.coerce.number().min(0).optional(),
  explanation: z.string().optional(),
  questionBankId: z.string().optional(),
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
  branchId: z.string().optional(),
  options: z.array(questionOptionSchema).optional(),
}).refine((data) => {
  // MCQ and True/False types require options
  if (['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'].includes(data.questionType)) {
    if (!data.options || data.options.length < 2) {
      return false;
    }
  }
  return true;
}, { message: 'MCQ and True/False questions require at least 2 options', path: ['options'] });

export const updateQuestionSchema = z.object({
  questionType: z.enum(['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER', 'NUMERICAL', 'FILL_BLANK']).optional(),
  questionText: z.string().min(1).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  marks: z.coerce.number().positive().optional(),
  negativeMarks: z.coerce.number().min(0).optional(),
  explanation: z.string().optional(),
  questionBankId: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  moduleId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  options: z.array(questionOptionSchema).optional(),
});

export const questionQuerySchema = z.object({
  search: z.string().optional(),
  questionType: z.string().optional(),
  difficulty: z.string().optional(),
  status: z.string().optional(),
  questionBankId: z.string().optional(),
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
