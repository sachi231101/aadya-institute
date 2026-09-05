/**
 * Maps center/counselor sidebar sub-items to permission item keys from permission-catalog.
 */
import { buildCenterNavPermissionKeys } from "./center-portal-nav";
import { buildCounselorNavPermissionKeys } from "./counselor-portal-nav";
import { canReadCenterItem, CENTER_ITEM_READ_PERMISSIONS } from "./center-item-permissions";
import {
  canReadCounselorItem,
  COUNSELOR_ITEM_READ_PERMISSIONS,
} from "./counselor-item-permissions";

export const CENTER_NAV_PERMISSION_KEYS: Record<string, string> = buildCenterNavPermissionKeys();

export const COUNSELOR_NAV_PERMISSION_KEYS: Record<string, string> = buildCounselorNavPermissionKeys();

export const BASELINE_PERMISSIONS = [
  "dashboard.read",
  "branch.read",
  "notification.read",
  "notification.resend",
];

export const isBaselineOnlyPermissions = (permissions: string[] | undefined): boolean => {
  if (!permissions?.length) return true;
  const baseline = new Set(BASELINE_PERMISSIONS);
  return permissions.every((p) => baseline.has(p));
};

const CENTER_ALWAYS_ALLOWED = [
  "/center/dashboard",
  "/center/home",
  "/center/settings",
];

const COUNSELOR_ALWAYS_ALLOWED = [
  "/counselor/dashboard",
  "/counselor/home",
  "/counselor/home",
  "/counselor/settings",
];

export const isAlwaysAllowedPortalPath = (
  pathname: string,
  portal: "center" | "counselor"
): boolean => {
  const paths = portal === "center" ? CENTER_ALWAYS_ALLOWED : COUNSELOR_ALWAYS_ALLOWED;
  return paths.some(
    (p) => pathname === p || (p.endsWith("/home") && pathname.startsWith(`${p}/`))
  );
};

/** Resolve catalog item key for a portal URL (exact match, then longest prefix). */
export const resolveNavItemKey = (
  pathname: string,
  navKeyMap: Record<string, string>
): string | null => {
  if (navKeyMap[pathname]) return navKeyMap[pathname];
  const urls = Object.keys(navKeyMap).sort((a, b) => b.length - a.length);
  for (const url of urls) {
    if (pathname === url || pathname.startsWith(`${url}/`)) {
      return navKeyMap[url];
    }
  }
  return null;
};

/** Check if user can see a nav URL based on granular permissions stored on auth user. */
export const canAccessNavUrl = (
  url: string,
  permissions: string[] | undefined,
  modulePermissions: string[] | undefined,
  navKeyMap: Record<string, string>,
  isAdmin?: boolean
): boolean => {
  if (isAdmin) return true;
  const itemKey = navKeyMap[url] ?? resolveNavItemKey(url, navKeyMap);
  if (!itemKey) return false;
  if (permissions?.length) {
    if (isBaselineOnlyPermissions(permissions)) return false;
    const permSet = new Set(permissions);
    if (itemKey.startsWith("students.")) {
      if (itemKey === "students.all" && permSet.has("student.read")) return true;
      if (itemKey === "students.attendance" && permSet.has("attendance.read")) return true;
      if (itemKey === "students.discontinuation" && permSet.has("student.read")) return true;
    }
    return permSetHasItemKey(permSet, itemKey);
  }
  if (modulePermissions?.length) {
    const prefix = itemKey.split(".")[0];
    const legacyMap: Record<string, string> = {
      leads: "leads_ai_calling",
      counsellor: "counsellor",
      exams: "examinations",
      targets: "targets",
      notifications: "notifications",
      communication: "notifications",
      batches: "batches",
      assignments: "assignments",
      placement: "placement",
      admin: "masters",
      schedule: "schedule",
      fees: "fees",
      reports: "reports",
      admissions: "admissions",
      students: "students",
      faculty: "faculty",
      courses: "courses",
    };
    const legacyKey = legacyMap[prefix] ?? prefix;
    return modulePermissions.includes(legacyKey);
  }
  return false;
};

function permSetHasItemKey(permSet: Set<string>, itemKey: string): boolean {
  const permissions = Array.from(permSet);
  if (COUNSELOR_ITEM_READ_PERMISSIONS[itemKey]) {
    return canReadCounselorItem(permissions, itemKey);
  }
  if (CENTER_ITEM_READ_PERMISSIONS[itemKey]) {
    return canReadCenterItem(permissions, itemKey);
  }
  const readMap: Record<string, string[]> = {
    "students.all": ["student.read"],
    "students.attendance": ["attendance.read"],
    "students.discontinuation": ["student.read"],
    "faculty.all": ["faculty.read"],
    "faculty.courses": ["faculty.read", "course.read"],
    "faculty.attendance": ["attendance.read"],
    "faculty.ratings": ["feedback.read"],
    "courses.all": ["course.read"],
    "courses.curriculum": ["module.read"],
    "courses.batches": ["batch.read"],
    "courses.timetable": ["schedule.read"],
    "leads.all": ["lead.read"],
    "leads.ai_calling": ["ai_call.read"],
    "leads.followups": ["lead.read"],
    "admissions.all": ["admission.read"],
    "admissions.applications": ["admission.read"],
    "admissions.enquiries": ["lead.read"],
    "counsellor.overview": ["user.read"],
    "counsellor.manage": ["user.read"],
    "counsellor.batches": ["batch.read"],
    "targets.manage": ["target.read"],
    "targets.leaderboard": ["target.read"],
    "targets.incentives": ["incentive.read"],
    "targets.performance": ["target.read"],
    "schedule.classes": ["schedule.read"],
    "schedule.timetable": ["schedule.read"],
    "schedule.recordings": ["recording.read"],
    "schedule.assignments": ["assignment.read"],
    "exams.all": ["exam.read"],
    "exams.create": ["exam.read"],
    "exams.question_bank": ["question_bank.read"],
    "fees.payments": ["fee.read"],
    "fees.pending": ["fee.read"],
    "fees.reports": ["fee.read"],
    "reports.students": ["report.read"],
    "reports.faculty": ["report.read"],
    "reports.courses": ["report.read"],
    "reports.financial": ["report.read"],
    "reports.placement": ["report.read"],
    "masters.setup": ["master.read"],
    "notifications.all": ["notification.read"],
    "notifications.whatsapp": ["notification.read"],
  };
  const required = readMap[itemKey];
  if (!required?.length) return true;
  return required.some((p) => permSet.has(p));
}
