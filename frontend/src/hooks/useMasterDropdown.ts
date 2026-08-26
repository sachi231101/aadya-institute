import { useMemo } from "react";
import { useActiveMasterRecords } from "./useMasters";

export interface MasterDropdownOption {
  value: string;
  label: string;
  code?: string | null;
  description?: string | null;
  data?: Record<string, any> | null;
}

/**
 * Reusable hook for fetching master data as dropdown options.
 * 
 * Usage:
 * ```tsx
 * const { options, isLoading } = useMasterDropdown("area");
 * // options: [{ value: "cuid123", label: "Vidyanagar", code: "VNG", ... }]
 * ```
 * 
 * Can be used in any form/component that needs master data for select/dropdown fields.
 * Only returns ACTIVE records. Cached for 5 minutes via TanStack Query.
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
    if (!data?.data) return [];
    return data.data.map((item) => ({
      value: item.id,
      label: item.name,
      code: item.code,
      description: item.description,
      data: item.data,
    }));
  }, [data]);

  return {
    options,
    isLoading,
    isError,
    error: error as Error | null,
  };
};
