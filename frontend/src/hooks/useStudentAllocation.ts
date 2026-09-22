import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { batchesApi, type BatchData } from "@/services/batches.api";
import { studentsApi } from "@/services/students.api";
import type { PaginationMeta, Student, StudentListParams } from "@/types/student.types";

export interface EnrolledBatchInfo {
  batchId: string;
  batchCode: string;
  batchName: string;
  courseName: string;
  branchName?: string;
  timeSlot?: string;
  startDate?: string;
  facultyName?: string;
}

export type AllocationEnrollmentTab = "UNASSIGNED" | "ASSIGNED" | "ALL";

export interface StudentAllocationFilters {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  courseId?: string;
  enrollmentStatus?: AllocationEnrollmentTab;
}

export interface BulkEnrollSummary {
  assigned: number;
  skipped: number;
  failures: Array<{ studentId: string; message: string }>;
}

export const ALLOCATION_QUERY_KEYS = {
  batches: ["batches"] as const,
  students: ["students"] as const,
  allocation: ["students", "allocation"] as const,
  allocationList: (filters: StudentAllocationFilters) =>
    ["students", "allocation", "list", filters] as const,
  allocationCounts: (filters: Pick<StudentAllocationFilters, "branchId" | "courseId" | "search">) =>
    ["students", "allocation", "counts", filters] as const,
};

const BULK_ENROLL_CHUNK = 200;

const emptyMeta: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

async function countStudents(params: StudentListParams): Promise<number> {
  const res = await studentsApi.getAll({ ...params, page: 1, limit: 1 });
  return res.meta?.total ?? 0;
}

/**
 * Fetch all student IDs matching filters (paginated), capped for bulk assign.
 */
export async function fetchMatchingStudentIds(
  filters: Omit<StudentAllocationFilters, "page" | "limit">,
  maxIds = BULK_ENROLL_CHUNK
): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  const limit = 100;

  while (ids.length < maxIds) {
    const res = await studentsApi.getAll({
      page,
      limit,
      search: filters.search || undefined,
      branchId: filters.branchId || undefined,
      courseId: filters.courseId || undefined,
      enrollmentStatus: filters.enrollmentStatus || "ALL",
    });
    const pageIds = (res.data ?? []).map((s) => s.id);
    if (pageIds.length === 0) break;
    for (const id of pageIds) {
      if (ids.length >= maxIds) break;
      ids.push(id);
    }
    const totalPages = res.meta?.totalPages ?? 1;
    if (page >= totalPages) break;
    page += 1;
  }

  return ids;
}

export function useStudentAllocation(filters: StudentAllocationFilters = {}) {
  const queryClient = useQueryClient();

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const enrollmentStatus = filters.enrollmentStatus ?? "UNASSIGNED";
  const search = filters.search?.trim() || undefined;
  const branchId = filters.branchId || undefined;
  const courseId = filters.courseId || undefined;

  const listFilters: StudentAllocationFilters = {
    page,
    limit,
    search,
    branchId,
    courseId,
    enrollmentStatus,
  };

  const countFilters = { branchId, courseId, search };

  const { data: batchesRes, isLoading: loadingBatches } = useQuery({
    queryKey: ALLOCATION_QUERY_KEYS.batches,
    queryFn: () => batchesApi.getAll(),
  });

  const {
    data: studentsRes,
    isLoading: loadingStudents,
    isFetching: fetchingStudents,
    isError: studentsError,
  } = useQuery({
    queryKey: ALLOCATION_QUERY_KEYS.allocationList(listFilters),
    queryFn: () =>
      studentsApi.getAll({
        page,
        limit,
        search,
        branchId,
        courseId,
        enrollmentStatus,
      }),
  });

  const { data: counts, isLoading: loadingCounts } = useQuery({
    queryKey: ALLOCATION_QUERY_KEYS.allocationCounts(countFilters),
    queryFn: async () => {
      const base: StudentListParams = {
        search,
        branchId,
        courseId,
      };
      const [all, assigned, unassigned] = await Promise.all([
        countStudents({ ...base, enrollmentStatus: "ALL" }),
        countStudents({ ...base, enrollmentStatus: "ASSIGNED" }),
        countStudents({ ...base, enrollmentStatus: "UNASSIGNED" }),
      ]);
      return { all, assigned, unassigned };
    },
  });

  const batches: BatchData[] = batchesRes?.data ?? [];
  const students: Student[] = studentsRes?.data ?? [];
  const meta: PaginationMeta = studentsRes?.meta ?? {
    ...emptyMeta,
    page,
    limit,
  };

  const enrolledMap = useMemo(() => {
    const map = new Map<string, EnrolledBatchInfo>();
    batches.forEach((b) => {
      if (Array.isArray(b.enrollments)) {
        b.enrollments.forEach((e) => {
          if (e.studentId) {
            map.set(e.studentId, {
              batchId: b.id,
              batchCode: b.code,
              batchName: b.name,
              courseName: b.course?.name || "Course",
              branchName: b.branch?.name || "—",
              timeSlot: b.timeSlot || "",
              startDate: b.startDate,
              facultyName: b.faculty?.user?.name || "—",
            });
          }
        });
      }
    });
    students.forEach((s) => {
      if (s.batchId && !map.has(s.id)) {
        map.set(s.id, {
          batchId: s.batchId,
          batchCode: s.batchCode || "",
          batchName: s.batchName || "",
          courseName: s.courseName || "Course",
        });
      }
    });
    return map;
  }, [batches, students]);

  const invalidateAllocation = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ALLOCATION_QUERY_KEYS.batches }),
      queryClient.invalidateQueries({ queryKey: ALLOCATION_QUERY_KEYS.students }),
      queryClient.invalidateQueries({ queryKey: ALLOCATION_QUERY_KEYS.allocation }),
      queryClient.invalidateQueries({ queryKey: ["students", "allocation", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["students", "allocation", "counts"] }),
    ]);
  };

  const assignStudentToBatch = async (
    batchId: string,
    studentId: string,
    admissionId?: string
  ) => {
    await batchesApi.enrollStudent(batchId, studentId, admissionId);
  };

  const assignStudentsToBatch = async (
    batchId: string,
    studentIds: string[]
  ): Promise<BulkEnrollSummary> => {
    const uniqueIds = Array.from(new Set(studentIds));
    let assigned = 0;
    let skipped = 0;
    const failures: BulkEnrollSummary["failures"] = [];

    const useSingleFallback = async (ids: string[]) => {
      for (const studentId of ids) {
        try {
          await batchesApi.enrollStudent(batchId, studentId);
          assigned += 1;
        } catch (err: unknown) {
          const message =
            (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
              ?.message ||
            (err as { message?: string })?.message ||
            "Failed to enroll student";
          failures.push({ studentId, message });
        }
      }
    };

    for (let i = 0; i < uniqueIds.length; i += BULK_ENROLL_CHUNK) {
      const chunk = uniqueIds.slice(i, i + BULK_ENROLL_CHUNK);
      try {
        const res = await batchesApi.bulkEnrollStudents(batchId, chunk);
        const payload = res.data ?? (res as unknown as BulkEnrollSummary);
        assigned += payload?.assigned ?? 0;
        skipped += payload?.skipped ?? 0;
        if (payload?.failures?.length) {
          failures.push(...payload.failures);
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number; data?: { data?: BulkEnrollSummary; message?: string } } })
          ?.response?.status;
        const body = (err as { response?: { data?: { data?: BulkEnrollSummary; message?: string } } })?.response
          ?.data;

        // Bulk returned structured soft-fail payload
        if (body?.data && typeof body.data.assigned === "number") {
          assigned += body.data.assigned ?? 0;
          skipped += body.data.skipped ?? 0;
          if (body.data.failures?.length) {
            failures.push(...body.data.failures);
          }
          continue;
        }

        // Older server without bulk route — fall back to single enroll
        if (status === 404 || status === 405) {
          await useSingleFallback(chunk);
          continue;
        }

        throw err;
      }
    }

    if (assigned === 0 && failures.length > 0) {
      const alreadyOnly = failures.every((f) =>
        f.message.toLowerCase().includes("already assigned to this batch")
      );
      if (alreadyOnly) {
        throw new Error(
          failures.length === 1
            ? "This student is already assigned to this batch."
            : `All ${failures.length} selected students are already assigned to this batch.`
        );
      }
      const detail = failures
        .slice(0, 3)
        .map((f) => f.message)
        .filter(Boolean)
        .join("; ");
      throw new Error(detail || "Could not assign any selected students to this batch.");
    }

    if (assigned === 0 && skipped > 0) {
      throw new Error(
        skipped === 1
          ? "This student is already assigned to this batch."
          : `All ${skipped} selected students are already assigned to this batch.`
      );
    }

    if (assigned === 0 && skipped === 0 && uniqueIds.length > 0) {
      throw new Error("Assignment did not complete. Please try again.");
    }

    return { assigned, skipped, failures };
  };

  const transferStudent = async (
    studentId: string,
    fromBatchId: string,
    toBatchId: string,
    admissionId?: string
  ) => {
    await batchesApi.transferStudent(studentId, fromBatchId, toBatchId, admissionId);
  };

  const removeStudentFromBatch = async (batchId: string, studentId: string) => {
    await batchesApi.removeStudent(batchId, studentId);
  };

  return {
    batches,
    students,
    meta,
    counts: counts ?? { all: 0, assigned: 0, unassigned: 0 },
    enrolledMap,
    loadingBatches,
    loadingStudents,
    loadingCounts,
    fetchingStudents,
    studentsError,
    invalidateAllocation,
    assignStudentToBatch,
    assignStudentsToBatch,
    transferStudent,
    removeStudentFromBatch,
  };
}
