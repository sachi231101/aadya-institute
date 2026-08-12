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

export type OverdueStatus = "OVERDUE" | "DUE_SOON" | "PARTIAL";

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
}
