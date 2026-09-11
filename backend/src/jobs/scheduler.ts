import cron from "node-cron";
import { classReminderJob } from "../modules/whatsapp/jobs/class-reminder.job";
import { feedbackJob } from "../modules/whatsapp/jobs/feedback.job";
import { firstClassJob } from "../modules/whatsapp/jobs/first-class.job";
import { moduleStartJob } from "../modules/whatsapp/jobs/module-start.job";
import { feeReminderJob } from "../modules/whatsapp/jobs/fee-reminder.job";
import { examReminderJob } from "../modules/whatsapp/jobs/exam-reminder.job";
import { recordingCleanupJob } from "./recording-cleanup.job";
import { googleRecordingSyncJob } from "./google-recording-sync.job";
import { aiFollowupJob } from "./ai-followup.job";
import { targetSyncJob } from "../modules/targets/jobs/target-sync.job";
import { logger } from "../config/logger";

let cronJobsStarted = false;

export const startCronJobs = (): void => {
  if (cronJobsStarted) {
    logger.warn("[cron] Cron jobs already started — skipping duplicate registration");
    return;
  }
  cronJobsStarted = true;

  cron.schedule("*/5 * * * *", async () => {
    logger.info("[cron] Running class-reminder job");
    await classReminderJob().catch((e) =>
      logger.error({ err: e }, "[cron] class-reminder failed")
    );
  });

  cron.schedule("*/5 * * * *", async () => {
    logger.info("[cron] Running first-class job");
    await firstClassJob().catch((e) =>
      logger.error({ err: e }, "[cron] first-class failed")
    );
  });

  cron.schedule("*/15 * * * *", async () => {
    logger.info("[cron] Running module-start job");
    await moduleStartJob().catch((e) =>
      logger.error({ err: e }, "[cron] module-start failed")
    );
  });

  cron.schedule("*/5 * * * *", async () => {
    logger.info("[cron] Running feedback job");
    await feedbackJob().catch((e) =>
      logger.error({ err: e }, "[cron] feedback failed")
    );
  });

  cron.schedule("*/10 * * * *", async () => {
    logger.info("[cron] Running google-recording-sync job");
    await googleRecordingSyncJob().catch((e) =>
      logger.error({ err: e }, "[cron] google-recording-sync failed")
    );
  });

  cron.schedule("*/30 * * * *", async () => {
    logger.info("[cron] Running target-sync job");
    await targetSyncJob().catch((e) =>
      logger.error({ err: e }, "[cron] target-sync failed")
    );
  });

  cron.schedule("0 9 * * *", async () => {
    logger.info("[cron] Running fee-reminder job");
    await feeReminderJob().catch((e) =>
      logger.error({ err: e }, "[cron] fee-reminder failed")
    );
  });

  cron.schedule("0 * * * *", async () => {
    logger.info("[cron] Running exam-reminder job");
    await examReminderJob().catch((e) =>
      logger.error({ err: e }, "[cron] exam-reminder failed")
    );
  });

  // Nightly full sweep (03:00)
  cron.schedule("0 3 * * *", async () => {
    logger.info("[cron] Running recording-cleanup job");
    await recordingCleanupJob().catch((e) =>
      logger.error({ err: e }, "[cron] recording-cleanup failed")
    );
  });

  // Daytime sweep so Drive delete lag after expiry is hours, not a full day
  cron.schedule("0 */6 * * *", async () => {
    logger.info("[cron] Running recording-cleanup daytime sweep");
    await recordingCleanupJob().catch((e) =>
      logger.error({ err: e }, "[cron] recording-cleanup daytime sweep failed")
    );
  });

  cron.schedule("0 10 * * *", async () => {
    logger.info("[cron] Running AI follow-up job");
    await aiFollowupJob().catch((e) =>
      logger.error({ err: e }, "[cron] ai-followup failed")
    );
  });

  logger.info("✅ Cron jobs started");
};
