import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { recordingQueue } from "../queues/recording.queue";

/**
 * Recording cleanup — finds expired class recordings, enqueues a deletion job
 * for the storage object, and marks the database record INACTIVE.
 *
 * Flow (AGENTS.md Section 32):
 *   Scheduled Job → Find expired recordings → Delete storage object → Update DB → Log
 */
export const recordingCleanupJob = async (): Promise<void> => {
  const expired = await prisma.recording.findMany({
    where: {
      expiresAt: { lte: new Date() },
      status: "ACTIVE",
    },
    take: 100,
  });

  logger.info(`[recording-cleanup] ${expired.length} expired recordings to clean up`);

  for (const recording of expired) {
    try {
      await recordingQueue.add(
        "delete-recording",
        { recordingId: recording.id, storageKey: recording.storageKey },
        { removeOnComplete: true, attempts: 3 }
      );

      await prisma.recording.update({
        where: { id: recording.id },
        data: { status: "INACTIVE" },
      });

      logger.info({ recordingId: recording.id, storageKey: recording.storageKey }, "[recording-cleanup] Cleanup queued");
    } catch (err) {
      logger.error({ err, recordingId: recording.id }, "[recording-cleanup] Failed to queue cleanup");
    }
  }
};
