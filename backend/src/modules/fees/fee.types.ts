export interface QueryPaymentsDTO {
  search?: string;
  method?: string | "ALL";
  status?: string | "ALL";
  page?: number;
  limit?: number;
}

export interface CreatePaymentDTO {
  studentName: string;
  admissionNo: string;
  courseName: string;
  amount: number;
  date?: string;
  /** @deprecated use paymentModeMasterId */
  method?: string;
  paymentModeMasterId?: string;
  bankAccountMasterId?: string;
  feeHeadMasterId?: string;
  feeHead?: string;
  transactionRef?: string;
  status?: string;
  notes?: string;
  studentId?: string;
  admissionId?: string;
  pendingFeeId?: string;
}

export interface QueryPendingFeesDTO {
  search?: string;
  status?: string | "ALL";
  page?: number;
  limit?: number;
}

export interface CollectPendingFeeDTO {
  amountPaidNow: number;
  /** @deprecated use paymentModeMasterId */
  method?: string;
  paymentModeMasterId?: string;
  feeHeadMasterId?: string;
  feeHead?: string;
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

export interface QueryFeePlansDTO {
  page?: number;
  limit?: number;
  branchId?: string;
  courseId?: string;
  status?: string;
  search?: string;
}

export interface CreateFeePlanDTO {
  name: string;
  code?: string;
  branchId?: string;
  courseId?: string;
  totalAmount: number;
  planType?: string;
  installments?: Array<{ installmentNo: number; amount: number; dueDays: number }>;
  description?: string;
}

export interface UpdateFeePlanDTO extends Partial<CreateFeePlanDTO> {
  status?: string;
}

export interface QueryReceiptsDTO {
  search?: string;
  page?: number;
  limit?: number;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}
