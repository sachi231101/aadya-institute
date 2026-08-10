import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";
import { prisma } from "../config/database";
import { sendError } from "../utils/response";

/**
 * Factory: checks that the user's roles have the given permission string.
 */
export const requirePermission = (permission: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userRoles = req.user?.roles ?? [];

    if (userRoles.length === 0) {
      sendError(res, "Forbidden — no roles assigned", 403);
      return;
    }

    try {
      const match = await prisma.rolePermission.findFirst({
        where: {
          role: { name: { in: userRoles } },
          permission: { name: permission },
        },
      });

      if (!match) {
        sendError(res, `Forbidden — missing permission: ${permission}`, 403);
        return;
      }

      next();
    } catch {
      sendError(res, "Internal error during permission check", 500);
    }
  };
};
