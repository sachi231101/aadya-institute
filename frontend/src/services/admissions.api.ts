import { api } from "./api";
import type {
  Application,
  ApplicationActivity,
  Admission,
  CreateApplicationPayload,
  CreateAdmissionPayload,
} from "../types/admission.types";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const admissionsApi = {
  // ─── APPLICATIONS API ──────────────────────────────────────────────────────
  getApplications: async (params?: {
    search?: string;
    feeStatus?: string;
    status?: string;
    courseId?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Application[]>> => {
    const response = await api.get<ApiResponse<Application[]>>("/admissions/applications", { params });
    return response.data;
  },

  getApplicationById: async (id: string): Promise<ApiResponse<Application>> => {
    const response = await api.get<ApiResponse<Application>>(`/admissions/applications/${id}`);
    return response.data;
  },

  createApplication: async (payload: CreateApplicationPayload): Promise<ApiResponse<Application>> => {
    const response = await api.post<ApiResponse<Application>>("/admissions/applications", payload);
    return response.data;
  },

  updateApplication: async (id: string, payload: Partial<CreateApplicationPayload>): Promise<ApiResponse<Application>> => {
    const response = await api.patch<ApiResponse<Application>>(`/admissions/applications/${id}`, payload);
    return response.data;
  },

  deleteApplication: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await api.delete<ApiResponse<{ id: string }>>(`/admissions/applications/${id}`);
    return response.data;
  },

  getApplicationActivities: async (id: string): Promise<ApiResponse<ApplicationActivity[]>> => {
    const response = await api.get<ApiResponse<ApplicationActivity[]>>(
      `/admissions/applications/${id}/activities`
    );
    return response.data;
  },

  addApplicationActivity: async (
    id: string,
    payload: { description: string; type?: string; title?: string }
  ): Promise<ApiResponse<ApplicationActivity>> => {
    const response = await api.post<ApiResponse<ApplicationActivity>>(
      `/admissions/applications/${id}/activities`,
      payload
    );
    return response.data;
  },

  // ─── ADMISSIONS API ────────────────────────────────────────────────────────
  /** Branch staff for "Admission taken by" (Admin + CM + Counsellor). */
  getStaffOptions: async (
    branchId: string
  ): Promise<ApiResponse<Array<{ id: string; name: string; roles: string[] }>>> => {
    const response = await api.get<
      ApiResponse<Array<{ id: string; name: string; roles: string[] }>>
    >("/admissions/staff-options", { params: { branchId } });
    return response.data;
  },

  getAdmissions: async (params?: {
    search?: string;
    courseId?: string;
    status?: string;
    batchId?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Admission[]>> => {
    const response = await api.get<ApiResponse<Admission[]>>("/admissions", { params });
    return response.data;
  },

  getAdmissionById: async (id: string): Promise<ApiResponse<Admission>> => {
    const response = await api.get<ApiResponse<Admission>>(`/admissions/${id}`);
    return response.data;
  },

  createAdmission: async (payload: CreateAdmissionPayload): Promise<ApiResponse<Admission>> => {
    const response = await api.post<ApiResponse<Admission>>("/admissions", payload);
    return response.data;
  },

  updateAdmission: async (id: string, payload: Partial<CreateAdmissionPayload>): Promise<ApiResponse<Admission>> => {
    const response = await api.patch<ApiResponse<Admission>>(`/admissions/${id}`, payload);
    return response.data;
  },

  deleteAdmission: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await api.delete<ApiResponse<{ id: string }>>(`/admissions/${id}`);
    return response.data;
  },
};
