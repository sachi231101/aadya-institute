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
 * - ADMIN role bypasses all permission checks.
 * - CENTER_MANAGER uses per-user permissions from the UserPermission table.
 * - COUNSELLOR has specific hardcoded permissions for lead management.
 * - Other roles fall back to role-level permissions from RolePermission.
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

    // ADMIN always has full access
    if (userRoles.includes("ADMIN")) {
      next();
      return;
    }

    // CENTER_MANAGER: check per-user permissions from UserPermission table
    if (userRoles.includes("CENTER_MANAGER")) {
      try {
        const userPermission = await prisma.userPermission.findFirst({
          where: {
            userId,
            permission: { name: permission },
          },
        });

        if (userPermission) {
          next();
          return;
        }

        // Also check role-level permissions as fallback (for always-on permissions)
        const roleMatch = await prisma.rolePermission.findFirst({
          where: {
            role: { name: { in: userRoles } },
            permission: { name: permission },
          },
        });

        if (roleMatch) {
          next();
          return;
        }

        logger.warn(
          { userId, roles: userRoles, requiredPermission: permission },
          "CENTER_MANAGER permission check failed"
        );
        sendError(res, "Forbidden — insufficient permissions", 403);
        return;
      } catch (err) {
        logger.error({ err, userId, permission }, "Error during CENTER_MANAGER permission check");
        sendError(res, "Internal error during permission check", 500);
        return;
      }
    }

    // COUNSELLOR: check per-user permissions from UserPermission table (same as CENTER_MANAGER)
    if (userRoles.includes("COUNSELLOR")) {
      try {
        const userPermission = await prisma.userPermission.findFirst({
          where: {
            userId,
            permission: { name: permission },
          },
        });

        if (userPermission) {
          next();
          return;
        }

        // Also check role-level permissions as fallback
        const roleMatch = await prisma.rolePermission.findFirst({
          where: {
            role: { name: { in: userRoles } },
            permission: { name: permission },
          },
        });

        if (roleMatch) {
          next();
          return;
        }

        // Backward compat: if no UserPermission records exist at all, allow legacy hardcoded set
        const anyUserPerm = await prisma.userPermission.count({ where: { userId } });
        if (
          anyUserPerm === 0 &&
          ["lead.read", "lead.create", "lead.update", "lead.convert", "branch.read", "dashboard.read"].includes(permission)
        ) {
          next();
          return;
        }

        logger.warn(
          { userId, roles: userRoles, requiredPermission: permission },
          "COUNSELLOR permission check failed"
        );
        sendError(res, "Forbidden — insufficient permissions", 403);
        return;
      } catch (err) {
        logger.error({ err, userId, permission }, "Error during COUNSELLOR permission check");
        sendError(res, "Internal error during permission check", 500);
        return;
      }
    }

    // General: check role-level permissions
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
