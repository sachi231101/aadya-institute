import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { recordingQueue } from "../queues/recording.queue";

/**
 * Recording cleanup — finds expired class recordings and enqueues an
 * idempotent deletion job. The worker changes DB state only after deletion.
 *
 * Flow (AGENTS.md Section 32):
 *   Scheduled Job → Find expired recordings → Delete storage object → Update DB → Log
 */
export const recordingCleanupJob = async (): Promise<void> => {
  const expired = await prisma.recording.findMany({
    where: {
      expiresAt: { lte: new Date() },
      recordingStatus: { not: "DELETED" },
    },
    take: 100,
  });

  logger.info(`[recording-cleanup] ${expired.length} expired recordings to clean up`);

  for (const recording of expired) {
    try {
      await recordingQueue.add(
        "delete-recording",
        { recordingId: recording.id },
        {
          jobId: `delete-recording-${recording.id}`,
          removeOnComplete: true,
          removeOnFail: true,
          attempts: 3,
          backoff: { type: "exponential", delay: 10000 },
        }
      );

      logger.info(
        { recordingId: recording.id },
        "[recording-cleanup] Cleanup queued"
      );
    } catch (err) {
      logger.error({ err, recordingId: recording.id }, "[recording-cleanup] Failed to queue cleanup");
    }
  }
};
