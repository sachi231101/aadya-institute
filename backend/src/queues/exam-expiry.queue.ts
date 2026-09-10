import { createQueue, createWorker, QUEUE_PRIORITY, defaultJobOptions } from "./queue";
import { prisma } from "../config/database";
import { enqueueExamGrading } from "./exam-grading.queue";
import { logger } from "../config/logger";

export interface ExamExpirySweepJob {
  limit?: number;
}

export const examExpiryQueue = createQueue("exam-expiry");

export const enqueueExamExpirySweep = async () => {
  await examExpiryQueue.add(
    "sweep",
    { limit: 200 },
    {
      ...defaultJobOptions(QUEUE_PRIORITY.CRITICAL),
      jobId: `expiry-sweep-${Date.now()}`,
    }
  );
};

/**
 * Find expired IN_PROGRESS attempts, mark EVALUATING, enqueue grading.
 * Also close exams whose endAt has passed (SCHEDULED/LIVE → ENDED).
 */
export const processExpiredAttempts = async (limit = 200) => {
  const now = new Date();

  // Close exam windows that have ended
  const closed = await prisma.exam.updateMany({
    where: {
      status: { in: ["SCHEDULED", "LIVE"] },
      endAt: { lt: now },
    },
    data: { status: "ENDED" },
  });
  if (closed.count > 0) {
    logger.info({ count: closed.count }, "[exam-expiry] Closed exams past endAt");
  }

  // Auto-submit attempts that are past their own timer OR past the exam endAt
  const expired = await prisma.examAttempt.findMany({
    where: {
      status: "IN_PROGRESS",
      OR: [
        { expiresAt: { lt: now } },
        { exam: { endAt: { lt: now } } },
      ],
    },
    select: { id: true, userId: true, instituteId: true },
    take: limit,
  });

  for (const attempt of expired) {
    try {
      const updated = await prisma.examAttempt.updateMany({
        where: { id: attempt.id, status: "IN_PROGRESS" },
        data: {
          status: "EVALUATING",
          submittedAt: now,
        },
      });
      if (updated.count === 0) continue;

      await enqueueExamGrading({
        attemptId: attempt.id,
        userId: attempt.userId,
        instituteId: attempt.instituteId,
      });
    } catch (err) {
      logger.error({ err, attemptId: attempt.id }, "[exam-expiry] Failed to enqueue grading");
    }
  }

  logger.info({ count: expired.length }, "[exam-expiry] Sweep complete");
  return expired.length;
};

export const examExpiryWorker = createWorker<ExamExpirySweepJob>(
  "exam-expiry",
  async (job) => {
    await processExpiredAttempts(job.data.limit ?? 200);
  },
  { concurrency: 1 }
);

/** Schedule repeating sweep every minute when workers run. */
export const scheduleExamExpirySweep = async () => {
  try {
    const addPromise = examExpiryQueue.add(
      "sweep",
      { limit: 200 },
      {
        repeat: { every: 60_000 },
        jobId: "exam-expiry-repeat",
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 2,
      } as any
    );
    await Promise.race([
      addPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis offline / timeout")), 2000)
      ),
    ]);
  } catch {
    logger.info("ℹ Skipping exam expiry repeating sweep schedule (Redis is offline)");
  }
};
