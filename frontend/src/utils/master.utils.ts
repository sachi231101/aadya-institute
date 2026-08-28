import type { MasterDropdownOption } from "@/hooks/useMasterDropdown";

/** Get display label for a master record ID from dropdown options. */
export const getMasterLabel = (
  options: MasterDropdownOption[],
  masterId: string | null | undefined
): string => {
  if (!masterId) return "";
  const match = options.find((o) => o.value === masterId);
  return match?.label ?? "";
};

/** Get master code for a record ID. */
export const getMasterCode = (
  options: MasterDropdownOption[],
  masterId: string | null | undefined
): string => {
  if (!masterId) return "";
  const match = options.find((o) => o.value === masterId);
  return match?.code ?? "";
};

/** Find master ID by legacy label/name (for edit forms loading existing data). */
export const findMasterIdByLabel = (
  options: MasterDropdownOption[],
  label: string | null | undefined
): string => {
  if (!label) return "";
  const match = options.find(
    (o) => o.label === label || o.code === label || o.value === label
  );
  return match?.value ?? "";
};

/** Find master ID by code (for enum migration). */
export const findMasterIdByCode = (
  options: MasterDropdownOption[],
  code: string | null | undefined
): string => {
  if (!code) return "";
  const match = options.find((o) => o.code === code);
  return match?.value ?? "";
};

export interface MasterSelectChangePayload {
  masterId: string;
  label: string;
  code?: string | null;
}

/** Parse a master select change event into ID + denormalized label. */
export const parseMasterSelectChange = (
  options: MasterDropdownOption[],
  masterId: string
): MasterSelectChangePayload => {
  const match = options.find((o) => o.value === masterId);
  return {
    masterId,
    label: match?.label ?? masterId,
    code: match?.code,
  };
};
