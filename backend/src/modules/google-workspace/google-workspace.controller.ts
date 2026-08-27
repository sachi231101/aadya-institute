import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendError } from "../../utils/response";
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
  next: NextFunction
): Promise<void> => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    if (!code || !state) {
      sendError(res, "Missing authorization code or state parameter", 400);
      return;
    }

    const result = await service.handleOAuthCallback(code, state);
    sendSuccess(res, result, 200, "Google Workspace account connected successfully");
  } catch (error) {
    next(error);
  }
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
