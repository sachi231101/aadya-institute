import React from "react";
import { MasterSelect } from "@/components/common/MasterSelect";

interface ClassroomDropdownProps {
  /** Selected classroom master record ID */
  value: string;
  onChange: (masterId: string) => void;
  className?: string;
  placeholder?: string;
  includeEmpty?: boolean;
  branchId?: string;
  disabled?: boolean;
}

/**
 * Classroom picker backed by Master Module (entityType: "classroom").
 */
export const ClassroomDropdown: React.FC<ClassroomDropdownProps> = ({
  value,
  onChange,
  className = "",
  placeholder = "Select Classroom / Lab",
  includeEmpty = true,
  branchId,
  disabled = false,
}) => (
  <MasterSelect
    entityType="classroom"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={className}
    includeEmpty={includeEmpty}
    entityLabel="Classroom"
    branchId={branchId}
    disabled={disabled}
  />
);

export default ClassroomDropdown;
