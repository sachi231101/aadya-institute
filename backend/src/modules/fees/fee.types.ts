export interface QueryPaymentsDTO {
  search?: string;
  method?: string | "ALL";
  paymentModeMasterId?: string;
  feeHeadMasterId?: string;
  status?: string | "ALL";
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface PaymentAllocationInput {
  pendingFeeId: string;
  amount: number;
}

export interface CreatePaymentDTO {
  studentId: string;
  studentName?: string;
  admissionNo?: string;
  courseName?: string;
  amount: number;
  lateFee?: number;
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
  admissionId?: string;
  pendingFeeId?: string;
  /** Explicit multi-charge allocation (preferred). Sum must equal amount (+ lateFee). */
  allocations?: PaymentAllocationInput[];
  sendWhatsAppReceipt?: boolean;
}

export interface QueryPendingFeesDTO {
  search?: string;
  status?: string | "ALL";
  branchId?: string;
  studentId?: string;
  feeHeadMasterId?: string;
  dueWithinDays?: number;
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

export interface CreateChargeDTO {
  studentId: string;
  feeHeadMasterId: string;
  amount: number;
  dueDate?: string;
  admissionId?: string;
  installmentNo?: number;
  notes?: string;
}

export interface CreateChargesDTO {
  studentId: string;
  admissionId?: string;
  charges: Array<{
    feeHeadMasterId: string;
    amount: number;
    dueDate?: string;
    installmentNo?: number;
    notes?: string;
  }>;
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
  byFeeHead?: Array<{ feeHead: string; feeHeadMasterId: string; collected: number; pending: number }>;
}

export interface FeeReportsResponse {
  totalCollected: number;
  targetRevenue: number;
  targetAchievedPercent: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  courseRevenue: Array<{ name: string; value: number; color: string }>;
  paymentModeDistribution: Array<{ mode: string; count: number; amount: number }>;
  dueStatusSummary: Array<{ status: string; count: number; totalAmount: number }>;
  byFeeHead?: Array<{ feeHead: string; feeHeadMasterId: string; collected: number; pending: number }>;
}

export interface QueryReceiptsDTO {
  search?: string;
  page?: number;
  limit?: number;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  feeHeadMasterId?: string;
}

export interface BranchScopeParams {
  branchId?: string;
  branchIds?: string[];
}

export interface StudentFeeStatementSummary {
  totalFee: number;
  concessionAmount: number;
  netPayable: number;
  amountPaid: number;
  dueAmount: number;
  status: "Paid" | "Overdue" | "Partial" | "Pending";
  nextDueDate?: string;
  byFeeHead: Array<{
    feeHeadMasterId: string;
    feeHead: string;
    totalFee: number;
    amountPaid: number;
    dueAmount: number;
  }>;
}

export interface QueryFeeStudentsDTO {
  search?: string;
  courseId?: string;
  batchId?: string;
  status?: string | "ALL";
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface QueryStudentInvoicesDTO {
  search?: string;
  status?: string | "ALL";
  studentId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface CreateOtherInvoiceDTO {
  studentId: string;
  reference?: string;
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
  terms?: string;
  discount?: number;
  tax?: number;
  adjustments?: number;
  takenByName?: string;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: "FLAT" | "PERCENT";
    tax?: number;
    taxPercent?: number;
    feeHeadMasterId?: string;
  }>;
  payment?: {
    amount: number;
    paymentModeMasterId?: string;
    method?: string;
    bankAccountMasterId?: string;
    transactionRef?: string;
    transactionDate?: string;
    transactionStatus?: string;
    narration?: string;
    tds?: number;
  };
}

export interface FeeProvisionLine {
  feeHeadMasterId: string;
  feeHead?: string;
  feeHeadCode?: string;
  amount: number;
  installments?: Array<{
    installmentNo: number;
    amount: number;
    dueDate?: string | Date;
    dueDays?: number;
  }>;
}

export interface FeeProvisionInput {
  instituteId: string;
  branchId: string | null;
  studentId: string;
  admissionId: string | null;
  studentName: string;
  admissionNo: string;
  phone: string;
  courseName: string;
  lines: FeeProvisionLine[];
  downPayment?: number;
  paymentMethod?: string;
  paymentModeMasterId?: string | null;
  transactionRef?: string | null;
  /** Amount already deducted from tuition (concession). */
  concessionAmount?: number;
  recordedById?: string | null;
}
