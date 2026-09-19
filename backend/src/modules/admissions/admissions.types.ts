import type {
  ApplicationStatus,
  FeeStatus,
  AdmissionStatus,
  FeePlan,
  ApplicationActivityType,
} from "@prisma/client";

export { ApplicationStatus, FeeStatus, AdmissionStatus, FeePlan, ApplicationActivityType };

// ─── Application Types ─────────────────────────────────────────────────────────
export interface CreateApplicationDTO {
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
}

export interface UpdateApplicationDTO {
  applicantName?: string;
  email?: string;
  phone?: string;
  courseId?: string;
  feeStatus?: FeeStatus;
  applicationFee?: number | null;
  paymentModeMasterId?: string | null;
  paymentRef?: string | null;
  status?: ApplicationStatus;
  notes?: string;
  rejectReason?: string;
}

export interface QueryApplicationsDTO {
  search?: string;
  feeStatus?: FeeStatus | "ALL";
  status?: ApplicationStatus | "ALL";
  courseId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface CreateApplicationActivityDTO {
  type?: ApplicationActivityType;
  title?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// ─── Admission Types ───────────────────────────────────────────────────────────
export interface AdmissionInstallmentDTO {
  installmentNo: number;
  dueDate: string;
  amount: number;
}

export interface AdmissionFeeLineDTO {
  feeHeadMasterId: string;
  amount: number;
  installments?: AdmissionInstallmentDTO[];
}

export interface AdmissionTermsAcceptanceDTO {
  masterId: string;
  name: string;
}

export interface CreateAdmissionDTO {
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
  installments?: AdmissionInstallmentDTO[];
  /** Multi-head fee lines (tuition/book/exam). When omitted, totalFee becomes Tuition. */
  feeLines?: AdmissionFeeLineDTO[];
  sourceMasterId?: string;
  statusMasterId?: string;
  paymentModeMasterId?: string;
  areaMasterId?: string;
  concessionHeadMasterId?: string;
  termsAcceptance?: AdmissionTermsAcceptanceDTO[];
  sendCredentials?: boolean;
}

export interface UpdateAdmissionDTO {
  studentName?: string;
  email?: string;
  phone?: string;
  courseId?: string;
  batchId?: string;
  feePlan?: FeePlan;
  status?: AdmissionStatus;
  notes?: string;
  termsAcceptance?: AdmissionTermsAcceptanceDTO[];
}

export interface QueryAdmissionsDTO {
  search?: string;
  courseId?: string | "ALL";
  status?: AdmissionStatus | "ALL";
  batchId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}
