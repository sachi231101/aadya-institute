import * as repository from './attempt.repository';
import { BatchSaveAnswersDto, RecordProctoringEventDto, StartExamDto } from './attempt.types';
import { AppError } from '../../middlewares/error.middleware';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { broadcastToUser } from '../../websocket/ws.server';
import { cacheGet, cacheSet, cacheDel } from '../../config/cache';
import { enqueueExamGrading } from '../../queues/exam-grading.queue';
import { env } from '../../config/env';
import { gradeExamAttempt } from './attempt.grading';

// ─── Activity Log Helper ──────────────────────────────────────────────────────
const logActivity = async (
  userId: string,
  instituteId: string,
  action: string,
  entityId: string,
  oldData?: unknown,
  newData?: unknown
) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        instituteId,
        action,
        entityType: 'ExamAttempt',
        entityId,
        oldData: oldData as any,
        newData: newData as any,
      },
    });
  } catch (err) {
    logger.error({ err, action, entityId }, '[attempt.service] Failed to write activity log');
  }
};

// ─── Student Available Exams ──────────────────────────────────────────────────
export const getStudentAvailableExams = async (userId: string, instituteId: string) => {
  const student = await repository.findStudentByUserId(userId, instituteId);
  if (!student) {
    // If user is Admin or staff previewing the student portal, return published exams
    return prisma.exam.findMany({
      where: {
        instituteId,
        status: { in: ['PUBLISHED', 'SCHEDULED', 'LIVE'] },
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
        module: { select: { id: true, name: true } },
        _count: { select: { examQuestions: true } },
        attempts: {
          where: { userId },
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
  }

  const batchIds = student.batchEnrollments.map((be) => be.batchId);
  const exams = await repository.findStudentAvailableExams(instituteId, student.id, batchIds);
  return exams;
};

// ─── Student Exam Instructions & Consent ──────────────────────────────────────
export const getExamInstructions = async (examId: string, userId: string, instituteId: string) => {
  const student = await repository.findStudentByUserId(userId, instituteId);
  let exam: any;
  let pastAttempts: any[] = [];

  if (!student) {
    exam = await repository.findExamMetaForStudent(examId, instituteId, null, null);
    pastAttempts = await prisma.examAttempt.findMany({
      where: { examId, userId },
      orderBy: { attemptNumber: 'desc' },
      select: {
        id: true,
        status: true,
        attemptNumber: true,
        startedAt: true,
        submittedAt: true,
        terminatedAt: true,
        terminationReason: true,
        score: true,
        totalMarks: true,
        passed: true,
        violationCount: true,
      },
    });
  } else {
    const batchIds = student.batchEnrollments.map((be) => be.batchId);
    exam = await repository.findExamMetaForStudent(examId, instituteId, student.id, batchIds);
    if (exam) {
      pastAttempts = await prisma.examAttempt.findMany({
        where: { examId, studentId: student.id },
        orderBy: { attemptNumber: 'desc' },
        select: {
          id: true,
          status: true,
          attemptNumber: true,
          startedAt: true,
          submittedAt: true,
          terminatedAt: true,
          terminationReason: true,
          score: true,
          totalMarks: true,
          passed: true,
          violationCount: true,
        },
      });
    }
  }

  if (!exam) {
    throw new AppError('Examination not found or you are not assigned to this exam', 403);
  }

  const activeAttempt = pastAttempts.find((a) => a.status === 'IN_PROGRESS');

  return {
    exam: {
      id: exam.id,
      name: exam.name,
      description: exam.description,
      instructions: exam.instructions,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      attemptsAllowed: exam.attemptsAllowed,
      examType: exam.examType,
      negativeMarkingEnabled: exam.negativeMarkingEnabled,
      questionCount: exam._count?.examQuestions ?? 0,
      course: exam.course,
      module: exam.module,
      proctoringEnabled: exam.proctoringEnabled,
      fullscreenRequired: exam.fullscreenRequired,
      maxWarnings: exam.maxWarnings,
      tabSwitchDetection: exam.tabSwitchDetection,
      windowBlurDetection: exam.windowBlurDetection,
      fullscreenExitDetection: exam.fullscreenExitDetection,
      keyboardShortcutDetection: exam.keyboardShortcutDetection,
      copyPasteDetection: exam.copyPasteDetection,
      rightClickDetection: exam.rightClickDetection,
      networkGracePeriodSeconds: exam.networkGracePeriodSeconds,
      autoTerminateOnMaxViolations: exam.autoTerminateOnMaxViolations,
    },
    attemptsUsed: pastAttempts.length,
    attemptsRemaining: Math.max(0, exam.attemptsAllowed - pastAttempts.length),
    canStartNewAttempt: pastAttempts.length < exam.attemptsAllowed && !activeAttempt,
    activeAttemptId: activeAttempt?.id || null,
    pastAttempts,
  };
};

// ─── Start Exam Attempt ───────────────────────────────────────────────────────
export const startExamAttempt = async (
  examId: string,
  userId: string,
  instituteId: string,
  dto: StartExamDto
) => {
  let student = await repository.findStudentByUserId(userId, instituteId);
  if (!student) {
    const branch = await prisma.branch.findFirst({ where: { instituteId } });
    if (branch) {
      student = await prisma.student.create({
        data: {
          instituteId,
          branchId: branch.id,
          studentCode: `STAFF-${userId.substring(0, 8)}`,
          userId,
          status: 'ACTIVE',
        },
        include: {
          batchEnrollments: {
            where: { status: 'ACTIVE' },
            select: { batchId: true },
          },
        },
      });
    }
  }

  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const batchIds = student.batchEnrollments.map((be) => be.batchId);
  let exam = await repository.findExamForStudent(examId, instituteId, student.id, batchIds);
  if (!exam) {
    // If staff preview, find directly by examId & instituteId
    exam = await prisma.exam.findFirst({
      where: { id: examId, instituteId },
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
                },
              },
            },
          },
        },
      },
    });
  }

  if (!exam) {
    throw new AppError('Examination not found or you are not authorized for this exam', 403);
  }

  // Check existing active attempt
  const existingActive = await repository.findActiveAttempt(examId, student.id);
  if (existingActive) {
    // Resume existing attempt if within timer
    const now = new Date();
    if (existingActive.expiresAt && now > new Date(existingActive.expiresAt)) {
      // Auto-submit expired attempt
      await submitExam(existingActive.id, userId, instituteId);
    } else {
      const sanitizedQuestions = formatSanitizedQuestions(exam, existingActive.id);
      return {
        isResumed: true,
        attempt: existingActive,
        questions: sanitizedQuestions,
        serverTime: now.toISOString(),
      };
    }
  }

  // Check attempt limit
  const count = await repository.countStudentAttempts(examId, student.id);
  if (count >= exam.attemptsAllowed) {
    throw new AppError(`Maximum attempts (${exam.attemptsAllowed}) reached for this examination`, 403);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);

  const attempt = await repository.createExamAttempt({
    instituteId,
    branchId: student.branchId,
    examId: exam.id,
    studentId: student.id,
    userId,
    attemptNumber: count + 1,
    startedAt: now,
    expiresAt,
    proctoringEnabled: exam.proctoringEnabled,
    maxViolations: exam.maxWarnings,
    totalMarks: exam.totalMarks,
  });

  await logActivity(userId, instituteId, 'EXAM_STARTED', attempt.id, null, {
    examId: exam.id,
    attemptNumber: attempt.attemptNumber,
    deviceInfo: dto.clientDeviceInfo,
  });

  const sanitizedQuestions = formatSanitizedQuestions(exam, attempt.id);

  return {
    isResumed: false,
    attempt,
    questions: sanitizedQuestions,
    serverTime: now.toISOString(),
  };
};

// ─── Helper: Format & Sanitize Questions for Student View ─────────────────────
const formatSanitizedQuestions = (exam: any, attemptId: string) => {
  let questions = exam.examQuestions.map((eq: any, index: number) => {
    let options = eq.question.options?.map((opt: any, optIdx: number) => ({
      id: opt.id,
      optionText: opt.optionText,
      displayOrder: opt.displayOrder ?? optIdx,
    })) || [];

    if (exam.randomizeOptions && options.length > 1) {
      // Deterministic shuffle per attempt/question
      options = [...options].sort(() => 0.5 - Math.random());
    }

    return {
      id: eq.question.id,
      questionText: eq.question.questionText,
      questionType: eq.question.questionType,
      marks: eq.marksOverride ?? eq.question.marks,
      negativeMarks: eq.question.negativeMarks,
      displayOrder: eq.displayOrder ?? index,
      options,
    };
  });

  if (exam.randomizeQuestions && questions.length > 1) {
    questions = [...questions].sort(() => 0.5 - Math.random());
  }

  return questions;
};

/** Attach sanitized exam questions to an in-progress attempt for the Take Exam UI. */
const attachSanitizedExamQuestions = async (attempt: any, instituteId: string) => {
  const cacheKey = `exam-paper:${attempt.examId}`;
  let examWithQuestions = await cacheGet<any>(cacheKey);

  if (!examWithQuestions) {
    examWithQuestions = await prisma.exam.findFirst({
      where: { id: attempt.examId, instituteId },
      include: {
        examQuestions: {
          orderBy: { displayOrder: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { displayOrder: 'asc' } },
              },
            },
          },
        },
      },
    });
    if (examWithQuestions) {
      await cacheSet(cacheKey, examWithQuestions, 300);
    }
  }

  if (!examWithQuestions) return attempt;

  const sanitized = formatSanitizedQuestions(examWithQuestions, attempt.id);
  attempt.exam = {
    ...attempt.exam,
    examQuestions: sanitized.map((q: (typeof sanitized)[number], index: number) => ({
      questionId: q.id,
      displayOrder: q.displayOrder ?? index,
      marksOverride: q.marks,
      question: {
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        options: q.options,
      },
    })),
  };

  return attempt;
};

export const invalidateExamPaperCache = async (examId: string) => {
  await cacheDel(`exam-paper:${examId}`);
};

// ─── Get Attempt Details & Active State ────────────────────────────────────────
export const getAttemptDetails = async (
  attemptId: string,
  userId: string,
  instituteId: string,
  isStaff = false
) => {
  const attempt = await repository.findAttemptById(attemptId, instituteId);
  if (!attempt) {
    throw new AppError('Attempt not found', 404);
  }

  if (!isStaff && attempt.userId !== userId) {
    throw new AppError('Unauthorized access to this examination attempt', 403);
  }

  // Server-authoritative timer check
  const now = new Date();
  if (attempt.status === 'IN_PROGRESS' && attempt.expiresAt && now > new Date(attempt.expiresAt)) {
    // Attempt expired: auto-finalize
    await submitExam(attempt.id, userId, instituteId);
    return repository.findAttemptById(attemptId, instituteId);
  }

  // Include sanitized questions for active attempts so TakeExam can load after navigation/refresh
  if (['IN_PROGRESS', 'NOT_STARTED'].includes(attempt.status)) {
    await attachSanitizedExamQuestions(attempt, instituteId);
  }

  return attempt;
};

// ─── Save / Autosave Answers ──────────────────────────────────────────────────
export const saveAnswers = async (
  attemptId: string,
  userId: string,
  instituteId: string,
  dto: BatchSaveAnswersDto
) => {
  const attempt = await repository.findAttemptLean(attemptId, instituteId);
  if (!attempt) {
    throw new AppError('Attempt not found', 404);
  }

  if (attempt.userId !== userId) {
    throw new AppError('Unauthorized attempt access', 403);
  }

  if (attempt.status === 'TERMINATED') {
    throw new AppError('This examination attempt has been terminated due to proctoring violations.', 403);
  }

  if (attempt.status !== 'IN_PROGRESS') {
    throw new AppError(`Cannot save answers for an attempt with status ${attempt.status}`, 409);
  }

  const now = new Date();
  if (attempt.expiresAt && now > new Date(attempt.expiresAt)) {
    await submitExam(attemptId, userId, instituteId);
    throw new AppError('Examination time has expired. Your exam was automatically submitted.', 400);
  }

  await repository.upsertExamAnswersBatch(attemptId, dto.answers);

  return { success: true, savedCount: dto.answers.length, savedAt: now.toISOString() };
};

// ─── Record Proctoring Event (Server-Authoritative) ───────────────────────────
export const recordProctoringEvent = async (
  attemptId: string,
  userId: string,
  instituteId: string,
  dto: RecordProctoringEventDto
) => {
  const attempt = await repository.findAttemptLean(attemptId, instituteId);
  if (!attempt) {
    throw new AppError('Attempt not found', 404);
  }

  if (attempt.userId !== userId) {
    throw new AppError('Unauthorized attempt access', 403);
  }

  if (attempt.status === 'TERMINATED') {
    return {
      violationCount: attempt.violationCount,
      maxViolations: attempt.maxViolations,
      warning: false,
      warningNumber: attempt.warningCount,
      attemptStatus: 'TERMINATED',
      terminationReason: attempt.terminationReason || 'MAX_PROCTORING_VIOLATIONS',
    };
  }

  const autoTerminate = attempt.exam.autoTerminateOnMaxViolations ?? true;
  const result = await repository.recordProctoringEventAtomic(
    attemptId,
    instituteId,
    dto,
    autoTerminate
  );

  const isCounted = !result.isDebounced;
  if (isCounted) {
    void logActivity(userId, instituteId, 'PROCTORING_VIOLATION', attemptId, null, {
      eventType: dto.eventType,
      violationCount: result.attempt.violationCount,
      warningCount: result.attempt.warningCount,
      isTerminated: result.isTerminated,
    });

    if (!result.isTerminated) {
      broadcastToUser(userId, 'proctoring:warning', {
        attemptId,
        violationCount: result.attempt.violationCount,
        warningNumber: result.attempt.warningCount,
        maxViolations: result.attempt.maxViolations,
        eventType: dto.eventType,
      });
    }
  }

  if (result.isTerminated) {
    void logActivity(userId, instituteId, 'EXAM_AUTO_TERMINATED', attemptId, null, {
      violationCount: result.attempt.violationCount,
      reason: 'MAX_PROCTORING_VIOLATIONS',
    });

    broadcastToUser(userId, 'proctoring:terminated', {
      attemptId,
      reason: 'MAX_PROCTORING_VIOLATIONS',
      violationCount: result.attempt.violationCount,
    });
  }

  return {
    violationCount: result.attempt.violationCount,
    maxViolations: result.attempt.maxViolations,
    warning: !result.isTerminated && isCounted,
    warningNumber: result.attempt.warningCount,
    isDebounced: result.isDebounced,
    attemptStatus: result.attempt.status,
    terminationReason: result.attempt.terminationReason,
  };
};

// ─── Submit (fast accept) + async grade ───────────────────────────────────────
export const submitExam = async (attemptId: string, userId: string, instituteId: string) => {
  const attempt = await repository.findAttemptLean(attemptId, instituteId);
  if (!attempt) {
    throw new AppError('Attempt not found', 404);
  }

  if (attempt.status === 'TERMINATED') {
    throw new AppError('Cannot submit a terminated examination attempt.', 403);
  }

  if (attempt.userId !== userId) {
    throw new AppError('Unauthorized attempt access', 403);
  }

  if (attempt.status === 'COMPLETED') {
    return repository.findAttemptById(attemptId, instituteId);
  }

  if (attempt.status === 'SUBMITTED' || attempt.status === 'EVALUATING' || attempt.status === 'AUTO_SUBMITTED') {
    // Already accepted — ensure grading job exists
    try {
      await enqueueExamGrading({ attemptId, userId: attempt.userId, instituteId });
    } catch {
      // Redis down: grade inline as fallback
      return gradeExamAttempt(attemptId, attempt.userId, instituteId);
    }
    return repository.findAttemptById(attemptId, instituteId);
  }

  const now = new Date();
  const updated = await prisma.examAttempt.updateMany({
    where: { id: attemptId, instituteId, status: 'IN_PROGRESS' },
    data: {
      status: 'EVALUATING',
      submittedAt: now,
    },
  });

  if (updated.count === 0) {
    return repository.findAttemptById(attemptId, instituteId);
  }

  try {
    await enqueueExamGrading({ attemptId, userId: attempt.userId, instituteId });
  } catch (err) {
    logger.warn({ err, attemptId }, '[submitExam] Queue unavailable — grading inline');
    if (!env.RUN_WORKERS) {
      // API-only process without workers: grade inline so results still complete
      return gradeExamAttempt(attemptId, attempt.userId, instituteId);
    }
    return gradeExamAttempt(attemptId, attempt.userId, instituteId);
  }

  return repository.findAttemptById(attemptId, instituteId);
};

// ─── Staff: Get All Attempts for an Exam ───────────────────────────────────────
export const getExamAttempts = async (
  examId: string,
  instituteId: string,
  branchId: string | undefined | null,
  filters: any
) => {
  return repository.findAttemptsForExam(examId, instituteId, branchId, filters);
};

// ─── Staff: Get Attempt Proctoring Timeline ───────────────────────────────────
export const getAttemptProctoringTimeline = async (
  attemptId: string,
  instituteId: string,
  branchId: string | undefined | null
) => {
  const attempt = await repository.findAttemptById(attemptId, instituteId);
  if (!attempt) {
    throw new AppError('Attempt not found', 404);
  }

  if (branchId && attempt.branchId && attempt.branchId !== branchId) {
    throw new AppError('Unauthorized access to this branch attempt', 403);
  }

  return attempt;
};

// ─── Staff: Manual Termination ────────────────────────────────────────────────
export const terminateAttemptManually = async (
  attemptId: string,
  staffUserId: string,
  instituteId: string,
  reason: string
) => {
  const attempt = await repository.findAttemptById(attemptId, instituteId);
  if (!attempt) {
    throw new AppError('Attempt not found', 404);
  }

  const now = new Date();
  const terminated = await repository.updateAttemptStatus(attemptId, instituteId, {
    status: 'TERMINATED',
    terminatedAt: now,
    terminationReason: `MANUAL: ${reason}`,
  });

  await logActivity(staffUserId, instituteId, 'EXAM_MANUAL_TERMINATED', attemptId, null, {
    reason,
    terminatedAt: now,
  });

  return terminated;
};
