import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";
import { hasBranchAccess } from "../utils/branch-isolation.util";
import { sendError } from "../utils/response";
import { logger } from "../config/logger";
import type { AuthUser } from "../modules/auth/auth.types";

/**
 * Middleware factory: validates that the authenticated user has authorization
 * to access the branch ID specified in request params (e.g. req.params.id or req.params.branchId).
 *
 * Rules:
 * - ADMIN: Access granted for any branch within their institute.
 * - Non-ADMIN: Access granted ONLY if req.params[paramName] === req.user.branchId.
 * - On mismatch: returns 404 Not Found (to prevent branch resource enumeration).
 */
export const requireBranchAccess = (paramName: string = "id") => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const user = req.user as unknown as AuthUser;
    const targetBranchId = req.params[paramName] as string;

    const userId = user?.id || (user as any)?.userId;

    if (!user || !userId) {
      sendError(res, "Unauthorized", 401);
      return;
    }


    if (!targetBranchId) {
      next();
      return;
    }

    const isAllowed = hasBranchAccess(user, targetBranchId);

    if (!isAllowed) {
      logger.warn(
        {
          userId: user.id,
          userBranchId: user.branchId,
          targetBranchId,
          roles: user.roles,
        },
        "Cross-branch access blocked"
      );
      // Return 404 Not Found instead of 403 Forbidden to prevent branch resource enumeration
      sendError(res, "Branch not found", 404);
      return;
    }

    next();
  };
};
