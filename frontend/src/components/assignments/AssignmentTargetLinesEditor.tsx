import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  /** When set, only batches taught by this faculty are shown (teaching desk; no branch lock). */
  facultyId?: string;
  /**
   * When set, courses/batches are scoped to this branch (admin / CM / counsellor).
   * Omit for faculty teaching-desk so cross-branch teaching batches stay visible.
   */
  branchId?: string;
  /** When true and branchId is missing, show a prompt instead of loading all branches mixed. */
  requireBranch?: boolean;
}

export const AssignmentTargetLinesEditor: React.FC<Props> = ({
  lines,
  onChange,
  facultyId,
  branchId,
  requireBranch = false,
}) => {
  const branchReady = !requireBranch || Boolean(branchId);

  const { data: coursesRes } = useQuery({
    queryKey: ["courses", "assignment-targets", branchId || "all"],
    queryFn: () =>
      coursesApi.getAll({
        status: "ACTIVE",
        ...(branchId ? { branchId } : {}),
      }),
    enabled: branchReady,
  });

  const { data: batchesRes, isLoading: batchesLoading } = useQuery({
    queryKey: ["batches", "assignment-targets", facultyId || "all", branchId || "all"],
    queryFn: () =>
      batchesApi.getAll({
        ...(branchId ? { branchId } : {}),
        ...(facultyId ? { facultyId } : {}),
      }),
    enabled: branchReady,
  });

  const batches = useMemo(() => {
    let all = (batchesRes?.data || []) as BatchData[];
    if (branchId) {
      all = all.filter(
        (b) => b.branchId === branchId || b.branch?.id === branchId
      );
    }
    if (!facultyId) return all;
    // Backend already scopes faculty lists; keep a defensive client filter that
    // also recognizes schedule-based teaching links.
    return all.filter((b) => batchIncludesFaculty(b as never, facultyId));
  }, [batchesRes, facultyId, branchId]);

  const courses = useMemo(() => {
    const all = (coursesRes?.data || []) as CourseData[];
    const scopedByBranch = branchId
      ? all.filter((c) => {
          const ids =
            c.branchIds ??
            c.courseBranches?.map((cb) => cb.branchId) ??
            [];
          // No branch metadata: trust the API response (already branch-scoped when possible).
          if (ids.length === 0) return true;
          return ids.includes(branchId);
        })
      : all;

    if (!facultyId) {
      // When branch-scoped, prefer courses that appear on batches of that branch
      // so empty course→batch pairs are avoided.
      if (!branchId) return scopedByBranch;
      const allowedCourseIds = new Set<string>();
      for (const b of batches) {
        if (b.courseId) allowedCourseIds.add(b.courseId);
        b.batchCourses?.forEach((bc) => {
          if (bc.courseId) allowedCourseIds.add(bc.courseId);
        });
        if (b.course?.id) allowedCourseIds.add(b.course.id);
      }
      if (allowedCourseIds.size === 0) return scopedByBranch;
      return scopedByBranch.filter((c) => allowedCourseIds.has(c.id));
    }

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
    return scopedByBranch.filter((c) => allowedCourseIds.has(c.id));
  }, [coursesRes, batches, facultyId, branchId]);

  const updateLine = (key: string, patch: Partial<AssignmentTargetLine>) => {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    if (lines.length <= 1) return;
    onChange(lines.filter((l) => l.key !== key));
  };

  const needBranch = requireBranch && !branchId;
  const noFacultyBatches = Boolean(facultyId) && !batchesLoading && batches.length === 0;

  return (
    <div className="space-y-3">
      {needBranch && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Select a branch above to load courses and batches.
        </p>
      )}
      {noFacultyBatches && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          No batches are linked to your faculty profile yet. Ask admin to assign you as batch
          faculty, then refresh.
        </p>
      )}
      <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
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
        onClick={() => onChange([...lines, createEmptyTargetLine()])}
        disabled={noFacultyBatches || needBranch}
      >
        <Plus className="h-4 w-4 mr-1" /> Add target
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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
      <div className="md:col-span-3 space-y-1">
        <Label className="md:hidden text-xs text-muted-foreground">Course *</Label>
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
      <div className="md:col-span-3 space-y-1">
        <Label className="md:hidden text-xs text-muted-foreground">Module</Label>
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
      <div className="md:col-span-2 space-y-1">
        <Label className="md:hidden text-xs text-muted-foreground">Topic</Label>
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
      <div className="md:col-span-3 space-y-1">
        <Label className="md:hidden text-xs text-muted-foreground">Batch *</Label>
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
          <p className="text-xs text-amber-800">No batch matches this course.</p>
        )}
      </div>
      <div className="md:col-span-1 flex items-center justify-end">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-destructive"
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
