import { createQueue, createWorker, QUEUE_PRIORITY, defaultJobOptions } from "./queue";
import { gradeExamAttempt } from "../modules/exam-attempts/attempt.grading";
import { logger } from "../config/logger";
import { isRedisAvailable } from "../config/redis";
import { env } from "../config/env";

export interface ExamGradingJob {
  attemptId: string;
  userId: string;
  instituteId: string;
}

export const examGradingQueue = createQueue("exam-grading");

const ENQUEUE_TIMEOUT_MS = 2500;

/**
 * Prefer async grading via BullMQ when Redis + workers are available.
 * Otherwise (or on timeout) grade inline so submit/results never hang.
 */
export const enqueueExamGrading = async (data: ExamGradingJob): Promise<"queued" | "graded-inline"> => {
  // Prefer inline when Redis cache client is offline or workers are disabled —
  // avoids hanging submit/result requests on BullMQ connection retries.
  if (!isRedisAvailable() || !env.RUN_WORKERS) {
    logger.warn(
      { attemptId: data.attemptId, redis: isRedisAvailable(), runWorkers: env.RUN_WORKERS },
      "[exam-grading] Queue unavailable — grading inline"
    );
    await gradeExamAttempt(data.attemptId, data.userId, data.instituteId);
    return "graded-inline";
  }

  try {
    await Promise.race([
      examGradingQueue.add("grade", data, {
        ...defaultJobOptions(QUEUE_PRIORITY.CRITICAL),
        jobId: `grade-${data.attemptId}`,
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`enqueue timeout after ${ENQUEUE_TIMEOUT_MS}ms`)), ENQUEUE_TIMEOUT_MS);
      }),
    ]);
    return "queued";
  } catch (err) {
    logger.warn({ err, attemptId: data.attemptId }, "[exam-grading] Enqueue failed — grading inline");
    await gradeExamAttempt(data.attemptId, data.userId, data.instituteId);
    return "graded-inline";
  }
};

export const examGradingWorker = createWorker<ExamGradingJob>(
  "exam-grading",
  async (job) => {
    logger.info({ attemptId: job.data.attemptId }, "[exam-grading] Grading attempt");
    await gradeExamAttempt(job.data.attemptId, job.data.userId, job.data.instituteId);
  },
  { concurrency: 4, peakConcurrency: 6 }
);
