export type ApplicationStatus = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ADMITTED";
export type FeeStatus = "PAID" | "PENDING";

export interface ApplicationActivity {
  id: string;
  applicationId: string;
  userId?: string | null;
  type: "NOTE_ADDED" | "STATUS_CHANGED" | "FEE_STATUS_CHANGED" | "CREATED";
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

export interface Application {
  id: string;
  applicationNo: string;
  leadId?: string | null;
  branchId?: string | null;
  applicantName: string;
  email?: string | null;
  phone: string;
  courseId: string;
  courseName?: string;
  course?: { id: string; name: string; code: string };
  lead?: { id: string; name: string; source?: string } | null;
  feeStatus: FeeStatus;
  applicationFee?: number | null;
  paymentModeMasterId?: string | null;
  paymentRef?: string | null;
  feePaidAt?: string | null;
  paymentId?: string | null;
  paymentModeMaster?: { id: string; name: string; code?: string | null } | null;
  payment?: {
    id: string;
    receiptNo: string;
    amount?: number | null;
    status?: string | null;
    transactionRef?: string | null;
    date?: string | null;
  } | null;
  status: ApplicationStatus;
  submittedDate: string;
  notes?: string | null;
  createdAt?: string;
  activities?: ApplicationActivity[];
  admissions?: Array<{ id: string; admissionNo?: string | null; status?: string | null }>;
}

export type AdmissionStatus = "CONFIRMED" | "PROVISIONAL" | "CANCELLED" | "PENDING" | "ACTIVE" | "COMPLETED";
export type FeePlan = "FULL_PAYMENT" | "INSTALLMENT";

export interface Admission {
  id: string;
  admissionNo?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  email?: string | null;
  phone?: string | null;
  courseId: string;
  courseName?: string;
  course?: { id: string; name: string; code: string; fee?: number };
  batchId?: string | null;
  batchName?: string | null;
  batch?: { id: string; name: string; code: string; timeSlot?: string; schedulePattern?: string } | null;
  feePlan: FeePlan;
  status: AdmissionStatus | string;
  admissionDate: string;
  termsAcceptedAt?: string | null;
  termsAcceptance?: Array<{ masterId: string; name: string }> | null;
  notes?: string | null;
  createdAt?: string;
  student?: { id: string; studentCode: string; user?: { id: string; name: string; email?: string; phone?: string } };
  branch?: { id: string; name: string; code: string };
  application?: { id: string; applicationNo: string; status: string; feeStatus: string };
  payments?: Array<{ id: string; receiptNo: string; amount: number; method: string; status: string; date?: string }>;
  pendingFees?: Array<{ id: string; dueAmount: number; dueDate: string; installmentNo: number; status: string }>;
  documents?: Array<{ id: string; name: string; status: string; fileName: string }>;
}

export interface CreateApplicationPayload {
  applicantName: string;
  email?: string;
  phone: string;
  courseId: string;
  leadId?: string;
  branchId?: string;
  feeStatus?: FeeStatus;
  applicationFee?: number;
  paymentModeMasterId?: string;
  paymentRef?: string;
  status?: ApplicationStatus;
  notes?: string;
  rejectReason?: string;
}

export interface AdmissionInstallmentPayload {
  installmentNo: number;
  dueDate: string;
  amount: number;
}

export interface CreateAdmissionPayload {
  studentName: string;
  email?: string;
  phone: string;
  courseId: string;
  batchId?: string;
  studentId?: string;
  applicationId?: string;
  leadId?: string;
  branchId?: string;
  feePlan?: FeePlan;
  status?: AdmissionStatus;
  notes?: string;
  totalFee?: number;
  amountPaid?: number;
  paymentMethod?: "UPI" | "NET_BANKING" | "CARD" | "CASH" | "CHEQUE";
  transactionRef?: string;
  admissionDate?: string;
  installments?: AdmissionInstallmentPayload[];
  sourceMasterId?: string;
  statusMasterId?: string;
  paymentModeMasterId?: string;
  areaMasterId?: string;
  concessionHeadMasterId?: string;
  termsAcceptance?: Array<{ masterId: string; name: string }>;
  sendCredentials?: boolean;
}
