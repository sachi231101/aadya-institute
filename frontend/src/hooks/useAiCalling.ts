import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  aiCallingApi,
  type CreateAgentInput,
  type UpdateAgentInput,
  type UpdateInstituteAiCallingConfigInput,
  type UpdatePlatformSettingsInput,
} from "../services/ai-calling.api";

export const useAiCallingConfig = (enabled = true) =>
  useQuery({
    queryKey: ["ai-calling", "config"],
    queryFn: () => aiCallingApi.getConfig(),
    enabled,
    retry: false,
  });

export const useUpdateAiCallingConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateInstituteAiCallingConfigInput) => aiCallingApi.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-calling", "config"] });
    },
  });
};

export const useAiCallingUsage = (params?: { from?: string; to?: string; days?: number }) =>
  useQuery({
    queryKey: ["ai-calling", "usage", params],
    queryFn: () => aiCallingApi.getUsage(params),
  });

export const useAiCallingAgents = (enabled = true) =>
  useQuery({
    queryKey: ["ai-calling", "agents"],
    queryFn: () => aiCallingApi.listAgents(),
    enabled,
  });

export const useAiCallById = (id: string | undefined) =>
  useQuery({
    queryKey: ["ai-calling", "logs", id],
    queryFn: () => aiCallingApi.getCallById(id!),
    enabled: Boolean(id),
  });

export const useAiCallingPlatform = (enabled = false) =>
  useQuery({
    queryKey: ["ai-calling", "platform"],
    queryFn: () => aiCallingApi.getPlatform(),
    enabled,
  });

export const useUpdateAiCallingPlatform = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePlatformSettingsInput) => aiCallingApi.updatePlatform(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-calling", "platform"] }),
  });
};

export const usePlatformAgents = (enabled = false) =>
  useQuery({
    queryKey: ["ai-calling", "platform", "agents"],
    queryFn: () => aiCallingApi.listPlatformAgents(),
    enabled,
  });

export const useCreatePlatformAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAgentInput) => aiCallingApi.createPlatformAgent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-calling", "platform", "agents"] });
      qc.invalidateQueries({ queryKey: ["ai-calling", "agents"] });
    },
  });
};

export const useUpdatePlatformAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAgentInput }) =>
      aiCallingApi.updatePlatformAgent(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-calling", "platform", "agents"] });
      qc.invalidateQueries({ queryKey: ["ai-calling", "agents"] });
    },
  });
};

export const useDeletePlatformAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiCallingApi.deletePlatformAgent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-calling", "platform", "agents"] });
      qc.invalidateQueries({ queryKey: ["ai-calling", "agents"] });
    },
  });
};
