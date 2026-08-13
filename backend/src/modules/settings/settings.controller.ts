import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { SettingsService } from "./settings.service";
import { sendSuccess, sendError } from "../../utils/response";

export const getSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const data = await SettingsService.getSettings(userId);
    sendSuccess(res, data, 200, "User settings retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch settings", 400);
  }
};

export const updatePersonal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const result = await SettingsService.updatePersonalInfo(userId, req.body);
    sendSuccess(res, result, 200, "Personal information updated successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update personal information", 400);
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const result = await SettingsService.changePassword(userId, req.body);
    sendSuccess(res, result, 200, "Password updated successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update password", 400);
  }
};

export const updateNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const result = await SettingsService.updateNotifications(userId, req.body);
    sendSuccess(res, result, 200, "Notification preferences updated successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update notification preferences", 400);
  }
};

export const updateSystem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const result = await SettingsService.updateSystemPreferences(userId, req.body);
    sendSuccess(res, result, 200, "System preferences updated successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update system preferences", 400);
  }
};

export const revokeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const sessionId = req.params.id as string;
    const result = await SettingsService.revokeSession(userId, sessionId);
    sendSuccess(res, result, 200, "Session revoked successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to revoke session", 400);
  }
};
