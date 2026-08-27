import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notification.store';
import * as api from '@/services/questions.api';

export const questionKeys = {
  all: ['questions'] as const,
  lists: () => [...questionKeys.all, 'list'] as const,
  list: (filters: object) => [...questionKeys.lists(), filters] as const,
  detail: (id: string) => [...questionKeys.all, 'detail', id] as const,
};

export const useQuestions = (filters?: api.QuestionFilters) => {
  return useQuery({
    queryKey: questionKeys.list(filters || {}),
    queryFn: () => api.getQuestions(filters),
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
      addNotification('Question created successfully!', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to create question', 'error');
    },
  });
};

export const useUpdateQuestion = (id: string) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: (payload: Partial<api.CreateQuestionPayload>) => api.updateQuestion(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
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
      addNotification('Question deleted successfully', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to delete question', 'error');
    },
  });
};
