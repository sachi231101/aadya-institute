import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/response";
import type { AuthUser } from "../auth/auth.types";
import * as service from "./assignment.service";
import type { AssignmentQueryDTO } from "./assignment.types";

export const getAssignments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getAssignments(
      req.user as unknown as AuthUser,
      req.query as AssignmentQueryDTO
    );
    sendSuccess(res, result.data, 200, "Assignments retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await service.getAssignmentById(
      req.user as unknown as AuthUser,
      req.params.id as string
    );
    sendSuccess(res, assignment, 200, "Assignment retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await service.createAssignment(
      req.user as unknown as AuthUser,
      req.body
    );
    sendSuccess(res, assignment, 201, "Assignment created successfully");
  } catch (error) {
    next(error);
  }
};

export const updateAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await service.updateAssignment(
      req.user as unknown as AuthUser,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, assignment, 200, "Assignment updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.deleteAssignment(
      req.user as unknown as AuthUser,
      req.params.id as string
    );
    sendSuccess(res, result, 200, "Assignment deleted successfully");
  } catch (error) {
    next(error);
  }
};
