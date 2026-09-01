import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { buildMeta } from "../../utils/pagination";
import {
  resolveModulePermissions,
  resolvePermissionsToModules,
} from "../../utils/module-permissions";
import {
  resolveModuleKeysToPermissions,
  getFullAccessPermissions,
  getBaselinePermissions,
  ALWAYS_ON_PERMISSIONS,
  getPermissionCatalog,
  type PermissionRoleScope,
} from "../../utils/permission-catalog";
import type { AuthUser } from "../auth/auth.types";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  UpdateWhatsappPreferenceInput,
  UpdateUserPermissionsInput,
  UserListQuery,
} from "./user.types";
import {
  findUsers,
  findUserById,
  findUserByEmail,
  findUserByPhone,
  findRolesByNames,
  findPermissionsByNames,
  setUserPermissions,
  createUser,
  updateUser,
  updateUserStatus,
  updateWhatsappPreference,
  deleteUser,
} from "./user.repository";
import type { UserStatus } from "@prisma/client";

/**
 * Determine the effective instituteId for the request.
 * Admin can access institute-wide; CENTER_MANAGER scoped to their branch.
 */
const getInstituteId = (currentUser: AuthUser): string => {
  return currentUser.instituteId;
};

/**
 * Branch filter for user listing — non-admins are locked to their assigned branch.
 */
const getBranchFilter = (currentUser: AuthUser, requestedBranchId?: string): string | undefined => {
  return getBranchScopeFilter(currentUser, requestedBranchId).branchId;
};

// ─── List Users ──────────────────────────────────────────────────────────────

export const listUsersService = async (
  currentUser: AuthUser,
  query: UserListQuery
) => {
  const { page = 1, limit = 20, search, role, status } = query;
  const instituteId = getInstituteId(currentUser);
  const branchId = getBranchFilter(currentUser, query.branchId);
  const skip = (page - 1) * limit;

  const { users, total } = await findUsers({
    instituteId,
    branchId,
    search,
    role,
    status: status as UserStatus | undefined,
    skip,
    take: limit,
  });

  return {
    users,
    meta: buildMeta(total, page, limit),
  };
};

// ─── Get User ────────────────────────────────────────────────────────────────

export const getUserService = async (
  currentUser: AuthUser,
  userId: string
) => {
  const instituteId = getInstituteId(currentUser);
  const user = await findUserById(userId, instituteId);

  if (!user) throw new AppError("User not found", 404);

  // CENTER_MANAGER can only see users from their branch
  if (
    currentUser.roles.includes("CENTER_MANAGER") &&
    !currentUser.roles.includes("ADMIN") &&
    currentUser.branchId &&
    user.branchId !== currentUser.branchId
  ) {
    throw new AppError("User not found", 404); // Return 404 instead of 403 to avoid leaking existence
  }

  return user;
};

// ─── Create User ─────────────────────────────────────────────────────────────

export const createUserService = async (
  currentUser: AuthUser,
  input: CreateUserInput
) => {
  const instituteId = getInstituteId(currentUser);

  // Validate roles exist
  const foundRoles = await findRolesByNames(input.roles);
  if (foundRoles.length !== input.roles.length) {
    const foundNames = foundRoles.map((r) => r.name);
    const missing = input.roles.filter((r) => !foundNames.includes(r));
    throw new AppError(`Invalid role(s): ${missing.join(", ")}`, 400);
  }

  // Admin cannot create another ADMIN via this endpoint (safety guard)
  if (
    input.roles.includes("ADMIN") &&
    !currentUser.roles.includes("ADMIN")
  ) {
    throw new AppError("Cannot assign ADMIN role", 403);
  }

  // Check for duplicate email
  if (input.email) {
    const existing = await findUserByEmail(input.email, instituteId);
    if (existing) throw new AppError("Email already in use", 409);
  }

  // Check for duplicate phone
  if (input.phone) {
    const existing = await findUserByPhone(input.phone, instituteId);
    if (existing) throw new AppError("Phone number already in use", 409);
  }

  // Branch assignment for CENTER_MANAGER / COUNSELLOR (required)
  const isBranchRole = input.roles.some((r) =>
    ["CENTER_MANAGER", "COUNSELLOR"].includes(r)
  );
  let branchId: string | null;
  if (currentUser.roles.includes("CENTER_MANAGER")) {
    branchId = currentUser.branchId || input.branchId || null;
  } else {
    branchId = input.branchId ?? null;
  }

  if (isBranchRole && !branchId) {
    throw new AppError(
      "Branch assignment is required when creating a Center Manager or Counsellor",
      400
    );
  }

  const passwordHash = await hashPassword(input.password || "Password@123");

  const user = await createUser({
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    passwordHash,
    instituteId,
    branchId,
    roleIds: foundRoles.map((r) => r.id),
  });

  // If creating a CENTER_MANAGER or COUNSELLOR, set granular permissions
  if (input.roles.includes("CENTER_MANAGER") || input.roles.includes("COUNSELLOR")) {
    const roleScope: PermissionRoleScope = input.roles.includes("COUNSELLOR")
      ? "COUNSELLOR"
      : "CENTER_MANAGER";

    const permissionNames =
      input.permissions !== undefined
        ? Array.from(new Set([...ALWAYS_ON_PERMISSIONS, ...input.permissions]))
        : input.modulePermissions?.length
          ? resolveModuleKeysToPermissions(input.modulePermissions, roleScope)
          : getBaselinePermissions(roleScope);

    await assignDirectPermissions(user.id, permissionNames, currentUser.id);

    // Re-fetch to include the newly created permissions
    const refreshed = await findUserById(user.id, instituteId);
    return refreshed ?? user;
  }

  return user;
};

// ─── Update User ─────────────────────────────────────────────────────────────

export const updateUserService = async (
  currentUser: AuthUser,
  userId: string,
  input: UpdateUserInput
) => {
  const instituteId = getInstituteId(currentUser);
  const existing = await findUserById(userId, instituteId);
  if (!existing) throw new AppError("User not found", 404);

  // Branch isolation check
  if (
    currentUser.roles.includes("CENTER_MANAGER") &&
    !currentUser.roles.includes("ADMIN") &&
    currentUser.branchId &&
    existing.branchId !== currentUser.branchId
  ) {
    throw new AppError("User not found", 404);
  }

  return updateUser(userId, instituteId, input);
};

// ─── Update User Permissions ─────────────────────────────────────────────────

export const updateUserPermissionsService = async (
  currentUser: AuthUser,
  userId: string,
  input: UpdateUserPermissionsInput
) => {
  const instituteId = getInstituteId(currentUser);
  const existing = await findUserById(userId, instituteId);
  if (!existing) throw new AppError("User not found", 404);

  // Only allow updating permissions for CENTER_MANAGER or COUNSELLOR users
  if (!existing.roles.includes("CENTER_MANAGER") && !existing.roles.includes("COUNSELLOR")) {
    throw new AppError("Module permissions can only be set for Center Managers and Counsellors", 400);
  }

  const roleScope: PermissionRoleScope = existing.roles.includes("COUNSELLOR")
    ? "COUNSELLOR"
    : "CENTER_MANAGER";

  const permissionNames = input.permissions?.length
    ? Array.from(new Set([...ALWAYS_ON_PERMISSIONS, ...input.permissions]))
    : resolveModuleKeysToPermissions(input.modulePermissions ?? [], roleScope);

  await assignDirectPermissions(userId, permissionNames, currentUser.id);

  // Re-fetch to include updated permissions
  const refreshed = await findUserById(userId, instituteId);
  if (!refreshed) throw new AppError("User not found after update", 500);
  return refreshed;
};

// ─── Update WhatsApp Preference (self-service opt-out) ────────────────────────

export const updateWhatsappPreferenceService = async (
  currentUser: AuthUser,
  input: UpdateWhatsappPreferenceInput
) => {
  // Users can only change their own preference; no admin elevation needed.
  return updateWhatsappPreference(currentUser.id, input.whatsappEnabled);
};

// ─── Update User Status ───────────────────────────────────────────────────────

export const updateUserStatusService = async (
  currentUser: AuthUser,
  userId: string,
  input: UpdateUserStatusInput
) => {
  const instituteId = getInstituteId(currentUser);
  const existing = await findUserById(userId, instituteId);
  if (!existing) throw new AppError("User not found", 404);

  // Prevent self-deactivation
  if (userId === currentUser.id) {
    throw new AppError("Cannot change your own account status", 400);
  }

  return updateUserStatus(userId, instituteId, input.status);
};

// ─── Delete User ──────────────────────────────────────────────────────────────

export const deleteUserService = async (
  currentUser: AuthUser,
  userId: string
) => {
  const instituteId = getInstituteId(currentUser);
  const existing = await findUserById(userId, instituteId);
  if (!existing) throw new AppError("User not found", 404);

  // Prevent self-deletion
  if (userId === currentUser.id) {
    throw new AppError("Cannot delete your own account", 400);
  }

  // Branch isolation for CENTER_MANAGER
  if (
    currentUser.roles.includes("CENTER_MANAGER") &&
    !currentUser.roles.includes("ADMIN") &&
    currentUser.branchId &&
    existing.branchId !== currentUser.branchId
  ) {
    throw new AppError("User not found", 404);
  }

  await deleteUser(userId, instituteId);
  return { id: userId, deleted: true };
};

// ─── Permission Catalog ───────────────────────────────────────────────────────

export const getPermissionCatalogService = (role: "CENTER_MANAGER" | "COUNSELLOR") => {
  return getPermissionCatalog(role);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Set explicit permission names on a user (replaces all user-level permissions).
 */
async function assignDirectPermissions(
  userId: string,
  permissionNames: string[],
  grantedById?: string
): Promise<void> {
  const permissionRecords = await findPermissionsByNames(permissionNames);
  const permissionIds = permissionRecords.map((p) => p.id);

  if (permissionIds.length > 0) {
    await setUserPermissions(userId, permissionIds, grantedById);
  }
}
