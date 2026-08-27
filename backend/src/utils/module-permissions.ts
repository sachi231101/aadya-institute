/**
 * Module-to-Permission mapping for Center Manager and Counsellor granular access.
 *
 * Each "module" maps to a set of granular permissions. When the admin/center manager
 * checks a module checkbox, all corresponding permissions are granted
 * to that user via the UserPermission table.
 */

export interface ModuleDefinition {
  key: string;
  label: string;
  description: string;
  permissions: string[];
}

/**
 * Modules that can be toggled on/off for a Center Manager.
 */
export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: "students",
    label: "Students",
    description: "View, create, and manage students",
    permissions: ["student.read", "student.create", "student.update"],
  },
  {
    key: "faculty",
    label: "Faculty",
    description: "View faculty members",
    permissions: ["faculty.read"],
  },
  {
    key: "courses",
    label: "Courses & Batches",
    description: "View courses and manage batches",
    permissions: [
      "course.read",
      "module.read",
      "batch.read",
      "batch.create",
      "batch.update",
    ],
  },
  {
    key: "admissions",
    label: "Admissions",
    description: "View and manage admissions",
    permissions: ["admission.read", "admission.create", "admission.update"],
  },
  {
    key: "leads_ai_calling",
    label: "Leads & AI Calling",
    description: "Manage leads, follow-ups, and AI calling",
    permissions: [
      "lead.read",
      "lead.create",
      "lead.update",
      "lead.assign",
      "lead.convert",
      "lead.delete",
      "ai_call.read",
      "ai_call.create",
    ],
  },
  {
    key: "schedule",
    label: "Schedule & Classes",
    description: "Manage schedules, attendance, recordings, and assignments",
    permissions: [
      "schedule.read",
      "schedule.create",
      "schedule.update",
      "schedule.delete",
      "attendance.read",
      "attendance.mark",
      "attendance.update",
      "recording.read",
      "assignment.read",
    ],
  },
  {
    key: "fees",
    label: "Fees & Payments",
    description: "View and manage fees and payments",
    permissions: ["fee.read", "fee.create", "fee.update", "fee.delete"],
  },
  {
    key: "reports",
    label: "Reports",
    description: "View reports and analytics",
    permissions: ["report.read"],
  },
  {
    key: "counsellor",
    label: "Counsellor Management",
    description: "Manage counsellors",
    permissions: ["user.read", "user.create", "user.update"],
  },
  {
    key: "masters",
    label: "Master Setup",
    description: "Configure classrooms, time slots, holidays, lead stages, fee heads, and institute reference data",
    permissions: ["master.read", "master.create", "master.update"],
  },
  {
    key: "examinations",
    label: "Examinations & Question Banks",
    description: "Create assessments, manage question banks, schedule exams, and view submissions",
    permissions: [
      "exam.read",
      "exam.create",
      "exam.update",
      "exam.publish",
      "exam.schedule",
      "exam.manage_questions",
      "exam.manage_question_bank",
      "exam.assign",
      "exam.view_attempts",
      "exam.manage_settings",
      "question.read",
      "question.create",
      "question.update",
      "question.delete",
      "question_bank.read",
      "question_bank.create",
      "question_bank.update",
      "question_bank.delete",
    ],
  },
];

/**
 * Permissions that are ALWAYS granted to Center Managers regardless of module selection.
 * These are needed for basic portal functionality.
 */
export const ALWAYS_ON_PERMISSIONS: string[] = [
  "dashboard.read",
  "branch.read",
  "notification.read",
  "notification.resend",
];

/**
 * All valid module keys.
 */
export const ALL_MODULE_KEYS = MODULE_DEFINITIONS.map((m) => m.key);

/**
 * Given an array of module keys, return the full list of permission names
 * (including always-on permissions).
 */
export const resolveModulePermissions = (moduleKeys: string[]): string[] => {
  const permissionSet = new Set<string>(ALWAYS_ON_PERMISSIONS);

  for (const key of moduleKeys) {
    const mod = MODULE_DEFINITIONS.find((m) => m.key === key);
    if (mod) {
      for (const perm of mod.permissions) {
        permissionSet.add(perm);
      }
    }
  }

  return Array.from(permissionSet);
};

/**
 * Given a list of permission names, reverse-map to module keys that are "enabled".
 * A module is considered enabled if ALL its permissions are present.
 */
export const resolvePermissionsToModules = (permissionNames: string[]): string[] => {
  const permSet = new Set(permissionNames);
  const enabledModules: string[] = [];

  for (const mod of MODULE_DEFINITIONS) {
    const allGranted = mod.permissions.every((p) => permSet.has(p));
    if (allGranted) {
      enabledModules.push(mod.key);
    }
  }

  return enabledModules;
};
