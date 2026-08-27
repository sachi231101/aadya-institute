import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { googleRecordingQueue } from "../queues/google-recording.queue";

/**
 * Scheduled job: Finds active/ended online class sessions that have a Google Meet space
 * and whose recording is missing or not yet marked READY, then queues sync jobs.
 */
export const googleRecordingSyncJob = async (): Promise<void> => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const candidates = await prisma.classSession.findMany({
      where: {
        googleMeetSpace: { isNot: null },
        scheduledDate: { gte: oneDayAgo },
        OR: [
          { recording: null },
          { recording: { recordingStatus: { in: ["PENDING", "RECORDING", "PROCESSING"] } } },
        ],
      },
      include: {
        batch: { select: { instituteId: true } },
        googleMeetSpace: { select: { organizerUserId: true } },
      },
      take: 50,
    });

    if (candidates.length === 0) {
      return;
    }

    logger.info({ count: candidates.length }, "[google-recording-sync-job] Enqueuing recording sync candidates");

    for (const session of candidates) {
      if (!session.googleMeetSpace) continue;

      await googleRecordingQueue.add(
        "sync-session-recording",
        {
          classSessionId: session.id,
          instituteId: session.batch.instituteId,
          userId: session.googleMeetSpace.organizerUserId,
        },
        {
          jobId: `sync-recording-${session.id}`,
          removeOnComplete: true,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 10000,
          },
        }
      );
    }
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "[google-recording-sync-job] Error during scheduled sync scan");
  }
};
