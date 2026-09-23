import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  batchCurriculumApi,
  type BatchCurriculumData,
  type BatchCurriculumModule,
} from "@/services/batch-curriculum.api";

export const batchCurriculumQueryKey = (batchId: string) =>
  ["batch-curriculum", batchId] as const;

const replaceModule = (
  data: BatchCurriculumData | undefined,
  updated: BatchCurriculumModule
): BatchCurriculumData | undefined => {
  if (!data) return data;
  return {
    ...data,
    modules: data.modules.map((m) => (m.id === updated.id ? updated : m)),
  };
};

/** Fetch full batch curriculum (modules + topic progress). Shared by Admin/CM/Faculty. */
export const useBatchCurriculum = (batchId?: string) => {
  return useQuery({
    queryKey: batchCurriculumQueryKey(batchId ?? ""),
    queryFn: async () => {
      const res = await batchCurriculumApi.get(batchId!);
      return res.data;
    },
    enabled: Boolean(batchId),
  });
};

export const useMarkBatchModule = (batchId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = batchCurriculumQueryKey(batchId ?? "");

  return useMutation({
    mutationFn: ({
      batchModuleId,
      isCompleted,
    }: {
      batchModuleId: string;
      isCompleted: boolean;
    }) => batchCurriculumApi.markModule(batchId!, batchModuleId, isCompleted),
    onSuccess: (res) => {
      queryClient.setQueryData<BatchCurriculumData>(queryKey, (prev) =>
        replaceModule(prev, res.data)
      );
    },
  });
};

export const useMarkBatchTopic = (batchId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = batchCurriculumQueryKey(batchId ?? "");

  return useMutation({
    mutationFn: ({
      batchModuleId,
      topicId,
      isCompleted,
    }: {
      batchModuleId: string;
      topicId: string;
      isCompleted: boolean;
    }) => batchCurriculumApi.markTopic(batchId!, batchModuleId, topicId, isCompleted),
    onSuccess: (res) => {
      queryClient.setQueryData<BatchCurriculumData>(queryKey, (prev) =>
        replaceModule(prev, res.data)
      );
    },
  });
};
