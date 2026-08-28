import { AppError } from "../../middlewares/error.middleware";
import { findMasterRecordById } from "./master.repository";
import { isAllowedMasterEntityType } from "./master.entity-types";

export interface ResolvedMasterRecord {
  id: string;
  entityType: string;
  name: string;
  code: string | null;
  branchId: string | null;
}

export interface ResolveMasterOptions {
  instituteId: string;
  entityType: string;
  masterRecordId?: string | null;
  branchId?: string | null;
  /** When true, branch-scoped masters must match the requested branch (or be institute-wide). */
  enforceBranch?: boolean;
}

/**
 * Validates that a master record exists, is ACTIVE, matches entityType,
 * and optionally belongs to the correct branch scope.
 */
export const assertActiveMaster = async (
  options: ResolveMasterOptions
): Promise<ResolvedMasterRecord> => {
  const { instituteId, entityType, masterRecordId, branchId, enforceBranch = true } = options;

  if (!masterRecordId) {
    throw new AppError(`${entityType} master record is required`, 400);
  }

  const normalizedType = entityType.toLowerCase();
  if (!isAllowedMasterEntityType(normalizedType)) {
    throw new AppError(`Invalid master entity type: ${entityType}`, 400);
  }

  const record = await findMasterRecordById(masterRecordId, instituteId);
  if (!record || record.status !== "ACTIVE") {
    throw new AppError(`${entityType} master record not found or inactive`, 400);
  }

  if (record.entityType.toLowerCase() !== normalizedType) {
    throw new AppError(
      `Master record does not match expected type ${normalizedType}`,
      400
    );
  }

  if (
    enforceBranch &&
    branchId &&
    record.branchId &&
    record.branchId !== branchId
  ) {
    throw new AppError(
      `${entityType} master record is not available for this branch`,
      400
    );
  }

  return {
    id: record.id,
    entityType: record.entityType,
    name: record.name,
    code: record.code,
    branchId: record.branchId,
  };
};

/**
 * Resolves an optional master ID. Returns null when masterRecordId is empty.
 */
export const resolveOptionalMaster = async (
  options: ResolveMasterOptions
): Promise<ResolvedMasterRecord | null> => {
  if (!options.masterRecordId) return null;
  return assertActiveMaster(options);
};

/**
 * Resolves master and returns denormalized label (name) for storage in legacy string fields.
 */
export const resolveMasterLabel = async (
  options: ResolveMasterOptions
): Promise<{ master: ResolvedMasterRecord; label: string }> => {
  const master = await assertActiveMaster(options);
  return { master, label: master.name };
};
