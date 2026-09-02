import React, { useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { MasterSelect } from "@/components/common/MasterSelect";
import { ClassroomDropdown } from "@/components/common/ClassroomDropdown";
import { Button } from "@/components/ui/button";
import { batchesApi } from "@/services/batches.api";

export type ScheduleLineFormRow = {
  key: string;
  courseId: string;
  dayOfWeek: number;
  timeslotMasterId: string;
  classroomMasterId: string;
  facultyId: string;
  status: "ACTIVE" | "INACTIVE";
  attendanceEnabled: boolean;
};

type CourseOption = { id: string; name: string; code: string };
type FacultyOption = {
  id: string;
  employeeCode?: string;
  user?: { name?: string };
  name?: string;
};

const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const WEEKDAYS = [1, 2, 3, 4, 5];

let lineKeySeq = 0;
export const newLineKey = () => `line-${Date.now()}-${++lineKeySeq}`;

export const createEmptyScheduleLine = (
  defaults?: Partial<ScheduleLineFormRow>
): ScheduleLineFormRow => ({
  key: newLineKey(),
  courseId: defaults?.courseId || "",
  dayOfWeek: defaults?.dayOfWeek ?? 1,
  timeslotMasterId: defaults?.timeslotMasterId || "",
  classroomMasterId: defaults?.classroomMasterId || "",
  facultyId: defaults?.facultyId || "",
  status: defaults?.status || "ACTIVE",
  attendanceEnabled: defaults?.attendanceEnabled ?? true,
});

interface Props {
  courses: CourseOption[];
  facultyList: FacultyOption[];
  lines: ScheduleLineFormRow[];
  onChange: (lines: ScheduleLineFormRow[]) => void;
  startDate?: string;
  endDate?: string;
  branchId?: string;
  excludeBatchId?: string;
  className?: string;
}

export const BatchScheduleLinesEditor: React.FC<Props> = ({
  courses,
  facultyList,
  lines,
  onChange,
  startDate,
  endDate,
  branchId,
  excludeBatchId,
  className = "",
}) => {
  const [actionOpenFor, setActionOpenFor] = useState<string | null>(null);
  const [availableByLine, setAvailableByLine] = useState<Record<string, FacultyOption[]>>({});
  const [loadingAvailable, setLoadingAvailable] = useState<string | null>(null);

  const facultyLabel = (f: FacultyOption) =>
    `${f.user?.name || f.name || "Unnamed"} (${f.employeeCode || "—"})`;

  const patchLine = (key: string, patch: Partial<ScheduleLineFormRow>) => {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    onChange(lines.filter((l) => l.key !== key));
  };

  const addLine = () => {
    const last = lines[lines.length - 1];
    onChange([
      ...lines,
      createEmptyScheduleLine({
        courseId: last?.courseId,
        timeslotMasterId: last?.timeslotMasterId,
        classroomMasterId: last?.classroomMasterId,
        facultyId: last?.facultyId,
        dayOfWeek: last ? (last.dayOfWeek + 1) % 7 : 1,
      }),
    ]);
  };

  const addWeekly = () => {
    const last = lines[lines.length - 1];
    const base = {
      courseId: last?.courseId || courses[0]?.id || "",
      timeslotMasterId: last?.timeslotMasterId || "",
      classroomMasterId: last?.classroomMasterId || "",
      facultyId: last?.facultyId || "",
    };
    const extras = WEEKDAYS.map((day) =>
      createEmptyScheduleLine({
        ...base,
        dayOfWeek: day,
      })
    );
    onChange([...lines, ...extras]);
  };

  const loadAvailable = async (line: ScheduleLineFormRow) => {
    try {
      setLoadingAvailable(line.key);
      setActionOpenFor(null);
      const res = await batchesApi.getAvailableFaculty({
        dayOfWeek: line.dayOfWeek,
        timeslotMasterId: line.timeslotMasterId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        branchId: branchId || undefined,
        excludeBatchId: excludeBatchId || undefined,
      });
      setAvailableByLine((prev) => ({ ...prev, [line.key]: res.data || [] }));
    } catch {
      setAvailableByLine((prev) => ({ ...prev, [line.key]: [] }));
    } finally {
      setLoadingAvailable(null);
    }
  };

  const clearAvailableFilter = (key: string) => {
    setAvailableByLine((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setActionOpenFor(null);
  };

  const facultyOptionsFor = (line: ScheduleLineFormRow) =>
    availableByLine[line.key] !== undefined ? availableByLine[line.key] : facultyList;

  const courseLabel = useMemo(() => {
    const map = new Map(courses.map((c) => [c.id, c]));
    return (id: string) => {
      const c = map.get(id);
      return c ? `${c.name} (${c.code})` : "Select course";
    };
  }, [courses]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-foreground">Batch Schedule Details</h4>
          <p className="text-[10px] text-muted-foreground">
            One line per day / course / slot. Use Weekly to add Mon–Fri clones.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-xs table-fixed">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[20%]" />
            <col className="w-[8%]" />
            <col className="w-[5%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead className="bg-blue-200 border-b border-blue-200">
            <tr className="text-left">
              <th className="px-3 py-2.5 font-bold">Course <span className="text-rose-500">*</span></th>
              <th className="px-3 py-2.5 font-bold">Day <span className="text-rose-500">*</span></th>
              <th className="px-3 py-2.5 font-bold">Time Slot <span className="text-rose-500">*</span></th>
              <th className="px-3 py-2.5 font-bold">Classroom</th>
              <th className="px-3 py-2.5 font-bold">Faculty <span className="text-rose-500">*</span></th>
              <th className="px-3 py-2.5 font-bold">Status</th>
              <th className="px-3 py-2.5 font-bold text-center">Att?</th>
              <th className="px-3 py-2.5 font-bold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No schedule lines yet. Click Add New Line or Weekly.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.key} className="align-top bg-card">
                  <td className="px-3 py-2.5">
                    <select
                      value={line.courseId}
                      onChange={(e) => patchLine(line.key, { courseId: e.target.value })}
                      className="w-full h-9 px-2 border border-border rounded-lg bg-background text-xs truncate"
                      required
                    >
                      <option value="">Select course</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {courseLabel(c.id)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={line.dayOfWeek}
                      onChange={(e) => patchLine(line.key, { dayOfWeek: Number(e.target.value) })}
                      className="w-full h-9 px-2 border border-border rounded-lg bg-background text-xs"
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <MasterSelect
                      entityType="timeslot"
                      value={line.timeslotMasterId}
                      onChange={(id) => patchLine(line.key, { timeslotMasterId: id })}
                      placeholder="Time slot"
                      className="mt-0"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <ClassroomDropdown
                      value={line.classroomMasterId}
                      onChange={(id) => patchLine(line.key, { classroomMasterId: id })}
                      placeholder="Classroom"
                      className="mt-0"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="space-y-1">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActionOpenFor((k) => (k === line.key ? null : line.key))
                          }
                          className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-sky-600 text-white text-[10px] font-semibold"
                        >
                          Action <ChevronDown className="h-3 w-3" />
                        </button>
                        {actionOpenFor === line.key && (
                          <div className="absolute z-20 mt-1 w-56 rounded-lg border border-border bg-card shadow-lg py-1">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted"
                              onClick={() => clearAvailableFilter(line.key)}
                            >
                              Load All Lecturer/Instructor
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted"
                              onClick={() => loadAvailable(line)}
                              disabled={loadingAvailable === line.key}
                            >
                              {loadingAvailable === line.key
                                ? "Loading available…"
                                : "Load Available Lecturer/Instructor"}
                            </button>
                          </div>
                        )}
                      </div>
                      <select
                        value={line.facultyId}
                        onChange={(e) => patchLine(line.key, { facultyId: e.target.value })}
                        className="w-full h-9 px-2 border border-border rounded-lg bg-background text-xs"
                        required
                      >
                        <option value="">Select faculty</option>
                        {facultyOptionsFor(line).map((f) => (
                          <option key={f.id} value={f.id}>
                            {facultyLabel(f)}
                          </option>
                        ))}
                      </select>
                      {availableByLine[line.key] !== undefined && (
                        <p className="text-[9px] text-emerald-600">
                          Showing available only ({availableByLine[line.key].length})
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={line.status}
                      onChange={(e) =>
                        patchLine(line.key, {
                          status: e.target.value as "ACTIVE" | "INACTIVE",
                        })
                      }
                      className="w-full h-9 px-2 border border-border rounded-lg bg-background text-xs"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={line.attendanceEnabled}
                      onChange={(e) =>
                        patchLine(line.key, { attendanceEnabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-border"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add New Line
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addWeekly} className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Weekly
        </Button>
      </div>
    </div>
  );
};
