import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { toAuthUser } from "../../utils/auth-user.util";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { StudyMaterialService } from "./study-material.service";

export const listStudyMaterials = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await StudyMaterialService.list(toAuthUser(req), req.query as never);
    sendPaginated(res, result.data, result.meta, "Study materials retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createStudyMaterial = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await StudyMaterialService.create(toAuthUser(req), req.body);
    sendSuccess(res, data, 201, "Study material created successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteStudyMaterial = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await StudyMaterialService.remove(toAuthUser(req), req.params.id as string);
    sendSuccess(res, null, 200, "Study material deleted successfully");
  } catch (error) {
    next(error);
  }
};
