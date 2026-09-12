import { api } from "./api";
import type {
  Payment,
  PendingFee,
  FeeStats,
  FeeReportsData,
  CreatePaymentPayload,
  CollectPendingFeePayload,
  CreateChargePayload,
  CreateChargesPayload,
  FeeReminderResponse,
  StudentFeeStatement,
  FeeStudentRow,
  StudentInvoice,
  OtherInvoice,
  CreateOtherInvoicePayload,
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

  listFeeStudents: async (params?: {
    search?: string;
    courseId?: string;
    batchId?: string;
    status?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<FeeStudentRow>> => {
    const response = await api.get<PaginatedApiResponse<FeeStudentRow>>("/fees/students", {
      params,
    });
    return response.data;
  },

  getPayments: async (params?: {
    search?: string;
    method?: string;
    paymentModeMasterId?: string;
    feeHeadMasterId?: string;
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

  voidPayment: async (id: string): Promise<ApiResponse<Payment>> => {
    const response = await api.post<ApiResponse<Payment>>(`/fees/payments/${id}/void`);
    return response.data;
  },

  deletePayment: async (id: string): Promise<ApiResponse<{ id: string; status: string }>> => {
    const response = await api.delete<ApiResponse<{ id: string; status: string }>>(
      `/fees/payments/${id}`
    );
    return response.data;
  },

  getPendingFees: async (params?: {
    search?: string;
    status?: string;
    studentId?: string;
    feeHeadMasterId?: string;
    dueWithinDays?: number;
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

  createCharge: async (payload: CreateChargePayload): Promise<ApiResponse<PendingFee[]>> => {
    const response = await api.post<ApiResponse<PendingFee[]>>("/fees/charge", payload);
    return response.data;
  },

  createCharges: async (payload: CreateChargesPayload): Promise<ApiResponse<PendingFee[]>> => {
    const response = await api.post<ApiResponse<PendingFee[]>>("/fees/charges", payload);
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

  listInvoices: async (params?: {
    search?: string;
    status?: string;
    studentId?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<StudentInvoice>> => {
    const response = await api.get<PaginatedApiResponse<StudentInvoice>>("/fees/invoices", {
      params,
    });
    return response.data;
  },

  getInvoice: async (id: string): Promise<ApiResponse<StudentInvoice>> => {
    const response = await api.get<ApiResponse<StudentInvoice>>(`/fees/invoices/${id}`);
    return response.data;
  },

  cancelInvoice: async (
    id: string,
    reason?: string
  ): Promise<ApiResponse<StudentInvoice>> => {
    const response = await api.post<ApiResponse<StudentInvoice>>(`/fees/invoices/${id}/cancel`, {
      reason,
    });
    return response.data;
  },

  listOtherInvoices: async (params?: {
    search?: string;
    status?: string;
    studentId?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedApiResponse<OtherInvoice>> => {
    const response = await api.get<PaginatedApiResponse<OtherInvoice>>("/fees/other-invoices", {
      params,
    });
    return response.data;
  },

  getOtherInvoice: async (id: string): Promise<ApiResponse<OtherInvoice>> => {
    const response = await api.get<ApiResponse<OtherInvoice>>(`/fees/other-invoices/${id}`);
    return response.data;
  },

  createOtherInvoice: async (
    payload: CreateOtherInvoicePayload
  ): Promise<ApiResponse<OtherInvoice>> => {
    const response = await api.post<ApiResponse<OtherInvoice>>("/fees/other-invoices", payload);
    return response.data;
  },

  getReceipts: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
    feeHeadMasterId?: string;
  }) => {
    const response = await api.get("/fees/receipts", { params });
    return response.data;
  },

  getReceipt: async (id: string): Promise<ApiResponse<Payment>> => {
    const response = await api.get<ApiResponse<Payment>>(`/fees/receipts/${id}`);
    return response.data;
  },

  downloadReceiptPdf: async (id: string): Promise<Blob> => {
    const response = await api.get(`/fees/receipts/${id}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },

  ensureReceiptPdf: async (
    id: string,
    force = false
  ): Promise<ApiResponse<Payment & { pdfReady?: boolean }>> => {
    const response = await api.post<ApiResponse<Payment & { pdfReady?: boolean }>>(
      `/fees/receipts/${id}/pdf`,
      {},
      { params: force ? { force: true } : undefined }
    );
    return response.data;
  },
};
