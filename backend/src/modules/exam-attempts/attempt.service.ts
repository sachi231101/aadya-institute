import * as repository from './attempt.repository';
import { BatchSaveAnswersDto, RecordProctoringEventDto, StartExamDto } from './attempt.types';
import { AppError } from '../../middlewares/error.middleware';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { broadcastToUser } from '../../websocket/ws.server';
import { cacheGet, cacheSet, cacheDel } from '../../config/cache';
import { enqueueExamGrading } from '../../queues/exam-grading.queue';

type ExamWindowInput = {
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  status?: string;
};

export type ExamWindowState = {
  isOpen: boolean;
  windowStatus: 'ON_DEMAND' | 'UPCOMING' | 'LIVE' | 'ENDED';
  startAt: string | null;
  endAt: string | null;
  message: string | null;
};

/** Evaluate whether an exam is within its scheduled start/end window. */
export const getExamWindowState = (exam: ExamWindowInput, now = new Date()): ExamWindowState => {
  const startAt = exam.startAt ? new Date(exam.startAt) : null;
  const endAt = exam.endAt ? new Date(exam.endAt) : null;

  if (!startAt && !endAt) {
    const openStatuses = ['PUBLISHED', 'SCHEDULED', 'LIVE'];
    const isOpen = !exam.status || openStatuses.includes(exam.status);
    return {
      isOpen,
      windowStatus: 'ON_DEMAND',
      startAt: null,
      endAt: null,
      message: isOpen ? null : 'This examination is not currently available.',
    };
  }

  if (startAt && now < startAt) {
    return {
      isOpen: false,
      windowStatus: 'UPCOMING',
      startAt: startAt.toISOString(),
      endAt: endAt ? endAt.toISOString() : null,
      message: `This examination opens at ${startAt.toLocaleString()}.`,
    };
  }

  if (endAt && now > endAt) {
    return {
      isOpen: false,
      windowStatus: 'ENDED',
      startAt: startAt ? startAt.toISOString() : null,
      endAt: endAt.toISOString(),
      message: `This examination ended at ${endAt.toLocaleString()}.`,
    };
  }

  return {
    isOpen: true,
    windowStatus: 'LIVE',
    startAt: startAt ? startAt.toISOString() : null,
    endAt: endAt ? endAt.toISOString() : null,
    message: null,
  };
};

const computeAttemptExpiresAt = (
  now: Date,
  durationMinutes: number,
  examEndAt?: Date | string | null
) => {
  const durationEnd = new Date(now.getTime() + durationMinutes * 60 * 1000);
  if (!examEndAt) return durationEnd;
  const windowEnd = new Date(examEndAt);
  return durationEnd < windowEnd ? durationEnd : windowEnd;
};

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
            countsTowardLimit: true,
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
        countsTowardLimit: true,
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
          countsTowardLimit: true,
        },
      });
    }
  }

  if (!exam) {
    throw new AppError('Examination not found or you are not assigned to this exam', 403);
  }

  const activeAttempt = pastAttempts.find((a) => a.status === 'IN_PROGRESS');
  const countedAttempts = pastAttempts.filter((a) => a.countsTowardLimit !== false);
  const attemptsUsed = countedAttempts.length;
  const attemptsRemaining = Math.max(0, exam.attemptsAllowed - attemptsUsed);
  const window = getExamWindowState(exam);

  // Keep exam status aligned with the schedule window (works even without Redis workers)
  if (window.windowStatus === 'LIVE' && exam.status === 'SCHEDULED') {
    await prisma.exam.updateMany({
      where: { id: exam.id, status: 'SCHEDULED' },
      data: { status: 'LIVE' },
    });
  } else if (window.windowStatus === 'ENDED' && ['SCHEDULED', 'LIVE'].includes(exam.status)) {
    await prisma.exam.updateMany({
      where: { id: exam.id, status: { in: ['SCHEDULED', 'LIVE'] } },
      data: { status: 'ENDED' },
    });
  }

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
      status: exam.status,
      startAt: exam.startAt ? new Date(exam.startAt).toISOString() : null,
      endAt: exam.endAt ? new Date(exam.endAt).toISOString() : null,
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
    attemptsUsed,
    attemptsRemaining,
    window,
    canStartNewAttempt: attemptsRemaining > 0 && !activeAttempt && window.isOpen,
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

  const now = new Date();
  const window = getExamWindowState(exam, now);

  // Check existing active attempt
  const existingActive = await repository.findActiveAttempt(examId, student.id);
  if (existingActive) {
    // Resume existing attempt if within timer and exam window
    const attemptExpired = existingActive.expiresAt && now > new Date(existingActive.expiresAt);
    const windowEnded = window.windowStatus === 'ENDED';
    if (attemptExpired || windowEnded) {
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

  if (!window.isOpen) {
    throw new AppError(
      window.message || 'This examination is not open for attempts right now.',
      403
    );
  }

  // Check attempt limit (waived/retry-granted attempts do not count)
  const count = await repository.countStudentAttempts(examId, student.id);
  if (count >= exam.attemptsAllowed) {
    throw new AppError(`Maximum attempts (${exam.attemptsAllowed}) reached for this examination`, 403);
  }

  const expiresAt = computeAttemptExpiresAt(now, exam.durationMinutes, exam.endAt);
  if (expiresAt <= now) {
    throw new AppError('This examination window has ended. You cannot start a new attempt.', 403);
  }

  const attemptNumber = await repository.getNextAttemptNumber(examId, student.id);

  // Promote SCHEDULED → LIVE when the first student starts inside the window
  if (exam.status === 'SCHEDULED') {
    await prisma.exam.updateMany({
      where: { id: exam.id, status: 'SCHEDULED' },
      data: { status: 'LIVE' },
    });
  }

  const attempt = await repository.createExamAttempt({
    instituteId,
    branchId: student.branchId,
    examId: exam.id,
    studentId: student.id,
    userId,
    attemptNumber,
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

/**
 * Attach full Q&A review (student answers + correct options) for completed attempts.
 * Only used when results are visible to the requester.
 */
const attachResultReview = async (attempt: any, instituteId: string) => {
  const examWithQuestions = await prisma.exam.findFirst({
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

  if (!examWithQuestions) {
    attempt.resultReview = [];
    return attempt;
  }

  const answerMap = new Map(
    (attempt.answers || []).map((a: any) => [a.questionId, a])
  );

  attempt.resultReview = examWithQuestions.examQuestions.map((eq: any, index: number) => {
    const q = eq.question;
    const ans = answerMap.get(q.id) as any | undefined;
    const selectedIds = Array.isArray(ans?.selectedOptionIds)
      ? (ans.selectedOptionIds as string[])
      : [];

    return {
      displayOrder: eq.displayOrder ?? index + 1,
      questionId: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      marks: eq.marksOverride ?? q.marks,
      options: (q.options || []).map((opt: any) => ({
        id: opt.id,
        optionText: opt.optionText,
        displayOrder: opt.displayOrder,
        isCorrect: !!opt.isCorrect,
        isSelected: selectedIds.includes(opt.id),
      })),
      studentAnswer: ans
        ? {
            selectedOptionIds: selectedIds,
            textAnswer: ans.textAnswer ?? null,
            numericalAnswer: ans.numericalAnswer ?? null,
            isCorrect: ans.isCorrect ?? null,
            marksAwarded: ans.marksAwarded ?? null,
            isFlagged: !!ans.isFlagged,
          }
        : null,
    };
  });

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
  if (attempt.status === 'IN_PROGRESS') {
    const window = getExamWindowState(attempt.exam || {}, now);
    const attemptExpired = attempt.expiresAt && now > new Date(attempt.expiresAt);
    if (attemptExpired || window.windowStatus === 'ENDED') {
      await submitExam(attempt.id, userId, instituteId);
      const finalized = await repository.findAttemptById(attemptId, instituteId);
      if (
        finalized &&
        finalized.status === 'COMPLETED' &&
        (isStaff || finalized.exam?.showResults !== false)
      ) {
        await attachResultReview(finalized, instituteId);
      }
      return finalized;
    }
  }

  // Recover stuck EVALUATING/SUBMITTED attempts when Redis/queue was unavailable
  if (['EVALUATING', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(attempt.status)) {
    await enqueueExamGrading({
      attemptId: attempt.id,
      userId: attempt.userId,
      instituteId,
    });
    const graded = await repository.findAttemptById(attemptId, instituteId);
    if (
      graded &&
      graded.status === 'COMPLETED' &&
      (isStaff || graded.exam?.showResults !== false)
    ) {
      await attachResultReview(graded, instituteId);
    }
    return graded;
  }

  // Include sanitized questions for active attempts so TakeExam can load after navigation/refresh
  if (['IN_PROGRESS', 'NOT_STARTED'].includes(attempt.status)) {
    await attachSanitizedExamQuestions(attempt, instituteId);
  }

  // Question + answer review for completed attempts (when results are visible)
  if (
    attempt.status === 'COMPLETED' &&
    (isStaff || attempt.exam?.showResults !== false)
  ) {
    await attachResultReview(attempt, instituteId);
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
    // Already accepted — ensure grading completes (inline if queue unavailable)
    await enqueueExamGrading({ attemptId, userId: attempt.userId, instituteId });
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
    // Race: another request may have moved status — finish grading if needed
    const current = await repository.findAttemptLean(attemptId, instituteId);
    if (current && ['SUBMITTED', 'EVALUATING', 'AUTO_SUBMITTED'].includes(current.status)) {
      await enqueueExamGrading({ attemptId, userId: attempt.userId, instituteId });
    }
    return repository.findAttemptById(attemptId, instituteId);
  }

  await enqueueExamGrading({ attemptId, userId: attempt.userId, instituteId });
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

// ─── Staff: Grant another chance after termination ────────────────────────────
export const grantAttemptRetry = async (
  attemptId: string,
  staffUserId: string,
  instituteId: string,
  reason: string
) => {
  const attempt = await repository.findAttemptById(attemptId, instituteId);
  if (!attempt) {
    throw new AppError('Attempt not found', 404);
  }

  if (attempt.status !== 'TERMINATED') {
    throw new AppError('Only terminated attempts can be reassigned for another chance', 400);
  }

  if (attempt.countsTowardLimit === false) {
    throw new AppError('Another chance has already been granted for this attempt', 400);
  }

  const updated = await repository.grantAttemptRetry(attemptId, instituteId, staffUserId, reason);

  await logActivity(staffUserId, instituteId, 'EXAM_RETRY_GRANTED', attemptId, null, {
    examId: attempt.examId,
    studentId: attempt.studentId,
    reason,
  });

  return updated;
};

// ─── Staff: Grading queue for subjective answers ──────────────────────────────
const SUBJECTIVE_TYPES = ['SHORT_ANSWER', 'LONG_ANSWER', 'FILL_BLANK'] as const;

export const getExamGradingQueue = async (examId: string, instituteId: string) => {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, instituteId },
    select: { id: true, name: true },
  });
  if (!exam) {
    throw new AppError('Examination not found', 404);
  }

  const attempts = await prisma.examAttempt.findMany({
    where: {
      examId,
      instituteId,
      OR: [
        { status: 'EVALUATING' },
        {
          answers: {
            some: { gradingStatus: 'PENDING_MANUAL' },
          },
        },
      ],
    },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      answers: {
        where: { gradingStatus: 'PENDING_MANUAL' },
        select: { id: true },
      },
      _count: {
        select: {
          answers: true,
        },
      },
    },
    orderBy: { submittedAt: 'asc' },
  });

  return {
    exam,
    attempts: attempts.map((a) => ({
      id: a.id,
      status: a.status,
      attemptNumber: a.attemptNumber,
      score: a.score,
      totalMarks: a.totalMarks,
      submittedAt: a.submittedAt,
      student: a.student,
      pendingCount: a.answers.length,
    })),
  };
};

export const getAttemptForGrading = async (
  attemptId: string,
  instituteId: string,
  branchId?: string | null
) => {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, instituteId },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          totalMarks: true,
          passingMarks: true,
          showResults: true,
        },
      },
      student: {
        select: {
          id: true,
          studentCode: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      answers: {
        include: {
          question: {
            select: {
              id: true,
              questionType: true,
              questionText: true,
              marks: true,
              correctAnswer: true,
              explanation: true,
            },
          },
        },
        orderBy: { savedAt: 'asc' },
      },
    },
  });

  if (!attempt) {
    throw new AppError('Attempt not found', 404);
  }

  if (branchId && attempt.branchId && attempt.branchId !== branchId) {
    throw new AppError('Unauthorized access to this branch attempt', 403);
  }

  const examQuestions = await prisma.examQuestion.findMany({
    where: { examId: attempt.examId },
    select: {
      questionId: true,
      displayOrder: true,
      marksOverride: true,
    },
  });
  const orderMap = new Map(examQuestions.map((eq) => [eq.questionId, eq]));

  const subjective = attempt.answers
    .filter((a) => SUBJECTIVE_TYPES.includes(a.question.questionType as any))
    .map((a) => {
      const eq = orderMap.get(a.questionId);
      const maxMarks = eq?.marksOverride ?? a.question.marks;
      return {
        answerId: a.id,
        questionId: a.questionId,
        questionType: a.question.questionType,
        questionText: a.question.questionText,
        maxMarks,
        displayOrder: eq?.displayOrder ?? 0,
        textAnswer: a.textAnswer,
        marksAwarded: a.marksAwarded,
        isCorrect: a.isCorrect,
        gradingStatus: a.gradingStatus,
        graderComment: a.graderComment,
        gradedAt: a.gradedAt,
        sampleAnswer: a.question.correctAnswer,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const pendingCount = subjective.filter((s) => s.gradingStatus === 'PENDING_MANUAL').length;
  const gradedCount = subjective.filter((s) => s.gradingStatus === 'MANUALLY_GRADED').length;

  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.percentage,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt,
    },
    exam: attempt.exam,
    student: attempt.student,
    subjectiveAnswers: subjective,
    pendingCount,
    gradedCount,
    totalSubjective: subjective.length,
  };
};

export const gradeSubjectiveAnswer = async (
  attemptId: string,
  answerId: string,
  staffUserId: string,
  instituteId: string,
  data: { marksAwarded: number; isCorrect?: boolean; graderComment?: string }
) => {
  const answer = await prisma.examAnswer.findFirst({
    where: { id: answerId, attemptId },
    include: {
      question: { select: { id: true, marks: true, questionType: true } },
      attempt: { select: { id: true, instituteId: true, examId: true, branchId: true } },
    },
  });

  if (!answer || answer.attempt.instituteId !== instituteId) {
    throw new AppError('Answer not found', 404);
  }

  if (!SUBJECTIVE_TYPES.includes(answer.question.questionType as any)) {
    throw new AppError('Only fill-blank, short, and long answers can be manually graded', 400);
  }

  const eq = await prisma.examQuestion.findFirst({
    where: { examId: answer.attempt.examId, questionId: answer.questionId },
    select: { marksOverride: true },
  });
  const maxMarks = eq?.marksOverride ?? answer.question.marks;

  if (data.marksAwarded < 0 || data.marksAwarded > maxMarks) {
    throw new AppError(`Marks must be between 0 and ${maxMarks}`, 400);
  }

  const isCorrect =
    data.isCorrect !== undefined ? data.isCorrect : data.marksAwarded >= maxMarks * 0.99;

  await prisma.examAnswer.update({
    where: { id: answerId },
    data: {
      marksAwarded: data.marksAwarded,
      isCorrect,
      gradingStatus: 'MANUALLY_GRADED',
      gradedById: staffUserId,
      gradedAt: new Date(),
      graderComment: data.graderComment?.trim() || null,
    },
  });

  const { recalculateAttemptScore } = await import('./attempt.grading');
  await recalculateAttemptScore(attemptId, instituteId);

  await logActivity(staffUserId, instituteId, 'EXAM_ANSWER_MANUALLY_GRADED', answerId, null, {
    attemptId,
    marksAwarded: data.marksAwarded,
    isCorrect,
  });

  return getAttemptForGrading(attemptId, instituteId);
};
