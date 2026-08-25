import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
  listMastersService,
  getMasterByIdService,
  createMasterService,
  updateMasterService,
  deleteMasterService,
} from "./master.service";
import {
  masterListQuerySchema,
  createMasterRecordSchema,
  updateMasterRecordSchema,
} from "./master.validation";
import { sendSuccess, sendPaginated } from "../../utils/response";

export const getMasters = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entityType = String(req.params.entityType);
    const query = masterListQuerySchema.parse(req.query);
    const result = await listMastersService(req.user!, entityType, query);
    sendPaginated(res, result.records, result.meta, "Master records retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const getMasterById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const record = await getMasterByIdService(req.user!, id);
    sendSuccess(res, record, 200, "Master record retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const createMaster = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entityType = String(req.params.entityType);
    const input = createMasterRecordSchema.parse({
      ...req.body,
      entityType,
    });
    const record = await createMasterService(req.user!, input);
    sendSuccess(res, record, 201, "Master record created successfully");
  } catch (err) {
    next(err);
  }
};

export const updateMaster = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const input = updateMasterRecordSchema.parse(req.body);
    const record = await updateMasterService(req.user!, id, input);
    sendSuccess(res, record, 200, "Master record updated successfully");
  } catch (err) {
    next(err);
  }
};

export const deleteMaster = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const result = await deleteMasterService(req.user!, id);
    sendSuccess(res, result, 200, "Master record deleted successfully");
  } catch (err) {
    next(err);
  }
};
