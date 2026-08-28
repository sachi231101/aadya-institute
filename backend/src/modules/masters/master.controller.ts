import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
  listMastersService,
  getMasterByIdService,
  createMasterService,
  updateMasterService,
  deleteMasterService,
  toggleMasterStatusService,
  listAllEntityCountsService,
  listActiveMastersByTypeService,
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
    sendSuccess(res, result, 200, "Master record deactivated successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle a master record's active/inactive status
 */
export const toggleMasterStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const record = await toggleMasterStatusService(req.user!, id);
    sendSuccess(res, record, 200, `Master record ${record.status === "ACTIVE" ? "activated" : "deactivated"} successfully`);
  } catch (err) {
    next(err);
  }
};

/**
 * Get counts for all entity types (overview grid)
 */
export const getEntityCounts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const counts = await listAllEntityCountsService(req.user!);
    sendSuccess(res, counts, 200, "Entity counts retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Get active-only records for a given entity type (for dropdown consumption)
 */
export const getActiveMasters = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entityType = String(req.params.entityType);
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const records = await listActiveMastersByTypeService(req.user!, entityType, branchId);
    sendSuccess(res, records, 200, "Active master records retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Preview next sequential number for a given target document type
 */
export const previewNumberingSeries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { SequenceService } = await import("./sequence.service");
    const target = String(req.query.target || "ADMISSION");
    const branchCode = req.query.branchCode ? String(req.query.branchCode) : undefined;
    const courseCode = req.query.courseCode ? String(req.query.courseCode) : undefined;
    const result = await SequenceService.previewNextNumber(
      req.user!.instituteId,
      target,
      { branchCode, courseCode }
    );
    sendSuccess(res, result, 200, "Numbering series preview generated successfully");
  } catch (err) {
    next(err);
  }
};

