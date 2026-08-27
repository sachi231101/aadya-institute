import { Router } from 'express';
import * as controller from './question.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/permission.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { createQuestionSchema, updateQuestionSchema } from './question.validation';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('question.read'), controller.getAll);
router.post('/', requirePermission('question.create'), validate(createQuestionSchema), controller.create);
router.get('/:id', requirePermission('question.read'), controller.getById);
router.patch('/:id', requirePermission('question.update'), validate(updateQuestionSchema), controller.update);
router.delete('/:id', requirePermission('question.delete'), controller.remove);

export default router;
