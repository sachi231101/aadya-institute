import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import * as service from './question.service';

const qs = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : undefined;

export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, branchId, roles } = req.user!;
    const isAdmin = roles.includes('ADMIN');
    const effectiveBranchId = isAdmin ? undefined : branchId;

    const result = await service.getQuestions(instituteId, effectiveBranchId, {
      search: qs(req.query.search),
      questionType: qs(req.query.questionType),
      difficulty: qs(req.query.difficulty),
      status: qs(req.query.status),
      questionBankId: qs(req.query.questionBankId),
      courseId: qs(req.query.courseId),
      moduleId: qs(req.query.moduleId),
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    res.json({ success: true, message: 'Questions retrieved', data: result.questions, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const question = await service.getQuestionById(req.params.id as string, req.user!.instituteId);
    res.json({ success: true, message: 'Question retrieved', data: question });
  } catch (error) { next(error); }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, branchId, userId } = req.user!;
    const question = await service.createQuestion(instituteId, branchId, userId, req.body);
    res.status(201).json({ success: true, message: 'Question created successfully', data: question });
  } catch (error) { next(error); }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const question = await service.updateQuestion(req.params.id as string, req.user!.instituteId, req.body);
    res.json({ success: true, message: 'Question updated successfully', data: question });
  } catch (error) { next(error); }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteQuestion(req.params.id as string, req.user!.instituteId);
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) { next(error); }
};
