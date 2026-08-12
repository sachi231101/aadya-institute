export type BranchStatus = "ACTIVE" | "INACTIVE";

export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  assignedManagerName: string;
  assignedManagerEmail: string;
  studentCount: number;
  batchCount: number;
  revenueCollected: number;
  status: BranchStatus;
}
