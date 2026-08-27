import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notification.store';
import * as api from '@/services/exams.api';

export const examKeys = {
  all: ['exams'] as const,
  lists: () => [...examKeys.all, 'list'] as const,
  list: (filters: object) => [...examKeys.lists(), filters] as const,
  details: () => [...examKeys.all, 'detail'] as const,
  detail: (id: string) => [...examKeys.details(), id] as const,
  stats: () => [...examKeys.all, 'stats'] as const,
  questions: (id: string) => [...examKeys.detail(id), 'questions'] as const,
  batches: (id: string) => [...examKeys.detail(id), 'batches'] as const,
};

export const useExams = (filters?: api.ExamFilters) => {
  return useQuery({
    queryKey: examKeys.list(filters || {}),
    queryFn: () => api.getExams(filters),
  });
};

export const useExamStats = () => {
  return useQuery({
    queryKey: examKeys.stats(),
    queryFn: api.getExamStats,
  });
};

export const useExam = (id: string) => {
  return useQuery({
    queryKey: examKeys.detail(id),
    queryFn: () => api.getExamById(id),
    enabled: !!id,
  });
};

export const useExamQuestions = (examId: string) => {
  return useQuery({
    queryKey: examKeys.questions(examId),
    queryFn: () => api.getExamQuestions(examId),
    enabled: !!examId,
  });
};

export const useExamBatches = (examId: string) => {
  return useQuery({
    queryKey: examKeys.batches(examId),
    queryFn: () => api.getExamBatches(examId),
    enabled: !!examId,
  });
};

export const useCreateExam = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: api.createExam,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      queryClient.invalidateQueries({ queryKey: examKeys.stats() });
      addNotification(`Exam "${data.data?.name}" created successfully!`, 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to create exam', 'error');
    },
  });
};

export const useUpdateExam = (id: string) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: (payload: Partial<api.CreateExamPayload>) => api.updateExam(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      addNotification('Exam updated successfully!', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to update exam', 'error');
    },
  });
};

export const useDeleteExam = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: api.deleteExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      queryClient.invalidateQueries({ queryKey: examKeys.stats() });
      addNotification('Exam deleted successfully', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to delete exam', 'error');
    },
  });
};

export const usePublishExam = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: api.publishExam,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      queryClient.invalidateQueries({ queryKey: examKeys.stats() });
      addNotification('Exam published successfully!', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to publish exam', 'error');
    },
  });
};

export const useScheduleExam = (id: string) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: (payload: api.ScheduleExamPayload) => api.scheduleExam(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      addNotification('Exam scheduled successfully!', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to schedule exam', 'error');
    },
  });
};

export const useArchiveExam = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: api.archiveExam,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: examKeys.lists() });
      queryClient.invalidateQueries({ queryKey: examKeys.stats() });
      addNotification('Exam archived', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to archive exam', 'error');
    },
  });
};

export const useAddQuestionToExam = (examId: string) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: (payload: api.AddQuestionPayload) => api.addQuestionToExam(examId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.questions(examId) });
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) });
      addNotification('Question added to exam', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to add question', 'error');
    },
  });
};

export const useRemoveQuestionFromExam = (examId: string) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: (questionId: string) => api.removeQuestionFromExam(examId, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.questions(examId) });
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) });
      addNotification('Question removed from exam', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to remove question', 'error');
    },
  });
};

export const useAssignBatchToExam = (examId: string) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: (batchId: string) => api.assignBatchToExam(examId, batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.batches(examId) });
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) });
      addNotification('Batch assigned to exam', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to assign batch', 'error');
    },
  });
};

export const useRemoveBatchFromExam = (examId: string) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: (batchId: string) => api.removeBatchFromExam(examId, batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.batches(examId) });
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) });
      addNotification('Batch removed from exam', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to remove batch', 'error');
    },
  });
};
