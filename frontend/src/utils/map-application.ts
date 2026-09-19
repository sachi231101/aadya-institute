import type { Application, ApplicationStatus, FeeStatus } from "../types/admission.types";

export type ApplicationDisplayStatus =
  | "UNDER_REVIEW"
  | "NEW_APPLICATION"
  | "APPROVED"
  | "ADMITTED"
  | "REJECTED"
  | "FEE_PENDING"
  | "READY_FOR_ADMISSION";

export interface ApplicationListItem {
  id: string;
  applicationNo: string;
  applicantName: string;
  avatar: string;
  email: string;
  phone: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  feeStatus: "PAID" | "NOT_PAID";
  applicationFee?: number | null;
  paymentModeMasterId?: string | null;
  paymentModeName?: string | null;
  paymentRef?: string | null;
  feePaidAt?: string | null;
  paymentId?: string | null;
  receiptNo?: string | null;
  status: ApplicationDisplayStatus;
  apiStatus: ApplicationStatus;
  submittedDate: string;
  submittedTime: string;
  notes?: string | null;
  leadId?: string | null;
  leadName?: string | null;
  leadSource?: string | null;
  branchId?: string | null;
  linkedAdmissionId?: string | null;
  linkedAdmissionNo?: string | null;
  /** 1 Submitted → 2 Under review → 3 Fee paid → 4 Admitted */
  currentWorkflowStep: number;
}

function mapApiStatus(
  status: ApplicationStatus,
  feeStatus: FeeStatus
): ApplicationDisplayStatus {
  if (status === "REJECTED") return "REJECTED";
  if (status === "ADMITTED") return "ADMITTED";
  if (status === "APPROVED") return "APPROVED";
  if (feeStatus === "PAID") return "READY_FOR_ADMISSION";
  if (status === "UNDER_REVIEW") return "UNDER_REVIEW";
  if (status === "SUBMITTED") return "NEW_APPLICATION";
  return "FEE_PENDING";
}

function mapFeeStatus(feeStatus: FeeStatus): "PAID" | "NOT_PAID" {
  return feeStatus === "PAID" ? "PAID" : "NOT_PAID";
}

function workflowStep(app: { status: ApplicationStatus; feeStatus: FeeStatus }): number {
  if (app.status === "ADMITTED" || app.status === "APPROVED") return 4;
  if (app.feeStatus === "PAID") return 3;
  if (app.status === "UNDER_REVIEW") return 2;
  return 1;
}

export function mapApplicationFromApi(app: Application & Record<string, unknown>): ApplicationListItem {
  const date = app.submittedDate || app.createdAt || new Date().toISOString();
  const d = new Date(date);
  const lead = app.lead as { id?: string; name?: string; source?: string } | undefined;
  const paymentModeMaster = app.paymentModeMaster as
    | { id?: string; name?: string; code?: string | null }
    | undefined
    | null;
  const admissions = (app.admissions || []) as Array<{
    id: string;
    admissionNo?: string | null;
    status?: string | null;
  }>;
  const linked = admissions[0];

  return {
    id: app.id,
    applicationNo: app.applicationNo,
    applicantName: app.applicantName,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(app.applicantName || "AP")}`,
    email: app.email || "",
    phone: app.phone || "",
    courseId: app.courseId,
    courseName: app.course?.name || app.courseName || "—",
    courseCode: app.course?.code || "—",
    feeStatus: mapFeeStatus(app.feeStatus),
    applicationFee:
      app.applicationFee !== undefined && app.applicationFee !== null
        ? Number(app.applicationFee)
        : null,
    paymentModeMasterId: app.paymentModeMasterId ?? paymentModeMaster?.id ?? null,
    paymentModeName: paymentModeMaster?.name ?? null,
    paymentRef: app.paymentRef ?? null,
    feePaidAt: app.feePaidAt ?? null,
    paymentId: app.paymentId ?? app.payment?.id ?? null,
    receiptNo: app.payment?.receiptNo ?? null,
    status: mapApiStatus(app.status, app.feeStatus),
    apiStatus: app.status,
    submittedDate: d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    submittedTime: d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    notes: app.notes,
    leadId: app.leadId ?? lead?.id ?? null,
    leadName: lead?.name ?? null,
    leadSource: lead?.source ?? null,
    branchId: app.branchId ?? null,
    linkedAdmissionId: linked?.id ?? null,
    linkedAdmissionNo: linked?.admissionNo ?? null,
    currentWorkflowStep: workflowStep(app),
  };
}

export function displayStatusToApi(status: ApplicationDisplayStatus): ApplicationStatus {
  switch (status) {
    case "NEW_APPLICATION":
    case "FEE_PENDING":
      return "SUBMITTED";
    case "UNDER_REVIEW":
      return "UNDER_REVIEW";
    case "READY_FOR_ADMISSION":
      return "UNDER_REVIEW";
    case "APPROVED":
      return "APPROVED";
    case "ADMITTED":
      return "ADMITTED";
    case "REJECTED":
      return "REJECTED";
    default:
      return "UNDER_REVIEW";
  }
}

export function filterStatusToApi(filter: string): string | undefined {
  switch (filter) {
    case "NEW_APPLICATION":
      return "SUBMITTED";
    case "UNDER_REVIEW":
      return "UNDER_REVIEW";
    case "APPROVED":
      return "APPROVED";
    case "ADMITTED":
      return "ADMITTED";
    case "REJECTED":
      return "REJECTED";
    default:
      return undefined;
  }
}
