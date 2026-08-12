import { api } from "./api";

export interface BatchData {
  id: string;
  name: string;
  code: string;
  courseId: string;
  facultyId?: string | null;
  startDate: string;
  capacity?: number;
  schedulePattern?: "MWF" | "TTS" | "WEEKEND" | "CUSTOM" | string;
  timeSlot?: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  course?: { id: string; name: string; code: string };
  faculty?: {
    id: string;
    employeeCode: string;
    user?: { id: string; name: string; email?: string; phone?: string };
  } | null;
  branch?: { id: string; name: string; code: string };
  schedules?: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>;
  _count?: { enrollments: number; classSessions: number };
  enrollments?: Array<{
    id: string;
    studentId: string;
    student?: {
      id: string;
      studentCode: string;
      qualification?: string;
      user?: { id: string; name: string; email?: string; phone?: string };
    };
  }>;
}

export interface CreateBatchPayload {
  name: string;
  code: string;
  courseId: string;
  facultyId?: string;
  startDate: string;
  expectedEndDate?: string;
  capacity?: number;
  schedulePattern?: "MWF" | "TTS" | "WEEKEND" | "CUSTOM";
  timeSlot?: string;
}

export const batchesApi = {
  getAll: async (params?: { search?: string; courseId?: string; facultyId?: string; status?: string }) => {
    const response = await api.get<{ success: boolean; data: BatchData[] }>("/batches", { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<{ success: boolean; data: BatchData }>(`/batches/${id}`);
    return response.data;
  },

  getStudents: async (batchId: string) => {
    const response = await api.get<{
      success: boolean;
      data: Array<{
        id: string;
        studentId: string;
        student: {
          id: string;
          studentCode: string;
          qualification?: string;
          user?: { id: string; name: string; email?: string; phone?: string };
        };
      }>;
    }>(`/batches/${batchId}/students`);
    return response.data;
  },

  create: async (data: CreateBatchPayload) => {
    const response = await api.post<{ success: boolean; data: BatchData }>("/batches", data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateBatchPayload>) => {
    const response = await api.patch<{ success: boolean }>(`/batches/${id}`, data);
    return response.data;
  },

  assignFaculty: async (batchId: string, facultyId: string) => {
    const response = await api.patch<{ success: boolean }>(`/batches/${batchId}/faculty`, { facultyId });
    return response.data;
  },

  enrollStudent: async (batchId: string, studentId: string, admissionId?: string) => {
    const response = await api.post<{ success: boolean }>(`/batches/${batchId}/students`, {
      studentId,
      admissionId,
    });
    return response.data;
  },

  removeStudent: async (batchId: string, studentId: string) => {
    const response = await api.delete<{ success: boolean }>(`/batches/${batchId}/students/${studentId}`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ success: boolean }>(`/batches/${id}`);
    return response.data;
  },
};
