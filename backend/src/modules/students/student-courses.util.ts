/**
 * Collect unique enrolled courses for a student from admissions + batch enrollments.
 */
export type StudentCourseRef = { id: string; name: string; code: string; admissionId?: string };

export function collectStudentCourses(s: {
  admissions?: Array<{
    id?: string;
    course?: { id?: string; name?: string; code?: string } | null;
  }>;
  batchEnrollments?: Array<{
    batch?: {
      course?: { id?: string; name?: string; code?: string } | null;
      batchCourses?: Array<{ course?: { id?: string; name?: string; code?: string } | null }>;
    } | null;
  }>;
}): StudentCourseRef[] {
  const byId = new Map<string, StudentCourseRef>();

  const addCourse = (
    course?: { id?: string; name?: string; code?: string } | null,
    admissionId?: string
  ) => {
    if (!course?.id || !course.name) return;
    const existing = byId.get(course.id);
    if (existing) {
      if (!existing.admissionId && admissionId) existing.admissionId = admissionId;
      return;
    }
    byId.set(course.id, {
      id: course.id,
      name: course.name,
      code: course.code || "",
      ...(admissionId ? { admissionId } : {}),
    });
  };

  for (const enrollment of s.batchEnrollments || []) {
    const batch = enrollment?.batch;
    if (!batch) continue;
    const batchCourses = batch.batchCourses || [];
    if (batchCourses.length > 0) {
      for (const bc of batchCourses) addCourse(bc.course);
    } else {
      addCourse(batch.course);
    }
  }

  for (const admission of s.admissions || []) {
    addCourse(admission?.course, admission?.id);
  }

  return Array.from(byId.values());
}

export function formatStudentCourseNames(courses: StudentCourseRef[], fallback = ""): string {
  if (courses.length === 0) return fallback;
  return courses.map((c) => c.name).join(", ");
}
