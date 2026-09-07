import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { coursesApi, type CourseData } from "@/services/courses.api";
import { batchesApi, type BatchData } from "@/services/batches.api";
import { formatBatchSubjectNames, batchIncludesFaculty } from "@/utils/batch.utils";

export type AssignmentTargetLine = {
  key: string;
  courseId: string;
  courseModuleId: string;
  topic: string;
  batchId: string;
};

let lineKeySeq = 0;
export const newTargetKey = () => `target-${Date.now()}-${++lineKeySeq}`;

export const createEmptyTargetLine = (
  defaults?: Partial<AssignmentTargetLine>
): AssignmentTargetLine => ({
  key: newTargetKey(),
  courseId: defaults?.courseId || "",
  courseModuleId: defaults?.courseModuleId || "",
  topic: defaults?.topic || "",
  batchId: defaults?.batchId || "",
});

function parseTopics(topics: unknown): string[] {
  if (!topics) return [];
  if (Array.isArray(topics)) {
    return topics
      .map((t) => (typeof t === "string" ? t : (t as { name?: string })?.name || ""))
      .filter(Boolean);
  }
  if (typeof topics === "string") {
    try {
      return parseTopics(JSON.parse(topics));
    } catch {
      return topics.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

interface Props {
  lines: AssignmentTargetLine[];
  onChange: (lines: AssignmentTargetLine[]) => void;
  /** When set, only batches taught by this faculty are shown */
  facultyId?: string;
}

export const AssignmentTargetLinesEditor: React.FC<Props> = ({
  lines,
  onChange,
  facultyId,
}) => {
  const { data: coursesRes } = useQuery({
    queryKey: ["courses", "assignment-targets"],
    queryFn: () => coursesApi.getAll({ status: "ACTIVE" }),
  });

  const { data: batchesRes, isLoading: batchesLoading } = useQuery({
    queryKey: ["batches", "assignment-targets", facultyId || "all"],
    queryFn: () => batchesApi.getAll(),
  });

  const batches = useMemo(() => {
    const all = (batchesRes?.data || []) as BatchData[];
    if (!facultyId) return all;
    // Backend already scopes faculty lists; keep a defensive client filter that
    // also recognizes schedule-based teaching links.
    return all.filter((b) => batchIncludesFaculty(b as never, facultyId));
  }, [batchesRes, facultyId]);

  const courses = useMemo(() => {
    const all = (coursesRes?.data || []) as CourseData[];
    if (!facultyId) return all;
    const allowedCourseIds = new Set<string>();
    for (const b of batches) {
      if (b.courseId) allowedCourseIds.add(b.courseId);
      b.batchCourses?.forEach((bc) => {
        if (bc.courseId) allowedCourseIds.add(bc.courseId);
      });
      if (b.course?.id) allowedCourseIds.add(b.course.id);
    }
    // Do not fall back to every institute course — that produces course options
    // with zero matching batches (the faculty create-assignment failure mode).
    if (allowedCourseIds.size === 0) return [];
    return all.filter((c) => allowedCourseIds.has(c.id));
  }, [coursesRes, batches, facultyId]);

  const updateLine = (key: string, patch: Partial<AssignmentTargetLine>) => {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    if (lines.length <= 1) return;
    onChange(lines.filter((l) => l.key !== key));
  };

  const noFacultyBatches = Boolean(facultyId) && !batchesLoading && batches.length === 0;

  return (
    <div className="space-y-3">
      {noFacultyBatches && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          No batches are linked to your faculty profile yet. Ask admin to assign you as batch
          faculty (or on a batch course/schedule), then refresh this page.
        </p>
      )}
      <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-text-secondary px-1">
        <div className="col-span-3">Course *</div>
        <div className="col-span-3">Module</div>
        <div className="col-span-2">Topic</div>
        <div className="col-span-3">Batch *</div>
        <div className="col-span-1" />
      </div>

      {lines.map((line) => (
        <TargetLineRow
          key={line.key}
          line={line}
          courses={courses}
          batches={batches}
          canRemove={lines.length > 1}
          onChange={(patch) => updateLine(line.key, patch)}
          onRemove={() => removeLine(line.key)}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-[#2563EB]"
        onClick={() => onChange([...lines, createEmptyTargetLine()])}
        disabled={noFacultyBatches}
      >
        <Plus className="h-4 w-4 mr-1" /> Add target row
      </Button>
    </div>
  );
};

const TargetLineRow: React.FC<{
  line: AssignmentTargetLine;
  courses: CourseData[];
  batches: BatchData[];
  canRemove: boolean;
  onChange: (patch: Partial<AssignmentTargetLine>) => void;
  onRemove: () => void;
}> = ({ line, courses, batches, canRemove, onChange, onRemove }) => {
  const course = courses.find((c) => c.id === line.courseId);
  const modules = course?.modules || [];
  const selectedModule = modules.find((m) => m.id === line.courseModuleId);
  const topics = useMemo(() => parseTopics(selectedModule?.topics), [selectedModule]);

  const filteredBatches = useMemo(() => {
    if (!line.courseId) return batches;
    return batches.filter(
      (b) =>
        b.courseId === line.courseId ||
        b.batchCourses?.some((bc) => bc.courseId === line.courseId) ||
        b.course?.id === line.courseId
    );
  }, [batches, line.courseId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 rounded-lg border bg-muted/20">
      <div className="md:col-span-3">
        <select
          value={line.courseId}
          onChange={(e) =>
            onChange({
              courseId: e.target.value,
              courseModuleId: "",
              topic: "",
              batchId: "",
            })
          }
          className="w-full h-10 px-2 border rounded-md text-sm bg-background"
        >
          <option value="">Select course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-3">
        <select
          value={line.courseModuleId}
          disabled={!line.courseId}
          onChange={(e) => onChange({ courseModuleId: e.target.value, topic: "" })}
          className="w-full h-10 px-2 border rounded-md text-sm bg-background disabled:opacity-50"
        >
          <option value="">Any module</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <select
          value={line.topic}
          disabled={!line.courseModuleId || topics.length === 0}
          onChange={(e) => onChange({ topic: e.target.value })}
          className="w-full h-10 px-2 border rounded-md text-sm bg-background disabled:opacity-50"
        >
          <option value="">Any topic</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-3">
        <select
          value={line.batchId}
          disabled={!line.courseId}
          onChange={(e) => onChange({ batchId: e.target.value })}
          className="w-full h-10 px-2 border rounded-md text-sm bg-background disabled:opacity-50"
        >
          <option value="">Select batch</option>
          {filteredBatches.length === 0 && line.courseId ? (
            <option value="" disabled>
              No batch for this course
            </option>
          ) : null}
          {filteredBatches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code}) — {formatBatchSubjectNames(b)}
            </option>
          ))}
        </select>
        {line.courseId && filteredBatches.length === 0 && (
          <p className="text-[11px] text-amber-700 mt-1">No assigned batch matches this course.</p>
        )}
      </div>
      <div className="md:col-span-1 flex items-center justify-end">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-red-600"
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
