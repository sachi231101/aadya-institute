import { z } from "zod";

export const createRecordingSchema = z.object({
  classSessionId: z.string().min(1, "Class session is required"),
  storageKey: z.string().optional().default(""),
  googleConferenceRecordId: z.string().optional(),
  googleRecordingId: z.string().optional(),
  googleDriveFileId: z.string().optional(),
  playbackUrl: z.string().url().optional(),
  recordingStatus: z.enum(["PENDING", "RECORDING", "PROCESSING", "READY", "FAILED", "DELETED"]).optional(),
  storageProvider: z.string().optional().default("GOOGLE_DRIVE"),
  duration: z.number().int().positive().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  metadata: z.any().optional(),
});

export const queryRecordingSchema = z.object({
  batchId: z.string().optional(),
  courseId: z.string().optional(),
  classSessionId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  recordingStatus: z.enum(["PENDING", "RECORDING", "PROCESSING", "READY", "FAILED", "DELETED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
