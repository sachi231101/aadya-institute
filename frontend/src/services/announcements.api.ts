import { api } from "./api";
import type { PaginatedResponse, SingleResponse } from "@/types/faculty.types";

export type AnnouncementTargetRole =
  | "STUDENT"
  | "FACULTY"
  | "COUNSELLOR"
  | "CENTER_MANAGER"
  | "ALL";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  targetRole: AnnouncementTargetRole | string;
  authorRole: string;
  batchId?: string | null;
  courseId?: string | null;
  branchId?: string | null;
  publishedAt: string;
  createdAt: string;
  isRead?: boolean;
  readAt?: string | null;
  readCount?: number;
  sentCount?: number;
  batch?: { id: string; name: string; code: string; branchId?: string } | null;
  course?: { id: string; name: string; code: string } | null;
  branch?: { id: string; name: string; code: string } | null;
  faculty?: {
    id: string;
    designation?: string | null;
    user?: { id: string; name: string } | null;
  } | null;
  createdBy?: { id: string; name: string } | null;
}

export interface AnnouncementListParams {
  page?: number;
  limit?: number;
  batchId?: string;
  courseId?: string;
  search?: string;
  status?: "PUBLISHED" | "DRAFT" | "ALL";
  view?: "inbox" | "sent";
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  type?: "GENERAL" | "CLASS" | "ASSIGNMENT" | "URGENT";
  status?: "PUBLISHED" | "DRAFT";
  targetRole?: AnnouncementTargetRole;
  branchId?: string;
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

  markRead: async (id: string) => {
    const response = await api.post<SingleResponse<{ readAt: string }>>(`/announcements/${id}/read`);
    return response.data;
  },

  markAllRead: async (batchId?: string) => {
    const response = await api.post<SingleResponse<{ marked: number }>>("/announcements/read-all", {
      batchId,
    });
    return response.data;
  },
};
