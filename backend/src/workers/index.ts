/**
 * BullMQ worker process entry — start with RUN_WORKERS=true.
 * Do not run this in the HTTP API process (set RUN_WORKERS=false there).
 */
import { env } from "../config/env";
import { connectDatabase } from "../config/database";
import { logger } from "../config/logger";
import { scheduleExamExpirySweep } from "../queues/exam-expiry.queue";

async function main() {
  if (!env.RUN_WORKERS) {
    logger.warn("RUN_WORKERS is false — worker entry refusing to start consumers");
    process.exit(1);
  }

  await connectDatabase();

  // Side-effect imports register BullMQ workers
  await import("../modules/whatsapp/whatsapp.worker");
  await import("../queues/recording.queue");
  await import("../queues/google-recording.queue");
  await import("../queues/ai-calling.queue");
  await import("../queues/automation.queue");
  await import("../queues/exam-grading.queue");
  await import("../queues/exam-expiry.queue");

  await scheduleExamExpirySweep();

  logger.info(
    { peakMode: env.PEAK_MODE },
    "🚀 Aadya BullMQ workers running"
  );
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
