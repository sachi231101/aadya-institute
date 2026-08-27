import { Router } from 'express';
import * as controller from './question-bank.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/permission.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { createQuestionBankSchema, updateQuestionBankSchema } from './question-bank.validation';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('question_bank.read'), controller.getAll);
router.post('/', requirePermission('question_bank.create'), validate(createQuestionBankSchema), controller.create);
router.get('/:id', requirePermission('question_bank.read'), controller.getById);
router.patch('/:id', requirePermission('question_bank.update'), validate(updateQuestionBankSchema), controller.update);
router.delete('/:id', requirePermission('question_bank.delete'), controller.remove);

export default router;
