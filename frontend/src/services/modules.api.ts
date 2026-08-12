import { api } from "./api";

export interface TopicData {
  id: string;
  title: string;
  durationHours: number;
  description?: string;
  isCompleted: boolean;
}

export interface ModuleData {
  id: string;
  courseId: string;
  name: string;
  code?: string;
  description?: string;
  sequence: number;
  duration?: number;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
  topics?: TopicData[];
  createdAt: string;
}

export interface CreateModulePayload {
  courseId: string;
  name: string;
  code?: string;
  description?: string;
  sequence?: number;
  duration?: number;
}

export interface AddTopicPayload {
  title: string;
  durationHours?: number;
  description?: string;
}

export const modulesApi = {
  getByCourse: async (courseId: string) => {
    const response = await api.get<{ success: boolean; data: ModuleData[] }>("/modules", {
      params: { courseId },
    });
    return response.data;
  },

  create: async (data: CreateModulePayload) => {
    const response = await api.post<{ success: boolean; data: ModuleData }>("/modules", data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateModulePayload>) => {
    const response = await api.patch<{ success: boolean; data: ModuleData }>(`/modules/${id}`, data);
    return response.data;
  },

  addTopic: async (moduleId: string, data: AddTopicPayload) => {
    const response = await api.post<{ success: boolean; data: ModuleData }>(
      `/modules/${moduleId}/topics`,
      data
    );
    return response.data;
  },

  toggleTopic: async (moduleId: string, topicId: string) => {
    const response = await api.patch<{ success: boolean; data: ModuleData }>(
      `/modules/${moduleId}/topics/${topicId}/toggle`
    );
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ success: boolean }>(`/modules/${id}`);
    return response.data;
  },
};
