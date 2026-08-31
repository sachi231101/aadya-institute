import { api } from "./api";

export interface Recording {
  id: string;
  classSessionId: string;
  storageKey: string;
  duration?: number;
  startedAt?: string;
  endedAt?: string;
  expiresAt: string;
  status: string;
  createdAt: string;
  classSession?: {
    id: string;
    title: string;
    scheduledDate: string;
    batch?: { id: string; name: string; code: string };
    faculty?: { id: string; user?: { name: string } };
    batchModule?: { courseModule?: { name: string } };
  };
}

export interface RecordingQueryParams {
  page?: number;
  limit?: number;
  batchId?: string;
  classSessionId?: string;
  status?: string;
  recordingStatus?: string;
}

export interface RecordingAccess {
  recordingId: string;
  classSessionId?: string;
  title?: string;
  playbackUrl?: string;
  googleDriveFileId?: string;
  storageProvider?: string;
  recordingStatus?: string;
  duration?: number;
  startedAt?: string;
  endedAt?: string;
  expiresAt?: string;
}

export const recordingsApi = {
  getRecordings: async (params?: RecordingQueryParams) => {
    const response = await api.get("/recordings", { params });
    return response.data;
  },

  getRecordingById: async (id: string) => {
    const response = await api.get(`/recordings/${id}`);
    return response.data;
  },

  createRecording: async (data: {
    classSessionId: string;
    storageKey: string;
    duration?: number;
    startedAt?: string;
    endedAt?: string;
    expiresAt: string;
  }) => {
    const response = await api.post("/recordings", data);
    return response.data;
  },

  deleteRecording: async (id: string) => {
    const response = await api.delete(`/recordings/${id}`);
    return response.data;
  },

  getRecordingAccess: async (id: string) => {
    const response = await api.get(`/recordings/${id}/access`);
    return response.data;
  },
};
