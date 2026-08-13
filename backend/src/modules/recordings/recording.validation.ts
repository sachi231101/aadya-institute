import { z } from "zod";

export const createRecordingSchema = z.object({
  classSessionId: z.string().min(1, "Class session is required"),
  storageKey: z.string().min(1, "Storage key is required"),
  duration: z.number().int().positive().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
});

export const queryRecordingSchema = z.object({
  batchId: z.string().optional(),
  classSessionId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
