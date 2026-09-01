import { api } from "./api";

export interface WhatsAppNotification {
  id: string;
  phone: string;
  message: string;
  status: string;
  templateName?: string;
  sentAt?: string;
  createdAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  body: string;
  category?: string;
  status: string;
  createdAt: string;
}

export interface WhatsAppRule {
  id: string;
  eventType: string;
  templateId?: string;
  isEnabled: boolean;
  config?: Record<string, unknown>;
}

export const whatsappApi = {
  sendMessage: async (phone: string, message: string) => {
    const response = await api.post("/whatsapp/send", { phone, message });
    return response.data;
  },

  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
  }) => {
    const response = await api.get("/whatsapp", { params });
    return response.data;
  },

  listTemplates: async () => {
    const response = await api.get("/whatsapp/templates/all");
    return response.data;
  },

  createTemplate: async (data: Record<string, unknown>) => {
    const response = await api.post("/whatsapp/templates", data);
    return response.data;
  },

  updateTemplate: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/whatsapp/templates/${id}`, data);
    return response.data;
  },

  toggleTemplateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/whatsapp/templates/${id}/status`, { status });
    return response.data;
  },

  listRules: async () => {
    const response = await api.get("/whatsapp/rules/all");
    return response.data;
  },

  upsertRule: async (data: Record<string, unknown>) => {
    const response = await api.post("/whatsapp/rules", data);
    return response.data;
  },

  resendNotification: async (id: string) => {
    const response = await api.post(`/whatsapp/${id}/resend`);
    return response.data;
  },
};
