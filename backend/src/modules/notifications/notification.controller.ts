import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { NotificationService } from "./notification.service";
import { sendSuccess, sendError } from "../../utils/response";
import type { NotificationType } from "./notification.types";

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const userId = req.user?.userId;
    const roles = req.user?.roles || [];
    const branchId = req.user?.branchId;

    if (!instituteId || !userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const filters = {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      type: req.query.type ? (req.query.type as NotificationType) : undefined,
      module: req.query.module ? String(req.query.module) : undefined,
      role: req.query.role ? String(req.query.role) : undefined,
      unreadOnly: req.query.unreadOnly === "true",
      search: req.query.search ? String(req.query.search) : undefined,
    };

    const data = await NotificationService.getNotifications(
      instituteId,
      userId,
      filters,
      roles,
      branchId
    );
    sendSuccess(res, data, 200, "Notifications retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch notifications", 400);
  }
};

export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const userId = req.user?.userId;
    const roles = req.user?.roles || [];
    const branchId = req.user?.branchId;

    if (!instituteId || !userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const data = await NotificationService.getUnreadCount(
      instituteId,
      userId,
      roles,
      branchId
    );
    sendSuccess(res, data, 200, "Unread count retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch unread count", 400);
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const notificationId = req.params.id as string;
    const data = await NotificationService.markAsRead(notificationId, userId);
    sendSuccess(res, data, 200, "Notification marked as read");
  } catch (err: any) {
    sendError(res, err.message || "Failed to mark notification as read", 400);
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const userId = req.user?.userId;
    const roles = req.user?.roles || [];
    const branchId = req.user?.branchId;

    if (!instituteId || !userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const data = await NotificationService.markAllAsRead(
      instituteId,
      userId,
      roles,
      branchId
    );
    sendSuccess(res, data, 200, "All notifications marked as read");
  } catch (err: any) {
    sendError(res, err.message || "Failed to mark all notifications as read", 400);
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const notificationId = req.params.id as string;
    const data = await NotificationService.deleteNotification(notificationId, userId);
    sendSuccess(res, data, 200, "Notification deleted");
  } catch (err: any) {
    sendError(res, err.message || "Failed to delete notification", 400);
  }
};
