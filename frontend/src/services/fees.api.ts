import { api } from "./api";
import type {
  Payment,
  PendingFee,
  FeeStats,
  FeeReportsData,
  CreatePaymentPayload,
  CollectPendingFeePayload,
  FeeReminderResponse,
  StudentFeeStatement,
} from "../types/fee.types";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  message: string;
  data: {
    total: number;
    data: T[];
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const feesApi = {
  getStats: async (): Promise<ApiResponse<FeeStats>> => {
    const response = await api.get<ApiResponse<FeeStats>>("/fees/stats");
    return response.data;
  },

  getReports: async (): Promise<ApiResponse<FeeReportsData>> => {
    const response = await api.get<ApiResponse<FeeReportsData>>("/fees/reports");
    return response.data;
  },

  getPayments: async (params?: {
    search?: string;
    method?: string;
    paymentModeMasterId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<Payment>> => {
    const response = await api.get<PaginatedApiResponse<Payment>>("/fees/payments", { params });
    return response.data;
  },

  createPayment: async (
    payload: CreatePaymentPayload
  ): Promise<ApiResponse<Payment | Payment[]>> => {
    const response = await api.post<ApiResponse<Payment | Payment[]>>("/fees/payments", payload);
    return response.data;
  },

  deletePayment: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/fees/payments/${id}`);
    return response.data;
  },

  getPendingFees: async (params?: {
    search?: string;
    status?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<PendingFee>> => {
    const response = await api.get<PaginatedApiResponse<PendingFee>>("/fees/pending", { params });
    return response.data;
  },

  collectPendingFee: async (
    id: string,
    payload: CollectPendingFeePayload
  ): Promise<ApiResponse<{ payment: Payment; pendingFee: PendingFee }>> => {
    const response = await api.post<ApiResponse<{ payment: Payment; pendingFee: PendingFee }>>(
      `/fees/pending/${id}/collect`,
      payload
    );
    return response.data;
  },

  sendReminder: async (id: string): Promise<ApiResponse<FeeReminderResponse>> => {
    const response = await api.post<ApiResponse<FeeReminderResponse>>(
      `/fees/pending/${id}/reminder`
    );
    return response.data;
  },

  getStudentStatement: async (
    studentId: string
  ): Promise<ApiResponse<StudentFeeStatement>> => {
    const response = await api.get<ApiResponse<StudentFeeStatement>>(
      `/fees/students/${studentId}`
    );
    return response.data;
  },

  getPlans: async (params?: {
    page?: number;
    limit?: number;
    branchId?: string;
    courseId?: string;
    status?: string;
    search?: string;
  }) => {
    const response = await api.get("/fees/plans", { params });
    return response.data;
  },

  createPlan: async (payload: {
    name: string;
    code?: string;
    branchId?: string;
    courseId?: string;
    totalAmount: number;
    planType?: string;
    installments?: Array<{ installmentNo: number; amount: number; dueDays: number }>;
    description?: string;
  }) => {
    const response = await api.post("/fees/plans", payload);
    return response.data;
  },

  updatePlan: async (id: string, payload: Record<string, unknown>) => {
    const response = await api.patch(`/fees/plans/${id}`, payload);
    return response.data;
  },

  getReceipts: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const response = await api.get("/fees/receipts", { params });
    return response.data;
  },
};
