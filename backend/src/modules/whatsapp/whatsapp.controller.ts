import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendError, sendPaginated } from "../../utils/response";
import { whatsAppService, NotificationService } from "./whatsapp.service";
import * as service from "./whatsapp.service";
import {
  sendTestMessageSchema,
  createTemplateSchema,
  updateTemplateSchema,
  toggleTemplateStatusSchema,
  upsertRuleSchema,
  listNotificationsQuerySchema,
} from "./whatsapp.validation";
import type { NotificationType } from "./whatsapp.types";

// ─── Test Message ────────────────────────────────────────────────────────────

export const sendTestMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { phone, name, campaignName, templateParams } = sendTestMessageSchema.parse(req.body);
    const result = await whatsAppService.sendTestMessage(
      phone,
      name,
      campaignName,
      templateParams,
      req.user?.instituteId
    );
    sendSuccess(res, result, 200, "Test WhatsApp message sent successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to send test WhatsApp message", 400);
  }
};

// ─── Notification Queries ───────────────────────────────────────────────────

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const query = listNotificationsQuerySchema.parse(req.query);
    const user = req.user!;
    const result = await service.getNotifications(
      {
        id: user.userId,
        name: "User",
        instituteId: user.instituteId,
        branchId: user.branchId,
        roles: user.roles,
        permissions: [],
      },
      {
        ...query,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
      }
    );

    sendPaginated(res, result.data, result.meta, "Notifications retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to list notifications", 400);
  }
};

export const getNotificationById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = req.user!;
    const notification = await service.getNotificationById(
      {
        id: user.userId,
        name: "User",
        instituteId: user.instituteId,
        branchId: user.branchId,
        roles: user.roles,
        permissions: [],
      },
      id
    );
    if (!notification) {
      sendError(res, "Notification not found", 404);
      return;
    }
    sendSuccess(res, notification, 200, "Notification retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to get notification", 400);
  }
};

export const resendNotification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = req.user!;
    const notification = await service.resendNotification(
      {
        id: user.userId,
        name: "User",
        instituteId: user.instituteId,
        branchId: user.branchId,
        roles: user.roles,
        permissions: [],
      },
      id
    );
    sendSuccess(res, notification, 200, "Notification re-queued successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to resend notification", 400);
  }
};

// ─── Template Management ──────────────────────────────────────────────────────

export const listTemplates = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const templates = await service.listTemplates();
    sendSuccess(res, templates, 200, "Templates retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to list templates", 500);
  }
};

export const createTemplate = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const body = createTemplateSchema.parse(req.body);
    const template = await service.createTemplate(body);
    sendSuccess(res, template, 201, "Template created successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to create template", 400);
  }
};

export const updateTemplate = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const body = updateTemplateSchema.parse(req.body);
    const template = await service.updateTemplate(id, body);
    sendSuccess(res, template, 200, "Template updated successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update template", 400);
  }
};

export const toggleTemplateStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = toggleTemplateStatusSchema.parse(req.body);
    const template = await service.toggleTemplateStatus(id, status);
    sendSuccess(res, template, 200, `Template status updated to ${status}`);
  } catch (err: any) {
    sendError(res, err.message || "Failed to toggle template status", 400);
  }
};

// ─── Rule Management ──────────────────────────────────────────────────────────

export const listRules = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const rules = await service.listRules();
    sendSuccess(res, rules, 200, "Rules retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to list rules", 500);
  }
};

export const upsertRule = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const body = upsertRuleSchema.parse(req.body);
    const rule = await service.upsertRule(body);
    sendSuccess(res, rule, 200, "Rule updated successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to upsert rule", 400);
  }
};

// ─── User In-App Notifications API ───────────────────────────────────────────

export const getUserNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const userId = req.user?.userId;

    if (!instituteId || !userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const roles = req.user?.roles || [];
    const branchId = req.user?.branchId;

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
