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

const DEFAULT_RECORDINGS: ClassRecordingItem[] = [
  {
    id: "rec-001",
    course: "Java Programming",
    batch: "Batch C",
    batchName: "Java Full Stack Evening",
    module: "Object-Oriented Programming",
    facultyName: "Ramesh Kumar",
    date: "18 Aug 2026",
    rawDate: "2026-08-18",
    time: "09:00 AM - 10:00 AM",
    duration: "58 min",
    studentsCount: 12,
    thumbnailBg: "bg-gradient-to-br from-[#0A2540] via-slate-900 to-blue-950",
    topics: ["Classes & Objects", "Inheritance & Polymorphism", "Encapsulation Principles"],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    viewsCount: 24,
    status: "Available",
    expiresAt: "2026-09-18",
    meetUrl: "https://meet.google.com/aady-java-cls",
    meetId: "aady-java-cls",
    source: "Google Meet",
  },
  {
    id: "rec-002",
    course: "Digital Marketing",
    batch: "DM-2026-A",
    batchName: "Digital Marketing – Batch A",
    module: "SEO Fundamentals",
    facultyName: "Ramesh Kumar",
    date: "24 Aug 2026",
    rawDate: "2026-08-24",
    time: "10:00 AM – 11:30 AM",
    duration: "1h 30m",
    studentsCount: 28,
    thumbnailBg: "bg-gradient-to-br from-[#1769AA] via-slate-900 to-cyan-950",
    topics: ["Search Engine Algorithms", "Keyword Research Strategy", "On-Page Metadata Optimization"],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    viewsCount: 42,
    status: "Available",
    expiresAt: "2026-09-24",
    meetUrl: "https://meet.google.com/aady-dm-morn",
    meetId: "aady-dm-morn",
    source: "Google Meet",
  },
  {
    id: "rec-003",
    course: "Web Development",
    batch: "WD-2026-B",
    batchName: "Full Stack Web Dev",
    module: "React Components & Hooks",
    facultyName: "Ramesh Kumar",
    date: "23 Aug 2026",
    rawDate: "2026-08-23",
    time: "02:00 PM – 03:15 PM",
    duration: "1h 15m",
    studentsCount: 22,
    thumbnailBg: "bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950",
    topics: ["JSX Expressions", "useState & useEffect Lifecycle", "Component Reusability Patterns"],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    viewsCount: 38,
    status: "Available",
    expiresAt: "2026-09-23",
    meetUrl: "https://meet.google.com/aady-wd-react",
    meetId: "aady-wd-react",
    source: "Google Meet",
  },
];

const DEFAULT_SESSION_HISTORIES: SessionHistoryItem[] = [
  {
    id: "hist-001",
    course: "Java Programming",
    batch: "Batch C",
    module: "Java Syntax & Primitive Data Types",
    facultyName: "Ramesh Kumar",
    date: "16 Aug 2026",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    duration: "60 min",
    presentCount: 11,
    absentCount: 1,
    totalCount: 12,
    meetUrl: "https://meet.google.com/aady-java-cls",
    meetId: "aady-java-cls",
    notes: ["Completed primitive data types", "Homework assigned: Exercise 2.1 to 2.4"],
    recordingId: "rec-001",
  }
];

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
