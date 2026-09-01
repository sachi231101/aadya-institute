/**
 * Granular permission catalog aligned with Admin ERP sidebar modules.
 * Each top-level module (Lead Management, Admission Management, …) lists
 * the same submodules shown in app-sidebar.tsx.
 */

export interface PermissionItemDefinition {
  key: string;
  label: string;
  readPermissions: string[];
  writePermissions: string[];
}

export interface PermissionModuleDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
  items: PermissionItemDefinition[];
}

export type PermissionRoleScope = "CENTER_MANAGER" | "COUNSELLOR";

export const ALWAYS_ON_PERMISSIONS: string[] = [
  "dashboard.read",
  "branch.read",
  "notification.read",
  "notification.resend",
];

/** Permissions granted before admin assigns any module/submodule access. */
export const getBaselinePermissions = (_role?: PermissionRoleScope): string[] => [
  ...ALWAYS_ON_PERMISSIONS,
];

export const isBaselineOnlyPermissions = (permissionNames: string[]): boolean => {
  const baseline = new Set(ALWAYS_ON_PERMISSIONS);
  return (
    permissionNames.length > 0 &&
    permissionNames.every((p) => baseline.has(p))
  );
};

/** Center Manager — full ERP module tree (matches admin sidebar). */
const CENTER_MANAGER_CATALOG: PermissionModuleDefinition[] = [
  {
    key: "lead_management",
    label: "Lead Management",
    description: "Lead capture, AI calling, follow-ups, and call history",
    category: "ERP Modules",
    items: [
      { key: "leads.all", label: "All Leads", readPermissions: ["lead.read"], writePermissions: ["lead.create", "lead.update", "lead.assign", "lead.convert", "lead.delete"] },
      { key: "leads.new", label: "New Lead", readPermissions: ["lead.read"], writePermissions: ["lead.create"] },
      { key: "leads.ai_calling", label: "AI Calling", readPermissions: ["ai_call.read"], writePermissions: ["ai_call.create"] },
      { key: "leads.followups", label: "Follow-ups", readPermissions: ["lead.read"], writePermissions: ["lead.update", "lead.assign"] },
      { key: "leads.call_history", label: "Call History", readPermissions: ["ai_call.read", "lead.read"], writePermissions: [] },
    ],
  },
  {
    key: "admission_management",
    label: "Admission Management",
    description: "Enquiries, applications, admissions, and documents",
    category: "ERP Modules",
    items: [
      { key: "admissions.enquiries", label: "Enquiries", readPermissions: ["lead.read"], writePermissions: ["lead.create", "lead.update"] },
      { key: "admissions.applications", label: "Applications", readPermissions: ["admission.read"], writePermissions: ["admission.create", "admission.update"] },
      { key: "admissions.all", label: "Admissions", readPermissions: ["admission.read"], writePermissions: ["admission.create", "admission.update"] },
      { key: "admissions.direct", label: "Direct Admission", readPermissions: ["admission.read"], writePermissions: ["admission.create", "admission.update"] },
      { key: "admissions.documents", label: "Admission Documents", readPermissions: ["document.read"], writePermissions: ["document.create", "document.verify", "document.update"] },
    ],
  },
  {
    key: "counsellor_management",
    label: "Counsellor Management",
    description: "Counsellor staff, lead allocation, and performance",
    category: "ERP Modules",
    items: [
      { key: "counsellor.all", label: "All Counsellors", readPermissions: ["user.read"], writePermissions: ["user.create", "user.update"] },
      { key: "counsellor.lead_allocation", label: "Lead Allocation", readPermissions: ["lead.read"], writePermissions: ["lead.assign", "lead.update"] },
      { key: "counsellor.student_allocation", label: "Student Allocation", readPermissions: ["batch.read", "student.read"], writePermissions: ["batch.update"] },
      { key: "counsellor.performance", label: "Performance", readPermissions: ["target.read", "report.read"], writePermissions: [] },
    ],
  },
  {
    key: "student_management",
    label: "Student Management",
    description: "Student registry, documents, attendance, and performance",
    category: "ERP Modules",
    items: [
      { key: "students.all", label: "All Students", readPermissions: ["student.read"], writePermissions: ["student.create", "student.update"] },
      { key: "students.documents", label: "Student Documents", readPermissions: ["document.read"], writePermissions: ["document.create", "document.verify", "document.update"] },
      { key: "students.batch_allocation", label: "Batch Allocation", readPermissions: ["batch.read", "student.read"], writePermissions: ["batch.update"] },
      { key: "students.attendance", label: "Attendance", readPermissions: ["attendance.read"], writePermissions: ["attendance.mark", "attendance.update"] },
      { key: "students.performance", label: "Performance", readPermissions: ["student.read", "report.read"], writePermissions: [] },
      { key: "students.discontinuation", label: "Discontinuation Risk", readPermissions: ["student.read"], writePermissions: ["student.update"] },
    ],
  },
  {
    key: "faculty_management",
    label: "Faculty Management",
    description: "Faculty profiles, assignments, attendance, and ratings",
    category: "ERP Modules",
    items: [
      { key: "faculty.all", label: "All Faculty", readPermissions: ["faculty.read"], writePermissions: ["faculty.create", "faculty.update"] },
      { key: "faculty.course_assignment", label: "Course Assignment", readPermissions: ["faculty.read", "course.read"], writePermissions: ["faculty.update"] },
      { key: "faculty.batch_assignment", label: "Batch Assignment", readPermissions: ["faculty.read", "batch.read"], writePermissions: ["faculty.update", "batch.update"] },
      { key: "faculty.attendance", label: "Attendance", readPermissions: ["attendance.read"], writePermissions: ["attendance.mark", "attendance.update"] },
      { key: "faculty.performance", label: "Performance", readPermissions: ["feedback.read", "report.read"], writePermissions: [] },
    ],
  },
  {
    key: "course_management",
    label: "Course Management",
    description: "Courses, curriculum, and modules",
    category: "ERP Modules",
    items: [
      { key: "courses.all", label: "All Courses", readPermissions: ["course.read"], writePermissions: ["course.create", "course.update"] },
      { key: "courses.curriculum", label: "Curriculum", readPermissions: ["module.read", "course.read"], writePermissions: ["module.create", "module.update"] },
      { key: "courses.modules", label: "Modules", readPermissions: ["module.read"], writePermissions: ["module.create", "module.update"] },
    ],
  },
  {
    key: "batch_management",
    label: "Batch Management",
    description: "Batches and student/faculty allocation",
    category: "ERP Modules",
    items: [
      { key: "batches.all", label: "All Batches", readPermissions: ["batch.read"], writePermissions: ["batch.create", "batch.update"] },
      { key: "batches.create", label: "Create Batch", readPermissions: ["batch.read"], writePermissions: ["batch.create"] },
      { key: "batches.student_allocation", label: "Student Allocation", readPermissions: ["batch.read", "student.read"], writePermissions: ["batch.update"] },
      { key: "batches.faculty_allocation", label: "Faculty Allocation", readPermissions: ["batch.read", "faculty.read"], writePermissions: ["batch.update"] },
    ],
  },
  {
    key: "class_schedule",
    label: "Class & Schedule",
    description: "Timetable, classes, live sessions, and recordings",
    category: "ERP Modules",
    items: [
      { key: "schedule.timetable", label: "Timetable", readPermissions: ["schedule.read"], writePermissions: ["schedule.update"] },
      { key: "schedule.classes", label: "Classes & Sessions", readPermissions: ["schedule.read"], writePermissions: ["schedule.create", "schedule.update", "schedule.delete"] },
      { key: "schedule.live", label: "Live Classes", readPermissions: ["schedule.read", "google_meet.read"], writePermissions: ["google_meet.create", "schedule.update"] },
      { key: "schedule.recordings", label: "Recordings", readPermissions: ["recording.read"], writePermissions: ["recording.create", "recording.delete"] },
    ],
  },
  {
    key: "assignment_management",
    label: "Assignment Management",
    description: "Assignments, submissions, and reviews",
    category: "ERP Modules",
    items: [
      { key: "assignments.all", label: "All Assignments", readPermissions: ["assignment.read"], writePermissions: ["assignment.create", "assignment.update", "assignment.delete"] },
      { key: "assignments.create", label: "Create Assignment", readPermissions: ["assignment.read"], writePermissions: ["assignment.create"] },
      { key: "assignments.submissions", label: "Submissions", readPermissions: ["assignment.read"], writePermissions: ["assignment.grade"] },
      { key: "assignments.reviews", label: "Reviews", readPermissions: ["assignment.read"], writePermissions: ["assignment.grade", "assignment.update"] },
    ],
  },
  {
    key: "examination_management",
    label: "Examination Management",
    description: "Exams, question bank, and results",
    category: "ERP Modules",
    items: [
      { key: "exams.all", label: "All Examinations", readPermissions: ["exam.read"], writePermissions: ["exam.create", "exam.update", "exam.publish"] },
      { key: "exams.create", label: "Create Examination", readPermissions: ["exam.read"], writePermissions: ["exam.create", "exam.schedule", "exam.assign"] },
      { key: "exams.question_bank", label: "Question Bank", readPermissions: ["question_bank.read"], writePermissions: ["question_bank.create", "question_bank.update", "question_bank.delete"] },
      { key: "exams.results", label: "Results", readPermissions: ["exam.read", "exam.view_attempts"], writePermissions: ["exam.update"] },
    ],
  },
  {
    key: "fee_management",
    label: "Fee Management",
    description: "Fee plans, collections, receipts, and reports",
    category: "ERP Modules",
    items: [
      { key: "fees.plans", label: "Fee Plans", readPermissions: ["fee.read"], writePermissions: ["fee.update"] },
      { key: "fees.student_fees", label: "Student Fees", readPermissions: ["fee.read"], writePermissions: ["fee.update"] },
      { key: "fees.payments", label: "Payments", readPermissions: ["fee.read"], writePermissions: ["fee.create"] },
      { key: "fees.pending", label: "Pending Fees", readPermissions: ["fee.read"], writePermissions: ["fee.update"] },
      { key: "fees.receipts", label: "Receipts", readPermissions: ["fee.read"], writePermissions: [] },
      { key: "fees.reports", label: "Fee Reports", readPermissions: ["fee.read", "report.read"], writePermissions: [] },
    ],
  },
  {
    key: "target_incentive",
    label: "Target & Incentive",
    description: "Targets, assignments, leaderboard, and incentives",
    category: "ERP Modules",
    items: [
      { key: "targets.all", label: "Targets", readPermissions: ["target.read"], writePermissions: ["target.manage", "target.assign"] },
      { key: "targets.assignments", label: "Target Assignments", readPermissions: ["target.read"], writePermissions: ["target.assign"] },
      { key: "targets.leaderboard", label: "Leaderboard", readPermissions: ["target.read", "incentive.read"], writePermissions: [] },
      { key: "targets.incentives", label: "Incentive Approvals", readPermissions: ["incentive.read"], writePermissions: ["target.approve"] },
    ],
  },
  {
    key: "report_management",
    label: "Report Management",
    description: "Operational and academic reports",
    category: "ERP Modules",
    items: [
      { key: "reports.students", label: "Student Reports", readPermissions: ["report.read"], writePermissions: [] },
      { key: "reports.admissions", label: "Admission Reports", readPermissions: ["report.read", "admission.read"], writePermissions: [] },
      { key: "reports.attendance", label: "Attendance Reports", readPermissions: ["report.read", "attendance.read"], writePermissions: [] },
      { key: "reports.faculty", label: "Faculty Reports", readPermissions: ["report.read"], writePermissions: [] },
      { key: "reports.courses", label: "Course Reports", readPermissions: ["report.read"], writePermissions: [] },
      { key: "reports.examinations", label: "Examination Reports", readPermissions: ["report.read", "exam.read"], writePermissions: [] },
      { key: "reports.financial", label: "Finance Reports", readPermissions: ["report.read", "fee.read"], writePermissions: [] },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    description: "Notifications, WhatsApp, email, and automation",
    category: "ERP Modules",
    items: [
      { key: "communication.notifications", label: "Notifications", readPermissions: ["notification.read"], writePermissions: ["notification.manage"] },
      { key: "communication.whatsapp", label: "WhatsApp", readPermissions: ["notification.read"], writePermissions: ["notification.resend", "notification.manage"] },
      { key: "communication.email", label: "Email", readPermissions: ["email.read"], writePermissions: ["email.manage"] },
      { key: "communication.automation", label: "Automation", readPermissions: ["notification.read"], writePermissions: ["notification.manage"] },
    ],
  },
  {
    key: "placement_management",
    label: "Placement Management",
    description: "Eligible students, companies, jobs, and placements",
    category: "ERP Modules",
    items: [
      { key: "placement.eligible", label: "Eligible Students", readPermissions: ["placement.read"], writePermissions: [] },
      { key: "placement.companies", label: "Companies", readPermissions: ["placement.read"], writePermissions: ["placement.create", "placement.update"] },
      { key: "placement.jobs", label: "Jobs", readPermissions: ["placement.read"], writePermissions: ["placement.create", "placement.update"] },
      { key: "placement.applications", label: "Applications", readPermissions: ["placement.read"], writePermissions: ["placement.create", "placement.update"] },
      { key: "placement.interviews", label: "Interviews", readPermissions: ["placement.read"], writePermissions: ["placement.create", "placement.update"] },
      { key: "placement.placements", label: "Placements", readPermissions: ["placement.read"], writePermissions: ["placement.create", "placement.update"] },
    ],
  },
  {
    key: "administration",
    label: "Administration",
    description: "Branch setup, masters, integrations, and settings",
    category: "ERP Modules",
    items: [
      { key: "admin.organization", label: "Organization", readPermissions: ["institute.read"], writePermissions: [] },
      { key: "admin.branches", label: "Centers & Branches", readPermissions: ["branch.read"], writePermissions: ["branch.update"] },
      { key: "admin.masters", label: "Masters", readPermissions: ["master.read"], writePermissions: ["master.create", "master.update", "master.delete"] },
      { key: "admin.integrations", label: "Integrations", readPermissions: ["google_meet.read"], writePermissions: ["google_meet.connect"] },
      { key: "admin.settings", label: "Settings", readPermissions: ["institute.read"], writePermissions: ["institute.update"] },
    ],
  },
];

/** Counsellor — ERP modules relevant to counsellor portal. */
const COUNSELLOR_CATALOG: PermissionModuleDefinition[] = [
  {
    key: "lead_management",
    label: "Lead Management",
    description: "Lead capture, AI calling, and follow-ups",
    category: "ERP Modules",
    items: [
      { key: "leads.all", label: "All Leads", readPermissions: ["lead.read"], writePermissions: ["lead.create", "lead.update", "lead.assign", "lead.convert"] },
      { key: "leads.new", label: "New Lead", readPermissions: ["lead.read"], writePermissions: ["lead.create"] },
      { key: "leads.ai_calling", label: "AI Calling", readPermissions: ["ai_call.read"], writePermissions: ["ai_call.create"] },
      { key: "leads.followups", label: "Follow-ups", readPermissions: ["lead.read"], writePermissions: ["lead.update", "lead.assign"] },
    ],
  },
  {
    key: "admission_management",
    label: "Admission Management",
    description: "Enquiries, applications, and admissions",
    category: "ERP Modules",
    items: [
      { key: "admissions.enquiries", label: "Enquiries", readPermissions: ["lead.read"], writePermissions: ["lead.create", "lead.update"] },
      { key: "admissions.applications", label: "Applications", readPermissions: ["admission.read"], writePermissions: ["admission.create", "admission.update"] },
      { key: "admissions.all", label: "Admissions", readPermissions: ["admission.read"], writePermissions: ["admission.create", "admission.update"] },
      { key: "admissions.direct", label: "Direct Admission", readPermissions: ["admission.read"], writePermissions: ["admission.create"] },
    ],
  },
  {
    key: "student_management",
    label: "Student Management",
    description: "Student profiles and attendance",
    category: "ERP Modules",
    items: [
      { key: "students.all", label: "All Students", readPermissions: ["student.read"], writePermissions: ["student.update"] },
      { key: "students.attendance", label: "Attendance", readPermissions: ["attendance.read"], writePermissions: ["attendance.mark"] },
    ],
  },
  {
    key: "faculty_management",
    label: "Faculty Management",
    description: "View faculty and assigned courses",
    category: "ERP Modules",
    items: [
      { key: "faculty.all", label: "All Faculty", readPermissions: ["faculty.read"], writePermissions: [] },
      { key: "faculty.course_assignment", label: "Course Assignment", readPermissions: ["faculty.read", "course.read"], writePermissions: [] },
      { key: "faculty.attendance", label: "Attendance", readPermissions: ["attendance.read"], writePermissions: [] },
    ],
  },
  {
    key: "batch_management",
    label: "Batch Management",
    description: "Batches and class timetable",
    category: "ERP Modules",
    items: [
      { key: "batches.all", label: "All Batches", readPermissions: ["batch.read"], writePermissions: [] },
      { key: "schedule.timetable", label: "Class Timetable", readPermissions: ["schedule.read"], writePermissions: [] },
    ],
  },
  {
    key: "examination_management",
    label: "Examination Management",
    description: "View examinations and schedules",
    category: "ERP Modules",
    items: [
      { key: "exams.all", label: "All Examinations", readPermissions: ["exam.read"], writePermissions: [] },
    ],
  },
  {
    key: "fee_management",
    label: "Fee Management",
    description: "Payments and pending fees",
    category: "ERP Modules",
    items: [
      { key: "fees.payments", label: "Payments", readPermissions: ["fee.read"], writePermissions: ["fee.create"] },
      { key: "fees.pending", label: "Pending Fees", readPermissions: ["fee.read"], writePermissions: [] },
      { key: "fees.reports", label: "Fee Reports", readPermissions: ["fee.read", "report.read"], writePermissions: [] },
    ],
  },
  {
    key: "report_management",
    label: "Report Management",
    description: "Student, faculty, course, and finance reports",
    category: "ERP Modules",
    items: [
      { key: "reports.students", label: "Student Reports", readPermissions: ["report.read"], writePermissions: [] },
      { key: "reports.faculty", label: "Faculty Reports", readPermissions: ["report.read"], writePermissions: [] },
      { key: "reports.courses", label: "Course Reports", readPermissions: ["report.read"], writePermissions: [] },
      { key: "reports.financial", label: "Finance Reports", readPermissions: ["report.read"], writePermissions: [] },
    ],
  },
  {
    key: "target_incentive",
    label: "Target & Incentive",
    description: "Personal targets and rewards",
    category: "ERP Modules",
    items: [
      { key: "targets.performance", label: "My Targets & Rewards", readPermissions: ["target.read", "incentive.read"], writePermissions: [] },
    ],
  },
];

export const getPermissionCatalog = (role: PermissionRoleScope): PermissionModuleDefinition[] => {
  return role === "COUNSELLOR" ? COUNSELLOR_CATALOG : CENTER_MANAGER_CATALOG;
};

export const getAllCatalogModuleKeys = (role: PermissionRoleScope): string[] => {
  return getPermissionCatalog(role).map((m) => m.key);
};

export const getAllCatalogItemKeys = (role: PermissionRoleScope): string[] => {
  return getPermissionCatalog(role).flatMap((m) => m.items.map((i) => i.key));
};

export interface ItemAccessState {
  show: boolean;
  editable: boolean;
}

export const resolveItemAccessToPermissions = (
  accessByItem: Record<string, ItemAccessState>,
  role: PermissionRoleScope
): string[] => {
  const permissionSet = new Set<string>(ALWAYS_ON_PERMISSIONS);
  const catalog = getPermissionCatalog(role);

  for (const mod of catalog) {
    for (const item of mod.items) {
      const access = accessByItem[item.key];
      if (!access?.show) continue;
      for (const p of item.readPermissions) permissionSet.add(p);
      if (access.editable) {
        for (const p of item.writePermissions) permissionSet.add(p);
      }
    }
  }

  return Array.from(permissionSet);
};

export const permissionsToItemAccess = (
  permissionNames: string[],
  role: PermissionRoleScope
): Record<string, ItemAccessState> => {
  const permSet = new Set(permissionNames);
  const catalog = getPermissionCatalog(role);
  const result: Record<string, ItemAccessState> = {};

  for (const mod of catalog) {
    for (const item of mod.items) {
      const hasRead = item.readPermissions.some((p) => permSet.has(p));
      const hasWrite =
        item.writePermissions.length > 0 &&
        item.writePermissions.every((p) => permSet.has(p));
      result[item.key] = { show: hasRead, editable: hasWrite };
    }
  }

  return result;
};

/** True when the user has at least one catalog submodule visible (Show checked). */
export const hasAssignedModulePermissions = (
  permissionNames: string[],
  role: PermissionRoleScope
): boolean => {
  if (isBaselineOnlyPermissions(permissionNames)) return false;
  const access = permissionsToItemAccess(permissionNames, role);
  return Object.values(access).some((a) => a.show);
};

export const resolvePermissionsToModuleKeys = (
  permissionNames: string[],
  role: PermissionRoleScope
): string[] => {
  const access = permissionsToItemAccess(permissionNames, role);
  const catalog = getPermissionCatalog(role);
  const enabled: string[] = [];

  for (const mod of catalog) {
    const hasAny = mod.items.some((item) => access[item.key]?.show);
    if (hasAny) enabled.push(mod.key);
  }

  return enabled;
};

/** Map new ERP module keys to legacy sidebar moduleKey values. */
export const LEGACY_MODULE_KEY_MAP: Record<string, string> = {
  lead_management: "leads_ai_calling",
  admission_management: "admissions",
  counsellor_management: "counsellor",
  student_management: "students",
  faculty_management: "faculty",
  course_management: "courses",
  batch_management: "batches",
  class_schedule: "schedule",
  assignment_management: "assignments",
  examination_management: "examinations",
  fee_management: "fees",
  target_incentive: "targets",
  report_management: "reports",
  communication: "notifications",
  placement_management: "placement",
  administration: "masters",
};

export const toLegacyModuleKeys = (erpModuleKeys: string[]): string[] => {
  const legacy = new Set<string>();
  for (const key of erpModuleKeys) {
    legacy.add(LEGACY_MODULE_KEY_MAP[key] ?? key);
  }
  return Array.from(legacy);
};

export const resolveModuleKeysToPermissions = (
  moduleKeys: string[],
  role: PermissionRoleScope
): string[] => {
  const catalog = getPermissionCatalog(role);
  const access: Record<string, ItemAccessState> = {};

  for (const mod of catalog) {
    const enabled = moduleKeys.includes(mod.key) || moduleKeys.some((k) => LEGACY_MODULE_KEY_MAP[mod.key] === k);
    for (const item of mod.items) {
      access[item.key] = { show: enabled, editable: enabled };
    }
  }

  return resolveItemAccessToPermissions(access, role);
};

export const getFullAccessPermissions = (role: PermissionRoleScope): string[] => {
  const access: Record<string, ItemAccessState> = {};
  for (const mod of getPermissionCatalog(role)) {
    for (const item of mod.items) {
      access[item.key] = { show: true, editable: true };
    }
  }
  return resolveItemAccessToPermissions(access, role);
};

export const canReadItem = (permissionNames: string[], itemKey: string, role: PermissionRoleScope): boolean => {
  const access = permissionsToItemAccess(permissionNames, role);
  return access[itemKey]?.show ?? false;
};

export const canEditItem = (permissionNames: string[], itemKey: string, role: PermissionRoleScope): boolean => {
  const access = permissionsToItemAccess(permissionNames, role);
  return access[itemKey]?.editable ?? false;
};
