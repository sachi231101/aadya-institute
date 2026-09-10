/**
 * Registers every BullMQ worker in the current process.
 *
 * Shared by the dedicated worker entry (src/workers/index.ts) and the API
 * server, which starts consumers in-process when RUN_WORKERS is true.
 *
 * @module workers/register
 */
import { env } from "../config/env";
import { logger } from "../config/logger";
import { scheduleExamExpirySweep } from "../queues/exam-expiry.queue";

let registered = false;

export const registerWorkers = async (): Promise<void> => {
  if (registered) return;
  registered = true;

  try {
    // Side-effect imports register BullMQ workers
    await import("../modules/whatsapp/whatsapp.worker");
    await import("../queues/recording.queue");
    await import("../queues/google-recording.queue");
    await import("../queues/ai-calling.queue");
    await import("../queues/automation.queue");
    await import("../queues/exam-grading.queue");
    await import("../queues/exam-expiry.queue");

    await scheduleExamExpirySweep();

    logger.info({ peakMode: env.PEAK_MODE }, "🚀 Aadya BullMQ workers running");
  } catch (err) {
    logger.warn({ err }, "BullMQ workers failed to start (Redis may be offline)");
  }
};
