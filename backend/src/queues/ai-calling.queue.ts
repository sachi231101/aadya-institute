import { createQueue, createWorker } from "./queue";
import type { AiCallingJobPayload } from "../modules/ai-calling/ai-calling.types";
import { logger } from "../config/logger";

/** Legacy shape kept for type compatibility; worker only processes callLogId jobs. */
export interface AICallingJob extends Partial<AiCallingJobPayload> {
  to?: string;
  from?: string;
  callbackUrl?: string;
  studentId?: string;
  leadId?: string;
  callLogId?: string;
  instituteId?: string;
}

export const aiCallingQueue = createQueue("ai-calling");

export const aiCallingWorker = createWorker<AICallingJob>(
  "ai-calling",
  async (job) => {
    const { callLogId, leadId, studentId, instituteId } = job.data;

    if (callLogId && instituteId && (leadId || studentId)) {
      const { AiCallingService } = await import(
        "../modules/ai-calling/ai-calling.service"
      );
      await AiCallingService.processCallJob({
        callLogId,
        instituteId,
        leadId,
        studentId,
      });
      return;
    }

    // Legacy jobs without CallLog context are no longer dialed (cross-tenant risk).
    logger.warn(
      { jobData: job.data },
      "[ai-calling.queue] Ignoring legacy job without callLogId/instituteId"
    );
  },
  { concurrency: 3, peakConcurrency: 1, pauseInPeakMode: true }
);
