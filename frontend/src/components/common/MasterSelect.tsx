import React from "react";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { getMasterTypeMeta } from "@/constants/master-types";
import { Loader2 } from "lucide-react";

interface MasterSelectProps {
  /** Master entityType key (e.g. "leadsource", "designation", "area") */
  entityType: string;
  /** Selected master record ID */
  value: string;
  /** Called with the selected master record ID */
  onChange: (masterId: string) => void;
  placeholder?: string;
  className?: string;
  includeEmpty?: boolean;
  entityLabel?: string;
  branchId?: string;
  disabled?: boolean;
}

/**
 * Generic master-data select. Fetches ACTIVE records from Master Module API.
 *
 * @example
 * <MasterSelect entityType="leadsource" value={sourceMasterId} onChange={setSourceMasterId} />
 */
export const MasterSelect: React.FC<MasterSelectProps> = ({
  entityType,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  includeEmpty = true,
  entityLabel,
  branchId,
  disabled = false,
}) => {
  const { options, isLoading, isError } = useMasterDropdown(entityType, branchId);
  const meta = getMasterTypeMeta(entityType);
  const label = entityLabel || meta?.name || entityType.replace(/_/g, " ");

  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-2 h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 ${className}`}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading {label}...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={`flex items-center h-9 px-3 mt-1 bg-red-50 border border-red-200 rounded-xl text-xs text-red-500 ${className}`}
      >
        Failed to load {label}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none text-xs disabled:opacity-50 ${className}`}
    >
      {includeEmpty && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
          {opt.code ? ` (${opt.code})` : ""}
        </option>
      ))}
      {options.length === 0 && (
        <option value="" disabled>
          No {label} configured — add in Master Setup
        </option>
      )}
    </select>
  );
};

export default MasterSelect;
