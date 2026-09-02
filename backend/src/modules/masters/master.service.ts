import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
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
  findActiveNumberingSeriesByTarget,
} from "./master.repository";
import type { Status } from "@prisma/client";
import { isAllowedMasterEntityType } from "./master.entity-types";
import type { NumberingSeriesData } from "./master.types";

const NUMBERING_SERIES_TARGETS = [
  "ADMISSION",
  "RECEIPT",
  "STUDENT",
  "ENQUIRY",
  "APPLICATION",
  "EMPLOYEE",
] as const;

const DEFAULT_NUMBERING_PATTERNS: Record<string, string> = {
  ADMISSION: "AADYA/{YEAR}/{SEQ:4}",
  RECEIPT: "RCP/{YEAR}/{SEQ:4}",
  STUDENT: "AAD-{YEAR}-{SEQ:4}",
  ENQUIRY: "ENQ-{YEAR}-{SEQ:4}",
  APPLICATION: "APP-{YEAR}-{SEQ:4}",
  EMPLOYEE: "FAC-{YEAR}-{SEQ:4}",
};

const normalizeNumberingSeriesData = (
  code: string | undefined,
  data: Record<string, unknown> | undefined,
  existingData?: Record<string, unknown> | null
): NumberingSeriesData => {
  const target = (code || (data?.target as string) || "ADMISSION").toUpperCase();
  const startNumber = Number(data?.startNumber ?? existingData?.startNumber ?? 1) || 1;
  const currentSequence = existingData
    ? Number(existingData.currentSequence) || 0
    : 0;

  return {
    target,
    pattern:
      (data?.pattern as string) ||
      (existingData?.pattern as string) ||
      DEFAULT_NUMBERING_PATTERNS[target] ||
      "{SEQ:4}",
    startNumber,
    currentSequence,
    resetFrequency:
      (data?.resetFrequency as NumberingSeriesData["resetFrequency"]) ||
      (existingData?.resetFrequency as NumberingSeriesData["resetFrequency"]) ||
      "YEARLY",
    lastResetPeriod:
      (existingData?.lastResetPeriod as string | undefined) ??
      (data?.lastResetPeriod as string | undefined) ??
      "",
  };
};

export interface MasterAuthUser {
  userId: string;
  instituteId: string;
  branchId?: string | null;
  roles: string[];
}

const bustMasterActiveCache = async (instituteId: string) => {
  const { cacheDelByPrefix } = await import("../../config/cache");
  await cacheDelByPrefix(`masters:active:${instituteId}:`);
};

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

  if (!isAllowedMasterEntityType(input.entityType)) {
    throw new AppError(`Invalid master entity type: ${input.entityType}`, 400);
  }

  const branchId = currentUser.roles.includes("CENTER_MANAGER")
    ? (currentUser.branchId || input.branchId || undefined)
    : input.branchId;

  let payload: CreateMasterRecordInput = { ...input, branchId };

  // Code is only used for numbering series (document target). Ignore for all other masters.
  if (input.entityType !== "numberingseries") {
    payload = { ...payload, code: undefined };
  }

  if (input.entityType === "numberingseries") {
    const target = (input.code || (input.data?.target as string) || "ADMISSION").toUpperCase();
    if (!NUMBERING_SERIES_TARGETS.includes(target as (typeof NUMBERING_SERIES_TARGETS)[number])) {
      throw new AppError(
        `Invalid numbering series target. Allowed: ${NUMBERING_SERIES_TARGETS.join(", ")}`,
        400
      );
    }

    const existingSeries = await findActiveNumberingSeriesByTarget(instituteId, target);

    const numberingData = normalizeNumberingSeriesData(
      target,
      input.data,
      (existingSeries?.data as Record<string, unknown>) ?? undefined
    );

    if (existingSeries) {
      // Deactivate any other series for this target
      await prisma.masterRecord.updateMany({
        where: {
          instituteId,
          entityType: "numberingseries",
          code: target,
          id: { not: existingSeries.id },
        },
        data: { status: "INACTIVE" },
      });

      // Update existing record with the new pattern/settings and activate it
      return updateMasterRecord(existingSeries.id, instituteId, {
        name: input.name,
        code: target,
        description: input.description,
        status: "ACTIVE",
        data: numberingData as any,
      });
    }

    // Deactivate previous active series for this target
    await prisma.masterRecord.updateMany({
      where: {
        instituteId,
        entityType: "numberingseries",
        code: target,
      },
      data: { status: "INACTIVE" },
    });

    payload = {
      ...payload,
      code: target,
      data: numberingData,
    };

    const series = await createMasterRecord(instituteId, payload);
    await bustMasterActiveCache(instituteId);
    return series;
  }

  // Duplicate name check for other master entity types
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

  const created = await createMasterRecord(instituteId, payload);
  await bustMasterActiveCache(instituteId);
  return created;
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

  let updatePayload: UpdateMasterRecordInput = { ...input };

  // Code is only used for numbering series; do not overwrite legacy codes on other masters from forms.
  if (existing.entityType !== "numberingseries") {
    const { code: _ignoredCode, ...rest } = updatePayload;
    updatePayload = rest;
  }

  if (existing.entityType === "numberingseries") {
    const target = (input.code || existing.code || (input.data?.target as string) || "").toUpperCase();
    if (
      target &&
      !NUMBERING_SERIES_TARGETS.includes(target as (typeof NUMBERING_SERIES_TARGETS)[number])
    ) {
      throw new AppError(
        `Invalid numbering series target. Allowed: ${NUMBERING_SERIES_TARGETS.join(", ")}`,
        400
      );
    }

    if (input.status === "ACTIVE" || (!input.status && existing.status === "ACTIVE")) {
      await prisma.masterRecord.updateMany({
        where: {
          instituteId,
          entityType: "numberingseries",
          code: target,
          id: { not: id },
        },
        data: { status: "INACTIVE" },
      });
    }

    const mergedData = {
      ...(existing.data as Record<string, unknown> | null),
      ...(input.data ?? {}),
    };

    updatePayload = {
      ...updatePayload,
      code: target || existing.code || undefined,
      data: normalizeNumberingSeriesData(
        target || existing.code || undefined,
        mergedData,
        existing.data as Record<string, unknown> | null
      ),
    };
  }

  const updated = await updateMasterRecord(id, instituteId, updatePayload);
  await bustMasterActiveCache(instituteId);
  return updated;
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
  await bustMasterActiveCache(instituteId);
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

  if (existing.entityType === "numberingseries" && newStatus === "ACTIVE" && existing.code) {
    await prisma.masterRecord.updateMany({
      where: {
        instituteId,
        entityType: "numberingseries",
        code: existing.code,
        id: { not: id },
      },
      data: { status: "INACTIVE" },
    });
  }

  const toggled = await toggleMasterRecordStatus(id, newStatus);
  await bustMasterActiveCache(instituteId);
  return toggled;
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
  const { cacheGet, cacheSet } = await import("../../config/cache");
  const cacheKey = `masters:active:${instituteId}:${entityType}:${branchId || "all"}`;
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) return cached;
  const records = await findActiveMasterRecords(instituteId, entityType, branchId);
  await cacheSet(cacheKey, records, 60);
  return records;
};
