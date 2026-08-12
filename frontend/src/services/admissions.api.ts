import { api } from "./api";
import type {
  Enquiry,
  Application,
  Admission,
  CreateEnquiryPayload,
  CreateApplicationPayload,
  CreateAdmissionPayload,
  ConvertEnquiryPayload,
  ConvertApplicationPayload,
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
  // ─── ENQUIRIES API ─────────────────────────────────────────────────────────
  getEnquiries: async (params?: {
    search?: string;
    source?: string;
    status?: string;
    courseId?: string;
  }): Promise<ApiResponse<Enquiry[]>> => {
    const response = await api.get<ApiResponse<Enquiry[]>>("/admissions/enquiries", { params });
    return response.data;
  },

  getEnquiryById: async (id: string): Promise<ApiResponse<Enquiry>> => {
    const response = await api.get<ApiResponse<Enquiry>>(`/admissions/enquiries/${id}`);
    return response.data;
  },

  createEnquiry: async (payload: CreateEnquiryPayload): Promise<ApiResponse<Enquiry>> => {
    const response = await api.post<ApiResponse<Enquiry>>("/admissions/enquiries", payload);
    return response.data;
  },

  updateEnquiry: async (id: string, payload: Partial<CreateEnquiryPayload>): Promise<ApiResponse<Enquiry>> => {
    const response = await api.patch<ApiResponse<Enquiry>>(`/admissions/enquiries/${id}`, payload);
    return response.data;
  },

  deleteEnquiry: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await api.delete<ApiResponse<{ id: string }>>(`/admissions/enquiries/${id}`);
    return response.data;
  },

  convertEnquiryToApplication: async (id: string, payload?: ConvertEnquiryPayload): Promise<ApiResponse<Application>> => {
    const response = await api.post<ApiResponse<Application>>(`/admissions/enquiries/${id}/convert`, payload || {});
    return response.data;
  },

  // ─── APPLICATIONS API ──────────────────────────────────────────────────────
  getApplications: async (params?: {
    search?: string;
    feeStatus?: string;
    status?: string;
    courseId?: string;
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

  convertApplicationToAdmission: async (id: string, payload?: ConvertApplicationPayload): Promise<ApiResponse<Admission>> => {
    const response = await api.post<ApiResponse<Admission>>(`/admissions/applications/${id}/convert`, payload || {});
    return response.data;
  },

  // ─── ADMISSIONS API ────────────────────────────────────────────────────────
  getAdmissions: async (params?: {
    search?: string;
    courseId?: string;
    status?: string;
    batchId?: string;
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
