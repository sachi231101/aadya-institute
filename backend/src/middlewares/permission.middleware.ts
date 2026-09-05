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
  return requireAnyPermission(permission);
};

/**
 * Allow access if the user has ANY of the listed permissions.
 * Used for shared dropdown endpoints (e.g. active masters for assignment forms).
 */
export const requireAnyPermission = (...permissions: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const rawRoles = req.user?.roles ?? [];
    const userRoles = rawRoles.map((r: string) => r.toUpperCase());
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    if (userRoles.length === 0) {
      sendError(res, "Forbidden — no roles assigned", 403);
      return;
    }

    if (userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN")) {
      next();
      return;
    }

    for (const permission of permissions) {
      const allowed = await userHasPermission(userId, userRoles, permission);
      if (allowed) {
        next();
        return;
      }
    }

    logger.warn(
      { userId, roles: userRoles, requiredPermissions: permissions },
      "Permission check failed (any-of)"
    );
    sendError(res, "Forbidden — insufficient permissions", 403);
  };
};

async function userHasPermission(
  userId: string,
  userRoles: string[],
  permission: string
): Promise<boolean> {
  try {
    if (userRoles.includes("CENTER_MANAGER") || userRoles.includes("COUNSELLOR")) {
      const userPermission = await prisma.userPermission.findFirst({
        where: {
          userId,
          permission: { name: permission },
        },
      });
      if (userPermission) return true;

      const roleMatch = await prisma.rolePermission.findFirst({
        where: {
          role: { name: { in: userRoles } },
          permission: { name: permission },
        },
      });
      if (roleMatch) return true;

      if (userRoles.includes("COUNSELLOR")) {
        const anyUserPerm = await prisma.userPermission.count({ where: { userId } });
        if (
          anyUserPerm === 0 &&
          [
            "lead.read",
            "lead.create",
            "lead.update",
            "lead.convert",
            "branch.read",
            "dashboard.read",
            "master.read",
            "course.read",
          ].includes(permission)
        ) {
          return true;
        }
      }
      return false;
    }

    const match = await prisma.rolePermission.findFirst({
      where: {
        role: { name: { in: userRoles } },
        permission: { name: permission },
      },
    });
    if (match) return true;

    if (
      userRoles.includes("STUDENT") &&
      [
        "exam.take",
        "exam.read",
        "schedule.read",
        "attendance.read",
        "assignment.read",
        "assignment.submit",
        "recording.read",
        "student.read",
        "feedback.create",
      ].includes(permission)
    ) {
      return true;
    }

    return false;
  } catch (err) {
    logger.error({ err, userId, permission }, "Error during permission check");
    return false;
  }
}
