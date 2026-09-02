import type { Application, ApplicationStatus, FeeStatus } from "../types/admission.types";

export type ApplicationDisplayStatus =
  | "UNDER_REVIEW_BLUE"
  | "UNDER_REVIEW_ORANGE"
  | "NEW_APPLICATION"
  | "APPROVED"
  | "ADMITTED"
  | "REJECTED";

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
  status: ApplicationDisplayStatus;
  apiStatus: ApplicationStatus;
  submittedDate: string;
  submittedTime: string;
  notes?: string | null;
  enquiryId?: string | null;
  enquiryNo?: string | null;
  enquirySource?: string | null;
  leadId?: string | null;
  currentWorkflowStep: number;
}

function mapApiStatus(status: ApplicationStatus): ApplicationDisplayStatus {
  switch (status) {
    case "SUBMITTED":
      return "NEW_APPLICATION";
    case "UNDER_REVIEW":
      return "UNDER_REVIEW_BLUE";
    case "APPROVED":
      return "APPROVED";
    case "ADMITTED":
      return "ADMITTED";
    case "REJECTED":
      return "REJECTED";
    default:
      return "UNDER_REVIEW_BLUE";
  }
}

function mapFeeStatus(feeStatus: FeeStatus): "PAID" | "NOT_PAID" {
  return feeStatus === "PAID" ? "PAID" : "NOT_PAID";
}

function workflowStep(app: { status: ApplicationStatus; feeStatus: FeeStatus }): number {
  if (app.status === "ADMITTED" || app.status === "APPROVED") return 5;
  if (app.status === "UNDER_REVIEW") return 4;
  if (app.feeStatus === "PAID") return 3;
  if (app.status === "SUBMITTED") return 1;
  return 2;
}

export function mapApplicationFromApi(app: Application & Record<string, unknown>): ApplicationListItem {
  const date = app.submittedDate || app.createdAt || new Date().toISOString();
  const d = new Date(date);
  const enquiry = app.enquiry as { enquiryNo?: string; source?: string } | undefined;

  return {
    id: app.id,
    applicationNo: app.applicationNo,
    applicantName: app.applicantName,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(app.applicantName || "AP")}`,
    email: app.email || "—",
    phone: app.phone || "—",
    courseId: app.courseId,
    courseName: app.course?.name || app.courseName || "—",
    courseCode: app.course?.code || "—",
    feeStatus: mapFeeStatus(app.feeStatus),
    status: mapApiStatus(app.status),
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
    enquiryId: app.enquiryId,
    enquiryNo: enquiry?.enquiryNo ?? null,
    enquirySource: enquiry?.source ?? null,
    leadId: (app as { leadId?: string | null }).leadId ?? null,
    currentWorkflowStep: workflowStep(app),
  };
}

export function displayStatusToApi(status: ApplicationDisplayStatus): ApplicationStatus {
  switch (status) {
    case "NEW_APPLICATION":
      return "SUBMITTED";
    case "UNDER_REVIEW_BLUE":
    case "UNDER_REVIEW_ORANGE":
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
