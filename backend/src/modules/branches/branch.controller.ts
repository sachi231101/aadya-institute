import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import {
  listBranchesService,
  getBranchService,
  createBranchService,
  updateBranchService,
  updateBranchManagerService,
  deleteBranchService,
  getBranchStatsService,
} from "./branch.service";
import type { AuthUser } from "../auth/auth.types";

export const listBranches = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { branches, meta } = await listBranchesService(
      req.user as unknown as AuthUser,
      req.query as any
    );
    sendPaginated(res, branches, meta);
  } catch (err) {
    next(err);
  }
};

export const getBranch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branch = await getBranchService(
      req.user as unknown as AuthUser,
      req.params.id as string
    );
    sendSuccess(res, branch);
  } catch (err) {
    next(err);
  }
};

export const createBranch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branch = await createBranchService(
      req.user as unknown as AuthUser,
      req.body
    );
    sendSuccess(res, branch, 201, "Branch created successfully");
  } catch (err) {
    next(err);
  }
};

export const updateBranch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branch = await updateBranchService(
      req.user as unknown as AuthUser,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, branch, 200, "Branch updated successfully");
  } catch (err) {
    next(err);
  }
};

export const updateBranchManager = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branch = await updateBranchManagerService(
      req.user as unknown as AuthUser,
      req.params.id as string,
      req.body.managerUserId ?? null
    );
    sendSuccess(res, branch, 200, "Branch manager updated successfully");
  } catch (err) {
    next(err);
  }
};

export const deleteBranch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branch = await deleteBranchService(
      req.user as unknown as AuthUser,
      req.params.id as string
    );
    sendSuccess(res, branch, 200, "Branch deleted successfully");
  } catch (err) {
    next(err);
  }
};

export const getBranchStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getBranchStatsService(
      req.user as unknown as AuthUser,
      req.params.id as string
    );
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
};
