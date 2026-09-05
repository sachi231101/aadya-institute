/**
 * Shared form field definitions for Master entity types.
 * Used by Master Setup and MasterSelect inline "+ Add New".
 *
 * Note: top-level MasterRecord.code is not collected on forms except
 * Numbering Series (Target Document). PIN / IFSC remain as data fields.
 */

export interface MasterFormField {
  key: string;
  label: string;
  required?: boolean;
}

/** Top-level payload keys (not nested under data) */
export const MASTER_TOP_LEVEL_KEYS = new Set(["name", "code", "description"]);

export const MASTER_QUICK_CREATE_FIELDS: Record<string, MasterFormField[]> = {
  area: [
    { key: "name", label: "Area Name", required: true },
    { key: "city", label: "City" },
    { key: "pincode", label: "PIN Code" },
  ],
  classroom: [
    { key: "name", label: "Room Name", required: true },
    { key: "capacity", label: "Capacity" },
    { key: "type", label: "Room Type" },
  ],
  designation: [
    { key: "name", label: "Designation Title", required: true },
    { key: "level", label: "Hierarchy Level" },
    { key: "department", label: "Department" },
  ],
  education: [
    { key: "name", label: "Degree / Qualification", required: true },
    { key: "stream", label: "Stream / Field" },
  ],
  parentinfo: [
    { key: "name", label: "Relation Type", required: true },
    { key: "occupationGroup", label: "Occupation Group" },
    { key: "incomeBracket", label: "Income Bracket" },
  ],
  timeslot: [
    { key: "name", label: "Slot Name", required: true },
    { key: "startTime", label: "Start Time" },
    { key: "endTime", label: "End Time" },
    { key: "period", label: "Period" },
  ],
  examterm: [
    { key: "name", label: "Term Name", required: true },
    { key: "academicYear", label: "Academic Year" },
  ],
  coursepackage: [
    { key: "name", label: "Package Name", required: true },
    { key: "description", label: "Description" },
  ],
  leadsource: [
    { key: "name", label: "Source Channel", required: true },
    { key: "channelType", label: "Channel Type" },
  ],
  leadstage: [
    { key: "name", label: "Stage Name", required: true },
    { key: "description", label: "Pipeline Action" },
    { key: "color", label: "Badge Color" },
  ],
  admissionstatus: [
    { key: "name", label: "Status Title", required: true },
    { key: "step", label: "Enrollment Step" },
  ],
  bankaccounts: [
    { key: "name", label: "Bank Name", required: true },
    { key: "accountNumber", label: "Account No" },
    { key: "ifsc", label: "IFSC Code" },
    { key: "branch", label: "Bank Branch" },
  ],
  feeheads: [
    { key: "name", label: "Fee Head Title", required: true },
    { key: "type", label: "Fee Type" },
    { key: "gstApplicable", label: "GST Rate" },
  ],
  paymentmodes: [
    { key: "name", label: "Payment Mode", required: true },
    { key: "processingFee", label: "Gateway Charge" },
  ],
  concessionheads: [
    { key: "name", label: "Scholarship / Discount", required: true },
    { key: "percentage", label: "Max Discount" },
    { key: "approvalLevel", label: "Approval Required" },
  ],
  /** Numbering series only — `code` is the document target (STUDENT, ADMISSION, …) */
  numberingseries: [
    { key: "code", label: "Target Document", required: true },
    { key: "name", label: "Series Name", required: true },
    { key: "pattern", label: "Format Pattern" },
    { key: "startNumber", label: "Start No" },
    { key: "currentSequence", label: "Last Issued No" },
    { key: "resetFrequency", label: "Reset Cycle" },
  ],
};

export const getMasterQuickCreateFields = (entityType: string): MasterFormField[] =>
  MASTER_QUICK_CREATE_FIELDS[entityType.toLowerCase()] ?? [
    { key: "name", label: "Name", required: true },
  ];
