import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { logger } from "../../config/logger";
import type {
  CreateMeetSpaceOptions,
  GoogleMeetSpaceResult,
  GoogleConferenceRecord,
  GoogleRecordingArtifact,
} from "./google.types";

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
  } catch (err: any) {
    logger.error({ err: err?.message || err, code: err?.code }, "Google Meet space creation failed");
    if (err?.code === 403 || err?.status === 403) {
      throw new Error("Permission denied by Google Meet. Verify Google Workspace admin permissions and scopes.");
    }
    if (err?.code === 401 || err?.status === 401) {
      throw new Error("Google Workspace authentication expired. Re-authorization required.");
    }
    throw new Error("Failed to create Google Meet space. Please try again.");
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
  } catch (err: any) {
    logger.error({ err: err?.message || err, spaceName }, "Failed to get Google Meet space");
    throw new Error("Unable to retrieve Google Meet space details");
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
  } catch (err: any) {
    logger.warn({ err: err?.message || err, spaceName }, "Failed to list conference records for space");
    return [];
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
  } catch (err: any) {
    logger.warn({ err: err?.message || err, conferenceRecordName }, "Failed to list conference recordings");
    return [];
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
  } catch (err: any) {
    logger.error({ err: err?.message || err, recordingName }, "Failed to get recording artifact");
    return null;
  }
};
