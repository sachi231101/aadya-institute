import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { buildMeta } from "../../utils/pagination";
import type { AuthUser } from "../auth/auth.types";
import type { CreateUserInput, UpdateUserInput, UpdateUserStatusInput, UpdateWhatsappPreferenceInput, UserListQuery } from "./user.types";
import {
  findUsers,
  findUserById,
  findUserByEmail,
  findUserByPhone,
  findRolesByNames,
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
 * If the requesting user is a CENTER_MANAGER, enforce that they can only
 * see/create users in their own branch.
 */
const getBranchFilter = (currentUser: AuthUser, requestedBranchId?: string): string | undefined => {
  if (currentUser.roles.includes("ADMIN") || currentUser.roles.includes("COUNSELLOR")) {
    return requestedBranchId; // Admin & Counsellor can filter by requested branch or see all
  }
  if (currentUser.roles.includes("CENTER_MANAGER")) {
    // Always enforce the manager's own branch — ignore any branchId from request
    return currentUser.branchId ?? undefined;
  }
  return currentUser.branchId ?? undefined;
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

  // Branch override for CENTER_MANAGER
  const branchId = currentUser.roles.includes("CENTER_MANAGER")
    ? currentUser.branchId
    : (input.branchId ?? null);

  const passwordHash = await hashPassword(input.password);

  const user = await createUser({
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    passwordHash,
    instituteId,
    branchId,
    roleIds: foundRoles.map((r) => r.id),
  });

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
