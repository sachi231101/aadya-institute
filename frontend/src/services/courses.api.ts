import { api } from "./api";

export interface CourseData {
  id: string;
  name: string;
  code: string;
  description?: string;
  duration?: number;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  modules?: Array<{ id: string; name: string; sequence: number; duration?: number }>;
  _count?: { batches: number; admissions: number };
}

export interface CreateCoursePayload {
  name: string;
  code: string;
  description?: string;
  duration?: number;
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

  update: async (id: string, data: Partial<CreateCoursePayload>) => {
    const response = await api.patch<{ success: boolean }>(`/courses/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ success: boolean }>(`/courses/${id}`);
    return response.data;
  },
};
