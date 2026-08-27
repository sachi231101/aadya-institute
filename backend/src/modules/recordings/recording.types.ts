export interface CreateRecordingDTO {
  classSessionId: string;
  storageKey?: string;
  googleConferenceRecordId?: string;
  googleRecordingId?: string;
  googleDriveFileId?: string;
  playbackUrl?: string;
  recordingStatus?: string;
  storageProvider?: string;
  duration?: number;
  startedAt?: string;
  endedAt?: string;
  metadata?: any;
}

export interface RecordingQueryDTO {
  batchId?: string;
  courseId?: string;
  classSessionId?: string;
  status?: string;
  recordingStatus?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
