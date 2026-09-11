import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthUser } from "../auth/auth.types";
import * as service from "./google-workspace.service";

export const getConnectUrl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getConnectUrl(req.user as unknown as AuthUser);
    sendSuccess(res, result, 200, "Google authorization URL generated successfully");
  } catch (error) {
    next(error);
  }
};

export const handleOAuthCallback = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const integrationsPath =
    "/admin/administration/integrations/GOOGLE_WORKSPACE";
  const frontendUrl = env.FRONTEND_URL || "http://localhost:5173";
  const redirectUrl = new URL(integrationsPath, frontendUrl);

  try {
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };
    if (error) {
      throw new AppError(
        "Google authorization was cancelled or denied.",
        400,
        "OAUTH_FAILED"
      );
    }
    if (!code || !state) {
      throw new AppError(
        "Missing authorization code or state parameter",
        400,
        "OAUTH_FAILED"
      );
    }

    await service.handleOAuthCallback(code, state);
    redirectUrl.searchParams.set("google", "connected");
  } catch (error: unknown) {
    redirectUrl.searchParams.set("google", "error");
    redirectUrl.searchParams.set(
      "reason",
      error instanceof AppError && error.errorCode
        ? error.errorCode
        : "OAUTH_FAILED"
    );
  }

  res.redirect(302, redirectUrl.toString());
};

export const getConnectionStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getConnectionStatus(req.user as unknown as AuthUser);
    sendSuccess(res, result, 200, "Google Workspace status retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const disconnect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.disconnectGoogleWorkspace(req.user as unknown as AuthUser);
    sendSuccess(res, result, 200, result.message);
  } catch (error) {
    next(error);
  }
};

export const createMeetForSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const classSessionId = req.params.id as string;
    const result = await service.createMeetSpaceForSession(
      req.user as unknown as AuthUser,
      classSessionId,
      req.body
    );
    sendSuccess(res, result, 201, "Google Meet space created successfully for class session");
  } catch (error) {
    next(error);
  }
};

export const syncSessionRecordings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const classSessionId = req.params.id as string;
    const result = await service.syncSessionRecordings(
      req.user as unknown as AuthUser,
      classSessionId
    );
    sendSuccess(res, result, 200, result.message);
  } catch (error) {
    next(error);
  }
};
