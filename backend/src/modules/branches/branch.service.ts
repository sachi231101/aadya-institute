import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter, hasBranchAccess } from "../../utils/branch-isolation.util";
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
  createBranch,
  updateBranch,
  getBranchStats,
} from "./branch.repository";
import type { Status } from "@prisma/client";

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
  // Only Admin can create new branches
  if (!currentUser.roles.includes("ADMIN")) {
    throw new AppError("Forbidden — Admin access required to create branches", 403);
  }

  // Check code uniqueness within the institute
  const existing = await findBranchByCode(input.code, currentUser.instituteId);
  if (existing) {
    throw new AppError(`Branch code '${input.code}' already exists in this institute`, 409);
  }

  return createBranch({
    instituteId: currentUser.instituteId,
    name: input.name,
    code: input.code,
    address: input.address ?? null,
    phone: input.phone ?? null,
  });
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

  // If changing code, check uniqueness
  if (input.code && input.code !== existing.code) {
    const codeDuplicate = await findBranchByCode(input.code, currentUser.instituteId);
    if (codeDuplicate) {
      throw new AppError(`Branch code '${input.code}' is already in use`, 409);
    }
  }

  return updateBranch(branchId, currentUser.instituteId, input);
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
