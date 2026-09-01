import type { AuthUser } from "../modules/auth/auth.types";
import { AppError } from "../middlewares/error.middleware";

export interface BranchScopeFilter {
  instituteId: string;
  branchId?: string;
}

const BRANCH_LOCKED_ROLES = [
  "CENTER_MANAGER",
  "COUNSELLOR",
  "FACULTY",
  "STUDENT",
] as const;

/** True when user is not admin and holds a branch-scoped operational role. */
export const isBranchLockedRole = (roles: string[]): boolean => {
  if (roles.includes("ADMIN")) return false;
  return roles.some((r) =>
    (BRANCH_LOCKED_ROLES as readonly string[]).includes(r)
  );
};

/**
 * Construct Prisma `where` clause filter fragment for branch-level data isolation.
 *
 * Rules (AGENTS.md Section 19):
 * - ADMIN: Access to all branches within their instituteId. Can optionally filter by requestedBranchId.
 * - CENTER_MANAGER / FACULTY / COUNSELLOR / STUDENT: Access is strictly locked to user.branchId.
 *   Any requestedBranchId from frontend is ignored for non-Admin users.
 */
export const getBranchScopeFilter = (
  user: AuthUser,
  requestedBranchId?: string
): BranchScopeFilter => {
  const isGlobalRole = user.roles.includes("ADMIN");

  if (isGlobalRole) {
    return {
      instituteId: user.instituteId,
      ...(requestedBranchId ? { branchId: requestedBranchId } : {}),
    };
  }

  // Branch-specific roles: lock to user's assigned branchId if present
  return {
    instituteId: user.instituteId,
    ...(user.branchId ? { branchId: user.branchId } : {}),
  };
};

/** Resolve the branch ID that should be used for a query (ignores spoofed params for branch-locked roles). */
export const resolveEffectiveBranchId = (
  user: AuthUser,
  requestedBranchId?: string
): string | undefined => getBranchScopeFilter(user, requestedBranchId).branchId;

/**
 * Validate whether the authenticated user has access to a specific branch ID.
 * Returns true for ADMINs, or if targetBranchId matches user.branchId.
 */
export const hasBranchAccess = (
  user: AuthUser,
  targetBranchId: string
): boolean => {
  if (user.roles.includes("ADMIN")) {
    return true;
  }
  return !!user.branchId && user.branchId === targetBranchId;
};

/** Deny access when a branch-locked user tries to read another branch's record. */
export const assertBranchRecordAccess = (
  user: AuthUser,
  recordBranchId: string | null | undefined,
  message = "Resource not found"
): void => {
  if (user.roles.includes("ADMIN")) return;
  if (!user.branchId) {
    throw new AppError("Branch assignment required", 403);
  }
  if (!recordBranchId || recordBranchId !== user.branchId) {
    throw new AppError(message, 404);
  }
};
