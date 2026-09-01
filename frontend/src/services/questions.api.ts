import { api } from './api';

export interface QuestionFilters {
  search?: string;
  questionType?: string;
  difficulty?: string;
  status?: string;
  questionBankId?: string;
  courseId?: string;
  moduleId?: string;
  page?: number;
  limit?: number;
}

export interface QuestionOptionPayload {
  optionText: string;
  isCorrect: boolean;
  displayOrder?: number;
}

export interface CreateQuestionPayload {
  questionType: 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'NUMERICAL' | 'FILL_BLANK';
  questionText: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  marks?: number;
  negativeMarks?: number;
  explanation?: string;
  questionBankId?: string;
  courseId?: string;
  moduleId?: string;
  branchId?: string;
  options?: QuestionOptionPayload[];
}

export const getQuestions = async (filters?: QuestionFilters) => {
  const { data } = await api.get('/questions', { params: filters });
  return data;
};

export const getQuestionById = async (id: string) => {
  const { data } = await api.get(`/questions/${id}`);
  return data;
};

export const createQuestion = async (payload: CreateQuestionPayload) => {
  const { data } = await api.post('/questions', payload);
  return data;
};

export const createBulkQuestions = async (payload: { questions: CreateQuestionPayload[] } | CreateQuestionPayload[]) => {
  const body = Array.isArray(payload) ? { questions: payload } : payload;
  const { data } = await api.post('/questions/bulk', body);
  return data;
};

export const updateQuestion = async (id: string, payload: Partial<CreateQuestionPayload>) => {
  const { data } = await api.patch(`/questions/${id}`, payload);
  return data;
};

export const deleteQuestion = async (id: string) => {
  const { data } = await api.delete(`/questions/${id}`);
  return data;
};
