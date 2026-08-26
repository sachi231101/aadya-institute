import React from "react";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { Loader2 } from "lucide-react";

interface ClassroomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** If true, shows a full-width select with label styling matching other form fields */
  includeEmpty?: boolean;
}

/**
 * Dropdown that fetches classrooms from the Master Module (entityType: "classroom").
 * Automatically shows all ACTIVE classroom records.
 * When admin adds a new classroom in Master Setup, it instantly appears here.
 */
export const ClassroomDropdown: React.FC<ClassroomDropdownProps> = ({
  value,
  onChange,
  className = "",
  placeholder = "Select Classroom / Lab",
  includeEmpty = true,
}) => {
  const { options, isLoading } = useMasterDropdown("classroom");

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading classrooms...
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
          No classrooms configured — add in Master Setup
        </option>
      )}
    </select>
  );
};

export default ClassroomDropdown;
