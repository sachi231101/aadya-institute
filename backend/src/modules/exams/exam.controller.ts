import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import * as service from './exam.service';

const qs = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : undefined;

export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, branchId, roles } = req.user!;
    const isAdmin = roles.includes('ADMIN');
    const effectiveBranchId = isAdmin ? undefined : branchId;

    const result = await service.getExams(instituteId, effectiveBranchId, {
      search: qs(req.query.search),
      status: qs(req.query.status),
      courseId: qs(req.query.courseId),
      moduleId: qs(req.query.moduleId),
      batchId: qs(req.query.batchId),
      createdById: qs(req.query.createdById),
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    res.json({ success: true, message: 'Exams retrieved successfully', data: result.exams, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

export const getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, branchId, roles } = req.user!;
    const isAdmin = roles.includes('ADMIN');
    const effectiveBranchId = isAdmin ? undefined : branchId;
    const stats = await service.getExamStats(instituteId, effectiveBranchId);
    res.json({ success: true, message: 'Exam stats retrieved successfully', data: stats });
  } catch (error) { next(error); }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const exam = await service.getExamById(req.params.id as string, req.user!.instituteId);
    res.json({ success: true, message: 'Exam retrieved successfully', data: exam });
  } catch (error) { next(error); }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, branchId, userId } = req.user!;
    const exam = await service.createExam(instituteId, branchId, userId, req.body);
    res.status(201).json({ success: true, message: 'Exam created successfully', data: exam });
  } catch (error) { next(error); }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    const exam = await service.updateExam(req.params.id as string, instituteId, userId, req.body);
    res.json({ success: true, message: 'Exam updated successfully', data: exam });
  } catch (error) { next(error); }
};

export const publish = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    const exam = await service.publishExam(req.params.id as string, instituteId, userId);
    res.json({ success: true, message: 'Exam published successfully', data: exam });
  } catch (error) { next(error); }
};

export const schedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    const exam = await service.scheduleExam(req.params.id as string, instituteId, userId, req.body);
    res.json({ success: true, message: 'Exam scheduled successfully', data: exam });
  } catch (error) { next(error); }
};

export const archive = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    await service.archiveExam(req.params.id as string, instituteId, userId);
    res.json({ success: true, message: 'Exam archived successfully' });
  } catch (error) { next(error); }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    await service.deleteExam(req.params.id as string, instituteId, userId);
    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) { next(error); }
};

// ─── Questions ────────────────────────────────────────────────────────────────
export const getQuestions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const questions = await service.getExamQuestions(req.params.id as string, req.user!.instituteId);
    res.json({ success: true, message: 'Exam questions retrieved successfully', data: questions });
  } catch (error) { next(error); }
};

export const addQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    const eq = await service.addQuestionToExam(req.params.id as string, instituteId, userId, req.body);
    res.status(201).json({ success: true, message: 'Question added to exam', data: eq });
  } catch (error) { next(error); }
};

export const addQuestionBank = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    const result = await service.addQuestionBankToExam(req.params.id as string, instituteId, userId, req.body);
    const skippedNote = result.skipped > 0 ? ` (${result.skipped} already on exam)` : '';
    res.status(201).json({
      success: true,
      message: `${result.added} question${result.added === 1 ? '' : 's'} added from bank${skippedNote}`,
      data: result,
    });
  } catch (error) { next(error); }
};

export const removeQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    await service.removeQuestionFromExam(req.params.id as string, req.params.questionId as string, instituteId, userId);
    res.json({ success: true, message: 'Question removed from exam' });
  } catch (error) { next(error); }
};

export const reorderQuestions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId } = req.user!;
    await service.reorderExamQuestions(req.params.id as string, instituteId, req.body);
    res.json({ success: true, message: 'Questions reordered successfully' });
  } catch (error) { next(error); }
};

// ─── Batch Assignments ────────────────────────────────────────────────────────
export const getBatches = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const batches = await service.getExamBatches(req.params.id as string, req.user!.instituteId);
    res.json({ success: true, message: 'Exam batches retrieved successfully', data: batches });
  } catch (error) { next(error); }
};

export const assignBatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    const assignment = await service.assignBatchToExam(req.params.id as string, req.body.batchId, instituteId, userId);
    res.status(201).json({ success: true, message: 'Batch assigned to exam', data: assignment });
  } catch (error) { next(error); }
};

export const removeBatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    await service.removeBatchFromExam(req.params.id as string, req.params.batchId as string, instituteId, userId);
    res.json({ success: true, message: 'Batch removed from exam' });
  } catch (error) { next(error); }
};

export const getStudents = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const students = await service.getExamStudents(req.params.id as string, req.user!.instituteId);
    res.json({ success: true, message: 'Exam student assignments retrieved successfully', data: students });
  } catch (error) { next(error); }
};

export const assignStudents = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    const result = await service.assignStudentsToExam(req.params.id as string, instituteId, userId, req.body);
    const skippedNote = result.skipped > 0 ? ` (${result.skipped} already assigned)` : '';
    res.status(201).json({
      success: true,
      message: `${result.added} student${result.added === 1 ? '' : 's'} assigned to exam${skippedNote}`,
      data: result,
    });
  } catch (error) { next(error); }
};

export const removeStudent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, userId } = req.user!;
    await service.removeStudentFromExam(req.params.id as string, req.params.studentId as string, instituteId, userId);
    res.json({ success: true, message: 'Student removed from exam' });
  } catch (error) { next(error); }
};
