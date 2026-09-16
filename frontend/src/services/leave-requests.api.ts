import { api } from "./api";

export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LeaveRequestItem {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveRequestStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  createdAt: string;
}

interface SingleResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const leaveRequestsApi = {
  listMine: async (): Promise<SingleResponse<LeaveRequestItem[]>> => {
    const response = await api.get<SingleResponse<LeaveRequestItem[]>>("/leave-requests/me");
    return response.data;
  },
  create: async (payload: {
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<SingleResponse<LeaveRequestItem>> => {
    const response = await api.post<SingleResponse<LeaveRequestItem>>("/leave-requests", payload);
    return response.data;
  },
  cancel: async (id: string): Promise<SingleResponse<LeaveRequestItem>> => {
    const response = await api.patch<SingleResponse<LeaveRequestItem>>(`/leave-requests/${id}/cancel`);
    return response.data;
  },
  listPending: async (): Promise<SingleResponse<LeaveRequestItem[]>> => {
    const response = await api.get<SingleResponse<LeaveRequestItem[]>>("/leave-requests");
    return response.data;
  },
  review: async (
    id: string,
    payload: { decision: "APPROVED" | "REJECTED"; reviewNote?: string }
  ): Promise<SingleResponse<LeaveRequestItem>> => {
    const response = await api.patch<SingleResponse<LeaveRequestItem>>(
      `/leave-requests/${id}/review`,
      payload
    );
    return response.data;
  },
};
