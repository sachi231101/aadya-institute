export interface MasterRecordData {
  id: string;
  instituteId: string;
  branchId: string | null;
  entityType: string;
  code: string | null;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  sortOrder: number;
  data: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMasterRecordInput {
  entityType: string;
  name: string;
  code?: string;
  description?: string;
  branchId?: string;
  status?: "ACTIVE" | "INACTIVE";
  sortOrder?: number;
  data?: Record<string, any>;
}

export interface UpdateMasterRecordInput {
  name?: string;
  code?: string;
  description?: string;
  branchId?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  sortOrder?: number;
  data?: Record<string, any>;
}

export interface MasterListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
  branchId?: string;
}

export interface EntityCountResult {
  entityType: string;
  count: number;
  lastUpdated: string | null;
}

export interface ActiveMastersQuery {
  branchId?: string;
}

export interface ToggleStatusInput {
  status: "ACTIVE" | "INACTIVE";
}

/**
 * Shape of the `data` JSON column for entityType = "numberingseries".
 * Used by SequenceService to atomically generate sequential document numbers.
 */
export interface NumberingSeriesData {
  /** Target document: ADMISSION | RECEIPT | STUDENT | ENQUIRY | APPLICATION | EMPLOYEE */
  target: string;
  /** Pattern template e.g. "AADYA/{BRANCH}/{YEAR}/{SEQ:4}" */
  pattern: string;
  /** The starting sequence number (inclusive) — defaults to 1 */
  startNumber: number;
  /** Current counter value (last issued number) */
  currentSequence: number;
  /** How often the counter resets: YEARLY | MONTHLY | NEVER */
  resetFrequency: "YEARLY" | "MONTHLY" | "NEVER";
  /** Year/month when the counter was last reset (for reset tracking) */
  lastResetPeriod?: string;
}
