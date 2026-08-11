import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import * as service from "./faculty.service";

export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instituteId, branchId } = req.user!;
    const { data, meta } = await service.getAllFaculty(instituteId, branchId, req.query as any);
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
