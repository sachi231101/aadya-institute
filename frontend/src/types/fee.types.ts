export type PaymentMethod = "UPI" | "NET_BANKING" | "CARD" | "CASH" | "CHEQUE" | string;
export type PaymentStatus = "SUCCESS" | "PENDING" | "FAILED";

export interface Payment {
  id: string;
  receiptNo: string;
  studentId?: string | null;
  studentName: string;
  admissionNo: string;
  courseName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  paymentModeMasterId?: string | null;
  transactionRef?: string;
  status: PaymentStatus;
  notes?: string;
  pendingFeeId?: string | null;
}

export type OverdueStatus = "OVERDUE" | "DUE_SOON" | "PARTIAL" | "PAID";

export interface PendingFee {
  id: string;
  studentId?: string | null;
  studentName: string;
  admissionNo: string;
  phone: string;
  courseName: string;
  totalFee: number;
  amountPaid: number;
  dueAmount: number;
  dueDate: string;
  installmentNo: number;
  overdueDays: number;
  status: OverdueStatus;
  notes?: string;
}

export interface FeeStats {
  totalCollected: number;
  todayCollected: number;
  digitalPercent: number;
  totalTransactionsCount: number;
  totalPendingDues: number;
  overdueDues: number;
  overdueCount: number;
  avgOverdueDays: number;
}

export interface FeeReportsData {
  totalCollected: number;
  targetRevenue: number;
  targetAchievedPercent: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  courseRevenue: Array<{ name: string; value: number; color: string }>;
  paymentModeDistribution: Array<{ mode: string; count: number; amount: number }>;
  dueStatusSummary: Array<{ status: string; count: number; totalAmount: number }>;
}

export interface CreatePaymentPayload {
  studentId: string;
  studentName?: string;
  admissionNo?: string;
  courseName?: string;
  amount: number;
  lateFee?: number;
  date?: string;
  /** @deprecated use paymentModeMasterId */
  method?: PaymentMethod;
  paymentModeMasterId?: string;
  bankAccountMasterId?: string;
  feeHeadMasterId?: string;
  transactionRef?: string;
  status?: PaymentStatus;
  notes?: string;
  admissionId?: string;
  pendingFeeId?: string;
  sendWhatsAppReceipt?: boolean;
}

export interface CollectPendingFeePayload {
  amountPaidNow: number;
  /** @deprecated use paymentModeMasterId */
  method?: PaymentMethod;
  paymentModeMasterId?: string;
  feeHeadMasterId?: string;
  transactionRef?: string;
  notes?: string;
}

export interface FeeReminderResponse {
  message: string;
  notificationId: string | null;
  status: string;
  skipReason: string | null;
  studentName: string;
  phone: string;
}

export interface StudentFeeStatement {
  student: {
    id: string;
    name: string;
    phone: string | null;
    studentCode: string;
    branchId: string;
  };
  payments: Payment[];
  pendingFees: PendingFee[];
  summary: {
    totalFee: number;
    amountPaid: number;
    dueAmount: number;
    status: "Paid" | "Overdue" | "Partial" | "Pending";
    nextDueDate?: string;
  };
}

export interface FeePlanTemplate {
  id: string;
  name: string;
  code?: string | null;
  totalAmount: number;
  planType?: string;
  status?: string;
  description?: string | null;
  branchId?: string | null;
  courseId?: string | null;
  installments?: Array<{ installmentNo: number; amount: number; dueDays: number }> | null;
  course?: { id: string; name: string; code: string } | null;
  branch?: { id: string; name: string; code: string } | null;
}
