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
}

export interface QueryEnquiriesDTO {
  search?: string;
  source?: EnquirySource | "ALL";
  status?: EnquiryStatus | "ALL";
  courseId?: string;
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
  page?: number;
  limit?: number;
}

// ─── Admission Types ───────────────────────────────────────────────────────────
export interface CreateAdmissionDTO {
  studentName: string;
  email?: string;
  phone: string;
  courseId: string;
  batchId?: string;
  applicationId?: string;
  feePlan?: FeePlan;
  status?: AdmissionStatus;
  notes?: string;
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
}
