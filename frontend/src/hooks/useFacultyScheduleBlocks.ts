import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  facultyScheduleBlocksApi,
  type FacultyScheduleBlockListParams,
  type UpsertFacultyScheduleBlockPayload,
} from "../services/faculty-schedule-blocks.api";

const BLOCKS_KEY = "faculty-schedule-blocks";
const SESSIONS_KEY = "class-sessions";

const invalidateBlockRelatedQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: [BLOCKS_KEY] });
  queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
  queryClient.invalidateQueries({ queryKey: ["schedule-summary"] });
};

export const useFacultyScheduleBlocks = (
  params?: FacultyScheduleBlockListParams,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [BLOCKS_KEY, params],
    queryFn: () => facultyScheduleBlocksApi.getAll(params),
    enabled: options?.enabled !== false,
  });
};

export const useUpsertFacultyScheduleBlock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertFacultyScheduleBlockPayload) =>
      facultyScheduleBlocksApi.upsert(payload),
    onSuccess: () => {
      invalidateBlockRelatedQueries(queryClient);
    },
  });
};

export const useDeleteFacultyScheduleBlock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => facultyScheduleBlocksApi.deleteById(id),
    onSuccess: () => {
      invalidateBlockRelatedQueries(queryClient);
    },
  });
};

export const useDeleteFacultyScheduleBlockByKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { facultyId: string; scheduledDate: string; startTime: string }) =>
      facultyScheduleBlocksApi.deleteByKey(params),
    onSuccess: () => {
      invalidateBlockRelatedQueries(queryClient);
    },
  });
};
