import { prisma } from '../../config/database';
import { CreateQuestionDto, UpdateQuestionDto, QuestionQueryFilters } from './question.types';

const questionInclude = {
  options: { orderBy: { displayOrder: 'asc' as const } },
  questionBank: { select: { id: true, name: true } },
  course: { select: { id: true, name: true, code: true } },
  module: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { examQuestions: true } },
};

export const findAllQuestions = async (
  instituteId: string,
  branchId: string | undefined | null,
  filters: QuestionQueryFilters
) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { instituteId };

  if (branchId) {
    where.OR = [{ branchId }, { branchId: null }];
  }
  if (filters.questionType) where.questionType = filters.questionType;
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.status) where.status = filters.status;
  if (filters.questionBankId) where.questionBankId = filters.questionBankId;
  if (filters.courseId) where.courseId = filters.courseId;
  if (filters.moduleId) where.moduleId = filters.moduleId;

  if (filters.search) {
    where.questionText = { contains: filters.search, mode: 'insensitive' };
  }

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: questionInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  return { questions, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const findQuestionById = async (id: string, instituteId: string) => {
  return prisma.question.findFirst({
    where: { id, instituteId },
    include: questionInclude,
  });
};

export const createQuestion = async (
  instituteId: string,
  branchId: string | null | undefined,
  createdById: string,
  data: CreateQuestionDto
) => {
  return prisma.question.create({
    data: {
      instituteId,
      branchId: data.branchId || branchId || null,
      questionBankId: data.questionBankId || null,
      courseId: data.courseId || null,
      moduleId: data.moduleId || null,
      createdById,
      questionType: data.questionType as any,
      questionText: data.questionText,
      difficulty: (data.difficulty as any) || 'MEDIUM',
      marks: data.marks || 1,
      negativeMarks: data.negativeMarks || 0,
      explanation: data.explanation,
      options: data.options ? {
        create: data.options.map((opt, i) => ({
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
          displayOrder: opt.displayOrder ?? i,
        })),
      } : undefined,
    },
    include: questionInclude,
  });
};

export const createBulkQuestions = async (
  instituteId: string,
  branchId: string | null | undefined,
  createdById: string,
  data: CreateQuestionDto[]
) => {
  return prisma.$transaction(async (tx) => {
    const createdQuestions = [];
    for (const item of data) {
      const q = await tx.question.create({
        data: {
          instituteId,
          branchId: item.branchId || branchId || null,
          questionBankId: item.questionBankId || null,
          courseId: item.courseId || null,
          moduleId: item.moduleId || null,
          createdById,
          questionType: item.questionType as any,
          questionText: item.questionText,
          difficulty: (item.difficulty as any) || 'MEDIUM',
          marks: item.marks || 1,
          negativeMarks: item.negativeMarks || 0,
          explanation: item.explanation || null,
          options: item.options ? {
            create: item.options.map((opt, i) => ({
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              displayOrder: opt.displayOrder ?? i,
            })),
          } : undefined,
        },
        include: questionInclude,
      });
      createdQuestions.push(q);
    }
    return createdQuestions;
  });
};

export const updateQuestion = async (id: string, data: UpdateQuestionDto) => {
  return prisma.$transaction(async (tx) => {
    // Replace options if provided
    if (data.options !== undefined) {
      await tx.questionOption.deleteMany({ where: { questionId: id } });
      if (data.options.length > 0) {
        await tx.questionOption.createMany({
          data: data.options.map((opt, i) => ({
            questionId: id,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            displayOrder: opt.displayOrder ?? i,
          })),
        });
      }
    }

    return tx.question.update({
      where: { id },
      data: {
        ...(data.questionType !== undefined && { questionType: data.questionType as any }),
        ...(data.questionText !== undefined && { questionText: data.questionText }),
        ...(data.difficulty !== undefined && { difficulty: data.difficulty as any }),
        ...(data.marks !== undefined && { marks: data.marks }),
        ...(data.negativeMarks !== undefined && { negativeMarks: data.negativeMarks }),
        ...(data.explanation !== undefined && { explanation: data.explanation || null }),
        ...(data.questionBankId !== undefined && { questionBankId: data.questionBankId || null }),
        ...(data.courseId !== undefined && { courseId: data.courseId || null }),
        ...(data.moduleId !== undefined && { moduleId: data.moduleId || null }),
        ...(data.status !== undefined && { status: data.status as any }),
      },
      include: questionInclude,
    });
  });
};

export const deleteQuestion = async (id: string) => {
  return prisma.question.delete({ where: { id } });
};
