import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import { EmailService } from "./email.service";
import type {
  ListEmailTemplatesQuery,
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
  SendTestEmailInput,
  ListEmailLogsQuery,
} from "./email.validation";

export const listTemplates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await EmailService.listTemplates(toAuthUser(req), req.query as unknown as ListEmailTemplatesQuery);
    sendPaginated(res, result.data, result.meta, "Email templates retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const getTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await EmailService.getTemplate(toAuthUser(req), String(req.params.id));
    sendSuccess(res, data, 200, "Email template retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const createTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await EmailService.createTemplate(toAuthUser(req), req.body as CreateEmailTemplateInput);
    sendSuccess(res, data, 201, "Email template created successfully");
  } catch (err) {
    next(err);
  }
};

export const updateTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await EmailService.updateTemplate(
      toAuthUser(req),
      String(req.params.id),
      req.body as UpdateEmailTemplateInput
    );
    sendSuccess(res, data, 200, "Email template updated successfully");
  } catch (err) {
    next(err);
  }
};

export const deleteTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await EmailService.deleteTemplate(toAuthUser(req), String(req.params.id));
    sendSuccess(res, null, 200, "Email template deactivated successfully");
  } catch (err) {
    next(err);
  }
};

export const listLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await EmailService.listLogs(toAuthUser(req), req.query as unknown as ListEmailLogsQuery);
    sendPaginated(res, result.data, result.meta, "Email logs retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const sendTest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await EmailService.sendTest(toAuthUser(req), req.body as SendTestEmailInput);
    sendSuccess(res, data, 200, "Test email sent successfully");
  } catch (err) {
    next(err);
  }
};
