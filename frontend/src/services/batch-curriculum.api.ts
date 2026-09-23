import { api } from "./api";

export interface BatchCurriculumTopic {
  topicId: string;
  title: string;
  durationHours?: number;
  description?: string;
  isCompleted: boolean;
  completedAt?: string | null;
  completedById?: string | null;
}

export interface BatchCurriculumModule {
  id: string;
  courseModuleId: string;
  sequence: number;
  isCompleted: boolean;
  completedAt: string | null;
  completedById: string | null;
  completedBy?: { id: string; name: string } | null;
  name: string;
  code: string | null;
  description: string | null;
  duration: number | null;
  courseId: string;
  course: { id: string; name: string; code: string | null };
  topics: BatchCurriculumTopic[];
}

export interface BatchCurriculumData {
  batchId: string;
  batchName: string;
  batchCode: string;
  modules: BatchCurriculumModule[];
}

export const batchCurriculumApi = {
  get: async (batchId: string) => {
    const response = await api.get<{ success: boolean; data: BatchCurriculumData }>(
      `/batches/${batchId}/curriculum`
    );
    return response.data;
  },

  /** Alias of `get` for callers that prefer a descriptive name. */
  getByBatch: async (batchId: string) => batchCurriculumApi.get(batchId),

  markModule: async (batchId: string, batchModuleId: string, isCompleted: boolean) => {
    const response = await api.patch<{ success: boolean; data: BatchCurriculumModule }>(
      `/batches/${batchId}/curriculum/modules/${batchModuleId}`,
      { isCompleted }
    );
    return response.data;
  },

  markTopic: async (
    batchId: string,
    batchModuleId: string,
    topicId: string,
    isCompleted: boolean
  ) => {
    const response = await api.patch<{ success: boolean; data: BatchCurriculumModule }>(
      `/batches/${batchId}/curriculum/modules/${batchModuleId}/topics/${topicId}`,
      { isCompleted }
    );
    return response.data;
  },
};
