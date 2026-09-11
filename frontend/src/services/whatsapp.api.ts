import { api } from "./api";

export interface WhatsAppAutomationConfig {
  id: string;
  instituteId: string;
  enabled: boolean;
  updatedAt?: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  event: string;
  category?: string | null;
  body?: string | null;
  providerTemplateName: string;
  providerTemplateId?: string | null;
  providerNamespace?: string | null;
  language: string;
  variables: string[];
  status: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface WhatsAppAutomation {
  event: string;
  category: string;
  label: string;
  description: string;
  timingLabel: string;
  recipientLabel: string;
  sampleVariables: Record<string, string>;
  enabled: boolean;
  templateId: string | null;
  template: {
    id: string;
    name: string;
    status: string;
    providerTemplateName: string;
    variables: string[];
  } | null;
  configuration: Record<string, unknown> & {
    variableMap?: Record<string, string>;
  };
  ruleId: string | null;
}

export interface AutomationsResponse {
  globalEnabled: boolean;
  automations: WhatsAppAutomation[];
  templates: Array<{
    id: string;
    name: string;
    event: string;
    status: string;
    category?: string | null;
    variables?: string[];
  }>;
}

export interface WhatsAppHistoryItem {
  id: string;
  createdAt: string;
  sentAt?: string | null;
  event?: string | null;
  status: string;
  skipReason?: string | null;
  errorMessage?: string | null;
  isTest?: boolean;
  template?: { id: string; name: string; providerTemplateName: string } | null;
  recipientName?: string | null;
  phone?: string | null;
  provider?: string;
  providerMessageId?: string | null;
}

export const whatsappApi = {
  getAutomationConfig: async () => {
    const response = await api.get("/whatsapp/automation-config");
    return response.data;
  },

  patchAutomationConfig: async (enabled: boolean) => {
    const response = await api.patch("/whatsapp/automation-config", { enabled });
    return response.data;
  },

  listAutomations: async (): Promise<{ data: AutomationsResponse }> => {
    const response = await api.get("/whatsapp/automations");
    return response.data;
  },

  patchAutomation: async (
    type: string,
    data: { enabled?: boolean; templateId?: string | null; configuration?: Record<string, unknown> }
  ) => {
    const response = await api.patch(`/whatsapp/automations/${type}`, data);
    return response.data;
  },

  testAutomation: async (type: string, phone: string, name?: string) => {
    const response = await api.post(`/whatsapp/automations/${type}/test`, { phone, name });
    return response.data;
  },

  listTemplates: async () => {
    const response = await api.get("/whatsapp/templates");
    return response.data;
  },

  listProviderTemplates: async () => {
    const response = await api.get("/whatsapp/provider-templates");
    return response.data;
  },

  syncTemplates: async (data?: { templateStatus?: string; pageSize?: number }) => {
    const response = await api.post("/whatsapp/templates/sync", data ?? {});
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

  deleteTemplate: async (id: string) => {
    const response = await api.delete(`/whatsapp/templates/${id}`);
    return response.data;
  },

  toggleTemplateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/whatsapp/templates/${id}/status`, { status });
    return response.data;
  },

  getHistory: async (params?: {
    page?: number;
    limit?: number;
    event?: string;
    status?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    isTest?: boolean;
  }) => {
    const response = await api.get("/whatsapp/history", { params });
    return response.data;
  },

  /** @deprecated use getHistory */
  getNotifications: async (params?: Record<string, unknown>) => {
    const response = await api.get("/whatsapp/history", { params });
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
