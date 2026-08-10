import { createQueue, createWorker } from "./queue";
import { deleteFile } from "../integrations/storage/storage.client";

export interface RecordingJob {
  recordingId: string;
  storageKey: string;
}

export const recordingQueue = createQueue("recording");

export const recordingWorker = createWorker<RecordingJob>(
  "recording",
  async (job) => {
    await deleteFile(job.data.storageKey);
    console.info("[recording] Cleaned up:", job.data.recordingId);
  }
);
