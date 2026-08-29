/** Matches User.status from the users API (no ON_LEAVE in DB). */
export type CounselorStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export interface Counselor {
  id: string;
  name: string;
  /** Display-only code derived from user id — not persisted. */
  employeeCode: string;
  email: string;
  phone: string;
  branchId: string;
  branchName: string;
  assignedLeadsCount: number;
  /** Count of leads in CONVERTED stage (admission pipeline), not batch enrollments. */
  convertedLeadsCount: number;
  status: CounselorStatus;
  createdAt: string;
}

export interface CreateCounselorPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  branchId?: string;
  branchName?: string;
  status?: CounselorStatus;
  modulePermissions?: string[];
}

export interface UpdateCounselorPayload {
  name?: string;
  email?: string;
  phone?: string;
  branchId?: string;
  branchName?: string;
  status?: CounselorStatus;
}
