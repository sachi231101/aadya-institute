/**
 * Canonical master entity type registry for the frontend.
 * Mirrors backend/src/modules/masters/master.entity-types.ts
 *
 * Only master types that are wired into live forms/modules are listed here.
 */

export interface MasterEntityTypeMeta {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  usedInPages?: string[];
}

export const MASTER_CATEGORY_LABELS: Record<string, string> = {
  ACADEMIC_ORG: "Academic & Organization",
  ADMISSIONS_LEADS: "Admissions & Leads",
  ACCOUNTING_FEES: "Accounting & Fees",
  SYSTEM_AUTOMATION: "System & Automation",
};

/** Master types actively used across the application */
export const MASTER_ENTITY_TYPES: MasterEntityTypeMeta[] = [
  { id: "area", name: "Area", category: "ACADEMIC_ORG", categoryName: MASTER_CATEGORY_LABELS.ACADEMIC_ORG, usedInPages: ["Add Student", "Edit Student", "Direct Admission"] },
  { id: "classroom", name: "Classroom / Lab", category: "ACADEMIC_ORG", categoryName: MASTER_CATEGORY_LABELS.ACADEMIC_ORG, usedInPages: ["Classes", "Timetable", "Faculty Timetable", "Counselor Batches"] },
  { id: "designation", name: "Designation", category: "ACADEMIC_ORG", categoryName: MASTER_CATEGORY_LABELS.ACADEMIC_ORG, usedInPages: ["Add Faculty", "Edit Faculty", "Settings"] },
  { id: "education", name: "Education", category: "ACADEMIC_ORG", categoryName: MASTER_CATEGORY_LABELS.ACADEMIC_ORG, usedInPages: ["Add Student", "Edit Student", "Add Faculty", "Edit Faculty", "Enquiries"] },
  { id: "parentinfo", name: "Parent Info", category: "ACADEMIC_ORG", categoryName: MASTER_CATEGORY_LABELS.ACADEMIC_ORG, usedInPages: ["Add Student", "Edit Student", "Direct Admission"] },
  { id: "timeslot", name: "Time Slot", category: "ACADEMIC_ORG", categoryName: MASTER_CATEGORY_LABELS.ACADEMIC_ORG, usedInPages: ["Batches", "Timetable", "Enquiries", "Faculty Schedule"] },
  { id: "examterm", name: "Exam Term", category: "ACADEMIC_ORG", categoryName: MASTER_CATEGORY_LABELS.ACADEMIC_ORG, usedInPages: ["Create Exam", "Edit Exam"] },
  { id: "coursepackage", name: "Course Package", category: "ACADEMIC_ORG", categoryName: MASTER_CATEGORY_LABELS.ACADEMIC_ORG, usedInPages: ["Direct Admission"] },

  { id: "leadsource", name: "Lead Source", category: "ADMISSIONS_LEADS", categoryName: MASTER_CATEGORY_LABELS.ADMISSIONS_LEADS, usedInPages: ["Leads", "Enquiries", "Admissions", "AI Calling"] },
  { id: "leadstage", name: "Lead Stage", category: "ADMISSIONS_LEADS", categoryName: MASTER_CATEGORY_LABELS.ADMISSIONS_LEADS, usedInPages: ["Lead Management", "Lead Details", "Counselor Dashboard"] },
  { id: "admissionstatus", name: "Admission Status", category: "ADMISSIONS_LEADS", categoryName: MASTER_CATEGORY_LABELS.ADMISSIONS_LEADS, usedInPages: ["Direct Admission"] },

  { id: "bankaccounts", name: "Bank Accounts", category: "ACCOUNTING_FEES", categoryName: MASTER_CATEGORY_LABELS.ACCOUNTING_FEES, usedInPages: ["Payments"] },
  { id: "feeheads", name: "Fee Heads", category: "ACCOUNTING_FEES", categoryName: MASTER_CATEGORY_LABELS.ACCOUNTING_FEES, usedInPages: ["Payments", "Pending Fees"] },
  { id: "paymentmodes", name: "Payment Modes", category: "ACCOUNTING_FEES", categoryName: MASTER_CATEGORY_LABELS.ACCOUNTING_FEES, usedInPages: ["Payments", "Add Student", "Direct Admission"] },
  { id: "concessionheads", name: "Concession Heads", category: "ACCOUNTING_FEES", categoryName: MASTER_CATEGORY_LABELS.ACCOUNTING_FEES, usedInPages: ["Add Student", "Direct Admission"] },

  { id: "numberingseries", name: "Numbering Series", category: "SYSTEM_AUTOMATION", categoryName: MASTER_CATEGORY_LABELS.SYSTEM_AUTOMATION, usedInPages: ["Admissions", "Add Student", "Add Faculty", "Payments", "Enquiries", "Lead Conversion"] },
];

/** @deprecated Use MASTER_ENTITY_TYPES — all registered types are active */
export const ACTIVE_MASTER_TYPES = MASTER_ENTITY_TYPES;

export const getMasterTypeMeta = (entityType: string): MasterEntityTypeMeta | undefined =>
  MASTER_ENTITY_TYPES.find((t) => t.id === entityType.toLowerCase());

export const isActiveMasterType = (entityType: string): boolean =>
  getMasterTypeMeta(entityType) !== undefined;