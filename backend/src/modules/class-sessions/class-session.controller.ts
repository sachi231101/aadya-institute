import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { classSessionService } from "./class-session.service";
import { sendSuccess, sendError } from "../../utils/response";

export const getSessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const branchId = req.user!.branchId || undefined;
    const filters = {
      batchId: req.query.batchId as string,
      facultyId: req.query.facultyId as string,
      status: req.query.status as any,
      mode: req.query.mode as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      search: req.query.search as string,
    };
    const sessions = await classSessionService.getSessions(instituteId, branchId, filters);
    sendSuccess(res, sessions, 200, "Class sessions retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const session = await classSessionService.getSessionById(req.params.id as string, instituteId);
    sendSuccess(res, session, 200, "Class session details retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const session = await classSessionService.createSession(instituteId, req.body);
    sendSuccess(res, session, 201, "Class session created successfully");
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const session = await classSessionService.updateSession(req.params.id as string, instituteId, req.body);
    sendSuccess(res, session, 200, "Class session updated successfully");
  } catch (error) {
    next(error);
  }
};

export const cancelSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const session = await classSessionService.cancelSession(req.params.id as string, instituteId);
    sendSuccess(res, session, 200, "Class session cancelled successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    await classSessionService.deleteSession(req.params.id as string, instituteId);
    sendSuccess(res, { id: req.params.id, deleted: true }, 200, "Class session deleted successfully");
  } catch (error) {
    next(error);
  }
};
