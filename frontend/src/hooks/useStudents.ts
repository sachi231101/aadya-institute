import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsApi } from "@/services/students.api";
import { attendanceApi } from "@/services/attendance.api";
import type {
  StudentListParams,
  CreateStudentPayload,
  UpdateStudentPayload,
} from "@/types/student.types";
import type {
  RosterQuery,
  MarkAttendancePayload,
  BulkMarkAttendancePayload,
} from "@/types/attendance.types";

const STUDENTS_KEY = "students";
const STUDENT_PERFORMANCE_KEY = "student-performance";
const ATTENDANCE_ROSTER_KEY = "attendance-roster";

import { useAuthStore } from "@/store/auth.store";

// ─── Student CRUD Hooks ─────────────────────────────────────────────────

export const useStudentList = (params?: StudentListParams) => {
  const { user } = useAuthStore();
  const branchId = user?.role === "CENTER_MANAGER" && user.branchId ? user.branchId : params?.branchId;
  const mergedParams = { ...params, ...(branchId ? { branchId } : {}) };

  return useQuery({
    queryKey: [STUDENTS_KEY, mergedParams],
    queryFn: () => studentsApi.getAll(mergedParams),
  });
};

export const useStudent = (id: string | undefined) => {
  return useQuery({
    queryKey: [STUDENTS_KEY, id],
    queryFn: () => studentsApi.getById(id!),
    enabled: !!id,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStudentPayload) => studentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY] });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudentPayload }) =>
      studentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY] });
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY] });
    },
  });
};

// ─── Student Performance Hooks ──────────────────────────────────────────

export const useStudentPerformance = (studentId: string | undefined) => {
  return useQuery({
    queryKey: [STUDENT_PERFORMANCE_KEY, studentId],
    queryFn: () => studentsApi.getPerformance(studentId!),
    enabled: !!studentId,
  });
};

// ─── Attendance Hooks ───────────────────────────────────────────────────

export const useAttendanceRoster = (params: RosterQuery) => {
  return useQuery({
    queryKey: [ATTENDANCE_ROSTER_KEY, params],
    queryFn: () => attendanceApi.getRoster(params),
    enabled: !!params.date,
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MarkAttendancePayload) => attendanceApi.mark(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ATTENDANCE_ROSTER_KEY] });
    },
  });
};

export const useBulkMarkAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkMarkAttendancePayload) => attendanceApi.bulkMark(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ATTENDANCE_ROSTER_KEY] });
    },
  });
};
