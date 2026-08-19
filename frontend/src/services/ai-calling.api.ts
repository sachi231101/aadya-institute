import { api } from "./api";

export interface AICallLog {
  id: string;
  externalCallId?: string;
  leadId?: string;
  studentId?: string;
  status: string;
  duration: number;
  transcript?: string;
  recordingUrl?: string;
  aiScore?: string;
  aiSummary?: string;
  createdAt: string;
}

export const aiCallingApi = {
  triggerCall: async (phone: string, prompt: string) => {
    const response = await api.post("/ai-calling/trigger", { phone, prompt });
    return response.data;
  },

  triggerLeadCall: async (leadId: string) => {
    const response = await api.post(`/leads/${leadId}/ai-call`);
    return response.data;
  },

  getCallLogs: async (params?: { leadId?: string; studentId?: string; page?: number; limit?: number }) => {
    const response = await api.get("/ai-calling/logs", { params });
    return response.data;
  },

  getCallById: async (id: string) => {
    const response = await api.get(`/ai-calling/logs/${id}`);
    return response.data;
  },
};
