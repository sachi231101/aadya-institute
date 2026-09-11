export type PaymentMethod = "UPI" | "NET_BANKING" | "CARD" | "CASH" | "CHEQUE" | string;
export type PaymentStatus = "SUCCESS" | "PENDING" | "FAILED" | "VOID";

export interface PaymentAllocation {
  id?: string;
  pendingFeeId: string;
  amount: number;
  pendingFee?: {
    id: string;
    feeHead?: string | null;
    feeHeadMasterId?: string;
    installmentNo?: number;
  };
}

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
  feeHeadMasterId?: string | null;
  feeHead?: string | null;
  transactionRef?: string;
  status: PaymentStatus;
  notes?: string;
  pendingFeeId?: string | null;
  allocations?: PaymentAllocation[];
  receiptPdfUrl?: string | null;
  receiptGeneratedAt?: string | null;
  branchId?: string | null;
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
  feeHeadMasterId?: string;
  feeHead?: string | null;
  notes?: string;
  invoiceNo?: string | null;
  invoiceId?: string | null;
  invoiceStatus?: string | null;
  feeHeadMaster?: { id: string; name: string; code?: string | null } | null;
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
  byFeeHead?: Array<{
    feeHead: string;
    feeHeadMasterId: string;
    collected: number;
    pending: number;
  }>;
}

export interface FeeReportsData {
  totalCollected: number;
  targetRevenue: number;
  targetAchievedPercent: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  courseRevenue: Array<{ name: string; value: number; color: string }>;
  paymentModeDistribution: Array<{ mode: string; count: number; amount: number }>;
  dueStatusSummary: Array<{ status: string; count: number; totalAmount: number }>;
  byFeeHead?: Array<{
    feeHead: string;
    feeHeadMasterId: string;
    collected: number;
    pending: number;
  }>;
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
  allocations?: Array<{ pendingFeeId: string; amount: number }>;
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

export interface CreateChargePayload {
  studentId: string;
  feeHeadMasterId: string;
  amount: number;
  dueDate?: string;
  admissionId?: string;
  installmentNo?: number;
  notes?: string;
}

export interface CreateChargesPayload {
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

export interface FeeReminderResponse {
  message: string;
  notificationId: string | null;
  status: string;
  skipReason: string | null;
  studentName: string;
  phone: string;
  feeHead?: string;
}

export type FeeStudentStatus = "Paid" | "Overdue" | "Partial" | "Pending" | "None";

export interface FeeStudentRow {
  id: string;
  studentCode: string;
  name: string;
  phone: string | null;
  email: string | null;
  branchId: string | null;
  courseId: string | null;
  courseName: string | null;
  batchId: string | null;
  batchName: string | null;
  admissionNo: string | null;
  totalFee: number;
  amountPaid: number;
  balance: number;
  status: FeeStudentStatus;
  overdueCount: number;
  todayCollected: number;
}

export type StudentInvoiceStatus =
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export interface StudentInvoice {
  id: string;
  invoiceNo: string;
  studentId?: string | null;
  studentName: string;
  admissionNo: string;
  courseName: string;
  feeHead?: string | null;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: StudentInvoiceStatus;
  invoiceDate: string;
  dueDate: string;
  notes?: string | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  pendingFeeId?: string | null;
  otherInvoiceId?: string | null;
  pendingFee?: PendingFee | null;
  otherInvoice?: { id: string; invoiceNo: string } | null;
  allocations?: Array<{
    id: string;
    amount: number;
    payment?: {
      id: string;
      receiptNo: string;
      amount: number;
      date: string;
      method: string;
      status: string;
      receiptPdfUrl?: string | null;
    } | null;
  }>;
  lineItems?: unknown;
  branchId?: string | null;
}

export type OtherInvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";

export interface OtherInvoiceItem {
  id?: string;
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: string;
  tax?: number;
  taxPercent?: number;
  lineTotal?: number;
  feeHeadMasterId?: string | null;
  feeHead?: string | null;
  sortOrder?: number;
}

export interface OtherInvoice {
  id: string;
  invoiceNo: string;
  studentId?: string | null;
  studentName: string;
  admissionNo: string;
  courseName?: string | null;
  reference?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  takenByName?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  adjustments?: number;
  grandTotal: number;
  amountPaid: number;
  balance: number;
  status: OtherInvoiceStatus;
  terms?: string | null;
  notes?: string | null;
  items: OtherInvoiceItem[];
  pendingFees?: PendingFee[];
  studentInvoices?: StudentInvoice[];
  branchId?: string | null;
}

export interface CreateOtherInvoicePayload {
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
  invoices?: StudentInvoice[];
  receipts?: Payment[];
  byFeeHead?: Array<{
    feeHeadMasterId: string;
    feeHead: string;
    totalFee: number;
    amountPaid: number;
    dueAmount: number;
    charges?: PendingFee[];
  }>;
  summary: {
    totalFee: number;
    concessionAmount?: number;
    netPayable?: number;
    amountPaid: number;
    dueAmount: number;
    status: "Paid" | "Overdue" | "Partial" | "Pending";
    nextDueDate?: string;
    byFeeHead?: Array<{
      feeHeadMasterId: string;
      feeHead: string;
      totalFee: number;
      amountPaid: number;
      dueAmount: number;
    }>;
  };
}

export interface FeePlanLine {
  feeHeadMasterId: string;
  feeHeadCode?: string;
  amount: number;
  installments?: Array<{ installmentNo: number; amount: number; dueDays: number }>;
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
  installments?: Array<
    | { installmentNo: number; amount: number; dueDays: number }
    | FeePlanLine
  > | null;
  course?: { id: string; name: string; code: string } | null;
  branch?: { id: string; name: string; code: string } | null;
}
