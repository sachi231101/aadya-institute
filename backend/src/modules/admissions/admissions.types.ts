import type { 
  EnquirySource, 
  EnquiryStatus, 
  ApplicationStatus, 
  FeeStatus, 
  AdmissionStatus, 
  FeePlan 
} from "@prisma/client";

export { EnquirySource, EnquiryStatus, ApplicationStatus, FeeStatus, AdmissionStatus, FeePlan };

// ─── Enquiry Types ─────────────────────────────────────────────────────────────
export interface CreateEnquiryDTO {
  name: string;
  email?: string;
  phone: string;
  courseId: string;
  source?: EnquirySource;
  status?: EnquiryStatus;
  counselorNotes?: string;
  assignedToId?: string;
  aiCallStatus?: string;
  aiCallResult?: string;
  aiSummary?: string;
  nextFollowUpAt?: string;
}

export interface UpdateEnquiryDTO {
  name?: string;
  email?: string;
  phone?: string;
  courseId?: string;
  source?: EnquirySource;
  status?: EnquiryStatus;
  counselorNotes?: string;
  assignedToId?: string;
  aiCallStatus?: string;
  aiCallResult?: string;
  aiSummary?: string;
  nextFollowUpAt?: string;
}

export interface QueryEnquiriesDTO {
  search?: string;
  source?: EnquirySource | "ALL";
  status?: EnquiryStatus | "ALL";
  courseId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

// ─── Application Types ─────────────────────────────────────────────────────────
export interface CreateApplicationDTO {
  applicantName: string;
  email?: string;
  phone: string;
  courseId: string;
  enquiryId?: string;
  feeStatus?: FeeStatus;
  status?: ApplicationStatus;
  notes?: string;
}

export interface UpdateApplicationDTO {
  applicantName?: string;
  email?: string;
  phone?: string;
  courseId?: string;
  feeStatus?: FeeStatus;
  status?: ApplicationStatus;
  notes?: string;
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

// ─── Admission Types ───────────────────────────────────────────────────────────
export interface AdmissionInstallmentDTO {
  installmentNo: number;
  dueDate: string;
  amount: number;
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
  sourceMasterId?: string;
  statusMasterId?: string;
  paymentModeMasterId?: string;
  areaMasterId?: string;
  concessionHeadMasterId?: string;
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

// ─── Conversion Types ──────────────────────────────────────────────────────────
export interface ConvertEnquiryDTO {
  feeStatus?: FeeStatus;
  notes?: string;
}

export interface ConvertApplicationDTO {
  batchId?: string;
  feePlan?: FeePlan;
  notes?: string;
  totalFee?: number;
  amountPaid?: number;
  installments?: AdmissionInstallmentDTO[];
}
