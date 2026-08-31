import { api } from "./api";
import type {
  Student,
  StudentDetail,
  StudentPerformanceMetrics,
  CreateStudentPayload,
  UpdateStudentPayload,
  StudentListParams,
  PaginatedResponse,
  SingleResponse,
} from "../types/student.types";

export interface StudentDashboardData {
  profile: { id: string; studentCode: string; name: string | null; email: string | null };
  course: { id: string; name: string; code: string; batchName: string } | null;
  instructor: { id: string; name: string | null; email: string | null; phone: string | null } | null;
  counts: {
    todayClasses: number;
    upcomingClasses: number;
    pendingAssignments: number;
    availableRecordings: number;
  };
  attendanceSummary: {
    attendancePercentage: number;
    totalClasses: number;
    presentCount: number;
  };
  todaySessions: Array<{
    id: string;
    title: string | null;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    sessionStatus: string | null;
    mode: string | null;
    meetingUrl?: string | null;
    courseName: string | null;
    facultyName: string | null;
  }>;
  upcomingSessions: StudentDashboardData["todaySessions"];
  activeLiveSessions: Array<{
    id: string;
    title: string | null;
    meetingUrl?: string | null;
    courseName: string | null;
    facultyName: string | null;
  }>;
}

export const studentsApi = {
  getAll: async (params?: StudentListParams): Promise<PaginatedResponse<Student>> => {
    const response = await api.get<PaginatedResponse<Student>>("/students", { params });
    return response.data;
  },

  getById: async (id: string): Promise<SingleResponse<StudentDetail>> => {
    const response = await api.get<SingleResponse<StudentDetail>>(`/students/${id}`);
    return response.data;
  },

  create: async (data: CreateStudentPayload): Promise<SingleResponse<Student>> => {
    const response = await api.post<SingleResponse<Student>>("/students", data);
    return response.data;
  },

  update: async (id: string, data: UpdateStudentPayload): Promise<SingleResponse<Student>> => {
    const response = await api.patch<SingleResponse<Student>>(`/students/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<SingleResponse<null>> => {
    const response = await api.delete<SingleResponse<null>>(`/students/${id}`);
    return response.data;
  },

  getPerformance: async (id: string): Promise<SingleResponse<StudentPerformanceMetrics>> => {
    const response = await api.get<SingleResponse<StudentPerformanceMetrics>>(`/students/${id}/performance`);
    return response.data;
  },

  // ─── Student Credentials WhatsApp ─────────────────────────────────────

  sendCredentialsWhatsApp: async (
    id: string
  ): Promise<
    SingleResponse<{
      success: boolean;
      recipient: {
        name: string;
        phone: string;
        formattedPhone: string;
        studentCode: string;
      };
      message: string;
      whatsappWebUrl: string;
    }>
  > => {
    const response = await api.post(`/students/${id}/send-credentials-whatsapp`);
    return response.data;
  },
};
