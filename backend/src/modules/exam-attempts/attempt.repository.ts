import { prisma } from '../../config/database';
import { AttemptStatus, Prisma, ProctoringEventType } from '@prisma/client';
import { AttemptFilters, RecordProctoringEventDto, SaveAnswerDto } from './attempt.types';

const attemptInclude = {
  exam: {
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      totalMarks: true,
      passingMarks: true,
      proctoringEnabled: true,
      fullscreenRequired: true,
      maxWarnings: true,
      tabSwitchDetection: true,
      windowBlurDetection: true,
      fullscreenExitDetection: true,
      keyboardShortcutDetection: true,
      copyPasteDetection: true,
      rightClickDetection: true,
      networkGracePeriodSeconds: true,
      autoTerminateOnMaxViolations: true,
      showResults: true,
      course: { select: { id: true, name: true, code: true } },
    },
  },
  student: {
    select: {
      id: true,
      studentCode: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  },
  answers: {
    select: {
      id: true,
      questionId: true,
      selectedOptionIds: true,
      textAnswer: true,
      numericalAnswer: true,
      isFlagged: true,
      savedAt: true,
    },
  },
  proctoringEvents: {
    orderBy: { occurredAt: 'asc' as const },
    select: {
      id: true,
      eventType: true,
      clientEventId: true,
      occurredAt: true,
      receivedAt: true,
      metadata: true,
      sequenceNumber: true,
      isCountedViolation: true,
      warningNumber: true,
    },
  },
};

export const findStudentByUserId = async (userId: string, instituteId: string) => {
  return prisma.student.findFirst({
    where: { userId, instituteId },
    include: {
      batchEnrollments: {
        where: { status: 'ACTIVE' },
        select: { batchId: true },
      },
    },
  });
};

export const findExamForStudent = async (
  examId: string,
  instituteId: string,
  studentId: string,
  batchIds: string[]
) => {
  const accessOr: Record<string, unknown>[] = [
    { studentAssignments: { some: { studentId } } },
  ];
  if (batchIds.length > 0) {
    accessOr.unshift({ batchAssignments: { some: { batchId: { in: batchIds } } } });
  }

  return prisma.exam.findFirst({
    where: {
      id: examId,
      instituteId,
      status: { in: ['PUBLISHED', 'SCHEDULED', 'LIVE'] },
      OR: accessOr,
    },
    include: {
      course: { select: { id: true, name: true } },
      module: { select: { id: true, name: true } },
      examQuestions: {
        orderBy: { displayOrder: 'asc' },
        include: {
          question: {
            include: {
              options: {
                orderBy: { displayOrder: 'asc' },
                select: { id: true, optionText: true, displayOrder: true },
              },
            },
          },
        },
      },
    },
  });
};

/** Metadata only for instructions/consent (no question payloads). */
export const findExamMetaForStudent = async (
  examId: string,
  instituteId: string,
  studentId: string | null,
  batchIds: string[] | null
) => {
  let accessFilter: Record<string, unknown> = {};
  if (studentId) {
    const accessOr: Record<string, unknown>[] = [
      { studentAssignments: { some: { studentId } } },
    ];
    if (batchIds && batchIds.length > 0) {
      accessOr.unshift({ batchAssignments: { some: { batchId: { in: batchIds } } } });
    }
    accessFilter = { OR: accessOr };
  } else if (batchIds) {
    accessFilter = {
      batchAssignments: {
        some: { batchId: { in: batchIds } },
      },
    };
  }

  return prisma.exam.findFirst({
    where: {
      id: examId,
      instituteId,
      status: batchIds || studentId
        ? { in: ['PUBLISHED', 'SCHEDULED', 'LIVE'] }
        : { in: ['PUBLISHED', 'SCHEDULED', 'LIVE', 'DRAFT'] },
      ...accessFilter,
    },
    select: {
      id: true,
      name: true,
      description: true,
      instructions: true,
      durationMinutes: true,
      totalMarks: true,
      passingMarks: true,
      attemptsAllowed: true,
      examType: true,
      negativeMarkingEnabled: true,
      proctoringEnabled: true,
      fullscreenRequired: true,
      maxWarnings: true,
      tabSwitchDetection: true,
      windowBlurDetection: true,
      fullscreenExitDetection: true,
      keyboardShortcutDetection: true,
      copyPasteDetection: true,
      rightClickDetection: true,
      networkGracePeriodSeconds: true,
      autoTerminateOnMaxViolations: true,
      course: { select: { id: true, name: true } },
      module: { select: { id: true, name: true } },
      _count: { select: { examQuestions: true } },
    },
  });
};

export const findAttemptById = async (attemptId: string, instituteId: string) => {
  return prisma.examAttempt.findFirst({
    where: { id: attemptId, instituteId },
    include: attemptInclude,
  });
};

/** Lightweight ownership / timer check for autosave & proctoring (no answers/timeline). */
export const findAttemptLean = async (attemptId: string, instituteId: string) => {
  return prisma.examAttempt.findFirst({
    where: { id: attemptId, instituteId },
    select: {
      id: true,
      userId: true,
      examId: true,
      status: true,
      expiresAt: true,
      violationCount: true,
      warningCount: true,
      maxViolations: true,
      terminationReason: true,
      exam: {
        select: {
          autoTerminateOnMaxViolations: true,
        },
      },
    },
  });
};

export const upsertExamAnswersBatch = async (attemptId: string, answers: SaveAnswerDto[]) => {
  await prisma.$transaction(
    answers.map((answer) =>
      prisma.examAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: answer.questionId,
          },
        },
        update: {
          selectedOptionIds: answer.selectedOptionIds ? (answer.selectedOptionIds as any) : undefined,
          textAnswer: answer.textAnswer ?? undefined,
          numericalAnswer: answer.numericalAnswer ?? undefined,
          isFlagged: answer.isFlagged ?? false,
          savedAt: new Date(),
        },
        create: {
          attemptId,
          questionId: answer.questionId,
          selectedOptionIds: answer.selectedOptionIds ? (answer.selectedOptionIds as any) : undefined,
          textAnswer: answer.textAnswer ?? null,
          numericalAnswer: answer.numericalAnswer ?? null,
          isFlagged: answer.isFlagged ?? false,
        },
      })
    )
  );
};

export const findActiveAttempt = async (examId: string, studentId: string) => {
  return prisma.examAttempt.findFirst({
    where: {
      examId,
      studentId,
      status: { in: ['IN_PROGRESS', 'NOT_STARTED'] },
    },
    include: attemptInclude,
  });
};

export const countStudentAttempts = async (examId: string, studentId: string) => {
  return prisma.examAttempt.count({
    where: { examId, studentId },
  });
};

export const createExamAttempt = async (data: {
  instituteId: string;
  branchId?: string | null;
  examId: string;
  studentId: string;
  userId: string;
  attemptNumber: number;
  startedAt: Date;
  expiresAt: Date;
  proctoringEnabled: boolean;
  maxViolations: number;
  totalMarks: number;
}) => {
  return prisma.examAttempt.create({
    data: {
      instituteId: data.instituteId,
      branchId: data.branchId || null,
      examId: data.examId,
      studentId: data.studentId,
      userId: data.userId,
      attemptNumber: data.attemptNumber,
      status: 'IN_PROGRESS',
      startedAt: data.startedAt,
      expiresAt: data.expiresAt,
      proctoringEnabled: data.proctoringEnabled,
      maxViolations: data.maxViolations,
      totalMarks: data.totalMarks,
      violationCount: 0,
      warningCount: 0,
    },
    include: attemptInclude,
  });
};

export const upsertExamAnswer = async (attemptId: string, answer: SaveAnswerDto) => {
  return prisma.examAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId: answer.questionId,
      },
    },
    update: {
      selectedOptionIds: answer.selectedOptionIds ? (answer.selectedOptionIds as any) : undefined,
      textAnswer: answer.textAnswer ?? undefined,
      numericalAnswer: answer.numericalAnswer ?? undefined,
      isFlagged: answer.isFlagged ?? false,
      savedAt: new Date(),
    },
    create: {
      attemptId,
      questionId: answer.questionId,
      selectedOptionIds: answer.selectedOptionIds ? (answer.selectedOptionIds as any) : undefined,
      textAnswer: answer.textAnswer ?? null,
      numericalAnswer: answer.numericalAnswer ?? null,
      isFlagged: answer.isFlagged ?? false,
    },
  });
};

/**
 * Atomic Server-Authoritative Proctoring Event Processing
 * Guaranteed race-condition protection via database transaction.
 * Implements 5-second sliding debounce to suppress clustered browser events.
 */
export const recordProctoringEventAtomic = async (
  attemptId: string,
  instituteId: string,
  eventData: RecordProctoringEventDto,
  autoTerminate: boolean
) => {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.examAttempt.findFirst({
      where: { id: attemptId, instituteId },
    });

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return {
        attempt,
        event: null,
        isDebounced: false,
        isTerminated: attempt.status === 'TERMINATED',
      };
    }

    // Check idempotency if clientEventId provided
    if (eventData.clientEventId) {
      const existingEvent = await tx.examProctoringEvent.findFirst({
        where: {
          attemptId,
          clientEventId: eventData.clientEventId,
        },
      });
      if (existingEvent) {
        return {
          attempt,
          event: existingEvent,
          isDebounced: true,
          isTerminated: false,
        };
      }
    }

    // Check sliding debounce: if last event occurred within 5 seconds (5000ms), suppress duplicate violation count
    const occurredDate = new Date(eventData.occurredAt);
    let isCountedViolation = true;

    if (attempt.lastProctoringEventAt) {
      const diffMs = Math.abs(occurredDate.getTime() - new Date(attempt.lastProctoringEventAt).getTime());
      if (diffMs < 5000) {
        // Debounce clustered events like visibilitychange + blur
        isCountedViolation = false;
      }
    }

    const nextViolationCount = isCountedViolation
      ? attempt.violationCount + 1
      : attempt.violationCount;

    const nextWarningCount = isCountedViolation
      ? Math.min(nextViolationCount, attempt.maxViolations)
      : attempt.warningCount;

    const shouldTerminate = autoTerminate && nextViolationCount >= attempt.maxViolations;
    const newStatus: AttemptStatus = shouldTerminate ? 'TERMINATED' : 'IN_PROGRESS';
    const now = new Date();

    // Update Attempt atomically
    const updatedAttempt = await tx.examAttempt.update({
      where: { id: attemptId },
      data: {
        violationCount: nextViolationCount,
        warningCount: nextWarningCount,
        lastProctoringEventAt: occurredDate,
        status: newStatus,
        ...(shouldTerminate && {
          terminatedAt: now,
          terminationReason: 'MAX_PROCTORING_VIOLATIONS',
        }),
      },
      include: attemptInclude,
    });

    // Create Proctoring Event
    const countEvents = await tx.examProctoringEvent.count({ where: { attemptId } });
    const event = await tx.examProctoringEvent.create({
      data: {
        attemptId,
        instituteId,
        eventType: eventData.eventType as ProctoringEventType,
        clientEventId: eventData.clientEventId || null,
        occurredAt: occurredDate,
        receivedAt: now,
        metadata: eventData.metadata ? (eventData.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        sequenceNumber: countEvents + 1,
        isCountedViolation,
        warningNumber: isCountedViolation ? nextWarningCount : null,
      },
    });

    return {
      attempt: updatedAttempt,
      event,
      isDebounced: !isCountedViolation,
      isTerminated: shouldTerminate,
    };
  });
};

export const updateAttemptStatus = async (
  attemptId: string,
  instituteId: string,
  data: {
    status: AttemptStatus;
    submittedAt?: Date;
    terminatedAt?: Date;
    terminationReason?: string;
    score?: number;
    totalMarks?: number;
    percentage?: number;
    passed?: boolean;
    feedback?: string;
  }
) => {
  return prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      status: data.status,
      submittedAt: data.submittedAt,
      terminatedAt: data.terminatedAt,
      terminationReason: data.terminationReason,
      score: data.score,
      totalMarks: data.totalMarks,
      percentage: data.percentage,
      passed: data.passed,
      feedback: data.feedback,
    },
    include: attemptInclude,
  });
};

export const findAttemptsForExam = async (
  examId: string,
  instituteId: string,
  branchId: string | undefined | null,
  filters: AttemptFilters = {}
) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.ExamAttemptWhereInput = {
    examId,
    instituteId,
    ...(branchId && { branchId }),
    ...(filters.status && { status: filters.status }),
    ...(filters.search && {
      OR: [
        { student: { studentCode: { contains: filters.search, mode: 'insensitive' } } },
        { student: { user: { name: { contains: filters.search, mode: 'insensitive' } } } },
        { student: { user: { email: { contains: filters.search, mode: 'insensitive' } } } },
      ],
    }),
  };

  const [attempts, total] = await Promise.all([
    prisma.examAttempt.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        _count: {
          select: { proctoringEvents: true, answers: true },
        },
      },
    }),
    prisma.examAttempt.count({ where }),
  ]);

  return { attempts, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const findStudentAvailableExams = async (
  instituteId: string,
  studentId: string,
  batchIds: string[]
) => {
  const accessOr: Record<string, unknown>[] = [
    { studentAssignments: { some: { studentId } } },
  ];
  if (batchIds.length > 0) {
    accessOr.unshift({ batchAssignments: { some: { batchId: { in: batchIds } } } });
  }

  const exams = await prisma.exam.findMany({
    where: {
      instituteId,
      status: { in: ['PUBLISHED', 'SCHEDULED', 'LIVE'] },
      OR: accessOr,
    },
    include: {
      course: { select: { id: true, name: true, code: true } },
      module: { select: { id: true, name: true } },
      _count: { select: { examQuestions: true } },
      attempts: {
        where: { studentId },
        orderBy: { attemptNumber: 'desc' },
        select: {
          id: true,
          status: true,
          attemptNumber: true,
          score: true,
          totalMarks: true,
          passed: true,
          startedAt: true,
          submittedAt: true,
          terminatedAt: true,
          terminationReason: true,
          violationCount: true,
          warningCount: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return exams;
};
