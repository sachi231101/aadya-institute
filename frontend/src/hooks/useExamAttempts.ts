import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  examAttemptsApi,
  type ProctoringEventPayload,
  type SaveAnswerPayload,
} from '@/services/exam-attempts.api';
import { useNotificationStore } from '@/store/notification.store';

export const attemptKeys = {
  all: ['exam-attempts'] as const,
  available: () => [...attemptKeys.all, 'student-available'] as const,
  instructions: (examId: string) => [...attemptKeys.all, 'instructions', examId] as const,
  detail: (attemptId: string) => [...attemptKeys.all, 'detail', attemptId] as const,
  staffList: (examId: string, params?: Record<string, unknown>) =>
    [...attemptKeys.all, 'staff-list', examId, params] as const,
  staffProctoring: (attemptId: string) =>
    [...attemptKeys.all, 'staff-proctoring', attemptId] as const,
};

// ─── Student Hooks ────────────────────────────────────────────────────────────

export const useStudentAvailableExams = () => {
  return useQuery({
    queryKey: attemptKeys.available(),
    queryFn: examAttemptsApi.getAvailableExams,
  });
};

export const useExamInstructions = (examId: string) => {
  return useQuery({
    queryKey: attemptKeys.instructions(examId),
    queryFn: () => examAttemptsApi.getExamInstructions(examId),
    enabled: !!examId,
  });
};

export const useStartExam = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: ({ examId, deviceInfo }: { examId: string; deviceInfo?: Record<string, unknown> }) =>
      examAttemptsApi.startExam(examId, deviceInfo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.all });
      addNotification(data?.message || 'Exam started successfully', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to start examination', 'error');
    },
  });
};

export const useAttemptDetails = (attemptId: string) => {
  return useQuery({
    queryKey: attemptKeys.detail(attemptId),
    queryFn: () => examAttemptsApi.getAttempt(attemptId),
    enabled: !!attemptId,
    refetchInterval: false,
  });
};

export const useSaveAnswers = (attemptId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (answers: SaveAnswerPayload[]) =>
      examAttemptsApi.saveAnswers(attemptId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.detail(attemptId) });
    },
  });
};

export const useRecordProctoringEvent = (attemptId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProctoringEventPayload) =>
      examAttemptsApi.recordProctoringEvent(attemptId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.detail(attemptId) });
      return data;
    },
  });
};

export const useSubmitExam = (attemptId: string) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: () => examAttemptsApi.submitExam(attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.all });
      addNotification('Examination submitted successfully!', 'success');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to submit examination', 'error');
    },
  });
};

// ─── Staff / Admin Hooks ──────────────────────────────────────────────────────

export const useStaffExamAttempts = (
  examId: string,
  params?: { status?: string; search?: string; page?: number; limit?: number }
) => {
  return useQuery({
    queryKey: attemptKeys.staffList(examId, params),
    queryFn: () => examAttemptsApi.getExamAttemptsStaff(examId, params),
    enabled: !!examId,
    refetchInterval: 5000,
  });
};

export const useStaffAttemptProctoring = (attemptId: string) => {
  return useQuery({
    queryKey: attemptKeys.staffProctoring(attemptId),
    queryFn: () => examAttemptsApi.getAttemptProctoringStaff(attemptId),
    enabled: !!attemptId,
  });
};

export const useStaffTerminateAttempt = (attemptId: string, examId: string) => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: (reason: string) =>
      examAttemptsApi.terminateAttemptStaff(attemptId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attemptKeys.staffList(examId) });
      queryClient.invalidateQueries({ queryKey: attemptKeys.staffProctoring(attemptId) });
      addNotification('Attempt terminated manually', 'info');
    },
    onError: (err: any) => {
      addNotification(err?.response?.data?.message || 'Failed to terminate attempt', 'error');
    },
  });
};
