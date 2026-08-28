import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import * as service from "./feedback.service";
import type { ListFeedbackQuery, FacultyRatingsQuery } from "./feedback.validation";

export const listFeedback = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.listFeedback(toAuthUser(req), req.query as ListFeedbackQuery);
    sendPaginated(res, result.data, result.meta, "Feedback retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const submitFeedback = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.submitFeedback(toAuthUser(req), req.body);
    sendSuccess(res, data, 201, "Feedback submitted successfully");
  } catch (err) {
    next(err);
  }
};

export const getFacultyRatings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.getFacultyRatings(
      toAuthUser(req),
      req.query as FacultyRatingsQuery
    );
    sendSuccess(res, data, 200, "Faculty ratings retrieved successfully");
  } catch (err) {
    next(err);
  }
};
