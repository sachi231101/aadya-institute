/**
 * Counsellor catalog item → permission mappings (mirrors backend COUNSELLOR_CATALOG).
 */
export const COUNSELOR_ITEM_READ_PERMISSIONS: Record<string, string[]> = {
  "leads.all": ["lead.read"],
  "leads.new": ["lead.read"],
  "leads.ai_calling": ["ai_call.read"],
  "leads.followups": ["lead.read"],
  "admissions.enquiries": ["lead.read"],
  "admissions.applications": ["admission.read"],
  "admissions.all": ["admission.read"],
  "admissions.direct": ["admission.read"],
  "students.all": ["student.read"],
  "students.attendance": ["attendance.read"],
  "faculty.all": ["faculty.read"],
  "courses.course_assignment": ["faculty.read", "course.read"],
  "faculty.attendance": ["attendance.read"],
  "batches.all": ["batch.read"],
  "schedule.timetable": ["schedule.read"],
  "exams.all": ["exam.read"],
  "fees.payments": ["fee.read"],
  "fees.pending": ["fee.read"],
  "fees.reports": ["fee.read", "report.read"],
  "reports.students": ["report.read"],
  "reports.faculty": ["report.read"],
  "reports.courses": ["report.read"],
  "reports.financial": ["report.read", "fee.read"],
  "targets.performance": ["target.read", "incentive.read"],
};

export const COUNSELOR_ITEM_WRITE_PERMISSIONS: Record<string, string[]> = {
  "leads.all": ["lead.create", "lead.update", "lead.assign", "lead.convert"],
  "leads.new": ["lead.create"],
  "leads.ai_calling": ["ai_call.create"],
  "leads.followups": ["lead.update", "lead.assign"],
  "admissions.enquiries": ["lead.create", "lead.update"],
  "admissions.applications": ["admission.create", "admission.update"],
  "admissions.all": ["admission.create", "admission.update"],
  "admissions.direct": ["admission.create"],
  "students.all": ["student.update"],
  "students.attendance": ["attendance.mark"],
  "faculty.all": [],
  "courses.course_assignment": [],
  "faculty.attendance": [],
  "batches.all": [],
  "schedule.timetable": [],
  "exams.all": [],
  "fees.payments": ["fee.create"],
  "fees.pending": [],
  "fees.reports": [],
  "reports.students": [],
  "reports.faculty": [],
  "reports.courses": [],
  "reports.financial": [],
  "targets.performance": [],
};

export const canReadCounselorItem = (
  permissions: string[] | undefined,
  itemKey: string
): boolean => {
  if (!permissions?.length) return false;
  const required = COUNSELOR_ITEM_READ_PERMISSIONS[itemKey];
  if (!required?.length) return false;
  const permSet = new Set(permissions);
  return required.some((p) => permSet.has(p));
};

export const canEditCounselorItem = (
  permissions: string[] | undefined,
  itemKey: string
): boolean => {
  if (!permissions?.length) return false;
  const readOk = canReadCounselorItem(permissions, itemKey);
  if (!readOk) return false;
  const writePerms = COUNSELOR_ITEM_WRITE_PERMISSIONS[itemKey];
  if (!writePerms?.length) return false;
  const permSet = new Set(permissions);
  return writePerms.every((p) => permSet.has(p));
};
