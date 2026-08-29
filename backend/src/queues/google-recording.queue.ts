import { createQueue, createWorker } from "./queue";
import { logger } from "../config/logger";
import { syncSessionRecordings } from "../modules/google-workspace/google-workspace.service";

export interface GoogleRecordingSyncJobData {
  classSessionId: string;
  instituteId: string;
  userId: string;
}

export const googleRecordingQueue = createQueue("google-recording-sync");

export const googleRecordingWorker = createWorker<GoogleRecordingSyncJobData>(
  "google-recording-sync",
  async (job) => {
    const { classSessionId, instituteId, userId } = job.data;
    logger.info({ classSessionId }, "[google-recording-queue] Processing recording sync job");

    try {
      const mockAuthUser: any = {
        id: userId,
        userId,
        instituteId,
        roles: ["ADMIN"],
        permissions: [],
      };

      const result = await syncSessionRecordings(mockAuthUser, classSessionId);
      logger.info({ classSessionId, syncedCount: result.syncedCount }, "[google-recording-queue] Sync job completed");
    } catch (err: any) {
      logger.error({ err: err?.message || err, classSessionId }, "[google-recording-queue] Sync job failed");
      throw err;
    }
  },
  { concurrency: 3, peakConcurrency: 1, pauseInPeakMode: true }
);
