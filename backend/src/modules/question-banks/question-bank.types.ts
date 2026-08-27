export type QuestionBankStatus = 'ACTIVE' | 'INACTIVE';

export interface CreateQuestionBankDto {
  name: string;
  description?: string;
  courseId?: string;
  branchId?: string;
  status?: QuestionBankStatus;
}

export interface UpdateQuestionBankDto {
  name?: string;
  description?: string;
  courseId?: string;
  status?: QuestionBankStatus;
}

export interface QuestionBankQueryFilters {
  search?: string;
  courseId?: string;
  status?: string;
  page?: number;
  limit?: number;
}
