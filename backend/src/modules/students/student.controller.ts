import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import * as service from "./student.service";
import * as curriculumService from "../batches/batch-curriculum.service";

export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await service.getAllStudents(toAuthUser(req), req.query as any);
    sendPaginated(res, data, meta);
  } catch (err) { next(err); }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.getStudentById(req.params.id as string, toAuthUser(req));
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId } = req.user!;
    const data = await service.createStudent(instituteId, req.body, toAuthUser(req));
    sendSuccess(res, data, 201, "Student created successfully");
  } catch (err) { next(err); }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.updateStudent(req.params.id as string, req.body, toAuthUser(req));
    sendSuccess(res, data, 200, "Student updated successfully");
  } catch (err) { next(err); }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteStudent(req.params.id as string);
    sendSuccess(res, null, 200, "Student deleted successfully");
  } catch (err) { next(err); }
};

export const getPerformance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.getStudentPerformance(req.params.id as string, toAuthUser(req));
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const sendCredentialsWhatsApp = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.sendStudentCredentialsWhatsAppService(req.params.id as string, toAuthUser(req));
    sendSuccess(res, data, 200, "Student credentials dispatched to WhatsApp");
  } catch (err) { next(err); }
};

export const discontinue = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.discontinueStudent(
      req.params.id as string,
      req.body,
      toAuthUser(req)
    );
    sendSuccess(res, data, 200, "Student discontinued successfully");
  } catch (err) { next(err); }
};

export const continueEnrollment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.continueStudent(
      req.params.id as string,
      req.body ?? {},
      toAuthUser(req)
    );
    sendSuccess(res, data, 200, "Student continued successfully");
  } catch (err) { next(err); }
};

export const notifyDiscontinuationRisk = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.notifyDiscontinuationRisk(
      req.params.id as string,
      toAuthUser(req)
    );
    sendSuccess(res, data, 200, "Discontinuation risk WhatsApp queued");
  } catch (err) { next(err); }
};

export const triggerAiCall = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.triggerStudentAiCall(
      req.params.id as string,
      toAuthUser(req)
    );
    sendSuccess(res, data, 200, data.message || "AI voice call queued");
  } catch (err) { next(err); }
};

export const getMyDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.getMyDashboard(toAuthUser(req));
    sendSuccess(res, data, 200, "Student dashboard retrieved successfully");
  } catch (err) { next(err); }
};

export const getMyCurriculum = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await curriculumService.getMyCurriculum(toAuthUser(req));
    sendSuccess(res, data, 200, "Student curriculum retrieved successfully");
  } catch (err) { next(err); }
};
