import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { facultyApi } from "@/services/faculty.api";
import type {
  FacultyListParams,
  FacultyCoursesParams,
  FacultyAttendanceParams,
  CreateFacultyPayload,
  UpdateFacultyPayload,
  AssignCoursePayload,
  MarkAttendancePayload,
} from "@/types/faculty.types";

const FACULTY_KEY = "faculty";
const FACULTY_COURSES_KEY = "faculty-courses";
const FACULTY_ATTENDANCE_KEY = "faculty-attendance";

import { useAuthStore } from "@/store/auth.store";

// ─── Faculty CRUD Hooks ─────────────────────────────────────────────────

export const useFacultyList = (params?: FacultyListParams) => {
  const { user } = useAuthStore();
  const branchId = user?.role === "CENTER_MANAGER" && user.branchId ? user.branchId : params?.branchId;
  const mergedParams = { ...params, ...(branchId ? { branchId } : {}) };

  return useQuery({
    queryKey: [FACULTY_KEY, mergedParams],
    queryFn: () => facultyApi.getAll(mergedParams),
  });
};

export const useFacultyMember = (id: string | undefined) => {
  return useQuery({
    queryKey: [FACULTY_KEY, id],
    queryFn: () => facultyApi.getById(id!),
    enabled: !!id,
  });
};

export const useCreateFaculty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFacultyPayload) => facultyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FACULTY_KEY] });
    },
  });
};

export const useUpdateFaculty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFacultyPayload }) =>
      facultyApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FACULTY_KEY] });
    },
  });
};

export const useDeleteFaculty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => facultyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FACULTY_KEY] });
    },
  });
};

// ─── Faculty Course Assignment Hooks ────────────────────────────────────

export const useFacultyCourses = (params?: FacultyCoursesParams) => {
  return useQuery({
    queryKey: [FACULTY_COURSES_KEY, params],
    queryFn: () => facultyApi.getCourses(params),
  });
};

export const useAssignFacultyCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignCoursePayload) => facultyApi.assignCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FACULTY_COURSES_KEY] });
    },
  });
};

// ─── Faculty Attendance Hooks ───────────────────────────────────────────

export const useFacultyAttendance = (params?: FacultyAttendanceParams) => {
  return useQuery({
    queryKey: [FACULTY_ATTENDANCE_KEY, params],
    queryFn: () => facultyApi.getAttendance(params),
  });
};

export const useMarkFacultyAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MarkAttendancePayload) => facultyApi.markAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FACULTY_ATTENDANCE_KEY] });
    },
  });
};
