import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { toAuthUser } from "../../utils/auth-user.util";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { AnnouncementService } from "./announcement.service";

export const listAnnouncements = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await AnnouncementService.list(toAuthUser(req), req.query as never);
    sendPaginated(res, result.data, result.meta, "Announcements retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await AnnouncementService.create(toAuthUser(req), req.body);
    sendSuccess(res, data, 201, "Announcement created successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await AnnouncementService.remove(toAuthUser(req), req.params.id as string);
    sendSuccess(res, null, 200, "Announcement deleted successfully");
  } catch (error) {
    next(error);
  }
};
