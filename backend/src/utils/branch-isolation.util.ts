import type { AuthUser } from "../modules/auth/auth.types";
import { AppError } from "../middlewares/error.middleware";

export interface BranchScopeFilter {
  instituteId: string;
  /** Single-branch lock when exactly one branch applies. */
  branchId?: string;
  /**
   * Multi-branch access from UserBranchAccess.
   * For list queries, pass to repository as `branchIds` for an IN filter
   * when `branchId` is unset and this array has length > 0.
   */
  branchIds?: string[];
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
 * Rules (AGENTS.md Section 19 + UserBranchAccess):
 * - ADMIN: Access to all branches within their instituteId. Can optionally filter by requestedBranchId.
 * - Non-admin with `allowedBranchIds` (length > 0):
 *   - If exactly one allowed id → set `branchId` to that id.
 *   - If multiple → omit `branchId` and set `branchIds` for callers/list repos to use IN.
 *   - Frontend `requestedBranchId` is ignored (cannot spoof scope).
 * - Otherwise: lock to `user.branchId` when present.
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

  const allowed = user.allowedBranchIds ?? [];
  if (allowed.length > 0) {
    if (allowed.length === 1) {
      return {
        instituteId: user.instituteId,
        branchId: allowed[0],
      };
    }
    // Multiple allowed branches: do not pin a single branchId.
    // List repositories should filter with `id: { in: branchIds }`.
    return {
      instituteId: user.instituteId,
      branchIds: allowed,
    };
  }

  // Fall back to primary assigned branchId
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
 * ADMIN: always true.
 * Else if allowedBranchIds is non-empty: true when target is included.
 * Else: true when target matches user.branchId.
 */
export const hasBranchAccess = (
  user: AuthUser,
  targetBranchId: string
): boolean => {
  if (user.roles.includes("ADMIN")) {
    return true;
  }

  const allowed = user.allowedBranchIds ?? [];
  if (allowed.length > 0) {
    return allowed.includes(targetBranchId);
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

  const allowed = user.allowedBranchIds ?? [];
  if (allowed.length > 0) {
    if (!recordBranchId || !allowed.includes(recordBranchId)) {
      throw new AppError(message, 404);
    }
    return;
  }

  if (!user.branchId) {
    throw new AppError("Branch assignment required", 403);
  }
  if (!recordBranchId || recordBranchId !== user.branchId) {
    throw new AppError(message, 404);
  }
};
