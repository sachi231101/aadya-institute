import { api } from "./api";
import type {
  Faculty,
  FacultyCourseAssignment,
  FacultyAttendanceRecord,
  FacultyDashboardData,
  FacultyMyStudent,
  CreateFacultyPayload,
  UpdateFacultyPayload,
  FacultyListParams,
  FacultyCoursesParams,
  FacultyAttendanceParams,
  MyStudentsParams,
  AssignCoursePayload,
  MarkAttendancePayload,
  DailyAttendanceParams,
  BulkDailyAttendancePayload,
  FacultyDailyAttendanceResponse,
  PaginatedResponse,
  SingleResponse,
} from "../types/faculty.types";

export const facultyApi = {
  getAll: async (params?: FacultyListParams): Promise<PaginatedResponse<Faculty>> => {
    const response = await api.get<PaginatedResponse<Faculty>>("/faculty", { params });
    return response.data;
  },

  getById: async (id: string): Promise<SingleResponse<Faculty>> => {
    const response = await api.get<SingleResponse<Faculty>>(`/faculty/${id}`);
    return response.data;
  },

  create: async (data: CreateFacultyPayload): Promise<SingleResponse<Faculty>> => {
    const response = await api.post<SingleResponse<Faculty>>("/faculty", data);
    return response.data;
  },

  update: async (id: string, data: UpdateFacultyPayload): Promise<SingleResponse<Faculty>> => {
    const response = await api.patch<SingleResponse<Faculty>>(`/faculty/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<SingleResponse<null>> => {
    const response = await api.delete<SingleResponse<null>>(`/faculty/${id}`);
    return response.data;
  },

  getMyDashboard: async (): Promise<SingleResponse<FacultyDashboardData>> => {
    const response = await api.get<SingleResponse<FacultyDashboardData>>("/faculty/me/dashboard");
    return response.data;
  },

  getMyStudents: async (params?: MyStudentsParams): Promise<PaginatedResponse<FacultyMyStudent>> => {
    const response = await api.get<PaginatedResponse<FacultyMyStudent>>("/faculty/me/students", { params });
    return response.data;
  },

  getCourses: async (params?: FacultyCoursesParams): Promise<PaginatedResponse<FacultyCourseAssignment>> => {
    const response = await api.get<PaginatedResponse<FacultyCourseAssignment>>("/faculty/courses", { params });
    return response.data;
  },

  assignCourse: async (data: AssignCoursePayload): Promise<SingleResponse<FacultyCourseAssignment>> => {
    const response = await api.post<SingleResponse<FacultyCourseAssignment>>("/faculty/courses/assign", data);
    return response.data;
  },

  getAttendance: async (params?: FacultyAttendanceParams): Promise<PaginatedResponse<FacultyAttendanceRecord>> => {
    const response = await api.get<PaginatedResponse<FacultyAttendanceRecord>>("/faculty/attendance", { params });
    return response.data;
  },

  markAttendance: async (data: MarkAttendancePayload): Promise<SingleResponse<FacultyAttendanceRecord>> => {
    const response = await api.post<SingleResponse<FacultyAttendanceRecord>>("/faculty/attendance", data);
    return response.data;
  },

  getDailyAttendance: async (
    params?: DailyAttendanceParams
  ): Promise<SingleResponse<FacultyDailyAttendanceResponse>> => {
    const response = await api.get<SingleResponse<FacultyDailyAttendanceResponse>>("/faculty/daily-attendance", {
      params,
    });
    return response.data;
  },

  saveDailyAttendance: async (
    data: BulkDailyAttendancePayload
  ): Promise<SingleResponse<{ date: string; savedCount: number; records: unknown[] }>> => {
    const response = await api.put<SingleResponse<{ date: string; savedCount: number; records: unknown[] }>>(
      "/faculty/daily-attendance",
      data
    );
    return response.data;
  },
};
