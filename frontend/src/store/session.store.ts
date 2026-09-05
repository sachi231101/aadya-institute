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
  title?: string;
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
  sessionId?: string;
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

export interface SessionAttendanceRecord {
  studentId: string;
  studentCode?: string;
  studentName?: string;
  batchId?: string;
  batchCode?: string;
  courseName?: string;
  subjectName?: string;
  date?: string;
  status: "PRESENT" | "ABSENT" | "LEAVE";
  updatedAt: string;
}

export interface SessionMaterialItem {
  id: string;
  sessionId?: string;
  title: string;
  description: string;
  moduleName: string;
  batchCode: string;
  courseName: string;
  fileType: "pdf" | "slides" | "code" | "doc";
  fileSize: string;
  pagesOrDuration: string;
  uploadedAt: string;
  facultyName: string;
  downloadUrl: string;
  topics: string[];
}

interface SessionStoreState {
  recordings: ClassRecordingItem[];
  materials: SessionMaterialItem[];
  sessionHistories: SessionHistoryItem[];
  activeLiveClass: ActiveLiveClass | null;
  sessionAttendance: Record<string, SessionAttendanceRecord[]>;
  sessionStatuses: Record<string, "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED">;
  addRecording: (recording: ClassRecordingItem) => void;
  addMaterial: (material: SessionMaterialItem) => void;
  addSessionHistory: (history: SessionHistoryItem) => void;
  setActiveLiveClass: (liveClass: ActiveLiveClass | null) => void;
  endActiveLiveClass: () => void;
  setSessionStatus: (sessionId: string, status: "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED") => void;
  getSessionStatus: (sessionId: string) => "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED" | undefined;
  saveSessionAttendance: (sessionId: string, records: SessionAttendanceRecord[]) => void;
  getSessionAttendance: (sessionId: string) => SessionAttendanceRecord[] | undefined;
  getRecordingsForFaculty: (facultyName: string) => ClassRecordingItem[];
  getRecordingsForStudentBatch: (batch: string, course: string) => ClassRecordingItem[];
  getMaterialsForStudentBatch: (batch: string, course: string) => SessionMaterialItem[];
}

const DEFAULT_RECORDINGS: ClassRecordingItem[] = [];

const DEFAULT_MATERIALS: SessionMaterialItem[] = [];

const DEFAULT_SESSION_HISTORIES: SessionHistoryItem[] = [];

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  recordings: DEFAULT_RECORDINGS,
  materials: DEFAULT_MATERIALS,
  sessionHistories: DEFAULT_SESSION_HISTORIES,
  activeLiveClass: null,
  sessionAttendance: {},
  sessionStatuses: {},

  addRecording: (newRecording) => {
    set((state) => ({
      recordings: [newRecording, ...state.recordings],
    }));
  },

  addMaterial: (newMaterial) => {
    set((state) => ({
      materials: [newMaterial, ...state.materials],
    }));
  },

  addSessionHistory: (history) => {
    set((state) => ({
      sessionHistories: [history, ...state.sessionHistories],
    }));
  },

  setActiveLiveClass: (liveClass) => {
    set((state) => ({
      activeLiveClass: liveClass,
      sessionStatuses: liveClass?.sessionId
        ? { ...state.sessionStatuses, [liveClass.sessionId]: "LIVE" }
        : state.sessionStatuses,
    }));
  },

  endActiveLiveClass: () => {
    const current = get().activeLiveClass;
    if (current) {
      set((state) => ({
        activeLiveClass: {
          ...current,
          status: "COMPLETED",
        },
        sessionStatuses: current.sessionId || current.id
          ? { ...state.sessionStatuses, [current.sessionId || current.id]: "COMPLETED" }
          : state.sessionStatuses,
      }));
    }
  },

  setSessionStatus: (sessionId, status) => {
    set((state) => ({
      sessionStatuses: {
        ...state.sessionStatuses,
        [sessionId]: status,
      },
    }));
  },

  getSessionStatus: (sessionId) => {
    return get().sessionStatuses[sessionId];
  },

  saveSessionAttendance: (sessionId, records) => {
    set((state) => ({
      sessionAttendance: {
        ...state.sessionAttendance,
        [sessionId]: records,
      },
    }));
  },

  getSessionAttendance: (sessionId) => {
    return get().sessionAttendance[sessionId];
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

  getMaterialsForStudentBatch: (batch, course) => {
    const list = get().materials;
    return list.filter((m) => {
      const matchBatch = !batch || m.batchCode.toLowerCase().includes(batch.toLowerCase()) || batch.toLowerCase().includes(m.batchCode.toLowerCase());
      const matchCourse = !course || m.courseName.toLowerCase().includes(course.toLowerCase()) || course.toLowerCase().includes(m.courseName.toLowerCase());
      return matchBatch || matchCourse;
    });
  },
}));
