import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter, hasBranchAccess } from "../../utils/branch-isolation.util";
import { createAuditLog } from "../../utils/audit-log.util";
import type { AuthUser } from "../auth/auth.types";
import type {
  BranchListQuery,
  CreateBranchInput,
  UpdateBranchInput,
  BranchStatsResponse,
} from "./branch.types";
import {
  findBranches,
  findBranchById,
  findBranchByCode,
  findManagerCandidate,
  createBranch,
  updateBranch,
  getBranchStats,
} from "./branch.repository";
import type { Status, Prisma } from "@prisma/client";

const assertManagerInInstitute = async (
  managerUserId: string | null | undefined,
  instituteId: string
) => {
  if (managerUserId == null) return;
  const manager = await findManagerCandidate(managerUserId, instituteId);
  if (!manager) {
    throw new AppError(
      "Manager must be an active user in the same institute",
      400
    );
  }
};

export const listBranchesService = async (
  currentUser: AuthUser,
  query: BranchListQuery
) => {
  const { page = 1, limit = 20, search, status } = query;
  const scope = getBranchScopeFilter(currentUser);

  const skip = (page - 1) * limit;

  const { branches, total } = await findBranches({
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    branchIds: scope.branchIds,
    search,
    status: status as Status | undefined,
    skip,
    take: limit,
  });

  return {
    branches,
    meta: buildMeta(total, page, limit),
  };
};

export const getBranchService = async (
  currentUser: AuthUser,
  branchId: string
) => {
  if (!hasBranchAccess(currentUser, branchId)) {
    throw new AppError("Branch not found", 404);
  }

  const branch = await findBranchById(branchId, currentUser.instituteId);
  if (!branch) throw new AppError("Branch not found", 404);

  return branch;
};

export const createBranchService = async (
  currentUser: AuthUser,
  input: CreateBranchInput
) => {
  if (!currentUser.roles.includes("ADMIN")) {
    throw new AppError("Forbidden — Admin access required to create branches", 403);
  }

  const existing = await findBranchByCode(input.code, currentUser.instituteId);
  if (existing) {
    throw new AppError(`Branch code '${input.code}' already exists in this institute`, 409);
  }

  await assertManagerInInstitute(input.managerUserId, currentUser.instituteId);

  const branch = await createBranch({
    instituteId: currentUser.instituteId,
    name: input.name,
    code: input.code,
    address: input.address ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    timezone: input.timezone ?? "Asia/Kolkata",
    workingHours: (input.workingHours ?? null) as Prisma.InputJsonValue | null,
    managerUserId: input.managerUserId ?? null,
  });

  await createAuditLog({
    userId: currentUser.userId || currentUser.id,
    instituteId: currentUser.instituteId,
    action: "BRANCH_CREATED",
    entityType: "Branch",
    entityId: branch.id,
    newData: branch,
  });

  return branch;
};

export const updateBranchService = async (
  currentUser: AuthUser,
  branchId: string,
  input: UpdateBranchInput
) => {
  if (!hasBranchAccess(currentUser, branchId)) {
    throw new AppError("Branch not found", 404);
  }

  const existing = await findBranchById(branchId, currentUser.instituteId);
  if (!existing) throw new AppError("Branch not found", 404);

  if (input.code && input.code !== existing.code) {
    const codeDuplicate = await findBranchByCode(input.code, currentUser.instituteId);
    if (codeDuplicate && codeDuplicate.id !== branchId) {
      throw new AppError(`Branch code '${input.code}' is already in use`, 409);
    }
  }

  if (input.managerUserId !== undefined) {
    await assertManagerInInstitute(input.managerUserId, currentUser.instituteId);
  }

  const updated = await updateBranch(branchId, currentUser.instituteId, {
    ...input,
    workingHours:
      input.workingHours === undefined
        ? undefined
        : ((input.workingHours ?? null) as Prisma.InputJsonValue | null),
  });

  await createAuditLog({
    userId: currentUser.userId || currentUser.id,
    instituteId: currentUser.instituteId,
    action: "BRANCH_UPDATED",
    entityType: "Branch",
    entityId: branchId,
    oldData: existing,
    newData: updated,
  });

  return updated;
};

export const updateBranchManagerService = async (
  currentUser: AuthUser,
  branchId: string,
  managerUserId: string | null
) => {
  if (!hasBranchAccess(currentUser, branchId)) {
    throw new AppError("Branch not found", 404);
  }

  const existing = await findBranchById(branchId, currentUser.instituteId);
  if (!existing) throw new AppError("Branch not found", 404);

  await assertManagerInInstitute(managerUserId, currentUser.instituteId);

  const updated = await updateBranch(branchId, currentUser.instituteId, {
    managerUserId,
  });

  await createAuditLog({
    userId: currentUser.userId || currentUser.id,
    instituteId: currentUser.instituteId,
    action: "BRANCH_MANAGER_UPDATED",
    entityType: "Branch",
    entityId: branchId,
    oldData: { managerUserId: existing.managerUserId, manager: existing.manager },
    newData: { managerUserId: updated.managerUserId, manager: updated.manager },
  });

  return updated;
};

export const deleteBranchService = async (
  currentUser: AuthUser,
  branchId: string
) => {
  if (!currentUser.roles.includes("ADMIN")) {
    throw new AppError("Forbidden — Admin access required to delete branches", 403);
  }

  const existing = await findBranchById(branchId, currentUser.instituteId);
  if (!existing) throw new AppError("Branch not found", 404);

  const deleted = await updateBranch(branchId, currentUser.instituteId, {
    status: "DELETED",
  });

  await createAuditLog({
    userId: currentUser.userId || currentUser.id,
    instituteId: currentUser.instituteId,
    action: "BRANCH_DELETED",
    entityType: "Branch",
    entityId: branchId,
    oldData: existing,
    newData: { status: "DELETED" },
  });

  return deleted;
};

export const getBranchStatsService = async (
  currentUser: AuthUser,
  branchId: string
): Promise<BranchStatsResponse> => {
  if (!hasBranchAccess(currentUser, branchId)) {
    throw new AppError("Branch not found", 404);
  }

  const branch = await findBranchById(branchId, currentUser.instituteId);
  if (!branch) throw new AppError("Branch not found", 404);

  const stats = await getBranchStats(branchId, currentUser.instituteId);

  return {
    branchId: branch.id,
    branchName: branch.name,
    ...stats,
  };
};
