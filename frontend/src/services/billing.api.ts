import { api } from "./api";

export const billingApi = {
  listPlans: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get("/billing/plans", { params });
    return response.data;
  },

  createPlan: async (data: {
    name: string;
    code: string;
    price: number;
    billingCycle?: string;
    features?: Record<string, unknown>;
  }) => {
    const response = await api.post("/billing/plans", data);
    return response.data;
  },

  updatePlan: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/billing/plans/${id}`, data);
    return response.data;
  },

  getSubscription: async () => {
    const response = await api.get("/billing/subscription");
    return response.data;
  },

  createSubscription: async (data: {
    billingPlanId: string;
    startDate?: string;
    endDate?: string | null;
    autoRenew?: boolean;
  }) => {
    const response = await api.post("/billing/subscription", data);
    return response.data;
  },

  updateSubscription: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/billing/subscription/${id}`, data);
    return response.data;
  },

  listInvoices: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get("/billing/invoices", { params });
    return response.data;
  },

  createInvoice: async (data: {
    subscriptionId?: string;
    amount: number;
    taxAmount?: number;
    dueDate: string;
    notes?: string;
  }) => {
    const response = await api.post("/billing/invoices", data);
    return response.data;
  },

  updateInvoice: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/billing/invoices/${id}`, data);
    return response.data;
  },

  getUsage: async () => {
    const response = await api.get("/billing/usage");
    return response.data;
  },
};
