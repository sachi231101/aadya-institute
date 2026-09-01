/**
 * Maps center/counselor sidebar sub-items to permission item keys from permission-catalog.
 */
export const CENTER_NAV_PERMISSION_KEYS: Record<string, string> = {
  "/center/students/all": "students.all",
  "/center/students/attendance": "students.attendance",
  "/center/students/discontinuation-risk": "students.discontinuation",
  "/center/faculty/all": "faculty.all",
  "/center/faculty/courses": "faculty.courses",
  "/center/faculty/attendance": "faculty.attendance",
  "/center/faculty/ratings": "faculty.ratings",
  "/center/courses/all": "courses.all",
  "/center/courses/curriculum": "courses.curriculum",
  "/center/courses/batches": "courses.batches",
  "/center/leads": "leads.all",
  "/center/leads/ai-calling": "leads.ai_calling",
  "/center/leads/follow-ups": "leads.followups",
  "/center/admissions/all": "admissions.all",
  "/center/admissions/applications": "admissions.applications",
  "/center/admissions/enquiries": "admissions.enquiries",
  "/center/counselor/overview": "counsellor.overview",
  "/center/counselor/all": "counsellor.manage",
  "/center/counselor/batches": "counsellor.batches",
  "/center/targets": "targets.manage",
  "/center/performance": "targets.leaderboard",
  "/center/incentives": "targets.incentives",
  "/center/schedule/classes": "schedule.classes",
  "/center/schedule/timetable": "schedule.timetable",
  "/center/schedule/recordings": "schedule.recordings",
  "/center/schedule/assignments": "schedule.assignments",
  "/center/exams": "exams.all",
  "/center/exams/create": "exams.create",
  "/center/exams/question-bank": "exams.question_bank",
  "/center/fees/payments": "fees.payments",
  "/center/fees/pending": "fees.pending",
  "/center/fees/reports": "fees.reports",
  "/center/reports/students": "reports.students",
  "/center/reports/faculty": "reports.faculty",
  "/center/reports/courses": "reports.courses",
  "/center/reports/financial": "reports.financial",
  "/center/reports/placement": "reports.placement",
  "/center/masters": "masters.setup",
  "/center/notifications": "notifications.all",
  "/center/notifications/whatsapp": "notifications.whatsapp",
};

export const COUNSELOR_NAV_PERMISSION_KEYS: Record<string, string> = {
  "/counselor/leads": "leads.all",
  "/counselor/leads/ai-calling": "leads.ai_calling",
  "/counselor/leads/follow-ups": "leads.followups",
  "/counselor/admissions/all": "admissions.all",
  "/counselor/admissions/applications": "admissions.applications",
  "/counselor/admissions/enquiries": "admissions.enquiries",
  "/counselor/students/all": "students.all",
  "/counselor/students/attendance": "students.attendance",
  "/counselor/faculty/all": "faculty.all",
  "/counselor/faculty/courses": "faculty.courses",
  "/counselor/faculty/attendance": "faculty.attendance",
  "/counselor/batches": "courses.batches",
  "/counselor/timetable": "courses.timetable",
  "/counselor/fees/payments": "fees.payments",
  "/counselor/fees/pending": "fees.pending",
  "/counselor/fees/reports": "fees.reports",
  "/counselor/reports/students": "reports.students",
  "/counselor/reports/faculty": "reports.faculty",
  "/counselor/reports/courses": "reports.courses",
  "/counselor/reports/financial": "reports.financial",
  "/counselor/performance": "targets.performance",
};

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
  "/center/ask-me",
  "/center/settings",
];

const COUNSELOR_ALWAYS_ALLOWED = [
  "/counselor/dashboard",
  "/counselor/home",
  "/counselor/ask-me",
  "/counselor/settings",
];

export const isAlwaysAllowedPortalPath = (
  pathname: string,
  portal: "center" | "counselor"
): boolean => {
  const paths = portal === "center" ? CENTER_ALWAYS_ALLOWED : COUNSELOR_ALWAYS_ALLOWED;
  return paths.some(
    (p) => pathname === p || (p.endsWith("/ask-me") && pathname.startsWith(`${p}/`))
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
    const moduleKey = itemKey.split(".")[0];
    if (moduleKey === "leads") return modulePermissions.includes("leads_ai_calling");
    if (moduleKey === "counsellor") return modulePermissions.includes("counsellor");
    if (moduleKey === "exams") return modulePermissions.includes("examinations");
    if (moduleKey === "targets") return modulePermissions.includes("targets");
    if (moduleKey === "notifications") return modulePermissions.includes("notifications");
    return modulePermissions.includes(moduleKey);
  }
  return false;
};

function permSetHasItemKey(permSet: Set<string>, itemKey: string): boolean {
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
