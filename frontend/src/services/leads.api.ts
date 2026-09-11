import { api } from "./api";

export interface Lead {
  id: string;
  instituteId: string;
  branchId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  interestedIn: string;
  courseId?: string;
  source: string;
  stage: string;
  status: string;
  priority: string;
  leadScore?: number | null;
  admissionProbability?: number | null;
  tags?: string[];
  nextBestAction?: string | null;
  notes?: string;
  createdById: string;
  assignedCounsellorId?: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  convertedAt?: string;
  convertedStudentId?: string;
  convertedAdmissionId?: string;
  lostAt?: string;
  lostReason?: string;
  lostNotes?: string;
  createdAt: string;
  updatedAt: string;
  course?: { id: string; name: string; code: string };
  branch?: { id: string; name: string; code: string };
  createdBy?: { id: string; name: string };
  assignedCounsellor?: { id: string; name: string };
  callLogs?: CallLog[];
  followUps?: LeadFollowUp[];
  activities?: LeadActivity[];
}

export interface CallLog {
  id: string;
  instituteId?: string;
  branchId?: string | null;
  externalCallId?: string | null;
  leadId?: string | null;
  studentId?: string | null;
  agentId?: string | null;
  fromNumber?: string | null;
  status: string;
  callType?: string;
  callerUserId?: string | null;
  qualification?: string | null;
  sentiment?: string | null;
  nextAction?: string | null;
  /** Set when LeadAiOutcomeService auto-created a follow-up for this call. */
  followUpCreated?: boolean;
  duration: number;
  transcript?: string | null;
  recordingUrl?: string | null;
  recordingStorageKey?: string | null;
  aiScore?: string | null;
  aiSummary?: string | null;
  interestStatus?: string | null;
  outcome?: string | null;
  attemptNumber?: number;
  failureReason?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  caller?: { id: string; name: string; email?: string | null };
  lead?: { id: string; name: string; phoneNumber: string; leadScore?: number | null };
}

export interface LeadFollowUp {
  id: string;
  leadId: string;
  counsellorId: string;
  createdById: string;
  type: string;
  status: string;
  priority?: string;
  recommendedRank?: number | null;
  scheduledAt: string;
  completedAt?: string;
  notes?: string;
  outcome?: string;
  createdAt: string;
  counsellor?: { id: string; name: string };
  lead?: {
    id: string;
    name: string;
    phoneNumber: string;
    stage: string;
    leadScore?: number | null;
    priority?: string;
  };
}

export interface LeadActivity {
  id: string;
  leadId: string;
  userId?: string;
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; name: string };
}

export interface LeadDashboardSummary {
  totalLeads: number;
  new: number;
  assigned: number;
  contacted: number;
  interested: number;
  followUp: number;
  converted: number;
  lost: number;
  hot: number;
  warm: number;
  cold: number;
  unassigned: number;
  todayCreated: number;
  overdueFollowUps: number;
}

export interface LeadQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
  stageMasterId?: string;
  status?: string;
  source?: string;
  sourceMasterId?: string;
  priority?: string;
  branchId?: string;
  assignedCounsellorId?: string;
  sortBy?: string;
  sortOrder?: string;
  scoreBand?: "hot" | "warm" | "cold" | "unscored";
  unassigned?: boolean;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
  followUpFrom?: string;
  followUpTo?: string;
}

export interface CallHistoryQueryParams {
  page?: number;
  limit?: number;
  branchId?: string;
  leadId?: string;
  studentId?: string;
  status?: string;
  statuses?: string;
  callType?: "ALL" | "AI" | "MANUAL";
  view?: "queue" | "active" | "results";
}

export const leadsApi = {
  // Core CRUD
  getLeads: async (params?: LeadQueryParams) => {
    const response = await api.get("/leads", { params });
    return response.data;
  },

  getLeadById: async (id: string) => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },

  createLead: async (data: {
    name: string;
    phoneNumber: string;
    email?: string;
    interestedIn: string;
    courseId?: string;
    /** @deprecated use sourceMasterId */
    source?: string;
    sourceMasterId?: string;
    priority?: string;
    branchId: string;
    notes?: string;
    tags?: string[];
    assignedCounsellorId?: string;
  }) => {
    const response = await api.post("/leads", data);
    return response.data;
  },

  updateLead: async (id: string, data: Partial<Lead>) => {
    const response = await api.patch(`/leads/${id}`, data);
    return response.data;
  },

  archiveLead: async (id: string) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },

  // Lead Actions
  assignLead: async (id: string, data: { counsellorId: string; notes?: string }) => {
    const response = await api.post(`/leads/${id}/assign`, data);
    return response.data;
  },

  bulkAssignLeads: async (data: {
    leadIds: string[];
    counsellorId: string;
    notes?: string;
  }) => {
    const response = await api.post("/leads/bulk-assign", data);
    return response.data;
  },

  mergeLeads: async (data: { primaryLeadId: string; duplicateLeadId: string }) => {
    const response = await api.post("/leads/merge", data);
    return response.data;
  },

  updateLeadTags: async (id: string, data: { tags: string[] }) => {
    const response = await api.post(`/leads/${id}/tags`, data);
    return response.data;
  },

  updateLeadScore: async (
    id: string,
    data: {
      leadScore?: number | null;
      admissionProbability?: number | null;
      nextBestAction?: string | null;
    }
  ) => {
    const response = await api.patch(`/leads/${id}/score`, data);
    return response.data;
  },

  changeStage: async (id: string, data: { stage: string; notes?: string }) => {
    const response = await api.patch(`/leads/${id}/stage`, data);
    return response.data;
  },

  markLost: async (id: string, data: { reason: string; notes?: string }) => {
    const response = await api.patch(`/leads/${id}/lost`, data);
    return response.data;
  },

  createApplicationFromLead: async (id: string, data?: { feeStatus?: string; notes?: string; branchId?: string; courseId?: string }) => {
    const response = await api.post(`/leads/${id}/create-application`, data || {});
    return response.data;
  },

  triggerAiCall: async (id: string) => {
    const response = await api.post(`/leads/${id}/ai-call`);
    return response.data;
  },

  createManualCallLog: async (data: {
    leadId: string;
    status?: string;
    duration?: number;
    outcome?: string | null;
    notes?: string | null;
    qualification?: string | null;
    sentiment?: string | null;
    nextAction?: string | null;
    interestStatus?: string | null;
    startedAt?: string;
    endedAt?: string;
  }) => {
    const response = await api.post("/leads/call-logs", data);
    return response.data;
  },

  // Follow-ups
  getFollowUps: async (id: string) => {
    const response = await api.get(`/leads/${id}/follow-ups`);
    return response.data;
  },

  createFollowUp: async (id: string, data: {
    type: string;
    scheduledAt: string;
    notes?: string;
    counsellorId?: string;
    priority?: string;
  }) => {
    const response = await api.post(`/leads/${id}/follow-ups`, data);
    return response.data;
  },

  updateFollowUp: async (id: string, followUpId: string, data: {
    status?: string;
    outcome?: string;
    notes?: string;
    scheduledAt?: string;
    priority?: string;
  }) => {
    const response = await api.patch(`/leads/${id}/follow-ups/${followUpId}`, data);
    return response.data;
  },

  // Activities & History
  addActivity: async (id: string, data: { type: string; title: string; description?: string }) => {
    const response = await api.post(`/leads/${id}/activities`, data);
    return response.data;
  },

  getHistory: async (id: string) => {
    const response = await api.get(`/leads/${id}/history`);
    return response.data;
  },

  // Dashboard
  getDashboardSummary: async (params?: { branchId?: string }) => {
    const response = await api.get("/leads/dashboard/summary", { params });
    return response.data;
  },

  getCounsellorPerformance: async (params?: { branchId?: string }) => {
    const response = await api.get("/leads/dashboard/counsellors", { params });
    return response.data;
  },

  getFollowUpDashboard: async (params?: { branchId?: string }) => {
    const response = await api.get("/leads/dashboard/follow-ups", { params });
    return response.data;
  },

  getCallHistory: async (params?: CallHistoryQueryParams) => {
    const response = await api.get("/leads/call-history", { params });
    return response.data;
  },
};
