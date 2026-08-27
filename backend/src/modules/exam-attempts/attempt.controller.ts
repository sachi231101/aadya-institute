import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import * as service from './attempt.service';

export const getAvailableExams = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, instituteId } = req.user!;
    const exams = await service.getStudentAvailableExams(userId, instituteId);
    res.json({ success: true, data: exams });
  } catch (error) { next(error); }
};

export const getInstructions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, instituteId } = req.user!;
    const id = String(req.params.id);
    const result = await service.getExamInstructions(id, userId, instituteId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const startAttempt = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, instituteId } = req.user!;
    const id = String(req.params.id);
    const result = await service.startExamAttempt(id, userId, instituteId, req.body);
    res.status(201).json({ success: true, message: result.isResumed ? 'Exam attempt resumed' : 'Exam started', data: result });
  } catch (error) { next(error); }
};

export const getAttempt = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, instituteId, roles } = req.user!;
    const attemptId = String(req.params.attemptId);
    const isStaff = roles.some((r) => ['ADMIN', 'SUPER_ADMIN', 'CENTER_MANAGER', 'FACULTY'].includes(r.toUpperCase()));
    const attempt = await service.getAttemptDetails(attemptId, userId, instituteId, isStaff);
    res.json({ success: true, data: attempt });
  } catch (error) { next(error); }
};

export const saveAnswers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, instituteId } = req.user!;
    const attemptId = String(req.params.attemptId);
    const result = await service.saveAnswers(attemptId, userId, instituteId, req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const recordProctoringEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, instituteId } = req.user!;
    const attemptId = String(req.params.attemptId);
    const result = await service.recordProctoringEvent(attemptId, userId, instituteId, req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const submitAttempt = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, instituteId } = req.user!;
    const attemptId = String(req.params.attemptId);
    const result = await service.submitExam(attemptId, userId, instituteId);
    res.json({ success: true, message: 'Examination submitted successfully', data: result });
  } catch (error) { next(error); }
};

export const getExamAttemptsStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, branchId } = req.user!;
    const id = String(req.params.id);
    const result = await service.getExamAttempts(id, instituteId, branchId, req.query);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getProctoringTimelineStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, branchId } = req.user!;
    const attemptId = String(req.params.attemptId);
    const result = await service.getAttemptProctoringTimeline(attemptId, instituteId, branchId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const terminateStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, instituteId } = req.user!;
    const attemptId = String(req.params.attemptId);
    const result = await service.terminateAttemptManually(attemptId, userId, instituteId, req.body.reason);
    res.json({ success: true, message: 'Attempt terminated manually', data: result });
  } catch (error) { next(error); }
};
