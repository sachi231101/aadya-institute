import { api } from "./api";

export interface CourseData {
  id: string;
  name: string;
  code: string;
  description?: string;
  duration?: number;
  durationMonths?: number;
  totalHours?: number;
  fee?: number | null;
  category?: string;
  mode?: "OFFLINE" | "ONLINE" | "HYBRID" | string;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  modules?: Array<{ id: string; name: string; code?: string; sequence: number; duration?: number; topics?: any }>;
  _count?: { batches: number; admissions: number };
}

export interface CreateCoursePayload {
  name: string;
  code: string;
  description?: string;
  duration?: number;
  category?: string;
  mode?: string;
  level?: string;
  totalHours?: number;
  fee?: number;
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
}

export const coursesApi = {
  getAll: async (params?: { search?: string; status?: string }) => {
    const response = await api.get<{ success: boolean; data: CourseData[] }>("/courses", { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<{ success: boolean; data: CourseData }>(`/courses/${id}`);
    return response.data;
  },

  create: async (data: CreateCoursePayload) => {
    const response = await api.post<{ success: boolean; data: CourseData }>("/courses", data);
    return response.data;
  },

  update: async (id: string, data: UpdateCoursePayload) => {
    const response = await api.patch<{ success: boolean }>(`/courses/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ success: boolean }>(`/courses/${id}`);
    return response.data;
  },
};
