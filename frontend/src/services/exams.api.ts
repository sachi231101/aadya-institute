import { api } from './api';

export interface ExamFilters {
  search?: string;
  status?: string;
  courseId?: string;
  moduleId?: string;
  batchId?: string;
  createdById?: string;
  page?: number;
  limit?: number;
}

export interface CreateExamPayload {
  name: string;
  description?: string;
  instructions?: string;
  courseId?: string;
  moduleId?: string;
  branchId?: string;
  examTermMasterId?: string;
  durationMinutes: number;
  passingMarks?: number;
  attemptsAllowed?: number;
  examType?: 'ONLINE' | 'OFFLINE';
  negativeMarkingEnabled?: boolean;
  showResults?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  proctoringEnabled?: boolean;
  fullscreenRequired?: boolean;
  maxWarnings?: number;
}

export interface ScheduleExamPayload {
  startAt: string;
  endAt: string;
}

export interface AddQuestionPayload {
  questionId: string;
  displayOrder?: number;
  marksOverride?: number;
}

export interface AddQuestionBankPayload {
  questionBankId: string;
}

export interface ReorderQuestionsPayload {
  questions: Array<{ questionId: string; displayOrder: number }>;
}

// Exams
export const getExams = async (filters?: ExamFilters) => {
  const { data } = await api.get('/exams', { params: filters });
  return data;
};

export const getExamStats = async () => {
  const { data } = await api.get('/exams/stats');
  return data;
};

export const getExamById = async (id: string) => {
  const { data } = await api.get(`/exams/${id}`);
  return data;
};

export const createExam = async (payload: CreateExamPayload) => {
  const { data } = await api.post('/exams', payload);
  return data;
};

export const updateExam = async (id: string, payload: Partial<CreateExamPayload>) => {
  const { data } = await api.patch(`/exams/${id}`, payload);
  return data;
};

export const deleteExam = async (id: string) => {
  const { data } = await api.delete(`/exams/${id}`);
  return data;
};

export const publishExam = async (id: string) => {
  const { data } = await api.post(`/exams/${id}/publish`);
  return data;
};

export const scheduleExam = async (id: string, payload: ScheduleExamPayload) => {
  const { data } = await api.post(`/exams/${id}/schedule`, payload);
  return data;
};

export const archiveExam = async (id: string) => {
  const { data } = await api.post(`/exams/${id}/archive`);
  return data;
};

// Exam Questions
export const getExamQuestions = async (examId: string) => {
  const { data } = await api.get(`/exams/${examId}/questions`);
  return data;
};

export const addQuestionToExam = async (examId: string, payload: AddQuestionPayload) => {
  const { data } = await api.post(`/exams/${examId}/questions`, payload);
  return data;
};

export const addQuestionBankToExam = async (examId: string, payload: AddQuestionBankPayload) => {
  const { data } = await api.post(`/exams/${examId}/question-banks`, payload);
  return data;
};

export const removeQuestionFromExam = async (examId: string, questionId: string) => {
  const { data } = await api.delete(`/exams/${examId}/questions/${questionId}`);
  return data;
};

export const reorderExamQuestions = async (examId: string, payload: ReorderQuestionsPayload) => {
  const { data } = await api.patch(`/exams/${examId}/questions/reorder`, payload);
  return data;
};

// Exam Batches
export const getExamBatches = async (examId: string) => {
  const { data } = await api.get(`/exams/${examId}/batches`);
  return data;
};

export const assignBatchToExam = async (examId: string, batchId: string) => {
  const { data } = await api.post(`/exams/${examId}/batches`, { batchId });
  return data;
};

export const removeBatchFromExam = async (examId: string, batchId: string) => {
  const { data } = await api.delete(`/exams/${examId}/batches/${batchId}`);
  return data;
};

// Exam Students
export const getExamStudents = async (examId: string) => {
  const { data } = await api.get(`/exams/${examId}/students`);
  return data;
};

export const assignStudentsToExam = async (examId: string, studentIds: string[]) => {
  const { data } = await api.post(`/exams/${examId}/students`, { studentIds });
  return data;
};

export const removeStudentFromExam = async (examId: string, studentId: string) => {
  const { data } = await api.delete(`/exams/${examId}/students/${studentId}`);
  return data;
};
