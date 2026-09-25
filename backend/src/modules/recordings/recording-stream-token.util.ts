import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/error.middleware";

const STREAM_TOKEN_PURPOSE = "recording_stream";
/** Short-lived token for <video src> (no Bearer header). */
const STREAM_TOKEN_EXPIRES_IN = "20m";

export interface RecordingStreamTokenPayload {
  purpose: typeof STREAM_TOKEN_PURPOSE;
  userId: string;
  recordingId: string;
  instituteId: string;
  branchId?: string | null;
  allowedBranchIds?: string[];
  roles: string[];
}

export const signRecordingStreamToken = (
  payload: Omit<RecordingStreamTokenPayload, "purpose">
): string => {
  return jwt.sign(
    {
      purpose: STREAM_TOKEN_PURPOSE,
      userId: payload.userId,
      recordingId: payload.recordingId,
      instituteId: payload.instituteId,
      branchId: payload.branchId ?? null,
      allowedBranchIds: payload.allowedBranchIds ?? [],
      roles: payload.roles ?? [],
    },
    env.JWT_SECRET,
    { expiresIn: STREAM_TOKEN_EXPIRES_IN }
  );
};

export const verifyRecordingStreamToken = (
  token: string
): RecordingStreamTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as RecordingStreamTokenPayload;
    if (
      !decoded ||
      decoded.purpose !== STREAM_TOKEN_PURPOSE ||
      !decoded.userId ||
      !decoded.recordingId ||
      !decoded.instituteId
    ) {
      throw new Error("Invalid stream token payload");
    }
    return {
      purpose: STREAM_TOKEN_PURPOSE,
      userId: decoded.userId,
      recordingId: decoded.recordingId,
      instituteId: decoded.instituteId,
      branchId: decoded.branchId ?? null,
      allowedBranchIds: Array.isArray(decoded.allowedBranchIds)
        ? decoded.allowedBranchIds
        : [],
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
    };
  } catch {
    throw new AppError("Invalid or expired recording stream token", 401);
  }
};

export const buildRecordingStreamPath = (
  recordingId: string,
  token: string
): string => `/api/v1/recordings/${recordingId}/stream?token=${encodeURIComponent(token)}`;
