import { api } from "./api";
import type { PaginatedResponse, SingleResponse } from "@/types/faculty.types";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  batchId?: string | null;
  courseId?: string | null;
  publishedAt: string;
  createdAt: string;
  batch?: { id: string; name: string; code: string } | null;
  course?: { id: string; name: string; code: string } | null;
  faculty?: {
    id: string;
    user?: { id: string; name: string } | null;
  } | null;
}

export interface AnnouncementListParams {
  page?: number;
  limit?: number;
  batchId?: string;
  courseId?: string;
  search?: string;
  status?: "PUBLISHED" | "DRAFT" | "ALL";
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  type?: "GENERAL" | "CLASS" | "ASSIGNMENT" | "URGENT";
  status?: "PUBLISHED" | "DRAFT";
  batchId?: string;
  courseId?: string;
}

export const announcementsApi = {
  getAll: async (params?: AnnouncementListParams) => {
    const response = await api.get<PaginatedResponse<Announcement>>("/announcements", {
      params,
    });
    return response.data;
  },

  create: async (data: CreateAnnouncementPayload) => {
    const response = await api.post<SingleResponse<Announcement>>("/announcements", data);
    return response.data;
  },

  remove: async (id: string) => {
    const response = await api.delete<SingleResponse<null>>(`/announcements/${id}`);
    return response.data;
  },
};
