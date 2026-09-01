import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailApi, type EmailTemplateQueryParams, type EmailLogQueryParams } from "../services/email.api";

export const EMAIL_KEYS = {
  templates: (params?: EmailTemplateQueryParams) => ["email", "templates", params] as const,
  logs: (params?: EmailLogQueryParams) => ["email", "logs", params] as const,
};

export const useEmailTemplates = (params?: EmailTemplateQueryParams) => {
  return useQuery({
    queryKey: EMAIL_KEYS.templates(params),
    queryFn: () => emailApi.listTemplates(params),
  });
};

export const useEmailLogs = (params?: EmailLogQueryParams) => {
  return useQuery({
    queryKey: EMAIL_KEYS.logs(params),
    queryFn: () => emailApi.listLogs(params),
  });
};

export const useCreateEmailTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: emailApi.createTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email"] }),
  });
};

export const useUpdateEmailTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof emailApi.updateTemplate>[1] }) =>
      emailApi.updateTemplate(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email"] }),
  });
};

export const useDeleteEmailTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: emailApi.deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email"] }),
  });
};

export const useSendTestEmail = () => {
  return useMutation({
    mutationFn: emailApi.sendTest,
  });
};
