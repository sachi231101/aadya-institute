import { api } from "./api";

export interface BranchResponse {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  updatedAt: string;
}

export interface BranchListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
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

export interface CreateBranchPayload {
  name: string;
  code: string;
  address?: string;
  phone?: string;
}

export interface UpdateBranchPayload {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
}

export interface BranchStatsResponse {
  branchId: string;
  branchName: string;
  totalStudents: number;
  totalFaculty: number;
  totalBatches: number;
  totalAdmissions: number;
}

export const branchesApi = {
  getBranches: async (params?: BranchListParams): Promise<PaginatedResponse<BranchResponse>> => {
    const response = await api.get<PaginatedResponse<BranchResponse>>("/branches", { params });
    return response.data;
  },

  getBranchById: async (id: string): Promise<SingleResponse<BranchResponse>> => {
    const response = await api.get<SingleResponse<BranchResponse>>(`/branches/${id}`);
    return response.data;
  },

  createBranch: async (data: CreateBranchPayload): Promise<SingleResponse<BranchResponse>> => {
    const response = await api.post<SingleResponse<BranchResponse>>("/branches", data);
    return response.data;
  },

  updateBranch: async (id: string, data: UpdateBranchPayload): Promise<SingleResponse<BranchResponse>> => {
    const response = await api.patch<SingleResponse<BranchResponse>>(`/branches/${id}`, data);
    return response.data;
  },

  deleteBranch: async (id: string): Promise<SingleResponse<BranchResponse>> => {
    const response = await api.delete<SingleResponse<BranchResponse>>(`/branches/${id}`);
    return response.data;
  },

  getBranchStats: async (id: string): Promise<SingleResponse<BranchStatsResponse>> => {
    const response = await api.get<SingleResponse<BranchStatsResponse>>(`/branches/${id}/stats`);
    return response.data;
  },
};
