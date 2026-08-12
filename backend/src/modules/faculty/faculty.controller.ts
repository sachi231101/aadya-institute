import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import type { AuthUser } from "../auth/auth.types";
import { sendSuccess, sendPaginated } from "../../utils/response";
import * as service from "./faculty.service";

export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await service.getAllFaculty(req.user as unknown as AuthUser, req.query as any);
    sendPaginated(res, data, meta);
  } catch (err) { next(err); }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.getFacultyById(req.params.id as string);
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
    const data = await service.updateFaculty(req.params.id as string, req.body);
    sendSuccess(res, data, 200, "Faculty updated successfully");
  } catch (err) { next(err); }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteFaculty(req.params.id as string);
    sendSuccess(res, null, 200, "Faculty deleted successfully");
  } catch (err) { next(err); }
};

// ─── Faculty Course Assignments ─────────────────────────────────────────

export const getCourses = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await service.getAllFacultyCourses(req.user as unknown as AuthUser, req.query as any);
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

// ─── Faculty Attendance ─────────────────────────────────────────────────

export const getAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await service.getAllFacultyAttendance(req.user as unknown as AuthUser, req.query as any);
    sendPaginated(res, data, meta);
  } catch (err) { next(err); }
};

export const markAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.logFacultyAttendance(req.body);
    sendSuccess(res, data, 201, "Faculty attendance logged successfully");
  } catch (err) { next(err); }
};
