import { createQueue, createWorker, defaultJobOptions, QUEUE_PRIORITY } from "./queue";
import { logger } from "../config/logger";
import { indexCallSummaryEmbedding } from "../modules/ai-agent/call-summary-embedding.service";

export interface CallSummaryEmbeddingJob {
  callLogId: string;
}

export const callSummaryEmbeddingQueue = createQueue("call-summary-embedding");

export const enqueueCallSummaryEmbedding = async (callLogId: string): Promise<void> => {
  try {
    await callSummaryEmbeddingQueue.add(
      "index",
      { callLogId } satisfies CallSummaryEmbeddingJob,
      {
        ...defaultJobOptions(QUEUE_PRIORITY.BULK),
        jobId: `call-summary-embed:${callLogId}`,
      }
    );
  } catch (err) {
    logger.warn(
      { err, callLogId },
      "[call-summary-embedding] Failed to enqueue (Redis may be offline)"
    );
  }
};

export const callSummaryEmbeddingWorker = createWorker<CallSummaryEmbeddingJob>(
  "call-summary-embedding",
  async (job) => {
    const { callLogId } = job.data;
    if (!callLogId) {
      logger.warn({ jobData: job.data }, "[call-summary-embedding] Missing callLogId");
      return;
    }
    await indexCallSummaryEmbedding(callLogId);
  },
  { concurrency: 2, peakConcurrency: 1, pauseInPeakMode: true }
);
