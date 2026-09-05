import { api } from "./api";

export type IntegrationType =
  | "AI"
  | "WHATSAPP"
  | "AI_CALLING"
  | "GOOGLE_WORKSPACE"
  | "GOOGLE_SHEETS"
  | "PAYMENT"
  | "EMAIL";

export type IntegrationStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "CONNECTED"
  | "DISCONNECTED"
  | "ERROR";

export type IntegrationTestStatus = "SUCCESS" | "FAILED" | "PENDING";

export interface IntegrationCard {
  type: IntegrationType;
  name: string;
  description: string;
  provider: string | null;
  status: IntegrationStatus;
  isConfigured: boolean;
  isEnabled: boolean;
  maskedCredential: string | null;
  lastTestedAt: string | null;
  lastTestStatus: IntegrationTestStatus | null;
  lastError: string | null;
}

export interface IntegrationDetail extends IntegrationCard {
  id: string | null;
  configuration: Record<string, unknown>;
  connectedAt: string | null;
  connectedById: string | null;
  updatedAt: string | null;
}

export interface UpsertIntegrationPayload {
  provider?: string;
  isEnabled?: boolean;
  configuration?: Record<string, unknown>;
  credentials?: Record<string, string | undefined | null>;
  replaceCredentials?: boolean;
}

export interface IntegrationTestResult {
  success: boolean;
  message: string;
  integration?: IntegrationDetail;
}

export const INTEGRATIONS_QUERY_KEY = ["integrations"] as const;

export const integrationsApi = {
  list: async (): Promise<IntegrationCard[]> => {
    const res = await api.get("/integrations");
    return (res.data.data ?? []) as IntegrationCard[];
  },

  get: async (type: IntegrationType): Promise<IntegrationDetail> => {
    const res = await api.get(`/integrations/${type}`);
    return res.data.data as IntegrationDetail;
  },

  upsert: async (
    type: IntegrationType,
    payload: UpsertIntegrationPayload
  ): Promise<IntegrationDetail> => {
    const res = await api.put(`/integrations/${type}`, payload);
    return res.data.data as IntegrationDetail;
  },

  test: async (type: IntegrationType): Promise<IntegrationTestResult> => {
    try {
      const res = await api.post(`/integrations/${type}/test`);
      const data = res.data.data as IntegrationTestResult;
      return {
        success: true,
        message: res.data.message || data?.message || "Connection successful",
        integration: data?.integration ?? (data as unknown as IntegrationDetail),
      };
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; data?: IntegrationDetail } };
        message?: string;
      };
      return {
        success: false,
        message:
          axiosErr.response?.data?.message ||
          axiosErr.message ||
          "Connection test failed",
        integration: axiosErr.response?.data?.data,
      };
    }
  },

  disconnect: async (type: IntegrationType): Promise<IntegrationDetail> => {
    const res = await api.post(`/integrations/${type}/disconnect`);
    return res.data.data as IntegrationDetail;
  },

  connectGoogle: async (): Promise<{ url?: string; authUrl?: string; connectUrl?: string }> => {
    const res = await api.get("/integrations/google/connect");
    return res.data.data as { url?: string; authUrl?: string; connectUrl?: string };
  },

  disconnectGoogle: async (): Promise<void> => {
    await api.post("/integrations/google/disconnect");
  },
};
