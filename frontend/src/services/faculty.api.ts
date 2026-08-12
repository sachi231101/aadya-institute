import { api } from "./api";
import type {
  Faculty,
  FacultyCourseAssignment,
  FacultyAttendanceRecord,
  CreateFacultyPayload,
  UpdateFacultyPayload,
  FacultyListParams,
  FacultyCoursesParams,
  FacultyAttendanceParams,
  AssignCoursePayload,
  MarkAttendancePayload,
  PaginatedResponse,
  SingleResponse,
} from "../types/faculty.types";

export const facultyApi = {
  // ─── Faculty CRUD ───────────────────────────────────────────────────

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

  // ─── Faculty Course Assignments ───────────────────────────────────

  getCourses: async (params?: FacultyCoursesParams): Promise<PaginatedResponse<FacultyCourseAssignment>> => {
    const response = await api.get<PaginatedResponse<FacultyCourseAssignment>>("/faculty/courses", { params });
    return response.data;
  },

  assignCourse: async (data: AssignCoursePayload): Promise<SingleResponse<FacultyCourseAssignment>> => {
    const response = await api.post<SingleResponse<FacultyCourseAssignment>>("/faculty/courses/assign", data);
    return response.data;
  },

  // ─── Faculty Attendance ───────────────────────────────────────────

  getAttendance: async (params?: FacultyAttendanceParams): Promise<PaginatedResponse<FacultyAttendanceRecord>> => {
    const response = await api.get<PaginatedResponse<FacultyAttendanceRecord>>("/faculty/attendance", { params });
    return response.data;
  },

  markAttendance: async (data: MarkAttendancePayload): Promise<SingleResponse<FacultyAttendanceRecord>> => {
    const response = await api.post<SingleResponse<FacultyAttendanceRecord>>("/faculty/attendance", data);
    return response.data;
  },
};
