import { createQueue, createWorker } from "./queue";
import { initiateCall } from "../integrations/telephony/telephony.client";

export interface AICallingJob {
  to: string;
  from: string;
  callbackUrl: string;
  studentId?: string;
}

export const aiCallingQueue = createQueue("ai-calling");

export const aiCallingWorker = createWorker<AICallingJob>(
  "ai-calling",
  async (job) => {
    await initiateCall({
      to: job.data.to,
      from: job.data.from,
      callbackUrl: job.data.callbackUrl,
    });
  }
);
