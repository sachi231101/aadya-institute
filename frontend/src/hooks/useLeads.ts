import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  leadsApi,
  type LeadQueryParams,
  type CallHistoryQueryParams,
} from "../services/leads.api";
import { useAuthStore } from "@/store/auth.store";
import { getScopedBranchId, mergeBranchScopedParams } from "@/utils/branch-scope.util";

export const useLeads = (params?: LeadQueryParams) => {
  const { user } = useAuthStore();
  const mergedParams = mergeBranchScopedParams(user, params);
  return useQuery({
    queryKey: ["leads", mergedParams],
    queryFn: () => leadsApi.getLeads(mergedParams),
  });
};

export const useLeadById = (id: string) => {
  return useQuery({
    queryKey: ["leads", id],
    queryFn: () => leadsApi.getLeadById(id),
    enabled: !!id,
  });
};

export const useLeadDashboard = (branchId?: string) => {
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, branchId);
  return useQuery({
    queryKey: ["leads", "dashboard", scopedBranchId],
    queryFn: () => leadsApi.getDashboardSummary({ branchId: scopedBranchId }),
  });
};

export const useCounsellorPerformance = (branchId?: string) => {
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, branchId);
  return useQuery({
    queryKey: ["leads", "dashboard", "counsellors", scopedBranchId],
    queryFn: () => leadsApi.getCounsellorPerformance({ branchId: scopedBranchId }),
  });
};

export const useFollowUpDashboard = (branchId?: string) => {
  const { user } = useAuthStore();
  const scopedBranchId = getScopedBranchId(user, branchId);
  return useQuery({
    queryKey: ["leads", "dashboard", "follow-ups", scopedBranchId],
    queryFn: () => leadsApi.getFollowUpDashboard({ branchId: scopedBranchId }),
  });
};

export const useCallHistory = (
  params?: CallHistoryQueryParams,
  options?: { refetchInterval?: number | false; enabled?: boolean }
) => {
  const { user } = useAuthStore();
  const mergedParams = mergeBranchScopedParams(user, params);
  return useQuery({
    queryKey: ["leads", "call-history", mergedParams],
    queryFn: () => leadsApi.getCallHistory(mergedParams),
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled ?? true,
  });
};

export const useLeadFollowUps = (id: string) => {
  return useQuery({
    queryKey: ["leads", id, "follow-ups"],
    queryFn: () => leadsApi.getFollowUps(id),
    enabled: !!id,
  });
};

export const useLeadHistory = (id: string) => {
  return useQuery({
    queryKey: ["leads", id, "history"],
    queryFn: () => leadsApi.getHistory(id),
    enabled: !!id,
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof leadsApi.updateLead>[1] }) =>
      leadsApi.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useArchiveLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsApi.archiveLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useAssignLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof leadsApi.assignLead>[1] }) =>
      leadsApi.assignLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useBulkAssignLeads = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.bulkAssignLeads,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useMergeLeads = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.mergeLeads,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useUpdateLeadTags = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { tags: string[] } }) =>
      leadsApi.updateLeadTags(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useUpdateLeadScore = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof leadsApi.updateLeadScore>[1];
    }) => leadsApi.updateLeadScore(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useCreateManualCallLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.createManualCallLog,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads", "call-history"] });
      queryClient.invalidateQueries({ queryKey: ["leads", variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useChangeLeadStage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof leadsApi.changeStage>[1] }) =>
      leadsApi.changeStage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useMarkLeadLost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof leadsApi.markLost>[1] }) =>
      leadsApi.markLost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useCreateFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof leadsApi.createFollowUp>[1] }) =>
      leadsApi.createFollowUp(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["leads", "dashboard", "follow-ups"] });
    },
  });
};

export const useUpdateFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, followUpId, data }: { leadId: string; followUpId: string; data: Parameters<typeof leadsApi.updateFollowUp>[2] }) =>
      leadsApi.updateFollowUp(leadId, followUpId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads", variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads", "dashboard", "follow-ups"] });
    },
  });
};

export const useCreateApplicationFromLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: Parameters<typeof leadsApi.createApplicationFromLead>[1] }) =>
      leadsApi.createApplicationFromLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
};

export const useTriggerLeadCall = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => leadsApi.triggerAiCall(leadId),
    onSuccess: (_data, leadId) => {
      queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads", "call-history"] });
    },
  });
};
