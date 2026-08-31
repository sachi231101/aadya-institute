import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notification.store';
import * as api from '@/services/questions.api';
import { questionBankKeys } from '@/hooks/useQuestionBanks';

export const questionKeys = {
  all: ['questions'] as const,
  lists: () => [...questionKeys.all, 'list'] as const,
  list: (filters: object) => [...questionKeys.lists(), filters] as const,
  detail: (id: string) => [...questionKeys.all, 'detail', id] as const,
};

export const useQuestions = (
  filters?: api.QuestionFilters,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: questionKeys.list(filters || {}),
    queryFn: () => api.getQuestions(filters),
    enabled: options?.enabled !== false,
  });
};

export const useQuestion = (id: string) => {
  return useQuery({
    queryKey: questionKeys.detail(id),
    queryFn: () => api.getQuestionById(id),
    enabled: !!id,
  });
};

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: api.createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() });
      addNotification('Question created successfully!', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to create question', 'error');
    },
  });
};

export const useCreateBulkQuestions = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: api.createBulkQuestions,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() });
      const count = data?.data?.length || 'Multiple';
      addNotification(`${count} questions created successfully!`, 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to create questions', 'error');
    },
  });
};

export const useUpdateQuestion = (defaultId?: string) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: (args: Partial<api.CreateQuestionPayload> | { id: string; payload: Partial<api.CreateQuestionPayload> }) => {
      if ('id' in args && 'payload' in args) {
        return api.updateQuestion(args.id, args.payload);
      }
      if (defaultId) {
        return api.updateQuestion(defaultId, args as Partial<api.CreateQuestionPayload>);
      }
      throw new Error('Question ID is required for update');
    },
    onSuccess: (_data, args) => {
      const targetId = defaultId || ('id' in args ? args.id : undefined);
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: questionKeys.detail(targetId) });
      }
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() });
      addNotification('Question updated successfully!', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to update question', 'error');
    },
  });
};

export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: api.deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() });
      addNotification('Question deleted successfully', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to delete question', 'error');
    },
  });
};
