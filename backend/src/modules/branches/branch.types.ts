import type { Status, Prisma } from "@prisma/client";

export interface BranchListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: Status;
}

export interface BranchManagerSummary {
  id: string;
  name: string;
  email: string | null;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  workingHours?: Prisma.InputJsonValue | null;
  managerUserId?: string | null;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  workingHours?: Prisma.InputJsonValue | null;
  managerUserId?: string | null;
  status?: Status;
}

export interface BranchResponse {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string | null;
  workingHours: Prisma.JsonValue | null;
  managerUserId: string | null;
  manager?: BranchManagerSummary | null;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

export interface BranchStatsResponse {
  branchId: string;
  branchName: string;
  totalStudents: number;
  totalFaculty: number;
  totalBatches: number;
  totalAdmissions: number;
  todayClasses: number;
  upcomingClasses: number;
  liveClasses: number;
}
