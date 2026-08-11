import type { Status } from "@prisma/client";

export interface BranchListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: Status;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  status?: Status;
}

export interface BranchResponse {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
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
}
