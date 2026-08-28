/**
 * Canonical master entity types for Aadya Institute.
 * Only types wired into live business modules are allowed.
 */

export interface MasterEntityTypeDef {
  id: string;
  name: string;
  category: string;
}

/** 15 master types actively used across the application */
export const MASTER_ENTITY_TYPES: MasterEntityTypeDef[] = [
  // Academic & Organization
  { id: "area", name: "Area", category: "ACADEMIC_ORG" },
  { id: "classroom", name: "Class Room", category: "ACADEMIC_ORG" },
  { id: "designation", name: "Designation", category: "ACADEMIC_ORG" },
  { id: "education", name: "Education", category: "ACADEMIC_ORG" },
  { id: "parentinfo", name: "Parent Info", category: "ACADEMIC_ORG" },
  { id: "timeslot", name: "Time Slot", category: "ACADEMIC_ORG" },
  { id: "examterm", name: "Exam Term", category: "ACADEMIC_ORG" },
  // Admissions & Leads
  { id: "leadsource", name: "Lead Source", category: "ADMISSIONS_LEADS" },
  { id: "leadstage", name: "Lead Stage", category: "ADMISSIONS_LEADS" },
  { id: "admissionstatus", name: "Admission Status", category: "ADMISSIONS_LEADS" },
  // Accounting & Fees
  { id: "bankaccounts", name: "Bank Accounts", category: "ACCOUNTING_FEES" },
  { id: "feeheads", name: "Fee Heads", category: "ACCOUNTING_FEES" },
  { id: "paymentmodes", name: "Payment Modes", category: "ACCOUNTING_FEES" },
  { id: "concessionheads", name: "Concession Heads", category: "ACCOUNTING_FEES" },
  // System & Automation
  { id: "numberingseries", name: "Numbering Series", category: "SYSTEM_AUTOMATION" },
];

export const ALLOWED_MASTER_ENTITY_TYPES = MASTER_ENTITY_TYPES.map((t) => t.id);

/** @deprecated Use ALLOWED_MASTER_ENTITY_TYPES — all registered types are active */
export const ACTIVE_MASTER_ENTITY_TYPES = ALLOWED_MASTER_ENTITY_TYPES;

export const isAllowedMasterEntityType = (entityType: string): boolean =>
  ALLOWED_MASTER_ENTITY_TYPES.includes(entityType.toLowerCase());

export const getMasterEntityTypeDef = (
  entityType: string
): MasterEntityTypeDef | undefined =>
  MASTER_ENTITY_TYPES.find((t) => t.id === entityType.toLowerCase());