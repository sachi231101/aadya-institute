import { api } from "./api";
import type {
  TargetPlan,
  Target,
  Incentive,
  PerformanceSummary,
  LeaderboardEntry,
  TargetPeriod,
  TargetStatus,
  TargetMetric,
  TargetType,
  IncentiveType,
  IncentiveStatus,
  IncentiveSlab,
  IncentivePercentageTier,
} from "../types/target.types";

export interface CreateTargetPlanInput {
  branchId?: string;
  name: string;
  description?: string;
  periodType: TargetPeriod;
  startDate: string;
  endDate: string;
}

export interface UpdateTargetPlanInput {
  branchId?: string;
  name?: string;
  description?: string;
  periodType?: TargetPeriod;
  startDate?: string;
  endDate?: string;
  status?: TargetStatus;
}

export interface CreateIncentiveRuleInput {
  incentiveType: IncentiveType;
  fixedAmount?: number;
  slabs?: IncentiveSlab[];
  percentages?: IncentivePercentageTier[];
}

export interface CreateTargetInput {
  branchId?: string;
  targetPlanId?: string;
  userId?: string;
  title: string;
  targetType: TargetType;
  metric: TargetMetric;
  targetValue: number;
  unit?: string;
  startDate: string;
  endDate: string;
  incentiveRule?: CreateIncentiveRuleInput;
}

export interface UpdateTargetInput {
  branchId?: string;
  userId?: string;
  title?: string;
  targetType?: TargetType;
  metric?: TargetMetric;
  targetValue?: number;
  unit?: string;
  startDate?: string;
  endDate?: string;
  status?: TargetStatus;
  incentiveRule?: CreateIncentiveRuleInput;
}

export interface QueryTargetsParams {
  branchId?: string;
  targetPlanId?: string;
  userId?: string;
  metric?: TargetMetric;
  status?: TargetStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface QueryIncentivesParams {
  branchId?: string;
  userId?: string;
  targetId?: string;
  targetPlanId?: string;
  status?: IncentiveStatus;
  page?: number;
  limit?: number;
}

export const targetsApi = {
  // ─── Target Plans ──────────────────────────────────────────────────────────

  getTargetPlans: async (status?: TargetStatus): Promise<{ data: TargetPlan[] }> => {
    const response = await api.get("/targets/plans", { params: { status } });
    return response.data;
  },

  getTargetPlanById: async (id: string): Promise<{ data: TargetPlan }> => {
    const response = await api.get(`/targets/plans/${id}`);
    return response.data;
  },

  createTargetPlan: async (data: CreateTargetPlanInput): Promise<{ data: TargetPlan }> => {
    const response = await api.post("/targets/plans", data);
    return response.data;
  },

  updateTargetPlan: async (
    id: string,
    data: UpdateTargetPlanInput
  ): Promise<{ data: TargetPlan }> => {
    const response = await api.patch(`/targets/plans/${id}`, data);
    return response.data;
  },

  publishTargetPlan: async (id: string): Promise<{ data: TargetPlan }> => {
    const response = await api.post(`/targets/plans/${id}/publish`);
    return response.data;
  },

  activateTargetPlan: async (id: string): Promise<{ data: TargetPlan }> => {
    const response = await api.post(`/targets/plans/${id}/activate`);
    return response.data;
  },

  lockTargetPlan: async (id: string): Promise<{ data: TargetPlan }> => {
    const response = await api.post(`/targets/plans/${id}/lock`);
    return response.data;
  },

  // ─── Targets ───────────────────────────────────────────────────────────────

  getTargets: async (
    params?: QueryTargetsParams
  ): Promise<{
    data: Target[];
    meta?: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    const response = await api.get("/targets", { params });
    return response.data;
  },

  getTargetById: async (id: string): Promise<{ data: Target }> => {
    const response = await api.get(`/targets/${id}`);
    return response.data;
  },

  createTarget: async (data: CreateTargetInput): Promise<{ data: Target }> => {
    const response = await api.post("/targets", data);
    return response.data;
  },

  updateTarget: async (
    id: string,
    data: UpdateTargetInput
  ): Promise<{ data: Target }> => {
    const response = await api.patch(`/targets/${id}`, data);
    return response.data;
  },

  deleteTarget: async (id: string): Promise<{ data: { id: string; success: boolean } }> => {
    const response = await api.delete(`/targets/${id}`);
    return response.data;
  },

  recalculateTarget: async (id: string): Promise<{ data: any }> => {
    const response = await api.post(`/targets/${id}/recalculate`);
    return response.data;
  },

  // ─── Counselor Self-Service ────────────────────────────────────────────────

  getMyCurrentTargets: async (): Promise<{
    data: {
      targets: Target[];
      summary: {
        activeTargetCount: number;
        totalPotentialIncentive: number;
      };
    };
  }> => {
    const response = await api.get("/targets/my/current");
    return response.data;
  },

  getMyPerformanceHistory: async (): Promise<{
    data: {
      targets: Target[];
      incentives: Incentive[];
    };
  }> => {
    const response = await api.get("/targets/my/history");
    return response.data;
  },

  // ─── Performance & Leaderboards ────────────────────────────────────────────

  getPerformanceSummary: async (
    branchId?: string
  ): Promise<{ data: PerformanceSummary }> => {
    const response = await api.get("/targets/performance/summary", {
      params: { branchId },
    });
    return response.data;
  },

  getLeaderboard: async (
    branchId?: string
  ): Promise<{ data: LeaderboardEntry[] }> => {
    const response = await api.get("/targets/performance/leaderboard", {
      params: { branchId },
    });
    return response.data;
  },

  // ─── Incentives & Approvals ────────────────────────────────────────────────

  getIncentives: async (
    params?: QueryIncentivesParams
  ): Promise<{
    data: Incentive[];
    meta?: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    const response = await api.get("/targets/incentives", { params });
    return response.data;
  },

  getIncentiveById: async (id: string): Promise<{ data: Incentive }> => {
    const response = await api.get(`/targets/incentives/${id}`);
    return response.data;
  },

  approveIncentive: async (
    id: string,
    data: { approvedAmount?: number; notes?: string }
  ): Promise<{ data: Incentive }> => {
    const response = await api.post(`/targets/incentives/${id}/approve`, data);
    return response.data;
  },

  rejectIncentive: async (
    id: string,
    data: { reason: string }
  ): Promise<{ data: Incentive }> => {
    const response = await api.post(`/targets/incentives/${id}/reject`, data);
    return response.data;
  },
};
