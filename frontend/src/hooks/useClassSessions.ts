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
const SCHEDULE_SUMMARY_KEY = "schedule-summary";

/**
 * Invalidates all queries that depend on class session data,
 * ensuring Dashboard, Timetable, and Classes all stay in sync.
 */
const invalidateSessionRelatedQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
  queryClient.invalidateQueries({ queryKey: [SCHEDULE_SUMMARY_KEY] });
  queryClient.invalidateQueries({ queryKey: ["faculty-dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
};

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
      invalidateSessionRelatedQueries(queryClient);
    },
  });
};

export const useUpdateClassSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateClassSessionPayload }) =>
      classSessionsApi.update(id, payload),
    onSuccess: () => {
      invalidateSessionRelatedQueries(queryClient);
    },
  });
};

export const useDeleteClassSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classSessionsApi.delete(id),
    onSuccess: () => {
      invalidateSessionRelatedQueries(queryClient);
    },
  });
};
