import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { assertPasswordMeetsInstitutePolicy } from "../../utils/password-policy.util";
import { buildMeta } from "../../utils/pagination";
import {
  resolveModuleKeysToPermissions,
  getBaselinePermissions,
  ALWAYS_ON_PERMISSIONS,
  getPermissionCatalog,
  getAllCatalogPermissionNames,
  isItemGrantFlag,
  type PermissionRoleScope,
} from "../../utils/permission-catalog";
import { createAuditLog } from "../../utils/audit-log.util";
import type { AuthUser } from "../auth/auth.types";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  UpdateWhatsappPreferenceInput,
  UpdateUserPermissionsInput,
  UpdateUserBranchAccessInput,
  UserListQuery,
} from "./user.types";
import {
  findUsers,
  findUserById,
  findUserByEmail,
  findUserByPhone,
  findRolesByNames,
  findPermissionsByNames,
  ensurePermissionsExist,
  setUserPermissions,
  createUser,
  updateUser,
  updateUserStatus,
  updateWhatsappPreference,
  deleteUser,
  hardDeleteUser,
  replaceUserBranchAccess,
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

const actorId = (currentUser: AuthUser) => currentUser.userId || currentUser.id;

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

  const password = input.password || "Password@123";
  await assertPasswordMeetsInstitutePolicy(instituteId, password);
  const passwordHash = await hashPassword(password);

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
  let result = user;
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

    try {
      await assignDirectPermissions(user.id, permissionNames, actorId(currentUser));
    } catch (err) {
      await hardDeleteUser(user.id);
      throw err;
    }

    const refreshed = await findUserById(user.id, instituteId);
    result = refreshed ?? user;
  }

  await createAuditLog({
    userId: actorId(currentUser),
    instituteId,
    branchId: result.branchId,
    action: "USER_CREATED",
    entityType: "User",
    entityId: result.id,
    newData: {
      id: result.id,
      name: result.name,
      email: result.email,
      roles: result.roles,
      branchId: result.branchId,
      status: result.status,
    },
  });

  return result;
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

  const updated = await updateUser(userId, instituteId, input);

  await createAuditLog({
    userId: actorId(currentUser),
    instituteId,
    branchId: updated.branchId,
    action: "USER_UPDATED",
    entityType: "User",
    entityId: userId,
    oldData: {
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
      branchId: existing.branchId,
    },
    newData: {
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      branchId: updated.branchId,
    },
  });

  return updated;
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

  // Explicit `permissions: []` (or any array) must win over legacy modulePermissions.
  // Using `.length` previously treated empty arrays as "unset" and skipped the update path.
  const permissionNames =
    input.permissions !== undefined
      ? Array.from(new Set([...ALWAYS_ON_PERMISSIONS, ...input.permissions]))
      : resolveModuleKeysToPermissions(input.modulePermissions ?? [], roleScope);

  await assignDirectPermissions(userId, permissionNames, actorId(currentUser));

  // Re-fetch to include updated permissions
  const refreshed = await findUserById(userId, instituteId);
  if (!refreshed) throw new AppError("User not found after update", 500);

  await createAuditLog({
    userId: actorId(currentUser),
    instituteId,
    branchId: refreshed.branchId,
    action: "USER_PERMISSIONS_UPDATED",
    entityType: "User",
    entityId: userId,
    oldData: { permissions: existing.permissions },
    newData: { permissions: refreshed.permissions },
  });

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

  const isTargetAdmin =
    existing.email === "admin@aadya.in" ||
    existing.userRoles?.some((ur: any) => ur.role?.name === "ADMIN");

  if (isTargetAdmin && input.status !== "ACTIVE") {
    throw new AppError("System Administrator accounts cannot be deactivated", 400);
  }

  const updated = await updateUserStatus(userId, instituteId, input.status);

  await createAuditLog({
    userId: actorId(currentUser),
    instituteId,
    branchId: updated.branchId,
    action: "USER_STATUS_UPDATED",
    entityType: "User",
    entityId: userId,
    oldData: { status: existing.status },
    newData: { status: updated.status },
  });

  return updated;
};

// ─── Update User Branch Access ────────────────────────────────────────────────

export const updateUserBranchAccessService = async (
  currentUser: AuthUser,
  userId: string,
  input: UpdateUserBranchAccessInput
) => {
  const instituteId = getInstituteId(currentUser);
  const existing = await findUserById(userId, instituteId);
  if (!existing) throw new AppError("User not found", 404);

  const updated = await replaceUserBranchAccess(
    userId,
    instituteId,
    input.branchIds
  );
  if (!updated) {
    throw new AppError("One or more branches are invalid for this institute", 400);
  }

  await createAuditLog({
    userId: actorId(currentUser),
    instituteId,
    branchId: updated.branchId,
    action: "USER_BRANCH_ACCESS_UPDATED",
    entityType: "User",
    entityId: userId,
    oldData: {
      branchAccesses: existing.branchAccesses?.map((b) => b.branchId) ?? [],
    },
    newData: {
      branchAccesses: updated.branchAccesses?.map((b) => b.branchId) ?? [],
    },
  });

  return updated;
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

  // Prevent deleting System Administrator accounts
  const isTargetAdmin =
    existing.email === "admin@aadya.in" ||
    existing.userRoles?.some((ur: any) => ur.role?.name === "ADMIN");

  if (isTargetAdmin) {
    throw new AppError("System Administrator accounts cannot be deleted", 400);
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

  await createAuditLog({
    userId: actorId(currentUser),
    instituteId,
    branchId: existing.branchId,
    action: "USER_DELETED",
    entityType: "User",
    entityId: userId,
    oldData: {
      name: existing.name,
      email: existing.email,
      roles: existing.roles,
    },
  });

  return { id: userId, deleted: true };
};

// ─── Permission Catalog ───────────────────────────────────────────────────────

export const getPermissionCatalogService = (role: "CENTER_MANAGER" | "COUNSELLOR") => {
  return getPermissionCatalog(role);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Set explicit permission names on a user (replaces all user-level permissions).
 * Auto-creates any missing Permission rows that belong to the staff catalogs
 * (item.* flags and coarse APIs), so Grant all works even if seed is stale.
 */
async function assignDirectPermissions(
  userId: string,
  permissionNames: string[],
  grantedById?: string
): Promise<void> {
  const uniqueNames = Array.from(new Set(permissionNames));
  let permissionRecords = await findPermissionsByNames(uniqueNames);
  const foundNames = new Set(permissionRecords.map((p) => p.name));
  const missing = uniqueNames.filter((name) => !foundNames.has(name));

  if (missing.length > 0) {
    const catalogKnown = new Set(getAllCatalogPermissionNames());
    const creatable = missing.filter((name) => catalogKnown.has(name));
    const unknown = missing.filter((name) => !catalogKnown.has(name));

    if (creatable.length > 0) {
      await ensurePermissionsExist(
        creatable.map((name) => ({
          name,
          description: isItemGrantFlag(name)
            ? name.endsWith(".write")
              ? `Edit access for catalog item ${name.replace(/^item\./, "").replace(/\.write$/, "")}`
              : `Read access for catalog item ${name.replace(/^item\./, "")}`
            : `Catalog permission ${name}`,
        }))
      );
      permissionRecords = await findPermissionsByNames(uniqueNames);
    }

    if (unknown.length > 0) {
      throw new AppError(
        `Unknown permission(s): ${unknown.slice(0, 8).join(", ")}${unknown.length > 8 ? "…" : ""}`,
        400
      );
    }

    const stillMissing = uniqueNames.filter(
      (name) => !permissionRecords.some((p) => p.name === name)
    );
    if (stillMissing.length > 0) {
      throw new AppError(
        `Failed to resolve permission(s): ${stillMissing.slice(0, 8).join(", ")}${stillMissing.length > 8 ? "…" : ""}`,
        500
      );
    }
  }

  const permissionIds = Array.from(new Set(permissionRecords.map((p) => p.id)));
  // Always replace — including empty — so clearing modules actually removes prior grants.
  await setUserPermissions(userId, permissionIds, grantedById);
}
