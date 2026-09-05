import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { toAuthUser } from "../../utils/auth-user.util";
import { sendSuccess } from "../../utils/response";
import * as service from "./integration.service";
import { schemaForType } from "./integration.validation";

export const listIntegrations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.listIntegrationsService(toAuthUser(req));
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const normalizeIntegrationType = (raw: string): string =>
  String(raw).trim().toUpperCase().replace(/-/g, "_");

export const getIntegration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.getIntegrationService(
      toAuthUser(req),
      normalizeIntegrationType(String(req.params.type))
    );
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

export const upsertIntegration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const type = normalizeIntegrationType(String(req.params.type));
    const parsed = schemaForType(type).parse(req.body);
    const data = await service.upsertIntegrationService(toAuthUser(req), type, parsed);
    sendSuccess(res, data, 200, "Integration saved");
  } catch (err) {
    next(err);
  }
};

export const testIntegration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.testIntegrationService(
      toAuthUser(req),
      normalizeIntegrationType(String(req.params.type))
    );
    if (result.success) {
      sendSuccess(res, result, 200, result.message);
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: result.integration,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const disconnectIntegration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.disconnectIntegrationService(
      toAuthUser(req),
      normalizeIntegrationType(String(req.params.type))
    );
    sendSuccess(res, data, 200, "Integration disconnected");
  } catch (err) {
    next(err);
  }
};
