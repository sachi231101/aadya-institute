import { AppError } from "../../middlewares/error.middleware";

type GoogleErrorShape = {
  code?: number;
  status?: number;
  statusCode?: number;
  response?: { status?: number };
};

export const getGoogleHttpStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as GoogleErrorShape;
  return (
    candidate.code ??
    candidate.status ??
    candidate.statusCode ??
    candidate.response?.status
  );
};

export const toGoogleAppError = (
  error: unknown,
  fallbackCode:
    | "OAUTH_FAILED"
    | "MEET_CREATE_FAILED"
    | "RECORDING_NOT_READY"
    | "GOOGLE_UNAVAILABLE"
): AppError => {
  const status = getGoogleHttpStatus(error);

  if (status === 401) {
    return new AppError(
      "Google Workspace authorization expired. Reconnect the integration.",
      401,
      "GOOGLE_NOT_CONNECTED"
    );
  }

  if (status === 403) {
    return new AppError(
      "Google Workspace has not granted the required permission.",
      403,
      "INSUFFICIENT_GOOGLE_PERMISSIONS"
    );
  }

  if (status === 404) {
    return new AppError(
      "The Google recording is not available.",
      404,
      "RECORDING_NOT_READY"
    );
  }

  const statusCode =
    fallbackCode === "OAUTH_FAILED"
      ? 400
      : fallbackCode === "RECORDING_NOT_READY"
        ? 409
        : 503;
  const messages: Record<typeof fallbackCode, string> = {
    OAUTH_FAILED: "Google authorization failed. Please reconnect and try again.",
    MEET_CREATE_FAILED: "Google Meet could not create the meeting.",
    RECORDING_NOT_READY: "The Google recording is not ready yet.",
    GOOGLE_UNAVAILABLE: "Google Workspace is temporarily unavailable.",
  };

  return new AppError(messages[fallbackCode], statusCode, fallbackCode);
};
