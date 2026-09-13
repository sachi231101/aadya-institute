/**
 * BullMQ worker process entry — start with RUN_WORKERS=true.
 * Not required when the API process already runs consumers (RUN_WORKERS=true there).
 */
import { env } from "../config/env";
import { connectDatabase } from "../config/database";
import { logger } from "../config/logger";
import { startCronJobs } from "../jobs/scheduler";
import { registerWorkers } from "./register";

async function main() {
  if (!env.RUN_WORKERS) {
    logger.warn("RUN_WORKERS is false — worker entry refusing to start consumers");
    process.exit(1);
  }

  await connectDatabase();
  await registerWorkers();
  // Idempotent: no-op if API already started cron in the same process.
  startCronJobs();
}

main().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
