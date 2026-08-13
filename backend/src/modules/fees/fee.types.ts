import type { PaymentMethod, PaymentStatus, OverdueStatus } from "@prisma/client";

export interface QueryPaymentsDTO {
  search?: string;
  method?: PaymentMethod | "ALL";
  status?: PaymentStatus | "ALL";
  page?: number;
  limit?: number;
}

export interface CreatePaymentDTO {
  studentName: string;
  admissionNo: string;
  courseName: string;
  amount: number;
  date?: string;
  method: PaymentMethod;
  transactionRef?: string;
  status?: PaymentStatus;
  notes?: string;
  studentId?: string;
  admissionId?: string;
  pendingFeeId?: string;
}

export interface QueryPendingFeesDTO {
  search?: string;
  status?: OverdueStatus | "ALL";
  page?: number;
  limit?: number;
}

export interface CollectPendingFeeDTO {
  amountPaidNow: number;
  method: PaymentMethod;
  transactionRef?: string;
  notes?: string;
}

export interface FeeStatsResponse {
  totalCollected: number;
  todayCollected: number;
  digitalPercent: number;
  totalTransactionsCount: number;
  totalPendingDues: number;
  overdueDues: number;
  overdueCount: number;
  avgOverdueDays: number;
}

export interface FeeReportsResponse {
  totalCollected: number;
  targetRevenue: number;
  targetAchievedPercent: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  courseRevenue: Array<{ name: string; value: number; color: string }>;
  paymentModeDistribution: Array<{ mode: string; count: number; amount: number }>;
  dueStatusSummary: Array<{ status: string; count: number; totalAmount: number }>;
}
