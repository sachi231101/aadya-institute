import React from "react";
import { BookOpen } from "lucide-react";

export type BatchCourseFormRow = { courseId: string; facultyId: string };

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
}

export const BatchCourseSelector: React.FC<Props> = ({
  courses,
  facultyList,
  selectedCourses,
  onChange,
  className = "",
  defaultFacultyId = "",
}) => {
  const selectedIds = selectedCourses.map((c) => c.courseId);

  const toggle = (courseId: string) => {
    if (selectedIds.includes(courseId)) {
      onChange(selectedCourses.filter((r) => r.courseId !== courseId));
    } else {
      onChange([...selectedCourses, { courseId, facultyId: defaultFacultyId || "" }]);
    }
  };

  const setFaculty = (courseId: string, facultyId: string) => {
    onChange(
      selectedCourses.map((r) => (r.courseId === courseId ? { ...r, facultyId } : r))
    );
  };

  const facultyLabel = (f: FacultyOption) =>
    `${f.user?.name || f.name || "Unnamed"} (${f.employeeCode || "—"})`;

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-[11px] text-muted-foreground">
        Tick each course/subject in this batch. Assign one faculty member per subject.
      </p>
      <div className="rounded-xl border border-border max-h-56 overflow-y-auto divide-y divide-border/60">
        {courses.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 text-center">No courses available.</p>
        ) : (
          courses.map((c) => {
            const checked = selectedIds.includes(c.id);
            const row = selectedCourses.find((r) => r.courseId === c.id);
            return (
              <div key={c.id} className={`p-3 space-y-2 ${checked ? "bg-primary/5" : ""}`}>
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
                {checked && (
                  <div className="pl-8">
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                      Subject instructor
                    </label>
                    <select
                      value={row?.facultyId || ""}
                      onChange={(e) => setFaculty(c.id, e.target.value)}
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
                )}
              </div>
            );
          })
        )}
      </div>
      {selectedCourses.length > 0 && (
        <p className="text-[10px] text-emerald-600 font-medium">
          {selectedCourses.length} subject{selectedCourses.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
};
