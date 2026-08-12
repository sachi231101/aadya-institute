export type EnquirySource = "WEBSITE" | "WHATSAPP" | "WALK_IN" | "REFERRAL" | "SOCIAL_MEDIA";
export type EnquiryStatus = "NEW" | "IN_PROGRESS" | "FOLLOW_UP" | "CONVERTED" | "REJECTED";

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  courseId: string;
  courseName: string;
  source: EnquirySource;
  status: EnquiryStatus;
  counselorNotes?: string;
  createdAt: string;
}

export type ApplicationStatus = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ADMITTED";
export type FeeStatus = "PAID" | "PENDING";

export interface Application {
  id: string;
  applicationNo: string;
  applicantName: string;
  email: string;
  phone: string;
  courseId: string;
  courseName: string;
  feeStatus: FeeStatus;
  status: ApplicationStatus;
  submittedDate: string;
  notes?: string;
}

export type AdmissionStatus = "CONFIRMED" | "PROVISIONAL" | "CANCELLED";
export type FeePlan = "FULL_PAYMENT" | "INSTALLMENT";

export interface Admission {
  id: string;
  admissionNo: string;
  studentName: string;
  email: string;
  phone: string;
  courseId: string;
  courseName: string;
  batchId?: string;
  batchName?: string;
  feePlan: FeePlan;
  status: AdmissionStatus;
  admissionDate: string;
  notes?: string;
}
