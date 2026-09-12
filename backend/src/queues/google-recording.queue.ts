import { DelayedError } from "bullmq";
import { createQueue, createWorker, type WorkerJob } from "./queue";
import { logger } from "../config/logger";
import { prisma } from "../config/database";
import { syncSessionRecordings } from "../modules/google-workspace/google-workspace.service";

export interface GoogleRecordingSyncJobData {
  classSessionId: string;
  instituteId: string;
  userId: string;
  /** Number of "not ready yet" re-polls already performed (does not count hard-error retries). */
  pollAttempt?: number;
  /** Optional enqueue timestamp (ms) used when actualEndTime is missing. */
  enqueuedAtMs?: number;
}

/** Delay between Drive readiness re-polls (~2 minutes). */
export const GOOGLE_RECORDING_REPOLL_DELAY_MS = 2 * 60 * 1000;

/** Cap delayed re-polls (~6 hours at 2-minute intervals). Cron remains the backstop. */
export const GOOGLE_RECORDING_MAX_REPOLL_ATTEMPTS = 180;

/** Stop delayed re-polls after class end + this window (6 hours). */
export const GOOGLE_RECORDING_SYNC_WINDOW_MS = 6 * 60 * 60 * 1000;

const TERMINAL_STATUSES = ["AVAILABLE", "DELETED", "EXPIRED"] as const;

export const googleRecordingQueue = createQueue("google-recording-sync");

/**
 * BullMQ processor for Google Drive recording sync.
 * Exported for unit tests (worker is stubbed under NODE_TEST_CONTEXT).
 */
export const processGoogleRecordingSync = async (
  job: WorkerJob<GoogleRecordingSyncJobData>,
  token?: string
): Promise<void> => {
  const { classSessionId, instituteId, userId } = job.data;
  const pollAttempt = Number(job.data.pollAttempt) || 0;

  logger.info(
    { classSessionId, pollAttempt },
    "[google-recording-queue] Processing recording sync job"
  );

  // Reflect "syncing" in UI as soon as the worker picks up the job.
  await prisma.recording.updateMany({
    where: {
      classSessionId,
      recordingStatus: { notIn: [...TERMINAL_STATUSES] },
    },
    data: {
      recordingStatus: "PROCESSING",
    },
  });

  try {
    const mockAuthUser: any = {
      id: userId,
      userId,
      instituteId,
      roles: ["ADMIN"],
      permissions: [],
    };

    const result = await syncSessionRecordings(mockAuthUser, classSessionId);
    const recordingStatus = result.recording?.recordingStatus;

    logger.info(
      { classSessionId, syncedCount: result.syncedCount, recordingStatus, pollAttempt },
      "[google-recording-queue] Sync job completed"
    );

    if (recordingStatus === "AVAILABLE" || recordingStatus === "DELETED" || recordingStatus === "EXPIRED") {
      return;
    }

    // Anchor only on actualEndTime (or enqueue time) — never scheduledDate, which
    // can make afternoon classes look "past window" immediately.
    const session = await prisma.classSession.findUnique({
      where: { id: classSessionId },
      select: { actualEndTime: true },
    });
    const endAnchorMs =
      session?.actualEndTime?.getTime() ??
      (typeof job.data.enqueuedAtMs === "number" ? job.data.enqueuedAtMs : null) ??
      Date.now();
    const pastSyncWindow = Date.now() > endAnchorMs + GOOGLE_RECORDING_SYNC_WINDOW_MS;

    if (pollAttempt >= GOOGLE_RECORDING_MAX_REPOLL_ATTEMPTS || pastSyncWindow) {
      logger.info(
        {
          classSessionId,
          pollAttempt,
          pastSyncWindow,
          recordingStatus,
        },
        "[google-recording-queue] Re-poll cap reached; leaving non-terminal status for cron backstop"
      );
      return;
    }

    const nextPollAttempt = pollAttempt + 1;
    if (typeof job.updateData === "function") {
      await job.updateData({
        ...job.data,
        pollAttempt: nextPollAttempt,
      });
    }

    if (typeof job.moveToDelayed !== "function") {
      logger.warn(
        { classSessionId, nextPollAttempt },
        "[google-recording-queue] moveToDelayed unavailable; leaving for cron backstop"
      );
      return;
    }

    await job.moveToDelayed(Date.now() + GOOGLE_RECORDING_REPOLL_DELAY_MS, token);
    logger.info(
      {
        classSessionId,
        nextPollAttempt,
        delayMs: GOOGLE_RECORDING_REPOLL_DELAY_MS,
      },
      "[google-recording-queue] Scheduled delayed re-poll (Drive not ready yet)"
    );
    throw new DelayedError();
  } catch (err: any) {
    if (err instanceof DelayedError) {
      throw err;
    }

    logger.error(
      { err: err?.message || err, classSessionId },
      "[google-recording-queue] Sync job failed"
    );
    const attempts = Number(job.opts.attempts) || 1;
    if (job.attemptsMade + 1 >= attempts) {
      await prisma.recording.updateMany({
        where: {
          classSessionId,
          recordingStatus: { notIn: [...TERMINAL_STATUSES] },
        },
        data: {
          recordingStatus: "FAILED",
          lastSyncAt: new Date(),
          lastSyncError:
            err instanceof Error
              ? err.message
              : "Google recording synchronization failed.",
        },
      });
    }
    throw err;
  }
};

export const googleRecordingWorker = createWorker<GoogleRecordingSyncJobData>(
  "google-recording-sync",
  processGoogleRecordingSync,
  { concurrency: 3, peakConcurrency: 1, pauseInPeakMode: true }
);
