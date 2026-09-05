import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  invitationsApi,
  type CreateInvitationPayload,
} from "@/services/invitations.api";

const INVITATIONS_KEY = "invitations";

export const useInvitations = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: [INVITATIONS_KEY, params],
    queryFn: () => invitationsApi.list({ limit: 50, ...params }),
  });
};

export const useCreateInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvitationPayload) => invitationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVITATIONS_KEY] });
    },
  });
};

export const useRevokeInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invitationsApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVITATIONS_KEY] });
    },
  });
};

export const useAcceptInvitePreview = (token: string | null) => {
  return useQuery({
    queryKey: [INVITATIONS_KEY, "preview", token],
    queryFn: () => invitationsApi.preview(token!),
    enabled: !!token,
    retry: false,
  });
};

export const useAcceptInvitation = () => {
  return useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      invitationsApi.accept(data),
  });
};
