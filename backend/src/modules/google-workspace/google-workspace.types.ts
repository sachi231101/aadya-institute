export interface GoogleConnectionStatusDTO {
  isConnected: boolean;
  email?: string | null;
  googleAccountId?: string | null;
  scopes: string[];
  status: "CONNECTED" | "REAUTH_REQUIRED" | "DISCONNECTED" | "EXPIRED";
  lastSyncedAt?: Date | null;
  connectedAt?: Date | null;
}

export interface CreateMeetSpaceDTO {
  classSessionId: string;
  enableAutomaticRecording?: boolean;
  accessType?: "OPEN" | "TRUSTED" | "RESTRICTED";
}

export interface SyncRecordingsDTO {
  classSessionId: string;
}

export interface OAuthCallbackQueryDTO {
  code: string;
  state: string;
}

export interface GoogleStatePayload {
  userId: string;
  instituteId: string;
  timestamp: number;
  nonce: string;
}
