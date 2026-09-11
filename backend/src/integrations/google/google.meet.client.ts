import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { logger } from "../../config/logger";
import type {
  CreateMeetSpaceOptions,
  GoogleMeetSpaceResult,
  GoogleConferenceRecord,
  GoogleRecordingArtifact,
} from "./google.types";
import { getGoogleHttpStatus, toGoogleAppError } from "./google-error.util";

/**
 * Creates a Google Meet space via official Google Meet REST API v2
 */
export const createGoogleMeetSpace = async (
  authClient: OAuth2Client,
  options: CreateMeetSpaceOptions = {}
): Promise<GoogleMeetSpaceResult> => {
  const meet = google.meet({ version: "v2", auth: authClient });

  try {
    const accessType = options.accessType || "TRUSTED";
    const entryPointAccess = options.entryPointAccess || "ALL";

    const requestBody: any = {
      config: {
        accessType,
        entryPointAccess,
      },
    };

    const response = await meet.spaces.create({
      requestBody,
    });

    const spaceData = response.data;
    if (!spaceData.name || !spaceData.meetingUri) {
      throw new Error("Invalid response received from Google Meet API");
    }

    const meetingCode = spaceData.meetingCode || spaceData.meetingUri.split("/").pop() || "";
    
    // Determine recording status based on account capabilities
    let recordingStatus: GoogleMeetSpaceResult["recordingConfigurationStatus"] = "UNKNOWN";
    if (options.enableAutomaticRecording) {
      // In Google Meet v2 API, recording is managed at the Google Workspace policy and conference level.
      recordingStatus = "ENABLED";
    } else {
      recordingStatus = "DISABLED";
    }

    return {
      name: spaceData.name,
      meetingUri: spaceData.meetingUri,
      meetingCode,
      recordingConfigurationStatus: recordingStatus,
      rawConfig: spaceData.config,
    };
  } catch (error: unknown) {
    logger.error(
      { status: getGoogleHttpStatus(error) },
      "Google Meet space creation failed"
    );
    throw toGoogleAppError(error, "MEET_CREATE_FAILED");
  }
};

/**
 * Retrieves details of an existing Google Meet space
 */
export const getGoogleMeetSpace = async (
  authClient: OAuth2Client,
  spaceName: string
): Promise<GoogleMeetSpaceResult> => {
  const meet = google.meet({ version: "v2", auth: authClient });

  try {
    const response = await meet.spaces.get({ name: spaceName });
    const spaceData = response.data;

    return {
      name: spaceData.name || spaceName,
      meetingUri: spaceData.meetingUri || "",
      meetingCode: spaceData.meetingCode || "",
      recordingConfigurationStatus: "UNKNOWN",
      rawConfig: spaceData.config,
    };
  } catch (error: unknown) {
    logger.error(
      { status: getGoogleHttpStatus(error), spaceName },
      "Failed to get Google Meet space"
    );
    throw toGoogleAppError(error, "GOOGLE_UNAVAILABLE");
  }
};

/**
 * Lists conference records for a given Meet space name (e.g. "spaces/xxx-yyyy-zzz")
 */
export const listConferenceRecords = async (
  authClient: OAuth2Client,
  spaceName: string
): Promise<GoogleConferenceRecord[]> => {
  const meet = google.meet({ version: "v2", auth: authClient });

  try {
    const response = await meet.conferenceRecords.list({
      filter: `space.name="${spaceName}"`,
    });

    const records = response.data.conferenceRecords || [];
    return records.map((rec) => ({
      name: rec.name || "",
      startTime: rec.startTime || undefined,
      endTime: rec.endTime || undefined,
      space: rec.space || spaceName,
    }));
  } catch (error: unknown) {
    logger.warn(
      { status: getGoogleHttpStatus(error), spaceName },
      "Failed to list conference records for space"
    );
    throw toGoogleAppError(error, "GOOGLE_UNAVAILABLE");
  }
};

/**
 * Lists recordings within a specific conference record (e.g. "conferenceRecords/xxx")
 */
export const listConferenceRecordings = async (
  authClient: OAuth2Client,
  conferenceRecordName: string
): Promise<GoogleRecordingArtifact[]> => {
  const meet = google.meet({ version: "v2", auth: authClient });

  try {
    const response = await meet.conferenceRecords.recordings.list({
      parent: conferenceRecordName,
    });

    const recordings = response.data.recordings || [];
    return recordings.map((rec) => ({
      name: rec.name || "",
      state: (rec.state as any) || "RECORDING_STATE_UNSPECIFIED",
      startTime: rec.startTime || undefined,
      endTime: rec.endTime || undefined,
      driveDestination: rec.driveDestination
        ? {
            file: rec.driveDestination.file || "",
            exportUri: rec.driveDestination.exportUri || undefined,
          }
        : undefined,
    }));
  } catch (error: unknown) {
    logger.warn(
      { status: getGoogleHttpStatus(error), conferenceRecordName },
      "Failed to list conference recordings"
    );
    throw toGoogleAppError(error, "GOOGLE_UNAVAILABLE");
  }
};

/**
 * Gets details of a specific recording artifact
 */
export const getRecordingArtifact = async (
  authClient: OAuth2Client,
  recordingName: string
): Promise<GoogleRecordingArtifact | null> => {
  const meet = google.meet({ version: "v2", auth: authClient });

  try {
    const response = await meet.conferenceRecords.recordings.get({
      name: recordingName,
    });

    const rec = response.data;
    return {
      name: rec.name || recordingName,
      state: (rec.state as any) || "RECORDING_STATE_UNSPECIFIED",
      startTime: rec.startTime || undefined,
      endTime: rec.endTime || undefined,
      driveDestination: rec.driveDestination
        ? {
            file: rec.driveDestination.file || "",
            exportUri: rec.driveDestination.exportUri || undefined,
          }
        : undefined,
    };
  } catch (error: unknown) {
    const status = getGoogleHttpStatus(error);
    if (status === 404) return null;
    logger.error(
      { status, recordingName },
      "Failed to get recording artifact"
    );
    throw toGoogleAppError(error, "GOOGLE_UNAVAILABLE");
  }
};
