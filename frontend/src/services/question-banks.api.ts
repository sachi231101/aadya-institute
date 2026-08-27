import { api } from './api';

export interface QuestionBankFilters {
  search?: string;
  courseId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateQuestionBankPayload {
  name: string;
  description?: string;
  courseId?: string;
  branchId?: string;
}

export const getQuestionBanks = async (filters?: QuestionBankFilters) => {
  const { data } = await api.get('/question-banks', { params: filters });
  return data;
};

export const getQuestionBankById = async (id: string) => {
  const { data } = await api.get(`/question-banks/${id}`);
  return data;
};

export const createQuestionBank = async (payload: CreateQuestionBankPayload) => {
  const { data } = await api.post('/question-banks', payload);
  return data;
};

export const updateQuestionBank = async (id: string, payload: Partial<CreateQuestionBankPayload> & { status?: string }) => {
  const { data } = await api.patch(`/question-banks/${id}`, payload);
  return data;
};

export const deleteQuestionBank = async (id: string) => {
  const { data } = await api.delete(`/question-banks/${id}`);
  return data;
};
