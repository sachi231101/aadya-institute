import {
  CENTER_ITEM_READ_PERMISSIONS,
  CENTER_ITEM_WRITE_PERMISSIONS,
  canReadCenterItem,
  canEditCenterItem,
} from "./center-item-permissions";

/**
 * Counsellor catalog item keys — same Admin Dashboard sub-items as CM
 * for the Counsellor module set (mirrors backend COUNSELLOR_CATALOG).
 */
export const COUNSELOR_CATALOG_ITEM_KEYS = [
  "leads.all",
  "leads.ai_calling",
  "leads.followups",
  "leads.call_history",
  "admissions.enquiries",
  "admissions.applications",
  "admissions.all",
  "students.all",
  "students.documents",
  "students.student_allocation",
  "students.attendance",
  "students.performance",
  "students.discontinuation",
  "faculty.all",
  "faculty.attendance",
  "faculty.performance",
  "batches.all",
  "exams.all",
  "exams.create",
  "exams.question_bank",
  "exams.results",
  "fees.students",
  "fees.payments",
  "fees.pending",
  "fees.invoices",
  "fees.other_invoices",
  "fees.receipts",
  "fees.plans",
  "reports.students",
  "reports.admissions",
  "reports.attendance",
  "reports.faculty",
  "reports.courses",
  "reports.examinations",
  "reports.financial",
  "targets.all",
  "targets.leaderboard",
  "targets.incentives",
] as const;

type CounselorItemKey = (typeof COUNSELOR_CATALOG_ITEM_KEYS)[number];

const pickMaps = (
  source: Record<string, string[]>
): Record<CounselorItemKey, string[]> => {
  const result = {} as Record<CounselorItemKey, string[]>;
  for (const key of COUNSELOR_CATALOG_ITEM_KEYS) {
    result[key] = [...(source[key] ?? [])];
  }
  return result;
};

/** Mirrors Admin/CM item → coarse permission mappings for Counsellor catalog items. */
export const COUNSELOR_ITEM_READ_PERMISSIONS = pickMaps(CENTER_ITEM_READ_PERMISSIONS);
export const COUNSELOR_ITEM_WRITE_PERMISSIONS = pickMaps(CENTER_ITEM_WRITE_PERMISSIONS);

export const canReadCounselorItem = (
  permissions: string[] | undefined,
  itemKey: string
): boolean => canReadCenterItem(permissions, itemKey);

export const canEditCounselorItem = (
  permissions: string[] | undefined,
  itemKey: string
): boolean => canEditCenterItem(permissions, itemKey);
