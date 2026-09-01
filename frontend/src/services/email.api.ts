import { api } from "./api";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: string;
  sentAt?: string;
  error?: string;
  createdAt: string;
}

export interface EmailTemplateQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface EmailLogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const emailApi = {
  listTemplates: async (params?: EmailTemplateQueryParams) => {
    const response = await api.get("/email/templates", { params });
    return response.data;
  },

  getTemplate: async (id: string) => {
    const response = await api.get(`/email/templates/${id}`);
    return response.data;
  },

  createTemplate: async (data: {
    name: string;
    subject: string;
    body: string;
    category?: string;
  }) => {
    const response = await api.post("/email/templates", data);
    return response.data;
  },

  updateTemplate: async (id: string, data: Partial<EmailTemplate>) => {
    const response = await api.patch(`/email/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: string) => {
    const response = await api.delete(`/email/templates/${id}`);
    return response.data;
  },

  sendTest: async (data: { to: string; templateId?: string; subject?: string; body?: string }) => {
    const response = await api.post("/email/send-test", data);
    return response.data;
  },

  listLogs: async (params?: EmailLogQueryParams) => {
    const response = await api.get("/email/logs", { params });
    return response.data;
  },
};
