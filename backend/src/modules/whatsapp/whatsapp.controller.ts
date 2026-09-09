import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendError, sendPaginated } from "../../utils/response";
import { whatsAppService, NotificationService } from "./whatsapp.service";
import * as service from "./whatsapp.service";
import {
  sendTestMessageSchema,
  createTemplateSchema,
  updateTemplateSchema,
  toggleTemplateStatusSchema,
  syncTemplatesSchema,
  upsertRuleSchema,
  listNotificationsQuerySchema,
  patchAutomationConfigSchema,
  patchAutomationSchema,
  automationTestSchema,
  automationTypeParamSchema,
} from "./whatsapp.validation";
import type { NotificationType } from "./whatsapp.types";
import { toAuthUser } from "../../utils/auth-user.util";
import { AppError } from "../../middlewares/error.middleware";

const handle = (err: unknown, res: Response, fallback: string) => {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  const message = err instanceof Error ? err.message : fallback;
  sendError(res, message, 400);
};

export const sendTestMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { phone, name, campaignName, templateParams } = sendTestMessageSchema.parse(req.body);
    if (!campaignName) {
      sendError(res, "Campaign name is required for raw test send", 400);
      return;
    }
    const result = await whatsAppService.sendTestMessage(
      phone,
      name,
      campaignName,
      templateParams,
      req.user?.instituteId
    );
    sendSuccess(res, result, 200, "Test WhatsApp message sent successfully");
  } catch (err) {
    handle(err, res, "Failed to send test WhatsApp message");
  }
};

export const getAutomationConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await service.getAutomationConfig(req.user!.instituteId);
    sendSuccess(res, data, 200, "WhatsApp automation config retrieved");
  } catch (err) {
    handle(err, res, "Failed to get automation config");
  }
};

export const patchAutomationConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = patchAutomationConfigSchema.parse(req.body);
    const data = await service.patchAutomationConfig(toAuthUser(req), body.enabled);
    sendSuccess(res, data, 200, "WhatsApp automation config updated");
  } catch (err) {
    handle(err, res, "Failed to update automation config");
  }
};

export const listAutomations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await service.listAutomations(req.user!.instituteId);
    sendSuccess(res, data, 200, "Automations retrieved");
  } catch (err) {
    handle(err, res, "Failed to list automations");
  }
};

export const patchAutomation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = automationTypeParamSchema.parse(req.params);
    const body = patchAutomationSchema.parse(req.body);
    const data = await service.patchAutomation(toAuthUser(req), type, body);
    sendSuccess(res, data, 200, "Automation updated");
  } catch (err) {
    handle(err, res, "Failed to update automation");
  }
};

export const testAutomation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = automationTypeParamSchema.parse(req.params);
    const body = automationTestSchema.parse(req.body);
    const data = await service.sendAutomationTest(
      toAuthUser(req),
      type,
      body.phone,
      body.name
    );
    sendSuccess(res, data, 200, "Test message queued");
  } catch (err) {
    handle(err, res, "Failed to send test message");
  }
};

export const getHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = listNotificationsQuerySchema.parse(req.query);
    const result = await service.getHistory(toAuthUser(req), {
      ...query,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
    sendPaginated(res, result.data, result.meta, "WhatsApp history retrieved");
  } catch (err) {
    handle(err, res, "Failed to load history");
  }
};

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query = listNotificationsQuerySchema.parse(req.query);
    const result = await service.getNotifications(toAuthUser(req), {
      ...query,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
    sendPaginated(res, result.data, result.meta, "Notifications retrieved successfully");
  } catch (err) {
    handle(err, res, "Failed to list notifications");
  }
};

export const getNotificationById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const notification = await service.getNotificationById(
      toAuthUser(req),
      String(req.params.id)
    );
    if (!notification) {
      sendError(res, "Notification not found", 404);
      return;
    }
    sendSuccess(res, notification, 200, "Notification retrieved successfully");
  } catch (err) {
    handle(err, res, "Failed to get notification");
  }
};

export const resendNotification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const notification = await service.resendNotification(
      toAuthUser(req),
      String(req.params.id)
    );
    sendSuccess(res, notification, 200, "Notification re-queued successfully");
  } catch (err) {
    handle(err, res, "Failed to resend notification");
  }
};

export const listTemplates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const templates = await service.listTemplates(req.user!.instituteId);
    sendSuccess(res, templates, 200, "Templates retrieved successfully");
  } catch (err) {
    handle(err, res, "Failed to list templates");
  }
};

export const listProviderTemplates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const templates = await service.listProviderTemplates(toAuthUser(req));
    sendSuccess(res, templates, 200, "MSG91 templates retrieved successfully");
  } catch (err) {
    handle(err, res, "Failed to list MSG91 templates");
  }
};

export const syncTemplates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = syncTemplatesSchema.parse(req.body ?? {});
    const result = await service.syncTemplatesFromMsg91(toAuthUser(req), body);
    sendSuccess(res, result, 200, "Templates synced from MSG91");
  } catch (err) {
    handle(err, res, "Failed to sync MSG91 templates");
  }
};

export const createTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = createTemplateSchema.parse(req.body);
    const template = await service.createTemplate(toAuthUser(req), body);
    sendSuccess(res, template, 201, "Template created successfully");
  } catch (err) {
    handle(err, res, "Failed to create template");
  }
};

export const updateTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = updateTemplateSchema.parse(req.body);
    const template = await service.updateTemplate(
      toAuthUser(req),
      String(req.params.id),
      body
    );
    sendSuccess(res, template, 200, "Template updated successfully");
  } catch (err) {
    handle(err, res, "Failed to update template");
  }
};

export const deleteTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = await service.deleteTemplate(toAuthUser(req), String(req.params.id));
    sendSuccess(res, data, 200, "Template deleted");
  } catch (err) {
    handle(err, res, "Failed to delete template");
  }
};

export const toggleTemplateStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { status } = toggleTemplateStatusSchema.parse(req.body);
    const template = await service.toggleTemplateStatus(
      toAuthUser(req),
      String(req.params.id),
      status
    );
    sendSuccess(res, template, 200, `Template status updated to ${status}`);
  } catch (err) {
    handle(err, res, "Failed to toggle template status");
  }
};

export const listRules = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rules = await service.listRules(req.user!.instituteId);
    sendSuccess(res, rules, 200, "Rules retrieved successfully");
  } catch (err) {
    handle(err, res, "Failed to list rules");
  }
};

export const upsertRule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = upsertRuleSchema.parse(req.body);
    const rule = await service.upsertRule(toAuthUser(req), body);
    sendSuccess(res, rule, 200, "Rule updated successfully");
  } catch (err) {
    handle(err, res, "Failed to upsert rule");
  }
};

export const getUserNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const userId = req.user?.userId;
    if (!instituteId || !userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }
    const filters = {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      type: req.query.type ? (req.query.type as NotificationType) : undefined,
      unreadOnly: req.query.unreadOnly === "true",
      search: req.query.search ? String(req.query.search) : undefined,
    };
    const data = await NotificationService.getNotifications(
      instituteId,
      userId,
      filters,
      req.user?.roles || [],
      req.user?.branchId
    );
    sendSuccess(res, data, 200, "Notifications retrieved successfully");
  } catch (err) {
    handle(err, res, "Failed to fetch notifications");
  }
};

export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const userId = req.user?.userId;
    if (!instituteId || !userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }
    const data = await NotificationService.getUnreadCount(
      instituteId,
      userId,
      req.user?.roles || [],
      req.user?.branchId
    );
    sendSuccess(res, data, 200, "Unread count retrieved successfully");
  } catch (err) {
    handle(err, res, "Failed to fetch unread count");
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }
    const data = await NotificationService.markAsRead(String(req.params.id), userId);
    sendSuccess(res, data, 200, "Notification marked as read");
  } catch (err) {
    handle(err, res, "Failed to mark notification as read");
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const userId = req.user?.userId;
    if (!instituteId || !userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }
    const data = await NotificationService.markAllAsRead(
      instituteId,
      userId,
      req.user?.roles || [],
      req.user?.branchId
    );
    sendSuccess(res, data, 200, "All notifications marked as read");
  } catch (err) {
    handle(err, res, "Failed to mark all notifications as read");
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }
    const data = await NotificationService.deleteNotification(String(req.params.id), userId);
    sendSuccess(res, data, 200, "Notification deleted");
  } catch (err) {
    handle(err, res, "Failed to delete notification");
  }
};
