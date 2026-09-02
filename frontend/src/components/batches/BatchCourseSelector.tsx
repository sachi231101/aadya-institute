import React, { useState } from "react";
import { BookOpen, Calendar, Search } from "lucide-react";
import { MasterSelect } from "@/components/common/MasterSelect";
import { ClassroomDropdown } from "@/components/common/ClassroomDropdown";
import { Input } from "@/components/ui/input";

export type SchedulePattern = "MWF" | "TTS" | "WEEKEND" | "CUSTOM";

export type BatchCourseFormRow = {
  courseId: string;
  facultyId: string;
  startDate: string;
  expectedEndDate: string;
  schedulePattern: SchedulePattern;
  timeslotMasterId: string;
  classroomMasterId: string;
};

type CourseOption = { id: string; name: string; code: string };
type FacultyOption = {
  id: string;
  employeeCode?: string;
  user?: { name?: string };
  name?: string;
};

interface Props {
  courses: CourseOption[];
  facultyList: FacultyOption[];
  selectedCourses: BatchCourseFormRow[];
  onChange: (rows: BatchCourseFormRow[]) => void;
  className?: string;
  /** Pre-fill faculty when a new subject is checked (e.g. selected coordinator) */
  defaultFacultyId?: string;
  defaultStartDate?: string;
  defaultSchedulePattern?: SchedulePattern;
}

export const createEmptyCourseRow = (
  courseId: string,
  defaults?: {
    facultyId?: string;
    startDate?: string;
    schedulePattern?: SchedulePattern;
  }
): BatchCourseFormRow => ({
  courseId,
  facultyId: defaults?.facultyId || "",
  startDate: defaults?.startDate || new Date().toISOString().slice(0, 10),
  expectedEndDate: "",
  schedulePattern: defaults?.schedulePattern || "MWF",
  timeslotMasterId: "",
  classroomMasterId: "",
});

export const BatchCourseSelector: React.FC<Props> = ({
  courses,
  facultyList,
  selectedCourses,
  onChange,
  className = "",
  defaultFacultyId = "",
  defaultStartDate,
  defaultSchedulePattern = "MWF",
}) => {
  const [courseSearch, setCourseSearch] = useState("");
  const selectedIds = selectedCourses.map((c) => c.courseId);

  const toggle = (courseId: string) => {
    if (selectedIds.includes(courseId)) {
      onChange(selectedCourses.filter((r) => r.courseId !== courseId));
    } else {
      onChange([
        ...selectedCourses,
        createEmptyCourseRow(courseId, {
          facultyId: defaultFacultyId || "",
          startDate: defaultStartDate,
          schedulePattern: defaultSchedulePattern,
        }),
      ]);
    }
  };

  const patchRow = (courseId: string, patch: Partial<BatchCourseFormRow>) => {
    onChange(selectedCourses.map((r) => (r.courseId === courseId ? { ...r, ...patch } : r)));
  };

  const facultyLabel = (f: FacultyOption) =>
    `${f.user?.name || f.name || "Unnamed"} (${f.employeeCode || "—"})`;

  const batchWindow =
    selectedCourses.length > 0
      ? (() => {
          const starts = selectedCourses.map((r) => r.startDate).filter(Boolean).sort();
          const ends = selectedCourses.map((r) => r.expectedEndDate).filter(Boolean).sort();
          if (starts.length === 0) return null;
          const minStart = starts[0];
          const maxEnd = ends.length > 0 ? ends[ends.length - 1] : null;
          return maxEnd ? `${minStart} → ${maxEnd}` : `From ${minStart}`;
        })()
      : null;

  // Filter courses by search term — always show already-selected courses at top
  const searchLower = courseSearch.trim().toLowerCase();
  const filteredCourses = searchLower
    ? courses.filter(
        (c) =>
          selectedIds.includes(c.id) ||
          c.name.toLowerCase().includes(searchLower) ||
          c.code.toLowerCase().includes(searchLower)
      )
    : courses;

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-[11px] text-muted-foreground">
        Tick each course/subject in this batch. Assign faculty and schedule details per subject.
      </p>
      {/* Course search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search courses by name or code..."
          value={courseSearch}
          onChange={(e) => setCourseSearch(e.target.value)}
          className="pl-9 h-9 bg-muted/30 border-border text-foreground rounded-xl text-xs placeholder:text-muted-foreground focus:bg-background"
        />
      </div>
      <div className="rounded-xl border border-border max-h-[28rem] overflow-y-auto divide-y divide-border/60">
        {courses.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 text-center">No courses available.</p>
        ) : filteredCourses.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 text-center">
            No courses matching "{courseSearch}".
          </p>
        ) : (
          filteredCourses.map((c) => {
            const checked = selectedIds.includes(c.id);
            const row = selectedCourses.find((r) => r.courseId === c.id);
            return (
              <div key={c.id} className={`p-3 space-y-3 ${checked ? "bg-primary/5" : ""}`}>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-semibold">
                    {c.name} <span className="text-muted-foreground font-mono">({c.code})</span>
                  </span>
                </label>
                {checked && row && (
                  <div className="pl-7 space-y-3 border-l-2 border-primary/20 ml-1.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                        Subject instructor
                      </label>
                      <select
                        value={row.facultyId || ""}
                        onChange={(e) => patchRow(c.id, { facultyId: e.target.value })}
                        className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                      >
                        <option value="">Select faculty</option>
                        {facultyList.map((f) => (
                          <option key={f.id} value={f.id}>
                            {facultyLabel(f)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                          Schedule Pattern <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={row.schedulePattern}
                          onChange={(e) =>
                            patchRow(c.id, {
                              schedulePattern: e.target.value as SchedulePattern,
                            })
                          }
                          className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                          required
                        >
                          <option value="MWF">Mon, Wed, Fri (MWF)</option>
                          <option value="TTS">Tue, Thu, Sat (TTS)</option>
                          <option value="WEEKEND">Weekend (Sat, Sun)</option>
                          <option value="CUSTOM">Custom Schedule</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                          Start Date <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="date"
                          value={row.startDate}
                          onChange={(e) => patchRow(c.id, { startDate: e.target.value })}
                          required
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                          Expected End Date
                        </label>
                        <Input
                          type="date"
                          value={row.expectedEndDate}
                          min={row.startDate || undefined}
                          onChange={(e) => patchRow(c.id, { expectedEndDate: e.target.value })}
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                          Time Slot
                        </label>
                        <MasterSelect
                          entityType="timeslot"
                          value={row.timeslotMasterId}
                          onChange={(id) => patchRow(c.id, { timeslotMasterId: id })}
                          placeholder="Select time slot"
                          className="mt-0"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                          Classroom / Lab
                        </label>
                        <ClassroomDropdown
                          value={row.classroomMasterId}
                          onChange={(id) => patchRow(c.id, { classroomMasterId: id })}
                          placeholder="Select classroom"
                          className="mt-0"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {selectedCourses.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
          <span className="text-emerald-600 font-medium">
            {selectedCourses.length} subject{selectedCourses.length !== 1 ? "s" : ""} selected
          </span>
          {batchWindow && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Batch window: {batchWindow}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
