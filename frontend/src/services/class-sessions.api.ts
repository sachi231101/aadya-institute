import { api } from "./api";
import type {
  ClassSession,
  CreateClassSessionPayload,
  UpdateClassSessionPayload,
} from "../types/schedule.types";

export interface BackendClassSession {
  id: string;
  batchId: string;
  batchModuleId?: string;
  facultyId: string;
  branchId: string;
  title?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  roomNo?: string;
  mode?: "OFFLINE" | "ONLINE" | "HYBRID";
  meetingUrl?: string;
  notes?: string;
  sessionStatus?: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  status: string;
  createdAt: string;
  updatedAt: string;
  batch?: {
    id: string;
    name: string;
    code: string;
    courseId: string;
    course?: {
      id: string;
      name: string;
      code: string;
    };
  };
  faculty?: {
    id: string;
    employeeCode: string;
    user?: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
    };
  };
}

export interface SingleResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ListResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
}

export const mapBackendSession = (raw: BackendClassSession): ClassSession => {
  return {
    id: raw.id,
    title: raw.title || "Class Session",
    batchId: raw.batchId,
    batchCode: raw.batch?.code || "GENERAL-BATCH",
    courseId: raw.batch?.courseId || raw.batch?.course?.id || "",
    courseName: raw.batch?.course?.name || "General Course",
    facultyId: raw.facultyId,
    facultyName: raw.faculty?.user?.name || "Unassigned",
    date: raw.scheduledDate ? new Date(raw.scheduledDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    startTime: raw.startTime,
    endTime: raw.endTime,
    roomNo: raw.roomNo || "Room 101",
    mode: (raw.mode as any) || "OFFLINE",
    status: (raw.sessionStatus as any) || "UPCOMING",
    attendanceMarked: false,
    meetingUrl: raw.meetingUrl,
    notes: raw.notes,
  };
};

export const classSessionsApi = {
  getAll: async (params?: Record<string, any>): Promise<ListResponse<BackendClassSession>> => {
    const response = await api.get<ListResponse<BackendClassSession>>("/class-sessions", { params });
    return response.data;
  },

  getById: async (id: string): Promise<SingleResponse<BackendClassSession>> => {
    const response = await api.get<SingleResponse<BackendClassSession>>(`/class-sessions/${id}`);
    return response.data;
  },

  create: async (payload: CreateClassSessionPayload): Promise<SingleResponse<BackendClassSession>> => {
    const response = await api.post<SingleResponse<BackendClassSession>>("/class-sessions", payload);
    return response.data;
  },

  update: async (id: string, payload: UpdateClassSessionPayload): Promise<SingleResponse<BackendClassSession>> => {
    const response = await api.patch<SingleResponse<BackendClassSession>>(`/class-sessions/${id}`, payload);
    return response.data;
  },

  cancel: async (id: string): Promise<SingleResponse<BackendClassSession>> => {
    const response = await api.post<SingleResponse<BackendClassSession>>(`/class-sessions/${id}/cancel`);
    return response.data;
  },

  delete: async (id: string): Promise<SingleResponse<{ id: string; deleted: boolean }>> => {
    const response = await api.delete<SingleResponse<{ id: string; deleted: boolean }>>(`/class-sessions/${id}`);
    return response.data;
  },
};
