import { z } from "zod";

export const oauthCallbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().min(1, "OAuth state parameter is required"),
});

export const createMeetSpaceSchema = z.object({
  enableAutomaticRecording: z.boolean().optional().default(true),
  accessType: z.enum(["OPEN", "TRUSTED", "RESTRICTED"]).optional().default("TRUSTED"),
});

export const syncRecordingsSchema = z.object({
  classSessionId: z.string().min(1, "Class session ID is required"),
});
