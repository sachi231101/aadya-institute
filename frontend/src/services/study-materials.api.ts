import { api } from "./api";
import type { PaginatedResponse, SingleResponse } from "@/types/faculty.types";

export interface StudyMaterial {
  id: string;
  title: string;
  description?: string | null;
  fileType: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  batchId?: string | null;
  classSessionId?: string | null;
  createdAt: string;
  batch?: { id: string; name: string; code: string } | null;
  classSession?: {
    id: string;
    title?: string | null;
    scheduledDate?: string;
    batch?: { id: string; name: string; code: string } | null;
  } | null;
}

export interface StudyMaterialListParams {
  page?: number;
  limit?: number;
  batchId?: string;
  classSessionId?: string;
  search?: string;
}

export interface CreateStudyMaterialPayload {
  title: string;
  description?: string;
  fileType?: "pdf" | "slides" | "code" | "doc" | "notes";
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  batchId?: string;
  classSessionId?: string;
}

export const studyMaterialsApi = {
  getAll: async (params?: StudyMaterialListParams) => {
    const response = await api.get<PaginatedResponse<StudyMaterial>>("/study-materials", {
      params,
    });
    return response.data;
  },

  create: async (data: CreateStudyMaterialPayload) => {
    const response = await api.post<SingleResponse<StudyMaterial>>("/study-materials", data);
    return response.data;
  },

  remove: async (id: string) => {
    const response = await api.delete<SingleResponse<null>>(`/study-materials/${id}`);
    return response.data;
  },
};
