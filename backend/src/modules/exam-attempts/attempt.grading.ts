import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import * as repository from "./attempt.repository";
import type { ExamAnswer } from "@prisma/client";

/**
 * Score an attempt that is already SUBMITTED / EVALUATING / AUTO_SUBMITTED.
 * Batch-updates answer marks and sets COMPLETED.
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
  const answerUpdates: { id: string; isCorrect: boolean; marksAwarded: number }[] = [];

  for (const eq of exam.examQuestions) {
    const q = eq.question;
    const marks = eq.marksOverride ?? q.marks;
    const negativeMarks = exam.negativeMarkingEnabled ? q.negativeMarks || 0 : 0;
    totalMaxMarks += marks;

    const studentAnswer = answerMap.get(q.id);
    if (!studentAnswer) continue;

    let isCorrect = false;
    let awarded = 0;

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
      if (
        studentAnswer.numericalAnswer !== null &&
        studentAnswer.numericalAnswer !== undefined &&
        q.explanation
      ) {
        const numVal = parseFloat(q.explanation.trim());
        if (!isNaN(numVal) && Math.abs(studentAnswer.numericalAnswer - numVal) < 0.001) {
          isCorrect = true;
          awarded = marks;
        }
      }
    }

    totalScore += awarded;
    answerUpdates.push({ id: studentAnswer.id, isCorrect, marksAwarded: awarded });
  }

  const finalScore = Math.max(0, totalScore);
  const percentage = totalMaxMarks > 0 ? (finalScore / totalMaxMarks) * 100 : 0;
  const passed = finalScore >= exam.passingMarks;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const u of answerUpdates) {
      await tx.examAnswer.update({
        where: { id: u.id },
        data: { isCorrect: u.isCorrect, marksAwarded: u.marksAwarded },
      });
    }

    await tx.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: "COMPLETED",
        submittedAt: now,
        score: finalScore,
        totalMarks: totalMaxMarks,
        percentage: Math.round(percentage * 100) / 100,
        passed,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: userId || attempt.userId,
        instituteId,
        action: "EXAM_SUBMITTED",
        entityType: "ExamAttempt",
        entityId: attemptId,
        newData: {
          score: finalScore,
          totalMarks: totalMaxMarks,
          percentage,
          passed,
        } as any,
      },
    });
  });

  return repository.findAttemptById(attemptId, instituteId);
};
