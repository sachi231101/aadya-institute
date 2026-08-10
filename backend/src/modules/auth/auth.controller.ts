import type { Request, Response, NextFunction } from "express";
import { loginService, refreshTokenService, getMeService } from "./auth.service";
import { sendSuccess, sendError } from "../../utils/response";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user, tokens } = await loginService(req.body);
    sendSuccess(res, { user, ...tokens }, 200, "Login successful");
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tokens = await refreshTokenService(req.body.refreshToken);
    sendSuccess(res, tokens, 200, "Tokens refreshed");
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
