import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import type { AuthUser } from "../auth/auth.types";
import { sendSuccess, sendPaginated } from "../../utils/response";
import * as service from "./attendance.service";

export const getRoster = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, meta } = await service.getRoster(req.user as unknown as AuthUser, req.query as any);
    sendPaginated(res, data, meta);
  } catch (err) { next(err); }
};

export const mark = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.markAttendance(req.body, req.user?.userId);
    sendSuccess(res, data, 200, "Attendance marked successfully");
  } catch (err) { next(err); }
};

export const bulkMark = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.bulkMarkAttendance(req.body, req.user?.userId);
    sendSuccess(res, data, 200, "Bulk attendance marked successfully");
  } catch (err) { next(err); }
};

export const getSessionAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.getSessionAttendance(req.params.sessionId as string);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};
