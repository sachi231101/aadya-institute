import type { User } from "@/types/auth.types";

const BRANCH_LOCKED_ROLES = ["CENTER_MANAGER", "COUNSELLOR"] as const;

/** True when user must only access their assigned branch (not admin). */
export const isBranchLockedUser = (user?: User | null): boolean => {
  if (!user) return false;
  const roles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
  if (roles.includes("ADMIN")) return false;
  return roles.some((r) =>
    (BRANCH_LOCKED_ROLES as readonly string[]).includes(r)
  );
};

/**
 * Resolve branch ID for API calls.
 * Branch-locked users always use their assigned branch; admins may filter optionally.
 */
export const getScopedBranchId = (
  user?: User | null,
  requestedBranchId?: string
): string | undefined => {
  if (!user) return requestedBranchId;
  const roles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
  if (roles.includes("ADMIN")) {
    return requestedBranchId;
  }
  if (isBranchLockedUser(user)) {
    return user.branchId ?? undefined;
  }
  return requestedBranchId ?? user.branchId ?? undefined;
};

/** Merge branch scope into list/query params for branch-locked portal users. */
export const mergeBranchScopedParams = <T extends { branchId?: string }>(
  user: User | null | undefined,
  params?: T
): T => {
  const branchId = getScopedBranchId(user, params?.branchId);
  return { ...(params ?? ({} as T)), ...(branchId ? { branchId } : {}) };
};
