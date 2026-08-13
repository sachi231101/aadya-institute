import { api } from "./api";
import type {
  Payment,
  PendingFee,
  FeeStats,
  FeeReportsData,
  CreatePaymentPayload,
  CollectPendingFeePayload,
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
  // Stats
  getStats: async (): Promise<ApiResponse<FeeStats>> => {
    const response = await api.get<ApiResponse<FeeStats>>("/fees/stats");
    return response.data;
  },

  // Reports
  getReports: async (): Promise<ApiResponse<FeeReportsData>> => {
    const response = await api.get<ApiResponse<FeeReportsData>>("/fees/reports");
    return response.data;
  },

  // Payments
  getPayments: async (params?: {
    search?: string;
    method?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<Payment>> => {
    const response = await api.get<PaginatedApiResponse<Payment>>("/fees/payments", { params });
    return response.data;
  },

  createPayment: async (payload: CreatePaymentPayload): Promise<ApiResponse<Payment>> => {
    const response = await api.post<ApiResponse<Payment>>("/fees/payments", payload);
    return response.data;
  },

  deletePayment: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/fees/payments/${id}`);
    return response.data;
  },

  // Pending Fees
  getPendingFees: async (params?: {
    search?: string;
    status?: string;
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

  sendReminder: async (
    id: string
  ): Promise<ApiResponse<{ message: string; logId: string; studentName: string; phone: string }>> => {
    const response = await api.post<ApiResponse<{ message: string; logId: string; studentName: string; phone: string }>>(
      `/fees/pending/${id}/reminder`
    );
    return response.data;
  },
};
