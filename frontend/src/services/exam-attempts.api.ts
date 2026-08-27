import { api } from './api';

export interface ProctoringEventPayload {
  eventType:
    | 'TAB_SWITCH'
    | 'WINDOW_BLUR'
    | 'VISIBILITY_HIDDEN'
    | 'FULLSCREEN_EXIT'
    | 'KEYBOARD_SHORTCUT'
    | 'COPY_ATTEMPT'
    | 'PASTE_ATTEMPT'
    | 'RIGHT_CLICK'
    | 'DEVTOOLS_ATTEMPT'
    | 'NETWORK_DISCONNECT'
    | 'SESSION_CONFLICT'
    | 'SUSPICIOUS_BROWSER_EVENT';
  clientEventId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface SaveAnswerPayload {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
  numericalAnswer?: number;
  isFlagged?: boolean;
}

export const examAttemptsApi = {
  // Student Endpoints
  getAvailableExams: async () => {
    const res = await api.get('/exams/student/available');
    return res.data;
  },

  getExamInstructions: async (examId: string) => {
    const res = await api.get(`/exams/student/${examId}/instructions`);
    return res.data;
  },

  startExam: async (examId: string, clientDeviceInfo?: Record<string, unknown>) => {
    const res = await api.post(`/exams/student/${examId}/start`, { clientDeviceInfo });
    return res.data;
  },

  getAttempt: async (attemptId: string) => {
    const res = await api.get(`/exams/attempts/${attemptId}`);
    return res.data;
  },

  saveAnswers: async (attemptId: string, answers: SaveAnswerPayload[]) => {
    const res = await api.post(`/exams/attempts/${attemptId}/answers`, { answers });
    return res.data;
  },

  recordProctoringEvent: async (attemptId: string, payload: ProctoringEventPayload) => {
    const res = await api.post(`/exams/attempts/${attemptId}/proctoring-events`, payload);
    return res.data;
  },

  submitExam: async (attemptId: string) => {
    const res = await api.post(`/exams/attempts/${attemptId}/submit`);
    return res.data;
  },

  // Staff / Admin Endpoints
  getExamAttemptsStaff: async (examId: string, params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const res = await api.get(`/exams/${examId}/attempts`, { params });
    return res.data;
  },

  getAttemptProctoringStaff: async (attemptId: string) => {
    const res = await api.get(`/exams/attempts/${attemptId}/proctoring`);
    return res.data;
  },

  terminateAttemptStaff: async (attemptId: string, reason: string) => {
    const res = await api.post(`/exams/attempts/${attemptId}/terminate`, { reason });
    return res.data;
  },
};
