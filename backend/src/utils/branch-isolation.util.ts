import type { AuthUser } from "../modules/auth/auth.types";

export interface BranchScopeFilter {
  instituteId: string;
  branchId?: string;
}

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
  const isInstituteAdmin = user.roles.includes("ADMIN");

  if (isInstituteAdmin) {
    return {
      instituteId: user.instituteId,
      ...(requestedBranchId ? { branchId: requestedBranchId } : {}),
    };
  }

  // Non-admin roles: lock to user's assigned branchId if present
  return {
    instituteId: user.instituteId,
    ...(user.branchId ? { branchId: user.branchId } : {}),
  };
};

/**
 * Validate whether the authenticated user has access to a specific branch ID.
 * Returns true for ADMINs, or if targetBranchId matches user.branchId.
 */
export const hasBranchAccess = (
  user: AuthUser,
  targetBranchId: string
): boolean => {
  if (user.roles.includes("ADMIN")) {
    return true; // Admin has access to all branches in institute
  }
  return !!user.branchId && user.branchId === targetBranchId;
};
