import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { facultyApi } from "@/services/faculty.api";
import type {
  FacultyListParams,
  FacultyCoursesParams,
  FacultyAttendanceParams,
  MyStudentsParams,
  CreateFacultyPayload,
  UpdateFacultyPayload,
  AssignCoursePayload,
  MarkAttendancePayload,
} from "@/types/faculty.types";
import { useAuthStore } from "@/store/auth.store";
import { mergeBranchScopedParams } from "@/utils/branch-scope.util";

const FACULTY_KEY = "faculty";
const FACULTY_COURSES_KEY = "faculty-courses";
const FACULTY_ATTENDANCE_KEY = "faculty-attendance";
const FACULTY_DASHBOARD_KEY = "faculty-dashboard";
const FACULTY_MY_STUDENTS_KEY = "faculty-my-students";

export const useFacultyList = (params?: FacultyListParams) => {
  const { user } = useAuthStore();
  const mergedParams = mergeBranchScopedParams(user, params);

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

export const useFacultyDashboard = () => {
  return useQuery({
    queryKey: [FACULTY_DASHBOARD_KEY],
    queryFn: () => facultyApi.getMyDashboard(),
  });
};

export const useFacultyMyStudents = (params?: MyStudentsParams) => {
  return useQuery({
    queryKey: [FACULTY_MY_STUDENTS_KEY, params],
    queryFn: () => facultyApi.getMyStudents(params),
  });
};

export const useCreateFaculty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFacultyPayload) => facultyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FACULTY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["reports", "faculty"] });
      queryClient.invalidateQueries({ queryKey: ["masters", "preview"] });
    },
  });
};

export const useUpdateFaculty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFacultyPayload }) =>
      facultyApi.update(id, data),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: [FACULTY_KEY] });
      queryClient.invalidateQueries({ queryKey: [FACULTY_KEY, vars.id] });
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
      queryClient.invalidateQueries({ queryKey: [FACULTY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });
};

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
