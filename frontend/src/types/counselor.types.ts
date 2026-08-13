export type CounselorStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";

export interface Counselor {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  phone: string;
  branchId: string;
  branchName: string;
  assignedLeadsCount: number;
  activeStudentsCount: number;
  status: CounselorStatus;
  createdAt: string;
}

export interface CreateCounselorPayload {
  name: string;
  employeeCode: string;
  email: string;
  phone: string;
  password?: string;
  branchId?: string;
  branchName?: string;
  status?: CounselorStatus;
}

export interface UpdateCounselorPayload {
  name?: string;
  employeeCode?: string;
  email?: string;
  phone?: string;
  branchId?: string;
  branchName?: string;
  status?: CounselorStatus;
}
