/**
 * Shared helpers for package multi-course admissions:
 * one student row with all courses (never one row per package admission).
 */

export interface PackageCourseRef {
  id: string;
  name: string;
  code?: string;
  admissionId?: string;
  batchCode?: string;
}

export interface GroupableAdmission {
  id: string;
  studentId?: string | null;
  phone?: string | null;
  studentName?: string | null;
  courseId?: string | null;
  courseName?: string | null;
  courseCode?: string | null;
  batchCode?: string | null;
  amountPaid?: number;
  finalFee?: number;
  totalCourseFee?: number;
  paymentCount?: number;
  sortAt?: number | string | Date | null;
  courses?: PackageCourseRef[] | null;
  [key: string]: unknown;
}

export const getAdmissionGroupKey = (adm: {
  id: string;
  studentId?: string | null;
  phone?: string | null;
  studentName?: string | null;
}): string => {
  if (adm.studentId) return `student:${adm.studentId}`;
  const phone = (adm.phone || "").replace(/\D/g, "");
  const name = (adm.studentName || "").trim().toLowerCase();
  if (phone || name) return `fallback:${phone}|${name}`;
  return `id:${adm.id}`;
};

export const formatPackageCourseLabel = (
  courses: Array<{ name: string }> | undefined | null,
  fallback = "—"
): string => {
  const names = (courses || []).map((c) => c.name).filter(Boolean);
  if (names.length === 0) return fallback;
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
};

export const coursesFromStudent = (student: {
  courses?: Array<{ id: string; name: string; code?: string }> | null;
  courseName?: string | null;
}): PackageCourseRef[] => {
  if (student.courses?.length) {
    return student.courses.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code || "",
    }));
  }
  if (student.courseName && student.courseName !== "—" && student.courseName !== "Not assigned") {
    return student.courseName
      .split(",")
      .map((part) => part.replace(/\+\d+\s*$/, "").trim())
      .filter(Boolean)
      .map((name, idx) => ({ id: `name-${idx}-${name}`, name }));
  }
  return [];
};

const toSortTime = (value: GroupableAdmission["sortAt"]): number => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const pickPrimary = <T extends GroupableAdmission>(group: T[]): T => {
  return [...group].sort((a, b) => {
    const aScore =
      ((a.amountPaid || 0) > 0 ? 4 : 0) +
      ((a.paymentCount || 0) > 0 ? 2 : 0) +
      ((a.finalFee || 0) > 0 || (a.totalCourseFee || 0) > 0 ? 1 : 0);
    const bScore =
      ((b.amountPaid || 0) > 0 ? 4 : 0) +
      ((b.paymentCount || 0) > 0 ? 2 : 0) +
      ((b.finalFee || 0) > 0 || (b.totalCourseFee || 0) > 0 ? 1 : 0);
    if (bScore !== aScore) return bScore - aScore;
    return toSortTime(a.sortAt) - toSortTime(b.sortAt);
  })[0];
};

const collectCourses = <T extends GroupableAdmission>(group: T[]): PackageCourseRef[] => {
  const byId = new Map<string, PackageCourseRef>();
  for (const adm of group) {
    if (adm.courses?.length) {
      for (const c of adm.courses) {
        if (c.id && !byId.has(c.id)) byId.set(c.id, c);
      }
    } else if (adm.courseName && adm.courseName !== "—") {
      const id = adm.courseId || adm.id;
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name: adm.courseName,
          code: adm.courseCode || "",
          admissionId: adm.id,
          batchCode: adm.batchCode && adm.batchCode !== "—" ? adm.batchCode : undefined,
        });
      }
    }
  }
  return Array.from(byId.values());
};

export type GroupedAdmission<T extends GroupableAdmission> = T & {
  courses: PackageCourseRef[];
  admissionIds: string[];
  courseName: string;
};

/**
 * Collapse sibling package admissions into one row per student.
 */
export const groupAdmissionsByStudent = <T extends GroupableAdmission>(
  admissions: T[]
): GroupedAdmission<T>[] => {
  const groups = new Map<string, T[]>();
  for (const adm of admissions) {
    const key = getAdmissionGroupKey(adm);
    const bucket = groups.get(key) || [];
    bucket.push(adm);
    groups.set(key, bucket);
  }

  return Array.from(groups.values()).map((group) => {
    const primary = pickPrimary(group);
    const courses = collectCourses(group);
    const batchCodes = [
      ...new Set(group.map((a) => a.batchCode).filter((b): b is string => !!b && b !== "—")),
    ];

    return {
      ...primary,
      courses,
      admissionIds: group.map((a) => a.id),
      courseName: formatPackageCourseLabel(courses, primary.courseName || "—"),
      batchCode: batchCodes.length > 0 ? batchCodes.join(", ") : primary.batchCode,
      amountPaid: group.reduce((sum, a) => sum + (Number(a.amountPaid) || 0), 0),
      amountDue: group.reduce((sum, a) => sum + (Number((a as any).amountDue) || 0), 0),
      totalCourseFee: group.reduce((sum, a) => sum + (Number(a.totalCourseFee) || 0), 0),
      finalFee: group.reduce((sum, a) => sum + (Number(a.finalFee) || 0), 0),
    } as GroupedAdmission<T>;
  });
};

/** Count unique students represented by admission rows (package-safe). */
export const countUniqueAdmissionStudents = (
  admissions: Array<{ id: string; studentId?: string | null; phone?: string | null; studentName?: string | null }>
): number => {
  const keys = new Set(admissions.map((a) => getAdmissionGroupKey(a)));
  return keys.size;
};
