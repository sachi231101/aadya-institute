import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { batchesApi, type BatchData } from "@/services/batches.api";
import { studentsApi } from "@/services/students.api";
import type { Student } from "@/types/student.types";
import { formatBatchSubjectNames, getBatchCourseRows } from "@/utils/batch.utils";

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

export const ALLOCATION_QUERY_KEYS = {
  batches: ["batches"] as const,
  students: ["students"] as const,
  allocation: ["students", "allocation"] as const,
};

export function useStudentAllocation() {
  const queryClient = useQueryClient();

  const { data: batchesRes, isLoading: loadingBatches } = useQuery({
    queryKey: ALLOCATION_QUERY_KEYS.batches,
    queryFn: () => batchesApi.getAll(),
  });

  const { data: studentsRes, isLoading: loadingStudents } = useQuery({
    queryKey: ALLOCATION_QUERY_KEYS.students,
    queryFn: () => studentsApi.getAll({ limit: 200 }),
  });

  const batches: BatchData[] = batchesRes?.data ?? [];
  const students: Student[] = studentsRes?.data ?? [];

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
    return map;
  }, [batches]);

  const invalidateAllocation = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ALLOCATION_QUERY_KEYS.batches }),
      queryClient.invalidateQueries({ queryKey: ALLOCATION_QUERY_KEYS.students }),
      queryClient.invalidateQueries({ queryKey: ALLOCATION_QUERY_KEYS.allocation }),
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
    studentIds: string[],
    enrolledMapRef: Map<string, EnrolledBatchInfo>
  ) => {
    await Promise.all(
      studentIds.map(async (studentId) => {
        const oldInfo = enrolledMapRef.get(studentId);
        if (oldInfo && oldInfo.batchId !== batchId) {
          await batchesApi.transferStudent(studentId, oldInfo.batchId, batchId);
        } else {
          await batchesApi.enrollStudent(batchId, studentId);
        }
      })
    );
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
    enrolledMap,
    loadingBatches,
    loadingStudents,
    invalidateAllocation,
    assignStudentToBatch,
    assignStudentsToBatch,
    transferStudent,
    removeStudentFromBatch,
  };
}
