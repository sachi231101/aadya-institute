import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendError, sendPaginated } from "../../utils/response";
import * as service from "./notification.service";
import {
  createTemplateSchema,
  updateTemplateSchema,
  toggleTemplateStatusSchema,
  upsertRuleSchema,
  listNotificationsQuerySchema,
} from "./notification.validation";

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
