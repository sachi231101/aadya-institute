import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import type {
  CreateMasterRecordInput,
  UpdateMasterRecordInput,
  MasterListQuery,
} from "./master.types";
import {
  findMasterRecords,
  findMasterRecordById,
  createMasterRecord,
  updateMasterRecord,
  deleteMasterRecord,
} from "./master.repository";
import type { Status } from "@prisma/client";

export interface MasterAuthUser {
  userId: string;
  instituteId: string;
  branchId?: string | null;
  roles: string[];
}

/**
 * Determine effective branch filter based on user roles
 */
const getBranchFilter = (currentUser: MasterAuthUser, requestedBranchId?: string): string | undefined => {
  if (currentUser.roles.includes("ADMIN")) {
    return requestedBranchId;
  }
  if (currentUser.roles.includes("CENTER_MANAGER")) {
    return currentUser.branchId ?? undefined;
  }
  return currentUser.branchId ?? undefined;
};

export const listMastersService = async (
  currentUser: MasterAuthUser,
  entityType: string,
  query: MasterListQuery
) => {
  const { page = 1, limit = 50, search, status } = query;
  const instituteId = currentUser.instituteId;
  const branchId = getBranchFilter(currentUser, query.branchId);
  const skip = (page - 1) * limit;

  const { records, total } = await findMasterRecords({
    instituteId,
    entityType,
    branchId,
    search,
    status: status as Status | undefined,
    skip,
    take: limit,
  });

  return {
    records,
    meta: buildMeta(total, page, limit),
  };
};

export const getMasterByIdService = async (
  currentUser: MasterAuthUser,
  id: string
) => {
  const instituteId = currentUser.instituteId;
  const record = await findMasterRecordById(id, instituteId);
  if (!record) {
    throw new AppError("Master record not found", 404);
  }
  return record;
};

export const createMasterService = async (
  currentUser: MasterAuthUser,
  input: CreateMasterRecordInput
) => {
  const instituteId = currentUser.instituteId;

  const branchId = currentUser.roles.includes("CENTER_MANAGER")
    ? (currentUser.branchId || input.branchId || undefined)
    : input.branchId;

  return createMasterRecord(instituteId, {
    ...input,
    branchId,
  });
};

export const updateMasterService = async (
  currentUser: MasterAuthUser,
  id: string,
  input: UpdateMasterRecordInput
) => {
  const instituteId = currentUser.instituteId;
  const existing = await findMasterRecordById(id, instituteId);
  if (!existing) {
    throw new AppError("Master record not found", 404);
  }

  // Branch isolation guard
  if (
    currentUser.roles.includes("CENTER_MANAGER") &&
    !currentUser.roles.includes("ADMIN") &&
    existing.branchId &&
    existing.branchId !== currentUser.branchId
  ) {
    throw new AppError("Master record not found", 404);
  }

  return updateMasterRecord(id, instituteId, input);
};

export const deleteMasterService = async (
  currentUser: MasterAuthUser,
  id: string
) => {
  const instituteId = currentUser.instituteId;
  const existing = await findMasterRecordById(id, instituteId);
  if (!existing) {
    throw new AppError("Master record not found", 404);
  }

  // Branch isolation guard
  if (
    currentUser.roles.includes("CENTER_MANAGER") &&
    !currentUser.roles.includes("ADMIN") &&
    existing.branchId &&
    existing.branchId !== currentUser.branchId
  ) {
    throw new AppError("Master record not found", 404);
  }

  await deleteMasterRecord(id, instituteId);
  return { id, deleted: true };
};
