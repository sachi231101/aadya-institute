import type { Request, Response, NextFunction } from "express";
import {
  loginService,
  refreshTokenService,
  logoutService,
  logoutAllService,
  getMeService,
} from "./auth.service";
import { sendSuccess } from "../../utils/response";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";

const clientMeta = (req: Request) => ({
  ipAddress:
    req.ip ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    null,
  userAgent: (req.headers["user-agent"] as string) || null,
});

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const meta = clientMeta(req);
    const { user, tokens } = await loginService({
      ...req.body,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    sendSuccess(res, { user, ...tokens }, 200, "Login successful");
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tokens = await refreshTokenService(req.body.refreshToken, clientMeta(req));
    sendSuccess(res, tokens, 200, "Tokens refreshed");
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await logoutService(req.user!.userId, req.body.refreshToken);
    sendSuccess(res, null, 200, "Logged out successfully");
  } catch (err) {
    next(err);
  }
};

export const logoutAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await logoutAllService(req.user!.userId);
    sendSuccess(res, null, 200, "Logged out of all sessions");
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await getMeService(req.user!.userId);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};
