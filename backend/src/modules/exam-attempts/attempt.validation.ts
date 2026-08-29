import { z } from 'zod';

export const startExamSchema = z.object({
  clientDeviceInfo: z.object({
    userAgent: z.string().optional(),
    screenResolution: z.string().optional(),
    browserName: z.string().optional(),
  }).optional(),
});

export const saveAnswerSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  selectedOptionIds: z.array(z.string()).optional(),
  textAnswer: z.string().optional(),
  numericalAnswer: z.number().optional(),
  isFlagged: z.boolean().optional(),
});

export const batchSaveAnswersSchema = z.object({
  answers: z.array(saveAnswerSchema).min(1, 'At least one answer is required').max(50),
});

export const proctoringEventSchema = z.object({
  eventType: z.enum([
    'TAB_SWITCH',
    'WINDOW_BLUR',
    'VISIBILITY_HIDDEN',
    'FULLSCREEN_EXIT',
    'KEYBOARD_SHORTCUT',
    'COPY_ATTEMPT',
    'PASTE_ATTEMPT',
    'RIGHT_CLICK',
    'DEVTOOLS_ATTEMPT',
    'NETWORK_DISCONNECT',
    'SESSION_CONFLICT',
    'SUSPICIOUS_BROWSER_EVENT',
  ]),
  clientEventId: z.string().optional(),
  occurredAt: z.string().datetime({ message: 'occurredAt must be a valid ISO datetime' }),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const terminateAttemptSchema = z.object({
  reason: z.string().min(2, 'Termination reason is required'),
  notes: z.string().optional(),
});

export const attemptQuerySchema = z.object({
  status: z.enum([
    'NOT_STARTED',
    'IN_PROGRESS',
    'SUBMITTED',
    'AUTO_SUBMITTED',
    'EVALUATING',
    'COMPLETED',
    'TERMINATED',
    'EXPIRED',
  ]).optional(),
  search: z.string().optional(),
  batchId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
