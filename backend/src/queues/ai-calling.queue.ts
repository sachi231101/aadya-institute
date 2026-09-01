import { createQueue, createWorker } from "./queue";
import { initiateCall } from "../integrations/telephony/telephony.client";

export interface AICallingJob {
  to: string;
  from: string;
  callbackUrl: string;
  studentId?: string;
  leadId?: string;
}

export const aiCallingQueue = createQueue("ai-calling");

export const aiCallingWorker = createWorker<AICallingJob>(
  "ai-calling",
  async (job) => {
    if (job.data.leadId) {
      const { processQueuedLeadCall } = await import(
        "../modules/leads/services/lead-ai-call.service"
      );
      await processQueuedLeadCall(job.data.leadId);
      return;
    }

    await initiateCall({
      to: job.data.to,
      from: job.data.from,
      callbackUrl: job.data.callbackUrl,
    });
  },
  { concurrency: 3, peakConcurrency: 1, pauseInPeakMode: true }
);
