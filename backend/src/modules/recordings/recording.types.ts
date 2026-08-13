export interface CreateRecordingDTO {
  classSessionId: string;
  storageKey: string;
  duration?: number;
  startedAt?: string;
  endedAt?: string;
}

export interface RecordingQueryDTO {
  batchId?: string;
  classSessionId?: string;
  status?: string;
  page?: number;
  limit?: number;
}
