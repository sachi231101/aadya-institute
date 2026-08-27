import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  targetsApi,
  type CreateTargetPlanInput,
  type UpdateTargetPlanInput,
  type CreateTargetInput,
  type UpdateTargetInput,
  type QueryTargetsParams,
  type QueryIncentivesParams,
} from "../services/targets.api";
import type { TargetStatus } from "../types/target.types";

export const TARGET_KEYS = {
  allPlans: ["targetPlans"] as const,
  plan: (id: string) => ["targetPlans", id] as const,
  allTargets: ["targets"] as const,
  targetList: (params?: QueryTargetsParams) => ["targets", "list", params] as const,
  target: (id: string) => ["targets", id] as const,
  myCurrent: ["targets", "myCurrent"] as const,
  myHistory: ["targets", "myHistory"] as const,
  performanceSummary: (branchId?: string) => ["targets", "performanceSummary", branchId] as const,
  leaderboard: (branchId?: string) => ["targets", "leaderboard", branchId] as const,
  allIncentives: ["incentives"] as const,
  incentivesList: (params?: QueryIncentivesParams) => ["incentives", "list", params] as const,
  incentive: (id: string) => ["incentives", id] as const,
};

// ─── Target Plans Hooks ──────────────────────────────────────────────────────

export const useTargetPlans = (status?: TargetStatus) => {
  return useQuery({
    queryKey: [...TARGET_KEYS.allPlans, status],
    queryFn: async () => {
      const res = await targetsApi.getTargetPlans(status);
      return res.data;
    },
  });
};

export const useTargetPlan = (id?: string) => {
  return useQuery({
    queryKey: TARGET_KEYS.plan(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Plan ID is required");
      const res = await targetsApi.getTargetPlanById(id);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useCreateTargetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTargetPlanInput) => targetsApi.createTargetPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allPlans });
    },
  });
};

export const useUpdateTargetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTargetPlanInput }) =>
      targetsApi.updateTargetPlan(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allPlans });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.plan(vars.id) });
    },
  });
};

export const usePublishTargetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => targetsApi.publishTargetPlan(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allPlans });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.plan(id) });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allTargets });
    },
  });
};

export const useActivateTargetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => targetsApi.activateTargetPlan(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allPlans });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.plan(id) });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allTargets });
    },
  });
};

export const useLockTargetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => targetsApi.lockTargetPlan(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allPlans });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.plan(id) });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allTargets });
    },
  });
};

// ─── Targets CRUD Hooks ──────────────────────────────────────────────────────

export const useTargets = (params?: QueryTargetsParams) => {
  return useQuery({
    queryKey: TARGET_KEYS.targetList(params),
    queryFn: async () => {
      const res = await targetsApi.getTargets(params);
      return res;
    },
  });
};

export const useTarget = (id?: string) => {
  return useQuery({
    queryKey: TARGET_KEYS.target(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Target ID is required");
      const res = await targetsApi.getTargetById(id);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useCreateTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTargetInput) => targetsApi.createTarget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allTargets });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allPlans });
      queryClient.invalidateQueries({ queryKey: ["targets", "performanceSummary"] });
      queryClient.invalidateQueries({ queryKey: ["targets", "leaderboard"] });
    },
  });
};

export const useUpdateTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTargetInput }) =>
      targetsApi.updateTarget(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allTargets });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.target(vars.id) });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allPlans });
      queryClient.invalidateQueries({ queryKey: ["targets", "performanceSummary"] });
      queryClient.invalidateQueries({ queryKey: ["targets", "leaderboard"] });
    },
  });
};

export const useDeleteTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => targetsApi.deleteTarget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allTargets });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allPlans });
      queryClient.invalidateQueries({ queryKey: ["targets", "performanceSummary"] });
      queryClient.invalidateQueries({ queryKey: ["targets", "leaderboard"] });
    },
  });
};

export const useRecalculateTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => targetsApi.recalculateTarget(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.target(id) });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allTargets });
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.myCurrent });
      queryClient.invalidateQueries({ queryKey: ["targets", "performanceSummary"] });
      queryClient.invalidateQueries({ queryKey: ["targets", "leaderboard"] });
    },
  });
};

// ─── Counselor Hooks ─────────────────────────────────────────────────────────

export const useMyCurrentTargets = () => {
  return useQuery({
    queryKey: TARGET_KEYS.myCurrent,
    queryFn: async () => {
      const res = await targetsApi.getMyCurrentTargets();
      return res.data;
    },
    staleTime: 30000, // 30s
  });
};

export const useMyPerformanceHistory = () => {
  return useQuery({
    queryKey: TARGET_KEYS.myHistory,
    queryFn: async () => {
      const res = await targetsApi.getMyPerformanceHistory();
      return res.data;
    },
  });
};

// ─── Performance & Leaderboards Hooks ────────────────────────────────────────

export const usePerformanceSummary = (branchId?: string) => {
  return useQuery({
    queryKey: TARGET_KEYS.performanceSummary(branchId),
    queryFn: async () => {
      const res = await targetsApi.getPerformanceSummary(branchId);
      return res.data;
    },
  });
};

export const useLeaderboard = (branchId?: string) => {
  return useQuery({
    queryKey: TARGET_KEYS.leaderboard(branchId),
    queryFn: async () => {
      const res = await targetsApi.getLeaderboard(branchId);
      return res.data;
    },
  });
};

// ─── Incentives Hooks ────────────────────────────────────────────────────────

export const useIncentives = (params?: QueryIncentivesParams) => {
  return useQuery({
    queryKey: TARGET_KEYS.incentivesList(params),
    queryFn: async () => {
      const res = await targetsApi.getIncentives(params);
      return res;
    },
  });
};

export const useIncentive = (id?: string) => {
  return useQuery({
    queryKey: TARGET_KEYS.incentive(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Incentive ID is required");
      const res = await targetsApi.getIncentiveById(id);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useApproveIncentive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { approvedAmount?: number; notes?: string };
    }) => targetsApi.approveIncentive(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allIncentives });
    },
  });
};

export const useRejectIncentive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string } }) =>
      targetsApi.rejectIncentive(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TARGET_KEYS.allIncentives });
    },
  });
};
