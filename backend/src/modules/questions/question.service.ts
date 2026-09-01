import * as repository from './question.repository';
import { CreateQuestionDto, UpdateQuestionDto, QuestionQueryFilters } from './question.types';
import { AppError } from '../../middlewares/error.middleware';

export const getQuestions = async (
  instituteId: string,
  branchId: string | undefined | null,
  filters: QuestionQueryFilters
) => {
  return repository.findAllQuestions(instituteId, branchId, filters);
};

export const getQuestionById = async (id: string, instituteId: string) => {
  const question = await repository.findQuestionById(id, instituteId);
  if (!question) throw new AppError('Question not found', 404);
  return question;
};

export const createQuestion = async (
  instituteId: string,
  branchId: string | undefined | null,
  userId: string,
  data: CreateQuestionDto
) => {
  return repository.createQuestion(instituteId, branchId, userId, data);
};

export const createBulkQuestions = async (
  instituteId: string,
  branchId: string | undefined | null,
  userId: string,
  data: CreateQuestionDto[]
) => {
  return repository.createBulkQuestions(instituteId, branchId, userId, data);
};

export const updateQuestion = async (
  id: string,
  instituteId: string,
  data: UpdateQuestionDto
) => {
  const existing = await getQuestionById(id, instituteId);

  if (existing.status === 'INACTIVE') {
    // Allow reactivation but not other changes while inactive
  }

  return repository.updateQuestion(id, data);
};

export const deleteQuestion = async (id: string, instituteId: string) => {
  const existing = await getQuestionById(id, instituteId);

  // Prevent deleting questions that are used in exams
  if ((existing as any)._count?.examQuestions > 0) {
    throw new AppError('Cannot delete a question that is used in one or more exams. Remove it from exams first.', 400);
  }

  return repository.deleteQuestion(id);
};
