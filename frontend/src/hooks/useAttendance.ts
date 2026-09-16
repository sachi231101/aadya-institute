import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "../services/attendance.api";
import type {
  BulkMarkAttendancePayload,
  MarkAttendancePayload,
  PaginatedResponse,
  StudentAttendanceHistoryItem,
} from "../types/attendance.types";

export const STUDENT_ATTENDANCE_KEY = "student-attendance";
export const STUDENT_ATTENDANCE_SUMMARY_KEY = "student-attendance-summary";

export const useStudentAttendanceHistory = (
  studentId: string | null | undefined,
  params?: { fromDate?: string; toDate?: string; courseId?: string }
) => {
  return useQuery({
    queryKey: [STUDENT_ATTENDANCE_KEY, studentId, params],
    queryFn: async () => {
      const pageSize = 200;
      const first = await attendanceApi.getStudentHistory(studentId!, {
        ...params,
        page: 1,
        limit: pageSize,
      });
      const totalPages = first.meta?.totalPages ?? 1;
      if (totalPages <= 1) return first;

      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          attendanceApi.getStudentHistory(studentId!, {
            ...params,
            page: index + 2,
            limit: pageSize,
          })
        )
      );

      const merged: PaginatedResponse<StudentAttendanceHistoryItem> = {
        ...first,
        data: [first, ...rest].flatMap((page) => page.data ?? []),
      };
      return merged;
    },
    enabled: Boolean(studentId),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
};

export const useStudentAttendanceSummary = (studentId: string | null | undefined) => {
  return useQuery({
    queryKey: [STUDENT_ATTENDANCE_SUMMARY_KEY, studentId],
    queryFn: () => attendanceApi.getStudentSummary(studentId!),
    enabled: Boolean(studentId),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
};

export const useAttendance = () => {
  const queryClient = useQueryClient();

  const markMutation = useMutation({
    mutationFn: (data: MarkAttendancePayload) => attendanceApi.mark(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STUDENT_ATTENDANCE_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENT_ATTENDANCE_SUMMARY_KEY] });
    },
  });

  const bulkMarkMutation = useMutation({
    mutationFn: (data: BulkMarkAttendancePayload) => attendanceApi.bulkMark(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STUDENT_ATTENDANCE_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENT_ATTENDANCE_SUMMARY_KEY] });
    },
  });

  return {
    markAttendance: markMutation.mutateAsync,
    bulkMarkAttendance: bulkMarkMutation.mutateAsync,
    submitting: markMutation.isPending || bulkMarkMutation.isPending,
  };
};
