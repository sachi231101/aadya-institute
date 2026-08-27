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
  findDuplicateMasterRecord,
  createMasterRecord,
  updateMasterRecord,
  softDeleteMasterRecord,
  toggleMasterRecordStatus,
  findAllEntityTypeCounts,
  findActiveMasterRecords,
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

  // Duplicate name check
  const duplicate = await findDuplicateMasterRecord(
    instituteId,
    input.entityType,
    input.name
  );
  if (duplicate) {
    throw new AppError(
      `A record with the name "${input.name}" already exists in ${input.entityType}`,
      409
    );
  }

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

  // Duplicate name check on update (if name is being changed)
  if (input.name && input.name !== existing.name) {
    const duplicate = await findDuplicateMasterRecord(
      instituteId,
      existing.entityType,
      input.name,
      id
    );
    if (duplicate) {
      throw new AppError(
        `A record with the name "${input.name}" already exists in ${existing.entityType}`,
        409
      );
    }
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

  // Soft delete: set status to INACTIVE
  const deactivated = await softDeleteMasterRecord(id, instituteId);
  return { id, deleted: true, status: deactivated.status };
};

/**
 * Toggle a master record's status between ACTIVE and INACTIVE
 */
export const toggleMasterStatusService = async (
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

  const newStatus = existing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return toggleMasterRecordStatus(id, newStatus);
};

/**
 * Get counts for all entity types (for the Master Setup overview grid)
 */
export const listAllEntityCountsService = async (
  currentUser: MasterAuthUser
) => {
  const instituteId = currentUser.instituteId;
  const branchId = getBranchFilter(currentUser);
  return findAllEntityTypeCounts(instituteId, branchId);
};

/**
 * Get only ACTIVE master records for dropdown consumption (no pagination, all records)
 */
export const listActiveMastersByTypeService = async (
  currentUser: MasterAuthUser,
  entityType: string,
  requestedBranchId?: string
) => {
  const instituteId = currentUser.instituteId;
  const branchId = getBranchFilter(currentUser, requestedBranchId);
  return findActiveMasterRecords(instituteId, entityType, branchId);
};
