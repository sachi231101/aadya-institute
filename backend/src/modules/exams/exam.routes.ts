import { Router } from 'express';
import * as controller from './exam.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/permission.middleware';
import { validate } from '../../middlewares/validation.middleware';
import {
  createExamSchema,
  updateExamSchema,
  scheduleExamSchema,
  addQuestionToExamSchema,
  addQuestionBankToExamSchema,
  reorderQuestionsSchema,
  assignBatchSchema,
  assignStudentsToExamSchema,
} from './exam.validation';

const router = Router();

router.use(authMiddleware);

// Stats (must be before /:id)
router.get('/stats', requirePermission('exam.read'), controller.getStats);

// Exam CRUD
router.get('/', requirePermission('exam.read'), controller.getAll);
router.post('/', requirePermission('exam.create'), validate(createExamSchema), controller.create);
router.get('/:id', requirePermission('exam.read'), controller.getById);
router.patch('/:id', requirePermission('exam.update'), validate(updateExamSchema), controller.update);
router.delete('/:id', requirePermission('exam.delete'), controller.remove);

// Lifecycle
router.post('/:id/publish', requirePermission('exam.publish'), controller.publish);
router.post('/:id/schedule', requirePermission('exam.schedule'), validate(scheduleExamSchema), controller.schedule);
router.post('/:id/archive', requirePermission('exam.update'), controller.archive);

// Questions
router.get('/:id/questions', requirePermission('exam.read'), controller.getQuestions);
router.post('/:id/questions', requirePermission('exam.manage_questions'), validate(addQuestionToExamSchema), controller.addQuestion);
router.post('/:id/question-banks', requirePermission('exam.manage_questions'), validate(addQuestionBankToExamSchema), controller.addQuestionBank);
router.delete('/:id/questions/:questionId', requirePermission('exam.manage_questions'), controller.removeQuestion);
router.patch('/:id/questions/reorder', requirePermission('exam.manage_questions'), validate(reorderQuestionsSchema), controller.reorderQuestions);

// Batch assignments
router.get('/:id/batches', requirePermission('exam.read'), controller.getBatches);
router.post('/:id/batches', requirePermission('exam.assign'), validate(assignBatchSchema), controller.assignBatch);
router.delete('/:id/batches/:batchId', requirePermission('exam.assign'), controller.removeBatch);

router.get('/:id/students', requirePermission('exam.read'), controller.getStudents);
router.post('/:id/students', requirePermission('exam.assign'), validate(assignStudentsToExamSchema), controller.assignStudents);
router.delete('/:id/students/:studentId', requirePermission('exam.assign'), controller.removeStudent);

export default router;
