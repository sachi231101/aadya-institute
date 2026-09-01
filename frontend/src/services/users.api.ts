import { api } from "./api";

export interface UserResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  instituteId: string;
  branchId: string | null;
  branch?: { id: string; name: string; code: string } | null;
  roles: string[];
  modulePermissions: string[];
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  branchId?: string;
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

export interface CreateUserPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  roles: string[];
  branchId?: string;
  modulePermissions?: string[];
  permissions?: string[];
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  branchId?: string | null;
}

export interface UpdateUserStatusPayload {
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
}

export interface UpdateUserPermissionsPayload {
  modulePermissions?: string[];
  permissions?: string[];
}

export const usersApi = {
  getUsers: async (params?: UserListParams): Promise<PaginatedResponse<UserResponse>> => {
    const response = await api.get<PaginatedResponse<UserResponse>>("/users", { params });
    return response.data;
  },

  getUserById: async (id: string): Promise<SingleResponse<UserResponse>> => {
    const response = await api.get<SingleResponse<UserResponse>>(`/users/${id}`);
    return response.data;
  },

  createUser: async (data: CreateUserPayload): Promise<SingleResponse<UserResponse>> => {
    const response = await api.post<SingleResponse<UserResponse>>("/users", data);
    return response.data;
  },

  updateUser: async (id: string, data: UpdateUserPayload): Promise<SingleResponse<UserResponse>> => {
    const response = await api.patch<SingleResponse<UserResponse>>(`/users/${id}`, data);
    return response.data;
  },

  updateUserStatus: async (id: string, data: UpdateUserStatusPayload): Promise<SingleResponse<UserResponse>> => {
    const response = await api.patch<SingleResponse<UserResponse>>(`/users/${id}/status`, data);
    return response.data;
  },

  updateUserPermissions: async (
    id: string,
    data: UpdateUserPermissionsPayload
  ): Promise<SingleResponse<UserResponse>> => {
    const response = await api.patch<SingleResponse<UserResponse>>(`/users/${id}/permissions`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<SingleResponse<{ id: string; deleted: boolean }>> => {
    const response = await api.delete<SingleResponse<{ id: string; deleted: boolean }>>(`/users/${id}`);
    return response.data;
  },

  getPermissionCatalog: async (role: "CENTER_MANAGER" | "COUNSELLOR") => {
    const response = await api.get("/users/permission-catalog", { params: { role } });
    return response.data;
  },
};
