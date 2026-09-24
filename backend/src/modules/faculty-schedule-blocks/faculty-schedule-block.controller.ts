import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { toAuthUser } from "../../utils/auth-user.util";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { facultyScheduleBlockService } from "./faculty-schedule-block.service";
import type { QueryFacultyScheduleBlocksDto } from "./faculty-schedule-block.types";

export const listBlocks = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = toAuthUser(req);
    const scope = getBranchScopeFilter(authUser, req.query.branchId as string | undefined);

    const filters: QueryFacultyScheduleBlocksDto = {
      facultyId: req.query.facultyId as string | undefined,
      branchIds: scope.branchIds,
      from: (req.query.from as string) || (req.query.startDate as string) || undefined,
      to: (req.query.to as string) || (req.query.endDate as string) || undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await facultyScheduleBlockService.list(
      authUser.instituteId,
      scope.branchId,
      filters
    );
    sendPaginated(res, result.data, result.meta, "Faculty schedule blocks retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const upsertBlock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = toAuthUser(req);
    const data = await facultyScheduleBlockService.upsert(
      authUser,
      authUser.instituteId,
      req.body
    );
    sendSuccess(res, data, 200, "Faculty schedule block saved successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteBlockByKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = toAuthUser(req);
    const data = await facultyScheduleBlockService.deleteByKey(authUser, authUser.instituteId, {
      facultyId: String(req.query.facultyId || ""),
      scheduledDate: String(req.query.scheduledDate || ""),
      startTime: String(req.query.startTime || ""),
    });
    sendSuccess(res, data, 200, "Faculty schedule block deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteBlockById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUser = toAuthUser(req);
    const data = await facultyScheduleBlockService.deleteById(
      authUser,
      authUser.instituteId,
      req.params.id as string
    );
    sendSuccess(res, data, 200, "Faculty schedule block deleted successfully");
  } catch (error) {
    next(error);
  }
};
