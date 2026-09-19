import { api } from "./api";

export interface AICallLog {
  id: string;
  instituteId?: string;
  branchId?: string | null;
  externalCallId?: string | null;
  leadId?: string | null;
  studentId?: string | null;
  agentId?: string | null;
  fromNumber?: string | null;
  status: string;
  duration: number;
  transcript?: string | null;
  recordingUrl?: string | null;
  recordingStorageKey?: string | null;
  aiScore?: string | null;
  aiSummary?: string | null;
  scoreReason?: string | null;
  interestStatus?: string | null;
  outcome?: string | null;
  extractedFields?: Record<string, unknown> | null;
  attemptNumber?: number;
  failureReason?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  lead?: {
    id: string;
    name: string;
    phoneNumber: string;
    branchId?: string | null;
    leadScore?: number | null;
    leadTemperature?: string | null;
    leadIntent?: string | null;
    assignedCounsellorId?: string | null;
    assignedCounsellor?: { id: string; name: string } | null;
  } | null;
  agent?: {
    id: string;
    name: string;
    provider: string;
  } | null;
}

export interface AiCallingAgent {
  id: string;
  name: string;
  provider: string;
  providerAppId?: string | null;
  defaultScript?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Sarvam agent variable name → Aadya lead field path (not WhatsApp). */
export type AgentVariableMap = Record<string, string>;

/** HOT ≥ hotMin, WARM ≥ warmMin, COOL ≥ coolMin, else COLD. */
export type ScoreTemperatureBands = {
  hotMin: number;
  warmMin: number;
  coolMin: number;
};

export const DEFAULT_SCORE_TEMPERATURE_BANDS: ScoreTemperatureBands = {
  hotMin: 80,
  warmMin: 60,
  coolMin: 40,
};

export interface InstituteAiCallingConfig {
  instituteId: string | null;
  agentId: string | null;
  agent: {
    id: string;
    name: string;
    provider: string;
    isActive: boolean;
  } | null;
  fromNumber: string | null;
  callingScript: string | null;
  /** Effective map used on dial (stored or defaults). */
  agentVariableMap?: AgentVariableMap;
  /** True when institute has no custom map saved. */
  agentVariableMapIsDefault?: boolean;
  defaultAgentVariableMap?: AgentVariableMap;
  allowedAgentVariableFields?: string[];
  /** Effective HOT/WARM/COOL mins (stored or defaults). */
  scoreTemperatureBands?: ScoreTemperatureBands;
  scoreTemperatureBandsIsDefault?: boolean;
  defaultScoreTemperatureBands?: ScoreTemperatureBands;
  /** Min leadScore to auto-assign counsellor after AI call (default 50). */
  minScoreToAutoAssign?: number;
  minScoreToAutoAssignIsDefault?: boolean;
  defaultMinScoreToAutoAssign?: number;
  callingHoursStart: string | null;
  callingHoursEnd: string | null;
  callingDays: number[] | null;
  dailyCallLimit: number | null;
  maxAttemptsPerLead: number;
  retryDelayMinutes: number;
  isEnabled: boolean;
  resolved?: {
    hasTelephony: boolean;
    source: string;
    timezone: string;
    fromNumber: string;
    agentName: string | null;
  };
  updatedAt: string | null;
}

export interface UpdateInstituteAiCallingConfigInput {
  agentId?: string | null;
  fromNumber?: string | null;
  callingScript?: string | null;
  /** Pass null to clear custom map and revert to defaults. */
  agentVariableMap?: AgentVariableMap | null;
  /** Pass null to reset bands to defaults (80 / 60 / 40). */
  scoreTemperatureBands?: ScoreTemperatureBands | null;
  /** Pass null to reset to default 50. */
  minScoreToAutoAssign?: number | null;
  callingHoursStart?: string | null;
  callingHoursEnd?: string | null;
  callingDays?: number[] | null;
  dailyCallLimit?: number | null;
  maxAttemptsPerLead?: number;
  retryDelayMinutes?: number;
  isEnabled?: boolean;
}

export interface AiCallingUsageDay {
  instituteId: string;
  date: string;
  initiatedCount: number;
  completedCount: number;
  durationSeconds: number;
}

export interface AiCallingUsageResponse {
  from: string;
  to: string;
  totals: {
    initiatedCount: number;
    completedCount: number;
    durationSeconds: number;
  };
  days: AiCallingUsageDay[];
}

export interface AiCallingPlatformSettings {
  id: string;
  telephonyBaseUrl: string | null;
  defaultConcurrency: number;
  maskedCredential: string | null;
  credentialFingerprint: string | null;
  webhookConfigured: boolean;
  maskedWebhookSecret: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePlatformSettingsInput {
  telephonyBaseUrl?: string | null;
  defaultConcurrency?: number;
  credentials?: {
    apiKey?: string;
    telephonyApiKey?: string;
    webhookSecret?: string;
  };
  replaceCredentials?: boolean;
  webhookSecret?: string | null;
}

export interface CreateAgentInput {
  name: string;
  provider?: string;
  providerAppId?: string | null;
  defaultScript?: string | null;
  isActive?: boolean;
}

export type UpdateAgentInput = Partial<CreateAgentInput>;

export const aiCallingApi = {
  /** @deprecated Prefer triggerLeadCall — POST /ai-calling/trigger is not institute-scoped. */
  triggerCall: async (phone: string, prompt: string) => {
    const response = await api.post("/ai-calling/trigger", { phone, prompt });
    return response.data;
  },

  triggerLeadCall: async (leadId: string) => {
    const response = await api.post(`/leads/${leadId}/ai-call`);
    return response.data;
  },

  getCallLogs: async (params?: {
    leadId?: string;
    studentId?: string;
    page?: number;
    limit?: number;
    branchId?: string;
    status?: string;
  }) => {
    const response = await api.get("/leads/call-history", { params });
    return response.data;
  },

  getCallById: async (id: string) => {
    const response = await api.get(`/ai-calling/logs/${id}`);
    return response.data;
  },

  getConfig: async () => {
    const response = await api.get("/ai-calling/config");
    return response.data as { success: boolean; message: string; data: InstituteAiCallingConfig };
  },

  updateConfig: async (data: UpdateInstituteAiCallingConfigInput) => {
    const response = await api.put("/ai-calling/config", data);
    return response.data as { success: boolean; message: string; data: InstituteAiCallingConfig };
  },

  getUsage: async (params?: { from?: string; to?: string; days?: number }) => {
    const response = await api.get("/ai-calling/usage", { params });
    return response.data as { success: boolean; message: string; data: AiCallingUsageResponse };
  },

  listAgents: async () => {
    const response = await api.get("/ai-calling/agents");
    return response.data as { success: boolean; message: string; data: AiCallingAgent[] };
  },

  getPlatform: async () => {
    const response = await api.get("/ai-calling/platform");
    return response.data as { success: boolean; message: string; data: AiCallingPlatformSettings };
  },

  updatePlatform: async (data: UpdatePlatformSettingsInput) => {
    const response = await api.put("/ai-calling/platform", data);
    return response.data as { success: boolean; message: string; data: AiCallingPlatformSettings };
  },

  listPlatformAgents: async () => {
    const response = await api.get("/ai-calling/platform/agents");
    return response.data as { success: boolean; message: string; data: AiCallingAgent[] };
  },

  createPlatformAgent: async (data: CreateAgentInput) => {
    const response = await api.post("/ai-calling/platform/agents", data);
    return response.data as { success: boolean; message: string; data: AiCallingAgent };
  },

  updatePlatformAgent: async (id: string, data: UpdateAgentInput) => {
    const response = await api.put(`/ai-calling/platform/agents/${id}`, data);
    return response.data as { success: boolean; message: string; data: AiCallingAgent };
  },

  deletePlatformAgent: async (id: string) => {
    const response = await api.delete(`/ai-calling/platform/agents/${id}`);
    return response.data;
  },

  getInstituteConfigAdmin: async (instituteId: string) => {
    const response = await api.get(`/ai-calling/institutes/${instituteId}/config`);
    return response.data;
  },

  updateInstituteConfigAdmin: async (
    instituteId: string,
    data: UpdateInstituteAiCallingConfigInput
  ) => {
    const response = await api.put(`/ai-calling/institutes/${instituteId}/config`, data);
    return response.data;
  },
};
