export interface GoogleOAuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  tokenType: string;
  expiresIn?: number | null;
  expiryDate?: number | null;
  scopes: string[];
  idToken?: string | null;
}

export interface GoogleUserProfile {
  id: string;
  email: string;
  verifiedEmail: boolean;
  name?: string;
  picture?: string;
}

export interface CreateMeetSpaceOptions {
  accessType?: "OPEN" | "TRUSTED" | "RESTRICTED";
  entryPointAccess?: "ALL" | "CREATOR_APP_ONLY";
  enableAutomaticRecording?: boolean;
}

export interface GoogleMeetSpaceResult {
  name: string; // e.g. "spaces/123-abc-xyz"
  meetingUri: string; // e.g. "https://meet.google.com/123-abc-xyz"
  meetingCode: string; // e.g. "123-abc-xyz"
  recordingConfigurationStatus: "ENABLED" | "DISABLED" | "NOT_SUPPORTED" | "PERMISSION_DENIED" | "UNKNOWN";
  rawConfig?: any;
}

export interface GoogleConferenceRecord {
  name: string; // e.g. "conferenceRecords/xxx"
  startTime?: string;
  endTime?: string;
  space: string;
}

export interface GoogleRecordingArtifact {
  name: string; // e.g. "conferenceRecords/xxx/recordings/yyy"
  state: "RECORDING_STATE_UNSPECIFIED" | "STARTED" | "ENDED" | "FILE_GENERATED";
  startTime?: string;
  endTime?: string;
  driveDestination?: {
    file: string; // Drive file ID
    exportUri?: string;
  };
}

export interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  videoMediaMetadata?: {
    width?: number;
    height?: number;
    durationMillis?: string;
  };
}
