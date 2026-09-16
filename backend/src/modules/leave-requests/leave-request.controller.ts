import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import * as service from "./leave-request.service";
import type { CreateLeaveRequestInput, ReviewLeaveRequestInput } from "./leave-request.validation";

export const createLeaveRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.createLeaveRequest(toAuthUser(req), req.body as CreateLeaveRequestInput);
    sendSuccess(res, data, 201, "Leave request submitted");
  } catch (err) {
    next(err);
  }
};

export const listMyLeaveRequests = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.listMyLeaveRequests(toAuthUser(req));
    sendSuccess(res, data, 200, "Leave requests retrieved");
  } catch (err) {
    next(err);
  }
};

export const cancelLeaveRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.cancelLeaveRequest(toAuthUser(req), req.params.id as string);
    sendSuccess(res, data, 200, "Leave request cancelled");
  } catch (err) {
    next(err);
  }
};

export const listPendingLeaveRequests = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.listPendingLeaveRequests(toAuthUser(req));
    sendSuccess(res, data, 200, "Pending leave requests retrieved");
  } catch (err) {
    next(err);
  }
};

export const reviewLeaveRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.reviewLeaveRequest(
      toAuthUser(req),
      req.params.id as string,
      req.body as ReviewLeaveRequestInput
    );
    sendSuccess(res, data, 200, data.status === "APPROVED" ? "Leave approved" : "Leave rejected");
  } catch (err) {
    next(err);
  }
};
