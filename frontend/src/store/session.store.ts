import { create } from "zustand";

export interface ClassRecordingItem {
  id: string;
  course: string;
  batch: string;
  batchName: string;
  module: string;
  facultyName: string;
  date: string;
  rawDate: string;
  time: string;
  duration: string;
  studentsCount: number;
  thumbnailBg: string;
  topics: string[];
  videoUrl: string;
  viewsCount: number;
  status: "Available" | "Processing" | "Archived";
  expiresAt: string;
  meetUrl?: string;
  meetId?: string;
  startTime?: string;
  endTime?: string;
  source?: "Google Meet" | "Direct Class";
}

export interface SessionHistoryItem {
  id: string;
  course: string;
  batch: string;
  module: string;
  facultyName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  presentCount: number;
  absentCount: number;
  totalCount: number;
  meetUrl: string;
  meetId: string;
  notes: string[];
  recordingId?: string;
}

export interface ActiveLiveClass {
  id: string;
  courseName: string;
  batchCode: string;
  batchName: string;
  moduleName?: string;
  facultyName: string;
  date: string;
  time: string;
  meetUrl: string;
  meetId: string;
  startedAt: string;
  studentCount: number;
  status: "LIVE" | "COMPLETED";
}

interface SessionStoreState {
  recordings: ClassRecordingItem[];
  sessionHistories: SessionHistoryItem[];
  activeLiveClass: ActiveLiveClass | null;
  addRecording: (recording: ClassRecordingItem) => void;
  addSessionHistory: (history: SessionHistoryItem) => void;
  setActiveLiveClass: (liveClass: ActiveLiveClass | null) => void;
  endActiveLiveClass: () => void;
  getRecordingsForFaculty: (facultyName: string) => ClassRecordingItem[];
  getRecordingsForStudentBatch: (batch: string, course: string) => ClassRecordingItem[];
}

const DEFAULT_RECORDINGS: ClassRecordingItem[] = [];

const DEFAULT_SESSION_HISTORIES: SessionHistoryItem[] = [];

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  recordings: DEFAULT_RECORDINGS,
  sessionHistories: DEFAULT_SESSION_HISTORIES,
  activeLiveClass: null,

  addRecording: (newRecording) => {
    set((state) => ({
      recordings: [newRecording, ...state.recordings],
    }));
  },

  addSessionHistory: (history) => {
    set((state) => ({
      sessionHistories: [history, ...state.sessionHistories],
    }));
  },

  setActiveLiveClass: (liveClass) => {
    set({ activeLiveClass: liveClass });
  },

  endActiveLiveClass: () => {
    const current = get().activeLiveClass;
    if (current) {
      set({
        activeLiveClass: {
          ...current,
          status: "COMPLETED",
        },
      });
    }
  },

  getRecordingsForFaculty: (facultyName) => {
    const list = get().recordings;
    if (!facultyName) return list;
    return list.filter(
      (r) => r.facultyName.toLowerCase() === facultyName.toLowerCase()
    );
  },

  getRecordingsForStudentBatch: (batch, course) => {
    const list = get().recordings;
    return list.filter((r) => {
      const matchBatch = !batch || r.batch.toLowerCase().includes(batch.toLowerCase()) || batch.toLowerCase().includes(r.batch.toLowerCase());
      const matchCourse = !course || r.course.toLowerCase().includes(course.toLowerCase()) || course.toLowerCase().includes(r.course.toLowerCase());
      return matchBatch || matchCourse;
    });
  },
}));
