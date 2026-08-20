import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  classSessionsApi,
  type BackendClassSession,
} from "../services/class-sessions.api";
import type {
  CreateClassSessionPayload,
  UpdateClassSessionPayload,
} from "../types/schedule.types";

const SESSIONS_KEY = "class-sessions";

export const useClassSessions = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [SESSIONS_KEY, params],
    queryFn: () => classSessionsApi.getAll(params),
  });
};

export const useClassSession = (id: string | undefined) => {
  return useQuery({
    queryKey: [SESSIONS_KEY, id],
    queryFn: () => classSessionsApi.getById(id!),
    enabled: !!id,
  });
};

export const useCreateClassSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClassSessionPayload) => classSessionsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
    },
  });
};

export const useUpdateClassSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateClassSessionPayload }) =>
      classSessionsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
    },
  });
};

export const useDeleteClassSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classSessionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
    },
  });
};
