export type EnquirySource = "WEBSITE" | "WHATSAPP" | "WALK_IN" | "REFERRAL" | "SOCIAL_MEDIA";
export type EnquiryStatus = "NEW" | "IN_PROGRESS" | "FOLLOW_UP" | "CONVERTED" | "REJECTED";

export interface Enquiry {
  id: string;
  enquiryNo?: string;
  name: string;
  email?: string | null;
  phone: string;
  courseId: string;
  courseName?: string;
  course?: { id: string; name: string; code: string };
  source: EnquirySource;
  status: EnquiryStatus;
  counselorNotes?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export type ApplicationStatus = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ADMITTED";
export type FeeStatus = "PAID" | "PENDING";

export interface Application {
  id: string;
  applicationNo: string;
  enquiryId?: string | null;
  applicantName: string;
  email?: string | null;
  phone: string;
  courseId: string;
  courseName?: string;
  course?: { id: string; name: string; code: string };
  feeStatus: FeeStatus;
  status: ApplicationStatus;
  submittedDate: string;
  notes?: string | null;
  createdAt?: string;
}

export type AdmissionStatus = "CONFIRMED" | "PROVISIONAL" | "CANCELLED" | "PENDING" | "ACTIVE" | "COMPLETED";
export type FeePlan = "FULL_PAYMENT" | "INSTALLMENT";

export interface Admission {
  id: string;
  admissionNo?: string | null;
  studentName?: string | null;
  email?: string | null;
  phone?: string | null;
  courseId: string;
  courseName?: string;
  course?: { id: string; name: string; code: string };
  batchId?: string | null;
  batchName?: string | null;
  batch?: { id: string; name: string; code: string } | null;
  feePlan: FeePlan;
  status: AdmissionStatus;
  admissionDate: string;
  notes?: string | null;
  createdAt?: string;
}

export interface CreateEnquiryPayload {
  name: string;
  email?: string;
  phone: string;
  courseId: string;
  source?: EnquirySource;
  status?: EnquiryStatus;
  counselorNotes?: string;
}

export interface CreateApplicationPayload {
  applicantName: string;
  email?: string;
  phone: string;
  courseId: string;
  enquiryId?: string;
  feeStatus?: FeeStatus;
  status?: ApplicationStatus;
  notes?: string;
}

export interface CreateAdmissionPayload {
  studentName: string;
  email?: string;
  phone: string;
  courseId: string;
  batchId?: string;
  studentId?: string;
  feePlan?: FeePlan;
  status?: AdmissionStatus;
  notes?: string;
  totalFee?: number;
  amountPaid?: number;
}

export interface ConvertEnquiryPayload {
  feeStatus?: FeeStatus;
  notes?: string;
}

export interface ConvertApplicationPayload {
  batchId?: string;
  feePlan?: FeePlan;
  notes?: string;
}
