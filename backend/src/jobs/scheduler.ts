import cron from "node-cron";
import { classReminderJob } from "./class-reminder.job";
import { feedbackJob } from "./feedback.job";
import { aiFollowupJob } from "./ai-followup.job";
import { logger } from "../config/logger";

export const startCronJobs = (): void => {
  // Class reminders — every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    logger.info("[cron] Running class-reminder job");
    await classReminderJob().catch((e) =>
      logger.error({ err: e }, "[cron] class-reminder failed")
    );
  });

  // Feedback requests — every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    logger.info("[cron] Running feedback job");
    await feedbackJob().catch((e) =>
      logger.error({ err: e }, "[cron] feedback failed")
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
