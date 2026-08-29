import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import * as service from "./faculty.service";

export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await service.getAllFaculty(toAuthUser(req), req.query as any);
    sendPaginated(res, data, meta);
  } catch (err) { next(err); }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.getFacultyById(toAuthUser(req), req.params.id as string);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId } = req.user!;
    const data = await service.createFaculty(instituteId, req.body);
    sendSuccess(res, data, 201, "Faculty created successfully");
  } catch (err) { next(err); }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.updateFaculty(toAuthUser(req), req.params.id as string, req.body);
    sendSuccess(res, data, 200, "Faculty updated successfully");
  } catch (err) { next(err); }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteFaculty(toAuthUser(req), req.params.id as string);
    sendSuccess(res, null, 200, "Faculty deleted successfully");
  } catch (err) { next(err); }
};

export const getCourses = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await service.getAllFacultyCourses(toAuthUser(req), req.query as any);
    sendPaginated(res, data, meta);
  } catch (err) { next(err); }
};

export const assignCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { batchId, facultyId } = req.body;
    const data = await service.assignFacultyToBatch(batchId, facultyId);
    sendSuccess(res, data, 200, "Faculty assigned to batch successfully");
  } catch (err) { next(err); }
};

export const getAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await service.getAllFacultyAttendance(toAuthUser(req), req.query as any);
    sendPaginated(res, data, meta);
  } catch (err) { next(err); }
};

export const markAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.logFacultyAttendance(toAuthUser(req), req.body);
    sendSuccess(res, data, 201, "Faculty attendance logged successfully");
  } catch (err) { next(err); }
};

export const getMyDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.getMyDashboard(toAuthUser(req));
    sendSuccess(res, data, 200, "Faculty dashboard retrieved successfully");
  } catch (err) { next(err); }
};

export const getMyStudents = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await service.getMyStudents(toAuthUser(req), req.query as any);
    sendPaginated(res, data, meta);
  } catch (err) { next(err); }
};
