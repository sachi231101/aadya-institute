import { prisma } from '../../config/database';
import { CreateExamDto, UpdateExamDto } from './exam.types';

const examInclude = {
  course: { select: { id: true, name: true, code: true } },
  module: { select: { id: true, name: true, code: true } },
  branch: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  batchAssignments: {
    include: {
      batch: { select: { id: true, name: true, code: true, course: { select: { id: true, name: true } } } },
    },
  },
  _count: {
    select: { examQuestions: true, batchAssignments: true, studentAssignments: true },
  },
};

const examWithQuestionsInclude = {
  ...examInclude,
  examQuestions: {
    orderBy: { displayOrder: 'asc' as const },
    include: {
      question: {
        include: {
          options: { orderBy: { displayOrder: 'asc' as const } },
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  },
};

export const findAllExams = async (
  instituteId: string,
  branchId: string | undefined | null,
  filters: {
    search?: string;
    status?: string;
    courseId?: string;
    moduleId?: string;
    batchId?: string;
    createdById?: string;
    page?: number;
    limit?: number;
  }
) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { instituteId };

  if (branchId) where.branchId = branchId;
  if (filters.status) where.status = filters.status;
  if (filters.courseId) where.courseId = filters.courseId;
  if (filters.moduleId) where.moduleId = filters.moduleId;
  if (filters.createdById) where.createdById = filters.createdById;

  if (filters.batchId) {
    where.batchAssignments = { some: { batchId: filters.batchId } };
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      include: examInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.exam.count({ where }),
  ]);

  return { exams, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const findExamById = async (id: string, instituteId: string) => {
  return prisma.exam.findFirst({
    where: { id, instituteId },
    include: examWithQuestionsInclude,
  });
};

export const createExam = async (
  instituteId: string,
  branchId: string | null | undefined,
  createdById: string,
  data: CreateExamDto
) => {
  return prisma.exam.create({
    data: {
      instituteId,
      branchId: data.branchId || branchId || null,
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      courseId: data.courseId || null,
      moduleId: data.moduleId || null,
      createdById,
      durationMinutes: data.durationMinutes,
      passingMarks: data.passingMarks || 0,
      attemptsAllowed: data.attemptsAllowed || 1,
      examType: (data.examType as any) || 'ONLINE',
      negativeMarkingEnabled: data.negativeMarkingEnabled ?? false,
      showResults: data.showResults ?? true,
      randomizeQuestions: data.randomizeQuestions ?? false,
      randomizeOptions: data.randomizeOptions ?? false,
      proctoringEnabled: data.proctoringEnabled ?? false,
      fullscreenRequired: data.fullscreenRequired ?? false,
      maxWarnings: data.maxWarnings ?? 3,
      examTermMasterId: data.examTermMasterId || null,
    },
    include: examInclude,
  });
};

export const updateExam = async (id: string, instituteId: string, data: UpdateExamDto) => {
  return prisma.exam.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.instructions !== undefined && { instructions: data.instructions }),
      ...(data.courseId !== undefined && { courseId: data.courseId || null }),
      ...(data.moduleId !== undefined && { moduleId: data.moduleId || null }),
      ...(data.branchId !== undefined && { branchId: data.branchId || null }),
      ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
      ...(data.passingMarks !== undefined && { passingMarks: data.passingMarks }),
      ...(data.attemptsAllowed !== undefined && { attemptsAllowed: data.attemptsAllowed }),
      ...(data.examType !== undefined && { examType: data.examType as any }),
      ...(data.negativeMarkingEnabled !== undefined && { negativeMarkingEnabled: data.negativeMarkingEnabled }),
      ...(data.showResults !== undefined && { showResults: data.showResults }),
      ...(data.randomizeQuestions !== undefined && { randomizeQuestions: data.randomizeQuestions }),
      ...(data.randomizeOptions !== undefined && { randomizeOptions: data.randomizeOptions }),
      ...(data.proctoringEnabled !== undefined && { proctoringEnabled: data.proctoringEnabled }),
      ...(data.fullscreenRequired !== undefined && { fullscreenRequired: data.fullscreenRequired }),
      ...(data.maxWarnings !== undefined && { maxWarnings: data.maxWarnings }),
      ...(data.examTermMasterId !== undefined && {
        examTermMasterId: data.examTermMasterId || null,
      }),
    },
    include: examInclude,
  });
};

export const updateExamStatus = async (id: string, status: string) => {
  return prisma.exam.update({
    where: { id },
    data: { status: status as any },
  });
};

export const scheduleExam = async (id: string, startAt: Date, endAt: Date) => {
  return prisma.exam.update({
    where: { id },
    data: { startAt, endAt, status: 'SCHEDULED' },
    include: examInclude,
  });
};

export const recalculateTotalMarks = async (examId: string) => {
  const examQuestions = await prisma.examQuestion.findMany({
    where: { examId },
    include: { question: { select: { marks: true } } },
  });

  const totalMarks = examQuestions.reduce((sum, eq) => {
    return sum + (eq.marksOverride ?? eq.question.marks);
  }, 0);

  await prisma.exam.update({
    where: { id: examId },
    data: { totalMarks },
  });

  return totalMarks;
};

export const addQuestionBankToExam = async (
  examId: string,
  questionBankId: string,
  instituteId: string
) => {
  const questions = await prisma.question.findMany({
    where: { questionBankId, instituteId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (questions.length === 0) {
    return { added: 0, skipped: 0, total: 0 };
  }

  const questionIds = questions.map((q) => q.id);
  const existing = await prisma.examQuestion.findMany({
    where: { examId, questionId: { in: questionIds } },
    select: { questionId: true },
  });
  const existingIds = new Set(existing.map((e) => e.questionId));
  const toAdd = questions.filter((q) => !existingIds.has(q.id));

  if (toAdd.length === 0) {
    return { added: 0, skipped: questions.length, total: questions.length };
  }

  const maxOrder = await prisma.examQuestion.aggregate({
    where: { examId },
    _max: { displayOrder: true },
  });
  let displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;

  await prisma.examQuestion.createMany({
    data: toAdd.map((q) => ({
      examId,
      questionId: q.id,
      displayOrder: displayOrder++,
    })),
  });

  await recalculateTotalMarks(examId);

  return {
    added: toAdd.length,
    skipped: existingIds.size,
    total: questions.length,
  };
};

export const addQuestionToExam = async (
  examId: string,
  questionId: string,
  displayOrder?: number,
  marksOverride?: number
) => {
  // Get max displayOrder if not provided
  if (displayOrder === undefined) {
    const maxOrder = await prisma.examQuestion.aggregate({
      where: { examId },
      _max: { displayOrder: true },
    });
    displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
  }

  return prisma.examQuestion.create({
    data: {
      examId,
      questionId,
      displayOrder,
      marksOverride: marksOverride ?? null,
    },
    include: {
      question: {
        include: { options: { orderBy: { displayOrder: 'asc' as const } } },
      },
    },
  });
};

export const removeQuestionFromExam = async (examId: string, questionId: string) => {
  return prisma.examQuestion.deleteMany({
    where: { examId, questionId },
  });
};

export const reorderExamQuestions = async (
  examId: string,
  questions: Array<{ questionId: string; displayOrder: number }>
) => {
  await Promise.all(
    questions.map((q) =>
      prisma.examQuestion.updateMany({
        where: { examId, questionId: q.questionId },
        data: { displayOrder: q.displayOrder },
      })
    )
  );
};

export const getExamQuestions = async (examId: string) => {
  return prisma.examQuestion.findMany({
    where: { examId },
    orderBy: { displayOrder: 'asc' },
    include: {
      question: {
        include: {
          options: { orderBy: { displayOrder: 'asc' as const } },
          createdBy: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
          module: { select: { id: true, name: true } },
        },
      },
    },
  });
};

export const assignBatchToExam = async (examId: string, batchId: string) => {
  return prisma.examBatch.create({
    data: { examId, batchId },
    include: {
      batch: { select: { id: true, name: true, code: true } },
    },
  });
};

export const removeBatchFromExam = async (examId: string, batchId: string) => {
  return prisma.examBatch.deleteMany({
    where: { examId, batchId },
  });
};

export const getExamBatches = async (examId: string) => {
  return prisma.examBatch.findMany({
    where: { examId },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          course: { select: { id: true, name: true } },
          _count: { select: { enrollments: true } },
        },
      },
    },
  });
};

export const assignStudentsToExam = async (examId: string, studentIds: string[]) => {
  const result = await prisma.examStudent.createMany({
    data: studentIds.map((studentId) => ({ examId, studentId })),
    skipDuplicates: true,
  });
  return result.count;
};

export const removeStudentFromExam = async (examId: string, studentId: string) => {
  return prisma.examStudent.deleteMany({
    where: { examId, studentId },
  });
};

export const getExamStudents = async (examId: string) => {
  return prisma.examStudent.findMany({
    where: { examId },
    orderBy: { assignedAt: 'desc' },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          status: true,
          branch: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true, email: true, phone: true } },
          batchEnrollments: {
            where: { status: 'ACTIVE' },
            select: {
              batch: { select: { id: true, name: true, code: true } },
            },
          },
        },
      },
    },
  });
};

export const deleteExam = async (id: string, instituteId: string) => {
  return prisma.exam.delete({ where: { id } });
};

export const getExamStats = async (instituteId: string, branchId?: string | null) => {
  const where: Record<string, unknown> = { instituteId };
  if (branchId) where.branchId = branchId;

  const stats = await prisma.exam.groupBy({
    by: ['status'],
    where,
    _count: { status: true },
  });

  const result: Record<string, number> = {
    DRAFT: 0,
    PUBLISHED: 0,
    SCHEDULED: 0,
    LIVE: 0,
    ENDED: 0,
    COMPLETED: 0,
    ARCHIVED: 0,
    CANCELLED: 0,
  };

  stats.forEach((s) => {
    result[s.status] = s._count.status;
  });

  const total = Object.values(result).reduce((sum, v) => sum + v, 0);
  return { total, ...result };
};
