import { api } from "./api";

export interface MasterRecord {
  id: string;
  instituteId: string;
  branchId?: string | null;
  entityType: string;
  code?: string | null;
  name: string;
  description?: string | null;
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
  data?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string; code: string } | null;
}

export interface MasterListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
  branchId?: string;
}

export interface PaginatedMasterResponse {
  success: boolean;
  data: MasterRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SingleMasterResponse {
  success: boolean;
  data: MasterRecord;
  message?: string;
}

export interface CreateMasterPayload {
  name: string;
  code?: string;
  description?: string;
  branchId?: string;
  status?: "ACTIVE" | "INACTIVE";
  sortOrder?: number;
  data?: Record<string, any>;
}

export interface UpdateMasterPayload {
  name?: string;
  code?: string;
  description?: string;
  branchId?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  sortOrder?: number;
  data?: Record<string, any>;
}

export const mastersApi = {
  getMasters: async (
    entityType: string,
    params?: MasterListParams
  ): Promise<PaginatedMasterResponse> => {
    const response = await api.get<PaginatedMasterResponse>(`/masters/${entityType}`, {
      params,
    });
    return response.data;
  },

  getMasterById: async (
    entityType: string,
    id: string
  ): Promise<SingleMasterResponse> => {
    const response = await api.get<SingleMasterResponse>(`/masters/${entityType}/${id}`);
    return response.data;
  },

  createMaster: async (
    entityType: string,
    payload: CreateMasterPayload
  ): Promise<SingleMasterResponse> => {
    const response = await api.post<SingleMasterResponse>(
      `/masters/${entityType}`,
      payload
    );
    return response.data;
  },

  updateMaster: async (
    entityType: string,
    id: string,
    payload: UpdateMasterPayload
  ): Promise<SingleMasterResponse> => {
    const response = await api.patch<SingleMasterResponse>(
      `/masters/${entityType}/${id}`,
      payload
    );
    return response.data;
  },

  deleteMaster: async (
    entityType: string,
    id: string
  ): Promise<{ success: boolean; data: { id: string; deleted: boolean } }> => {
    const response = await api.delete<{
      success: boolean;
      data: { id: string; deleted: boolean };
    }>(`/masters/${entityType}/${id}`);
    return response.data;
  },
};
