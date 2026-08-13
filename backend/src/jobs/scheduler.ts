import cron from "node-cron";
import { classReminderJob } from "./class-reminder.job";
import { feedbackJob } from "./feedback.job";
import { firstClassJob } from "./first-class.job";
import { moduleStartJob } from "./module-start.job";
import { recordingCleanupJob } from "./recording-cleanup.job";
import { aiFollowupJob } from "./ai-followup.job";
import { logger } from "../config/logger";

export const startCronJobs = (): void => {
  // Class reminders — every 5 minutes (2h before class)
  cron.schedule("*/5 * * * *", async () => {
    logger.info("[cron] Running class-reminder job");
    await classReminderJob().catch((e) =>
      logger.error({ err: e }, "[cron] class-reminder failed")
    );
  });

  // First-class rules & regulations message — every 5 minutes (within 24h window)
  cron.schedule("*/5 * * * *", async () => {
    logger.info("[cron] Running first-class job");
    await firstClassJob().catch((e) =>
      logger.error({ err: e }, "[cron] first-class failed")
    );
  });

  // Module start notifications — every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    logger.info("[cron] Running module-start job");
    await moduleStartJob().catch((e) =>
      logger.error({ err: e }, "[cron] module-start failed")
    );
  });

  // Feedback requests — every 5 minutes (10–15 min after class end)
  cron.schedule("*/5 * * * *", async () => {
    logger.info("[cron] Running feedback job");
    await feedbackJob().catch((e) =>
      logger.error({ err: e }, "[cron] feedback failed")
    );
  });

  // Recording cleanup — every day at 3:00 AM
  cron.schedule("0 3 * * *", async () => {
    logger.info("[cron] Running recording-cleanup job");
    await recordingCleanupJob().catch((e) =>
      logger.error({ err: e }, "[cron] recording-cleanup failed")
    );
  });

  // AI follow-up calls — every day at 10 AM
  cron.schedule("0 10 * * *", async () => {
    logger.info("[cron] Running AI follow-up job");
    await aiFollowupJob().catch((e) =>
      logger.error({ err: e }, "[cron] ai-followup failed")
    );
  });

  logger.info("✅ Cron jobs started");
};
