import React from "react";
import { BookOpen, UserCheck } from "lucide-react";
import type { BatchCourseItem } from "@/services/batches.api";
import type { BatchLike } from "@/utils/batch.utils";
import { getBatchCourseRows, formatSubjectWithFaculty } from "@/utils/batch.utils";
import { Badge } from "@/components/ui/badge";

interface SubjectChipProps {
  batch: BatchLike;
  maxVisible?: number;
  className?: string;
}

/** Compact chips for batch list rows: "Python (Dr. A)" */
export const BatchSubjectChips: React.FC<SubjectChipProps> = ({
  batch,
  maxVisible = 3,
  className = "",
}) => {
  const rows = getBatchCourseRows(batch);
  if (rows.length === 0) {
    return <span className="text-xs text-muted-foreground">No subjects</span>;
  }

  const visible = rows.slice(0, maxVisible);
  const remaining = rows.length - visible.length;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visible.map((row, idx) => (
        <Badge
          key={`${row.courseId}-${idx}`}
          variant="outline"
          className="text-[10px] font-medium px-2 py-0.5 bg-background"
        >
          {formatSubjectWithFaculty(row)}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
};

interface SubjectTableProps {
  batchCourses?: BatchCourseItem[];
  batch?: BatchLike;
}

/** Full subjects & faculty table for batch details */
export const BatchSubjectsFacultyTable: React.FC<SubjectTableProps> = ({ batchCourses, batch }) => {
  const rows = batchCourses?.length
    ? batchCourses
    : batch
      ? getBatchCourseRows(batch)
      : [];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-muted/40 px-4 py-2.5 flex items-center gap-2 border-b border-border">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold text-foreground">Subjects & Faculty</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{rows.length} subject{rows.length !== 1 ? "s" : ""}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 px-4">No subjects linked to this batch.</p>
      ) : (
        <div className="divide-y divide-border/70">
          {rows.map((row, idx) => (
            <div
              key={row.id || `${row.courseId}-${idx}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0 pt-0.5">
                  {(row as BatchCourseItem).sequence ?? idx + 1}.
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{row.course?.name || "Course"}</p>
                  {row.course?.code && (
                    <p className="text-[10px] font-mono text-muted-foreground">{row.course.code}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:pl-6 shrink-0">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                {row.faculty?.user?.name ? (
                  <span className="text-xs font-medium">
                    {row.faculty.user.name}
                    {row.faculty.employeeCode ? (
                      <span className="text-muted-foreground ml-1">({row.faculty.employeeCode})</span>
                    ) : null}
                  </span>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Unassigned</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
