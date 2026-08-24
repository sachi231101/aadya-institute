import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";
import { prisma } from "../config/database";
import { sendError } from "../utils/response";
import { logger } from "../config/logger";

/**
 * Factory: checks that the authenticated user's roles have the given permission.
 *
 * Usage: router.get("/students", authMiddleware, requirePermission("student.read"), handler)
 *
 * Security notes:
 * - Always runs after authMiddleware — req.user is guaranteed to exist.
 * - Checks permissions by role name against the database, not just the JWT payload.
 *   This ensures revoked permissions take effect without waiting for the JWT to expire.
 * - Returns generic 403 in production; permission name is visible in development.
 */
export const requirePermission = (permission: string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userRoles = req.user?.roles ?? [];
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    if (userRoles.length === 0) {
      sendError(res, "Forbidden — no roles assigned", 403);
      return;
    }

    if (
      userRoles.includes("ADMIN") ||
      (userRoles.includes("CENTER_MANAGER") && (permission.startsWith("user.") || permission.startsWith("lead."))) ||
      (userRoles.includes("COUNSELLOR") && ["lead.read", "lead.create", "lead.update", "lead.convert", "branch.read"].includes(permission))
    ) {
      next();
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
        logger.warn(
          { userId, roles: userRoles, requiredPermission: permission },
          "Permission check failed"
        );
        sendError(res, "Forbidden — insufficient permissions", 403);
        return;
      }

      next();
    } catch (err) {
      logger.error({ err, userId, permission }, "Error during permission check");
      sendError(res, "Internal error during permission check", 500);
    }
  };
};
