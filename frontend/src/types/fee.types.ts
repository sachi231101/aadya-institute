export type PaymentMethod = "UPI" | "NET_BANKING" | "CARD" | "CASH" | "CHEQUE";
export type PaymentStatus = "SUCCESS" | "PENDING" | "FAILED";

export interface Payment {
  id: string;
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  courseName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  transactionRef?: string;
  status: PaymentStatus;
  notes?: string;
}

export type OverdueStatus = "OVERDUE" | "DUE_SOON" | "PARTIAL" | "PAID";

export interface PendingFee {
  id: string;
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
  studentName: string;
  admissionNo: string;
  courseName: string;
  amount: number;
  date?: string;
  method: PaymentMethod;
  transactionRef?: string;
  status?: PaymentStatus;
  notes?: string;
}

export interface CollectPendingFeePayload {
  amountPaidNow: number;
  method: PaymentMethod;
  transactionRef?: string;
  notes?: string;
}
