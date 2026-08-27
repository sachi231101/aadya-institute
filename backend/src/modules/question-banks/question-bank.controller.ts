import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import * as service from './question-bank.service';

const qs = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : undefined;

export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, branchId, roles } = req.user!;
    const isAdmin = roles.includes('ADMIN');
    const effectiveBranchId = isAdmin ? undefined : branchId;

    const result = await service.getQuestionBanks(instituteId, effectiveBranchId, {
      search: qs(req.query.search),
      courseId: qs(req.query.courseId),
      status: qs(req.query.status),
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    res.json({ success: true, message: 'Question banks retrieved', data: result.banks, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bank = await service.getQuestionBankById(req.params.id as string, req.user!.instituteId);
    res.json({ success: true, message: 'Question bank retrieved', data: bank });
  } catch (error) { next(error); }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, branchId, userId } = req.user!;
    const bank = await service.createQuestionBank(instituteId, branchId, userId, req.body);
    res.status(201).json({ success: true, message: 'Question bank created successfully', data: bank });
  } catch (error) { next(error); }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bank = await service.updateQuestionBank(req.params.id as string, req.user!.instituteId, req.body);
    res.json({ success: true, message: 'Question bank updated successfully', data: bank });
  } catch (error) { next(error); }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteQuestionBank(req.params.id as string, req.user!.instituteId);
    res.json({ success: true, message: 'Question bank deleted successfully' });
  } catch (error) { next(error); }
};
