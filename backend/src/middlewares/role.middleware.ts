import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";
import { sendError } from "../utils/response";

/**
 * Factory: requires the authenticated user to have AT LEAST ONE of the given roles.
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const userRoles = req.user?.roles ?? [];

    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      sendError(res, "Forbidden — insufficient role", 403);
      return;
    }

    next();
  };
};
