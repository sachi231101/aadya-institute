import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notification.store';
import * as api from '@/services/question-banks.api';

export const questionBankKeys = {
  all: ['question-banks'] as const,
  lists: () => [...questionBankKeys.all, 'list'] as const,
  list: (filters: object) => [...questionBankKeys.lists(), filters] as const,
  detail: (id: string) => [...questionBankKeys.all, 'detail', id] as const,
};

export const useQuestionBanks = (filters?: api.QuestionBankFilters) => {
  return useQuery({
    queryKey: questionBankKeys.list(filters || {}),
    queryFn: () => api.getQuestionBanks(filters),
  });
};

export const useQuestionBank = (id: string) => {
  return useQuery({
    queryKey: questionBankKeys.detail(id),
    queryFn: () => api.getQuestionBankById(id),
    enabled: !!id,
  });
};

export const useCreateQuestionBank = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: api.createQuestionBank,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() });
      addNotification('Question bank created successfully!', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to create question bank', 'error');
    },
  });
};

export const useUpdateQuestionBank = (id: string) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: (payload: Partial<api.CreateQuestionBankPayload> & { status?: string }) =>
      api.updateQuestionBank(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() });
      addNotification('Question bank updated successfully!', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to update question bank', 'error');
    },
  });
};

export const useDeleteQuestionBank = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: api.deleteQuestionBank,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.lists() });
      addNotification('Question bank deleted successfully', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to delete question bank', 'error');
    },
  });
};
