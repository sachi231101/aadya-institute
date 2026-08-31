import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import * as service from "./assignment.service";
import type { AssignmentQueryDTO } from "./assignment.types";

export const getAssignments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getAssignments(toAuthUser(req), req.query as AssignmentQueryDTO);
    sendPaginated(res, result.data, result.meta, "Assignments retrieved successfully");
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
    const assignment = await service.getAssignmentById(toAuthUser(req), req.params.id as string);
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
    const assignment = await service.createAssignment(toAuthUser(req), req.body);
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
      toAuthUser(req),
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
    const result = await service.deleteAssignment(toAuthUser(req), req.params.id as string);
    sendSuccess(res, result, 200, "Assignment deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const gradeSubmission = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.gradeSubmission(
      toAuthUser(req),
      req.params.submissionId as string,
      req.body
    );
    sendSuccess(res, result, 200, "Submission graded successfully");
  } catch (error) {
    next(error);
  }
};

export const submitAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.submitAssignment(
      toAuthUser(req),
      req.params.id as string,
      req.body
    );
    sendSuccess(res, result, 201, "Assignment submitted successfully");
  } catch (error) {
    next(error);
  }
};
