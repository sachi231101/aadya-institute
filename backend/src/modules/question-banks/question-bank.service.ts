import * as repository from './question-bank.repository';
import { CreateQuestionBankDto, UpdateQuestionBankDto, QuestionBankQueryFilters } from './question-bank.types';
import { AppError } from '../../middlewares/error.middleware';

export const getQuestionBanks = async (
  instituteId: string,
  branchId: string | undefined | null,
  filters: QuestionBankQueryFilters
) => {
  return repository.findAllQuestionBanks(instituteId, branchId, filters);
};

export const getQuestionBankById = async (id: string, instituteId: string) => {
  const bank = await repository.findQuestionBankById(id, instituteId, true);
  if (!bank) throw new AppError('Question bank not found', 404);
  return bank;
};

export const createQuestionBank = async (
  instituteId: string,
  branchId: string | undefined | null,
  userId: string,
  data: CreateQuestionBankDto
) => {
  return repository.createQuestionBank(instituteId, branchId, userId, data);
};

export const updateQuestionBank = async (id: string, instituteId: string, data: UpdateQuestionBankDto) => {
  const existing = await repository.findQuestionBankById(id, instituteId);
  if (!existing) throw new AppError('Question bank not found', 404);
  return repository.updateQuestionBank(id, data);
};

export const deleteQuestionBank = async (id: string, instituteId: string) => {
  const existing = await repository.findQuestionBankById(id, instituteId, true) as any;
  if (!existing) throw new AppError('Question bank not found', 404);

  if (existing._count?.questions > 0) {
    throw new AppError(`Cannot delete a question bank that contains ${existing._count.questions} questions. Move or delete the questions first.`, 400);
  }

  return repository.deleteQuestionBank(id);
};
