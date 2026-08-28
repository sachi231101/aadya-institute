import { useMemo } from "react";
import { useActiveMasterRecords } from "./useMasters";
import { isActiveMasterType } from "@/constants/master-types";

export interface MasterDropdownOption {
  value: string;
  label: string;
  code?: string | null;
  description?: string | null;
  data?: Record<string, unknown> | null;
}

/**
 * Reusable hook for fetching master data as dropdown options.
 * Returns ACTIVE records from Master Setup; value is always the master record ID.
 */
export const useMasterDropdown = (
  entityType: string | undefined,
  branchId?: string
): {
  options: MasterDropdownOption[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} => {
  const { data, isLoading, isError, error } = useActiveMasterRecords(entityType, branchId);

  const options = useMemo(() => {
    if (data?.data && data.data.length > 0) {
      return data.data.map((item) => ({
        value: item.id,
        label: item.name,
        code: item.code,
        description: item.description,
        data: item.data as Record<string, unknown> | null,
      }));
    }
    return [];
  }, [data]);

  const isTier1Active = entityType ? isActiveMasterType(entityType) : false;

  return {
    options,
    isLoading,
    isError,
    error: error as Error | null,
    ...(isTier1Active && !isLoading && options.length === 0
      ? { emptyHint: `No ${entityType} configured — add in Master Setup` }
      : {}),
  } as {
    options: MasterDropdownOption[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  };
};
