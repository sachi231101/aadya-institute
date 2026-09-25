import type { AssignmentSubmissionStatus } from "@/services/assignments.api";

export function formatAssignmentDueDate(dueDate?: string | null): string {
  if (!dueDate) return "—";
  return new Date(dueDate).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMarks(marks?: number | null, maxMarks?: number | null): string {
  if (marks == null) return "—";
  const max = maxMarks ?? 100;
  return `${marks}/${max}`;
}

export function submissionStatusLabel(
  status?: AssignmentSubmissionStatus | string | null,
  fallback?: { submittedAt?: string | null; evaluatedAt?: string | null; marks?: number | null }
): string {
  if (status === "GRADED" || fallback?.evaluatedAt || (fallback?.marks != null && status !== "PENDING")) {
    return "Graded";
  }
  if (status === "LATE") return "Late";
  if (status === "SUBMITTED" || fallback?.submittedAt) return "Submitted";
  if (status === "PENDING") return "Pending";
  return "Pending";
}

export function submissionStatusVariant(
  status?: AssignmentSubmissionStatus | string | null
): "default" | "secondary" | "outline" | "warning" | "success" | "destructive" {
  switch (status) {
    case "GRADED":
      return "success";
    case "LATE":
      return "destructive";
    case "SUBMITTED":
      return "warning";
    case "PENDING":
    default:
      return "outline";
  }
}

export function assignmentStatusLabel(status?: string): string {
  if (status === "INACTIVE") return "Locked";
  return "Active";
}

export function canStudentSubmit(opts: {
  assignmentStatus?: string;
  submissionStatus?: string | null;
  dueDate?: string | null;
  allowLate?: boolean;
  validTill?: string | null;
  restrictStudentUpload?: boolean;
}): boolean {
  if (opts.assignmentStatus === "INACTIVE") return false;
  if (opts.submissionStatus === "GRADED") return false;
  if (opts.restrictStudentUpload) return false;
  if (opts.validTill && new Date(opts.validTill).getTime() < Date.now()) return false;
  if (!opts.dueDate) return true;
  const pastDue = new Date(opts.dueDate).getTime() < Date.now();
  if (pastDue && !opts.allowLate) return false;
  return true;
}

/** Student list filter tabs: mutually exclusive per assignment. */
export type StudentAssignmentFilterStatus =
  | "PENDING"
  | "SUBMITTED"
  | "GRADED"
  | "OVERDUE";

/**
 * Derive the student Assignments toolbar status.
 * Overdue = past due and not submitted (allowLate only controls whether submit is still allowed).
 */
export function resolveStudentAssignmentFilterStatus(opts: {
  submission?: {
    submissionStatus?: string | null;
    submittedAt?: string | null;
    evaluatedAt?: string | null;
    marks?: number | null;
  } | null;
  dueDate?: string | null;
}): StudentAssignmentFilterStatus {
  const submission = opts.submission;
  if (
    submission?.submissionStatus === "GRADED" ||
    submission?.evaluatedAt ||
    submission?.marks != null
  ) {
    return "GRADED";
  }
  if (
    submission?.submittedAt ||
    submission?.submissionStatus === "SUBMITTED" ||
    submission?.submissionStatus === "LATE"
  ) {
    return "SUBMITTED";
  }
  const isPastDue = opts.dueDate
    ? Date.now() > new Date(opts.dueDate).getTime()
    : false;
  if (isPastDue) return "OVERDUE";
  return "PENDING";
}
