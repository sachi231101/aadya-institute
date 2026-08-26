import React from "react";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { Loader2 } from "lucide-react";

interface MasterSelectProps {
  /** The entityType key in MasterRecord (e.g. "lead_source", "designation", "area") */
  entityType: string;
  /** Current selected value (matched against option.label for name-based matching) */
  value: string;
  /** Called with the selected option label */
  onChange: (value: string) => void;
  /** Placeholder text for the empty option */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to include an empty placeholder option (default: true) */
  includeEmpty?: boolean;
  /** Label for the master entity type (used in loading/empty messages) */
  entityLabel?: string;
}

/**
 * Generic master-data select component.
 * Fetches ACTIVE records for the given entityType from the Master Module API.
 * 
 * Usage examples:
 * ```tsx
 * <MasterSelect entityType="lead_source" value={source} onChange={setSource} placeholder="Select Lead Source" />
 * <MasterSelect entityType="designation" value={designation} onChange={setDesignation} placeholder="Select Designation" />
 * <MasterSelect entityType="area" value={area} onChange={setArea} placeholder="Select Area" />
 * <MasterSelect entityType="payment_mode" value={mode} onChange={setMode} placeholder="Select Payment Mode" />
 * ```
 */
export const MasterSelect: React.FC<MasterSelectProps> = ({
  entityType,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  includeEmpty = true,
  entityLabel,
}) => {
  const { options, isLoading } = useMasterDropdown(entityType);
  const label = entityLabel || entityType.replace(/_/g, " ");

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading {label}...
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none text-xs ${className}`}
    >
      {includeEmpty && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.label}>
          {opt.label}{opt.code ? ` (${opt.code})` : ""}
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
