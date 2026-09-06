import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import * as repository from "./attempt.repository";
import type { AnswerGradingStatus, ExamAnswer } from "@prisma/client";

const SUBJECTIVE_TYPES = new Set(["SHORT_ANSWER", "LONG_ANSWER", "FILL_BLANK"]);

type AnswerGradeUpdate = {
  id: string;
  isCorrect: boolean | null;
  marksAwarded: number;
  gradingStatus: AnswerGradingStatus;
};

/**
 * Score an attempt that is already SUBMITTED / EVALUATING / AUTO_SUBMITTED.
 * Objective + numerical answers are auto-graded.
 * Subjective (FILL/SHORT/LONG) answers are marked PENDING_MANUAL;
 * attempt stays EVALUATING until an admin grades them all.
 */
export const gradeExamAttempt = async (
  attemptId: string,
  userId: string,
  instituteId: string
) => {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, instituteId },
    select: {
      id: true,
      examId: true,
      status: true,
      userId: true,
      submittedAt: true,
    },
  });

  if (!attempt) {
    logger.warn({ attemptId }, "[gradeExamAttempt] Attempt not found");
    return null;
  }

  if (attempt.status === "COMPLETED" || attempt.status === "TERMINATED") {
    return repository.findAttemptById(attemptId, instituteId);
  }

  const exam = await prisma.exam.findUnique({
    where: { id: attempt.examId },
    include: {
      examQuestions: {
        include: {
          question: {
            include: { options: true },
          },
        },
      },
    },
  });

  if (!exam) {
    logger.error({ attemptId, examId: attempt.examId }, "[gradeExamAttempt] Exam not found");
    return null;
  }

  const answers = await prisma.examAnswer.findMany({ where: { attemptId } });
  const answerMap = new Map<string, ExamAnswer>(answers.map((a) => [a.questionId, a]));

  let totalScore = 0;
  let totalMaxMarks = 0;
  let pendingManual = 0;
  const answerUpdates: AnswerGradeUpdate[] = [];

  for (const eq of exam.examQuestions) {
    const q = eq.question;
    const marks = eq.marksOverride ?? q.marks;
    const negativeMarks = exam.negativeMarkingEnabled ? q.negativeMarks || 0 : 0;
    totalMaxMarks += marks;

    const studentAnswer = answerMap.get(q.id);
    if (!studentAnswer) {
      if (SUBJECTIVE_TYPES.has(q.questionType)) {
        const created = await prisma.examAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId: q.id } },
          create: {
            attemptId,
            questionId: q.id,
            textAnswer: null,
            marksAwarded: 0,
            isCorrect: null,
            gradingStatus: "PENDING_MANUAL",
          },
          update: {},
        });
        answerMap.set(q.id, created);
        if (created.gradingStatus === "MANUALLY_GRADED") {
          totalScore += created.marksAwarded ?? 0;
        } else {
          pendingManual += 1;
          answerUpdates.push({
            id: created.id,
            isCorrect: null,
            marksAwarded: 0,
            gradingStatus: "PENDING_MANUAL",
          });
        }
      }
      continue;
    }

    // Don't overwrite marks already set by an admin
    if (studentAnswer.gradingStatus === "MANUALLY_GRADED") {
      totalScore += studentAnswer.marksAwarded ?? 0;
      continue;
    }

    let isCorrect: boolean | null = false;
    let awarded = 0;
    let gradingStatus: AnswerGradingStatus = "AUTO";

    if (q.questionType === "MCQ_SINGLE" || q.questionType === "TRUE_FALSE") {
      const correctOption = q.options.find((o) => o.isCorrect);
      const selectedIds = Array.isArray(studentAnswer.selectedOptionIds)
        ? (studentAnswer.selectedOptionIds as string[])
        : [];

      if (correctOption && selectedIds.length === 1 && selectedIds[0] === correctOption.id) {
        isCorrect = true;
        awarded = marks;
      } else if (selectedIds.length > 0) {
        awarded = -negativeMarks;
      }
    } else if (q.questionType === "MCQ_MULTIPLE") {
      const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id).sort();
      const selectedIds = (
        Array.isArray(studentAnswer.selectedOptionIds)
          ? (studentAnswer.selectedOptionIds as string[])
          : []
      ).sort();

      if (
        correctOptionIds.length > 0 &&
        correctOptionIds.length === selectedIds.length &&
        correctOptionIds.every((val, index) => val === selectedIds[index])
      ) {
        isCorrect = true;
        awarded = marks;
      } else if (selectedIds.length > 0) {
        awarded = -negativeMarks;
      }
    } else if (q.questionType === "NUMERICAL") {
      const keyRaw = (q.correctAnswer || q.explanation || "").trim();
      const expected = parseFloat(keyRaw);
      if (
        studentAnswer.numericalAnswer !== null &&
        studentAnswer.numericalAnswer !== undefined &&
        !Number.isNaN(expected) &&
        Math.abs(studentAnswer.numericalAnswer - expected) < 0.001
      ) {
        isCorrect = true;
        awarded = marks;
      }
    } else if (SUBJECTIVE_TYPES.has(q.questionType)) {
      isCorrect = null;
      awarded = 0;
      gradingStatus = "PENDING_MANUAL";
      pendingManual += 1;
    }

    totalScore += awarded;
    answerUpdates.push({
      id: studentAnswer.id,
      isCorrect,
      marksAwarded: awarded,
      gradingStatus,
    });
  }

  const finalScore = Math.max(0, totalScore);
  const percentage = totalMaxMarks > 0 ? (finalScore / totalMaxMarks) * 100 : 0;
  const passed = finalScore >= exam.passingMarks;
  const now = new Date();
  const nextStatus = pendingManual > 0 ? "EVALUATING" : "COMPLETED";

  await prisma.$transaction(async (tx) => {
    for (const u of answerUpdates) {
      // Skip re-write for answers we just created with PENDING_MANUAL
      await tx.examAnswer.update({
        where: { id: u.id },
        data: {
          isCorrect: u.isCorrect,
          marksAwarded: u.marksAwarded,
          gradingStatus: u.gradingStatus,
        },
      });
    }

    await tx.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: nextStatus,
        submittedAt: attempt.submittedAt ?? now,
        score: finalScore,
        totalMarks: totalMaxMarks,
        percentage: Math.round(percentage * 100) / 100,
        passed: pendingManual > 0 ? null : passed,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: userId || attempt.userId,
        instituteId,
        action: pendingManual > 0 ? "EXAM_AWAITING_MANUAL_GRADE" : "EXAM_SUBMITTED",
        entityType: "ExamAttempt",
        entityId: attemptId,
        newData: {
          score: finalScore,
          totalMarks: totalMaxMarks,
          percentage,
          passed: pendingManual > 0 ? null : passed,
          pendingManual,
        } as any,
      },
    });
  });

  return repository.findAttemptById(attemptId, instituteId);
};

/**
 * Recalculate attempt score from all answers and finalize when no PENDING_MANUAL remain.
 */
export const recalculateAttemptScore = async (attemptId: string, instituteId: string) => {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, instituteId },
    include: {
      exam: {
        select: {
          passingMarks: true,
          examQuestions: {
            select: {
              marksOverride: true,
              question: { select: { id: true, marks: true } },
            },
          },
        },
      },
      answers: {
        select: {
          id: true,
          marksAwarded: true,
          gradingStatus: true,
        },
      },
    },
  });

  if (!attempt) return null;

  let totalMaxMarks = 0;
  for (const eq of attempt.exam.examQuestions) {
    totalMaxMarks += eq.marksOverride ?? eq.question.marks;
  }

  const totalScore = Math.max(
    0,
    attempt.answers.reduce((sum, a) => sum + (a.marksAwarded ?? 0), 0)
  );
  const pendingManual = attempt.answers.filter((a) => a.gradingStatus === "PENDING_MANUAL").length;
  const percentage = totalMaxMarks > 0 ? (totalScore / totalMaxMarks) * 100 : 0;
  const passed = totalScore >= attempt.exam.passingMarks;
  const nextStatus = pendingManual > 0 ? "EVALUATING" : "COMPLETED";

  return prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      status: nextStatus,
      score: totalScore,
      totalMarks: totalMaxMarks,
      percentage: Math.round(percentage * 100) / 100,
      passed: pendingManual > 0 ? null : passed,
    },
  });
};
