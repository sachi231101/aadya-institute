import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { facultyApi } from "@/services/faculty.api";
import type {
  FacultyListParams,
  FacultyCoursesParams,
  FacultyAttendanceParams,
  MyStudentsParams,
  MyStudentAttendanceParams,
  CreateFacultyPayload,
  UpdateFacultyPayload,
  AssignCoursePayload,
  MarkAttendancePayload,
  DailyAttendanceParams,
  BulkDailyAttendancePayload,
} from "@/types/faculty.types";
import { useAuthStore } from "@/store/auth.store";
import { mergeBranchScopedParams } from "@/utils/branch-scope.util";

export const FACULTY_KEY = "faculty";
const FACULTY_COURSES_KEY = "faculty-courses";
const FACULTY_ATTENDANCE_KEY = "faculty-attendance";
const FACULTY_DAILY_ATTENDANCE_KEY = "faculty-daily-attendance";
const FACULTY_DASHBOARD_KEY = "faculty-dashboard";
const FACULTY_MY_STUDENTS_KEY = "faculty-my-students";
const FACULTY_MY_STUDENT_ATTENDANCE_KEY = "faculty-my-student-attendance";

/** Drop undefined keys so list query keys stay stable across renders. */
const normalizeFacultyListParams = (
  params?: FacultyListParams
): FacultyListParams | undefined => {
  if (!params) return undefined;
  const normalized: FacultyListParams = {};
  if (params.page != null) normalized.page = params.page;
  if (params.limit != null) normalized.limit = params.limit;
  if (params.search) normalized.search = params.search;
  if (params.branchId) normalized.branchId = params.branchId;
  if (params.status) normalized.status = params.status;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const invalidateFacultyDirectoryQueries = (
  queryClient: ReturnType<typeof useQueryClient>
) =>
  Promise.all([
    // refetchType "all" refreshes inactive directory queries before navigate remounts them
    queryClient.invalidateQueries({ queryKey: [FACULTY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({
      queryKey: ["reports", "faculty"],
      refetchType: "all",
    }),
    queryClient.invalidateQueries({ queryKey: ["masters", "preview"] }),
  ]);

export const useFacultyList = (
  params?: FacultyListParams,
  options?: { enabled?: boolean }
) => {
  const { user } = useAuthStore();
  const mergedParams = normalizeFacultyListParams(
    mergeBranchScopedParams(user, params)
  );

  return useQuery({
    queryKey: [FACULTY_KEY, "list", mergedParams],
    queryFn: () => facultyApi.getAll(mergedParams),
    enabled: options?.enabled !== false,
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
    // Pick up admin Timetable assignments without requiring a full page reload
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
};

export const useFacultyMyStudents = (params?: MyStudentsParams) => {
  return useQuery({
    queryKey: [FACULTY_MY_STUDENTS_KEY, params],
    queryFn: () => facultyApi.getMyStudents(params),
  });
};

export const useFacultyMyStudentAttendance = (
  params?: MyStudentAttendanceParams,
  enabled = true
) => {
  return useQuery({
    queryKey: [FACULTY_MY_STUDENT_ATTENDANCE_KEY, params],
    queryFn: () => facultyApi.getMyStudentAttendance(params),
    enabled,
  });
};

export const useCreateFaculty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFacultyPayload) => facultyApi.create(data),
    onSuccess: async () => {
      // Await so mutateAsync resolves only after directory caches are refreshed
      await invalidateFacultyDirectoryQueries(queryClient);
    },
  });
};

export const useUpdateFaculty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFacultyPayload }) =>
      facultyApi.update(id, data),
    onSuccess: async (_res, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [FACULTY_KEY], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: [FACULTY_KEY, vars.id] }),
      ]);
    },
  });
};

export const useDeleteFaculty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => facultyApi.delete(id),
    onSuccess: async () => {
      await invalidateFacultyDirectoryQueries(queryClient);
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

export const useFacultyDailyAttendance = (params?: DailyAttendanceParams, enabled = true) => {
  const { user } = useAuthStore();
  const mergedParams = mergeBranchScopedParams(user, params);

  return useQuery({
    queryKey: [FACULTY_DAILY_ATTENDANCE_KEY, mergedParams],
    queryFn: () => facultyApi.getDailyAttendance(mergedParams),
    enabled: enabled && (!!mergedParams?.date || !!mergedParams?.facultyId),
  });
};

export const useSaveFacultyDailyAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkDailyAttendancePayload) => facultyApi.saveDailyAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FACULTY_DAILY_ATTENDANCE_KEY] });
      queryClient.invalidateQueries({ queryKey: ["reports", "faculty"] });
      queryClient.invalidateQueries({ queryKey: [FACULTY_DASHBOARD_KEY] });
    },
  });
};
