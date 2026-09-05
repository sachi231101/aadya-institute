import { api } from "./api";

export interface InvitationResponse {
  id: string;
  instituteId: string;
  branchId: string | null;
  email: string;
  phone: string | null;
  name: string;
  roleName: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  acceptedAt: string | null;
  invitedById: string;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string; code: string } | null;
  invitedBy?: { id: string; name: string; email: string | null } | null;
  inviteLink?: string;
}

export interface CreateInvitationPayload {
  name: string;
  email: string;
  phone?: string;
  roleName: string;
  branchId?: string;
  branchIds?: string[];
}

export interface AcceptInvitePreview {
  name: string;
  email: string;
  roleName: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const invitationsApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<InvitationResponse>> => {
    const response = await api.get<PaginatedResponse<InvitationResponse>>("/invitations", {
      params,
    });
    return response.data;
  },

  create: async (
    data: CreateInvitationPayload
  ): Promise<SingleResponse<InvitationResponse>> => {
    const response = await api.post<SingleResponse<InvitationResponse>>("/invitations", data);
    return response.data;
  },

  revoke: async (id: string): Promise<SingleResponse<InvitationResponse>> => {
    const response = await api.post<SingleResponse<InvitationResponse>>(
      `/invitations/${id}/revoke`
    );
    return response.data;
  },

  preview: async (token: string): Promise<SingleResponse<AcceptInvitePreview>> => {
    const response = await api.get<SingleResponse<AcceptInvitePreview>>(
      `/invitations/accept/${encodeURIComponent(token)}`
    );
    return response.data;
  },

  accept: async (data: {
    token: string;
    password: string;
  }): Promise<SingleResponse<{ id: string; name: string; email: string | null }>> => {
    const response = await api.post("/invitations/accept", data);
    return response.data;
  },
};
