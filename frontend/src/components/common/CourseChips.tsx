import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatPackageCourseLabel, type PackageCourseRef } from "@/utils/admission-package.utils";

interface CourseChipsProps {
  courses?: PackageCourseRef[] | null;
  /** Fallback when courses is empty */
  fallback?: string;
  maxVisible?: number;
  className?: string;
  /** When true and only one course, render plain text instead of a chip */
  plainWhenSingle?: boolean;
}

export const CourseChips: React.FC<CourseChipsProps> = ({
  courses,
  fallback = "—",
  maxVisible = 3,
  className = "",
  plainWhenSingle = true,
}) => {
  const list = (courses || []).filter((c) => c?.name);
  if (list.length === 0) {
    return <span className={`text-xs text-muted-foreground ${className}`}>{fallback}</span>;
  }

  if (plainWhenSingle && list.length === 1) {
    return (
      <p className={`text-xs font-medium text-foreground truncate ${className}`} title={list[0].name}>
        {list[0].name}
      </p>
    );
  }

  const visible = list.slice(0, maxVisible);
  const remaining = list.length - visible.length;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`} title={formatPackageCourseLabel(list)}>
      {visible.map((c) => (
        <Badge
          key={c.admissionId || c.id}
          variant="outline"
          className="text-[10px] font-semibold border-primary/30 text-primary bg-primary/5 px-1.5 py-0"
        >
          {c.name}
          {c.code ? ` (${c.code})` : ""}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0">
          +{remaining}
        </Badge>
      )}
    </div>
  );
};
