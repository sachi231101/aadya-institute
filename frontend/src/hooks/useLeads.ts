import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsApi, type LeadQueryParams } from "../services/leads.api";

export const useLeads = (params?: LeadQueryParams) => {
  return useQuery({
    queryKey: ["leads", params],
    queryFn: () => leadsApi.getLeads(params),
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
  return useQuery({
    queryKey: ["leads", "dashboard", branchId],
    queryFn: () => leadsApi.getDashboardSummary({ branchId }),
  });
};

export const useCounsellorPerformance = (branchId?: string) => {
  return useQuery({
    queryKey: ["leads", "dashboard", "counsellors", branchId],
    queryFn: () => leadsApi.getCounsellorPerformance({ branchId }),
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

export const useConvertLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof leadsApi.convertLead>[1] }) =>
      leadsApi.convertLead(id, data),
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
    },
  });
};
