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
}

export interface CallLog {
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

export interface LeadFollowUp {
  id: string;
  leadId: string;
  counsellorId: string;
  createdById: string;
  type: string;
  status: string;
  scheduledAt: string;
  completedAt?: string;
  notes?: string;
  outcome?: string;
  createdAt: string;
  counsellor?: { id: string; name: string };
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
    assignedCounsellorId?: string;
  }) => {
    const response = await api.post("/leads", data);
    return response.data;
  },

  updateLead: async (id: string, data: Partial<Lead>) => {
    const response = await api.patch(`/leads/${id}`, data);
    return response.data;
  },

  // Lead Actions
  assignLead: async (id: string, data: { counsellorId: string; notes?: string }) => {
    const response = await api.post(`/leads/${id}/assign`, data);
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

  convertLead: async (id: string, data: { branchId: string; courseId: string; notes?: string }) => {
    const response = await api.post(`/leads/${id}/convert`, data);
    return response.data;
  },

  triggerAiCall: async (id: string) => {
    const response = await api.post(`/leads/${id}/ai-call`);
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
    counsellorId: string;
  }) => {
    const response = await api.post(`/leads/${id}/follow-ups`, data);
    return response.data;
  },

  updateFollowUp: async (id: string, followUpId: string, data: {
    status?: string;
    outcome?: string;
    notes?: string;
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
};
