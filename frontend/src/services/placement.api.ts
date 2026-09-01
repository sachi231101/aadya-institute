import { api } from "./api";

export interface PlacementQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: string;
  companyId?: string;
  jobId?: string;
  studentId?: string;
}

export const placementApi = {
  getEligibleStudents: async (params?: PlacementQueryParams) => {
    const response = await api.get("/placement/eligible-students", { params });
    return response.data;
  },

  listCompanies: async (params?: PlacementQueryParams) => {
    const response = await api.get("/placement/companies", { params });
    return response.data;
  },

  getCompany: async (id: string) => {
    const response = await api.get(`/placement/companies/${id}`);
    return response.data;
  },

  createCompany: async (data: Record<string, unknown>) => {
    const response = await api.post("/placement/companies", data);
    return response.data;
  },

  updateCompany: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/placement/companies/${id}`, data);
    return response.data;
  },

  deleteCompany: async (id: string) => {
    const response = await api.delete(`/placement/companies/${id}`);
    return response.data;
  },

  listJobs: async (params?: PlacementQueryParams) => {
    const response = await api.get("/placement/jobs", { params });
    return response.data;
  },

  getJob: async (id: string) => {
    const response = await api.get(`/placement/jobs/${id}`);
    return response.data;
  },

  createJob: async (data: Record<string, unknown>) => {
    const response = await api.post("/placement/jobs", data);
    return response.data;
  },

  updateJob: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/placement/jobs/${id}`, data);
    return response.data;
  },

  deleteJob: async (id: string) => {
    const response = await api.delete(`/placement/jobs/${id}`);
    return response.data;
  },

  listApplications: async (params?: PlacementQueryParams) => {
    const response = await api.get("/placement/applications", { params });
    return response.data;
  },

  createApplication: async (data: Record<string, unknown>) => {
    const response = await api.post("/placement/applications", data);
    return response.data;
  },

  updateApplication: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/placement/applications/${id}`, data);
    return response.data;
  },

  deleteApplication: async (id: string) => {
    const response = await api.delete(`/placement/applications/${id}`);
    return response.data;
  },

  listInterviews: async (params?: PlacementQueryParams) => {
    const response = await api.get("/placement/interviews", { params });
    return response.data;
  },

  createInterview: async (data: Record<string, unknown>) => {
    const response = await api.post("/placement/interviews", data);
    return response.data;
  },

  updateInterview: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/placement/interviews/${id}`, data);
    return response.data;
  },

  deleteInterview: async (id: string) => {
    const response = await api.delete(`/placement/interviews/${id}`);
    return response.data;
  },

  listPlacements: async (params?: PlacementQueryParams) => {
    const response = await api.get("/placement/placements", { params });
    return response.data;
  },

  createPlacement: async (data: Record<string, unknown>) => {
    const response = await api.post("/placement/placements", data);
    return response.data;
  },

  updatePlacement: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/placement/placements/${id}`, data);
    return response.data;
  },

  deletePlacement: async (id: string) => {
    const response = await api.delete(`/placement/placements/${id}`);
    return response.data;
  },
};
