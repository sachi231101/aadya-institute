import { createQueue, createWorker, QUEUE_PRIORITY, defaultJobOptions } from "./queue";
import { gradeExamAttempt } from "../modules/exam-attempts/attempt.grading";
import { logger } from "../config/logger";

export interface ExamGradingJob {
  attemptId: string;
  userId: string;
  instituteId: string;
}

export const examGradingQueue = createQueue("exam-grading");

export const enqueueExamGrading = async (data: ExamGradingJob) => {
  await examGradingQueue.add("grade", data, {
    ...defaultJobOptions(QUEUE_PRIORITY.CRITICAL),
    jobId: `grade-${data.attemptId}`,
  });
};

export const examGradingWorker = createWorker<ExamGradingJob>(
  "exam-grading",
  async (job) => {
    logger.info({ attemptId: job.data.attemptId }, "[exam-grading] Grading attempt");
    await gradeExamAttempt(job.data.attemptId, job.data.userId, job.data.instituteId);
  },
  { concurrency: 4, peakConcurrency: 6 }
);
