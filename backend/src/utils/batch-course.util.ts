/** Shared helpers for multi-course batch (BatchCourse) logic */

export type BatchCourseLike = {
  courseId: string;
  facultyId?: string | null;
  sequence?: number;
  course?: { id: string; name: string; code?: string } | null;
};

export type BatchLike = {
  courseId: string;
  course?: { id: string; name: string; code?: string } | null;
  batchCourses?: BatchCourseLike[];
};

export const getBatchCourseRows = (batch: BatchLike): BatchCourseLike[] => {
  if (batch.batchCourses && batch.batchCourses.length > 0) {
    return [...batch.batchCourses].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }
  if (batch.courseId && batch.course) {
    return [{ courseId: batch.courseId, course: batch.course, sequence: 1 }];
  }
  if (batch.courseId) {
    return [{ courseId: batch.courseId, sequence: 1 }];
  }
  return [];
};

export const batchIncludesCourse = (batch: BatchLike, courseId: string): boolean =>
  batch.courseId === courseId ||
  (batch.batchCourses?.some((bc) => bc.courseId === courseId) ?? false);

export const getBatchCourseIds = (batch: BatchLike): string[] => {
  const rows = getBatchCourseRows(batch);
  return [...new Set(rows.map((r) => r.courseId))];
};

export const formatBatchSubjectNames = (batch: BatchLike): string => {
  const names = getBatchCourseRows(batch)
    .map((r) => r.course?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return batch.course?.name ?? "N/A";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
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
  return session.batch?.course?.name ?? "Class Session";
};

export const assertAdmissionCourseInBatch = (
  admissionCourseId: string | null | undefined,
  batch: BatchLike
): boolean => {
  if (!admissionCourseId) return true;
  return batchIncludesCourse(batch, admissionCourseId);
};
