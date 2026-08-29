import { Router } from 'express';
import * as controller from './attempt.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { requirePermission } from '../../middlewares/permission.middleware';
import {
  examAnswersRateLimiter,
  examActionRateLimiter,
} from '../../middlewares/rate-limit.middleware';
import {
  startExamSchema,
  batchSaveAnswersSchema,
  proctoringEventSchema,
  terminateAttemptSchema,
} from './attempt.validation';

const router = Router();

router.use(authMiddleware);

// Student Exam Routes
router.get('/student/available', requirePermission('exam.take'), controller.getAvailableExams);
router.get('/student/:id/instructions', requirePermission('exam.take'), controller.getInstructions);
router.post(
  '/student/:id/start',
  requirePermission('exam.take'),
  examActionRateLimiter,
  validate(startExamSchema),
  controller.startAttempt
);

// Student Taking & Proctoring Routes
router.get('/attempts/:attemptId', requirePermission('exam.read'), controller.getAttempt);
router.post(
  '/attempts/:attemptId/answers',
  requirePermission('exam.take'),
  examAnswersRateLimiter,
  validate(batchSaveAnswersSchema),
  controller.saveAnswers
);
router.post('/attempts/:attemptId/proctoring-events', requirePermission('exam.take'), validate(proctoringEventSchema), controller.recordProctoringEvent);
router.post(
  '/attempts/:attemptId/submit',
  requirePermission('exam.take'),
  examActionRateLimiter,
  controller.submitAttempt
);

// Staff / Admin Management Routes
router.get('/:id/attempts', requirePermission('exam.view_attempts'), controller.getExamAttemptsStaff);
router.get('/attempts/:attemptId/proctoring', requirePermission('exam.view_attempts'), controller.getProctoringTimelineStaff);
router.post('/attempts/:attemptId/terminate', requirePermission('exam.update'), validate(terminateAttemptSchema), controller.terminateStaff);

export default router;
