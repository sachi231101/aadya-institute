import {
  assertActiveMaster,
  resolveOptionalMaster,
  type ResolvedMasterRecord,
} from "./master.validator";
import { findMasterRecordById } from "./master.repository";

export interface ResolvedMasterFields {
  masterId: string;
  code: string | null;
  label: string;
  data?: Record<string, unknown> | null;
}

/**
 * Resolve a required master record and return denormalized storage fields.
 */
export const resolveRequiredMasterFields = async (options: {
  instituteId: string;
  entityType: string;
  masterRecordId?: string | null;
  branchId?: string | null;
  legacyCode?: string | null;
}): Promise<ResolvedMasterFields> => {
  const master = await assertActiveMaster({
    instituteId: options.instituteId,
    entityType: options.entityType,
    masterRecordId: options.masterRecordId,
    branchId: options.branchId,
  });
  return {
    masterId: master.id,
    code: master.code,
    label: master.name,
  };
};

/**
 * Resolve optional master — returns null if no ID provided.
 */
export const resolveOptionalMasterFields = async (options: {
  instituteId: string;
  entityType: string;
  masterRecordId?: string | null;
  branchId?: string | null;
}): Promise<ResolvedMasterFields | null> => {
  const master = await resolveOptionalMaster({
    instituteId: options.instituteId,
    entityType: options.entityType,
    masterRecordId: options.masterRecordId,
    branchId: options.branchId,
  });
  if (!master) return null;
  const full = await findMasterRecordById(master.id, options.instituteId);
  return {
    masterId: master.id,
    code: master.code,
    label: master.name,
    data: (full?.data as Record<string, unknown> | null | undefined) ?? null,
  };
};

export type { ResolvedMasterRecord };
