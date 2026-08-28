import { prisma } from '../../config/database';
import { CreateQuestionBankDto, UpdateQuestionBankDto, QuestionBankQueryFilters } from './question-bank.types';

const qbInclude = {
  course: { select: { id: true, name: true, code: true } },
  branch: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { questions: true } },
};

export const findAllQuestionBanks = async (
  instituteId: string,
  branchId: string | undefined | null,
  filters: QuestionBankQueryFilters
) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { instituteId };

  if (branchId) {
    where.OR = [{ branchId }, { branchId: null }];
  }
  if (filters.status) where.status = filters.status;
  if (filters.courseId) where.courseId = filters.courseId;

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [banks, total] = await Promise.all([
    prisma.questionBank.findMany({
      where,
      include: qbInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.questionBank.count({ where }),
  ]);

  return { banks, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const findQuestionBankById = async (id: string, instituteId: string, withQuestions = false) => {
  return prisma.questionBank.findFirst({
    where: { id, instituteId },
    include: {
      ...qbInclude,
      ...(withQuestions ? {
        questions: {
          include: {
            options: { orderBy: { displayOrder: 'asc' as const } },
          },
          orderBy: { createdAt: 'desc' as const },
        },
      } : {}),
    },
  });
};

export const createQuestionBank = async (
  instituteId: string,
  branchId: string | null | undefined,
  createdById: string,
  data: CreateQuestionBankDto
) => {
  return prisma.questionBank.create({
    data: {
      instituteId,
      branchId: data.branchId || branchId || null,
      name: data.name,
      description: data.description,
      courseId: data.courseId || null,
      createdById,
    },
    include: qbInclude,
  });
};

export const updateQuestionBank = async (id: string, data: UpdateQuestionBankDto) => {
  return prisma.questionBank.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.courseId !== undefined && { courseId: data.courseId }),
      ...(data.status !== undefined && { status: data.status as any }),
    },
    include: qbInclude,
  });
};

export const deleteQuestionBank = async (id: string) => {
  return prisma.questionBank.delete({ where: { id } });
};
