/** Shared helpers for multi-course batch (BatchCourse) logic */

export type BatchCourseLike = {
  id?: string;
  courseId: string;
  facultyId?: string | null;
  sequence?: number;
  course?: { id: string; name: string; code?: string };
  faculty?: {
    id: string;
    employeeCode?: string;
    user?: { id?: string; name?: string; email?: string | null; phone?: string | null };
  } | null;
};

export type BatchLike = {
  courseId: string;
  facultyId?: string | null;
  course?: { id: string; name: string; code?: string } | null;
  faculty?: {
    id: string;
    employeeCode?: string;
    user?: { name?: string; email?: string | null; phone?: string | null };
  } | null;
  batchCourses?: BatchCourseLike[];
};

export const getBatchCourseRows = (batch: BatchLike): BatchCourseLike[] => {
  if (batch.batchCourses && batch.batchCourses.length > 0) {
    return [...batch.batchCourses].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }
  if (batch.courseId) {
    return [
      {
        courseId: batch.courseId,
        facultyId: batch.facultyId ?? batch.faculty?.id ?? null,
        sequence: 1,
        course: batch.course ?? undefined,
        faculty: batch.faculty ?? null,
      },
    ];
  }
  return [];
};

export const batchIncludesCourse = (batch: BatchLike, courseId: string): boolean =>
  batch.courseId === courseId ||
  (batch.batchCourses?.some((bc) => bc.courseId === courseId) ?? false);

export const batchIncludesFaculty = (batch: BatchLike, facultyId: string): boolean =>
  batch.facultyId === facultyId ||
  batch.faculty?.id === facultyId ||
  (batch.batchCourses?.some(
    (bc) => bc.facultyId === facultyId || bc.faculty?.id === facultyId
  ) ?? false);

export const getCourseNameInBatch = (batch: BatchLike, courseId: string): string | undefined => {
  const row = getBatchCourseRows(batch).find((r) => r.courseId === courseId);
  return row?.course?.name ?? batch.course?.name ?? undefined;
};

export const getBatchCourseIds = (batch: BatchLike): string[] => {
  const rows = getBatchCourseRows(batch);
  return [...new Set(rows.map((r) => r.courseId))];
};

export const formatBatchSubjectNames = (batch: BatchLike): string => {
  const names = getBatchCourseRows(batch)
    .map((r) => r.course?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return batch.course?.name || "N/A";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
};

export const formatSubjectWithFaculty = (row: BatchCourseLike): string => {
  const courseName = row.course?.name || "Course";
  const facultyName = row.faculty?.user?.name;
  return facultyName ? `${courseName} (${facultyName})` : courseName;
};

export const formatBatchSubjectsWithFaculty = (batch: BatchLike): string => {
  const rows = getBatchCourseRows(batch);
  if (rows.length === 0) return batch.course?.name || "N/A";
  return rows.map(formatSubjectWithFaculty).join(" · ");
};

export const getFacultyForCourseInBatch = (
  batch: BatchLike,
  courseId: string
): BatchCourseLike["faculty"] | null => {
  const row = getBatchCourseRows(batch).find((r) => r.courseId === courseId);
  return row?.faculty ?? batch.faculty ?? null;
};

export const getUniqueFacultyInBatch = (batch: BatchLike): Array<NonNullable<BatchCourseLike["faculty"]>> => {
  const seen = new Set<string>();
  const result: Array<NonNullable<BatchCourseLike["faculty"]>> = [];
  for (const row of getBatchCourseRows(batch)) {
    if (row.faculty?.id && !seen.has(row.faculty.id)) {
      seen.add(row.faculty.id);
      result.push(row.faculty);
    }
  }
  if (result.length === 0 && batch.faculty?.id) {
    result.push(batch.faculty);
  }
  return result;
};

export const formatBatchInstructorsSummary = (batch: BatchLike): string => {
  const faculty = getUniqueFacultyInBatch(batch);
  if (faculty.length === 0) return "Unassigned";
  if (faculty.length === 1) return faculty[0].user?.name || "Assigned";
  const names = faculty.map((f) => f.user?.name).filter(Boolean);
  if (names.length <= 2) return names.join(", ");
  return `${names[0]} +${names.length - 1} more`;
};

const formatShortDate = (value?: string | Date | null): string => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
};

/** Zenox-style title: Faculty|Course|Time|DateRange|Pattern */
export const formatBatchScheduleTitle = (batch: BatchLike & {
  name?: string;
  startDate?: string | Date | null;
  expectedEndDate?: string | Date | null;
  schedulePattern?: string | null;
  timeSlot?: string | null;
  schedules?: Array<{
    startTime?: string;
    endTime?: string;
    timeslotMaster?: { name?: string } | null;
    faculty?: { user?: { name?: string } | null } | null;
  }>;
}): string => {
  const faculty =
    batch.faculty?.user?.name ||
    batch.schedules?.find((s) => s.faculty?.user?.name)?.faculty?.user?.name ||
    getUniqueFacultyInBatch(batch)[0]?.user?.name ||
    "Unassigned";
  const course = formatBatchSubjectNames(batch);
  const slot =
    batch.timeSlot ||
    batch.schedules?.[0]?.timeslotMaster?.name ||
    (batch.schedules?.[0]?.startTime
      ? `${batch.schedules[0].startTime} to ${batch.schedules[0].endTime}`
      : "—");
  const range = `${formatShortDate(batch.startDate)} to ${formatShortDate(batch.expectedEndDate)}`;
  const pattern = batch.schedulePattern || "CUSTOM";
  return `${faculty} | ${course} | ${slot} | ${range} | ${pattern}`;
};

/** Prefer session title, then batch subjects, then legacy primary course */
export const getSessionSubjectLabel = (session: {
  title?: string | null;
  batch?: BatchLike | null;
}): string => {
  if (session.title?.trim()) return session.title.trim();
  if (session.batch) {
    const subjects = formatBatchSubjectNames(session.batch);
    if (subjects !== "N/A") return subjects;
  }
  return session.batch?.course?.name || "Class Session";
};
