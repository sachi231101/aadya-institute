import { create } from "zustand";

export type AnnouncementType =
  | "Important Notice"
  | "Assignment Reminder"
  | "Module Update"
  | "Class Schedule Update"
  | "General Announcement"
  | "Placement Alert"
  | "Career Guidance"
  | "Fee Clearance Notice";

export type AnnouncementStatus = "Published" | "Draft";

export type AuthorRole = "Faculty" | "Counsellor";

export interface StudentReadRecord {
  studentId: string;
  studentName: string;
  readAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  authorRole: AuthorRole;
  courseName: string;
  batchCode: string;
  batchName: string;
  facultyName: string; // Author Name
  facultyDesignation: string; // Designation (e.g. Java Faculty or Senior Academic Counsellor)
  studentCount: number;
  status: AnnouncementStatus;
  createdAt: string;
  publishedAt?: string;
  sentCount: number;
  readCount: number;
  isImportant?: boolean;
  attachmentName?: string;
  attachmentSize?: string;
  iconBg: string;
  iconColor: string;
  readBy: StudentReadRecord[];
}

interface AnnouncementStore {
  announcements: AnnouncementItem[];
  addAnnouncement: (announcement: Omit<AnnouncementItem, "id" | "createdAt" | "readBy">) => AnnouncementItem;
  updateAnnouncement: (id: string, updates: Partial<AnnouncementItem>) => void;
  deleteAnnouncement: (id: string) => void;
  markAsRead: (announcementId: string, studentId: string, studentName: string) => void;
  markAllAsRead: (studentId: string, studentName: string, batchName?: string) => void;
}

const STORAGE_KEY = "aadya_announcements_v2";

const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
  // ─── 1. FACULTY ANNOUNCEMENT ───
  {
    id: "anc-1",
    title: "Java Programming – Important Update",
    message: `Dear Students,\n\nTomorrow's Java Programming class will start at 10:00 AM instead of 9:00 AM.\n\nPlease be informed and attend the class on time. Review the Object-Oriented design notes before attending.\n\nThank you.`,
    type: "Class Schedule Update",
    authorRole: "Faculty",
    courseName: "Java Programming",
    batchCode: "Batch A",
    batchName: "Batch A – Java Programming",
    facultyName: "Ramesh Kumar",
    facultyDesignation: "Java Faculty",
    studentCount: 28,
    status: "Published",
    createdAt: "22 May 2026, 10:30 AM",
    publishedAt: "22 May 2026, 10:30 AM",
    sentCount: 28,
    readCount: 22,
    isImportant: true,
    attachmentName: "Schedule_Change.pdf",
    attachmentSize: "245 KB",
    iconBg: "bg-blue-50",
    iconColor: "text-[#1D4ED8]",
    readBy: [
      { studentId: "std-current", studentName: "Rahul Verma", readAt: "10:32 AM" },
      { studentId: "std-2", studentName: "Priya Sharma", readAt: "10:35 AM" },
      { studentId: "std-3", studentName: "Arjun R", readAt: "10:40 AM" },
    ],
  },
  // ─── 2. COUNSELLOR ANNOUNCEMENT ───
  {
    id: "anc-c1",
    title: "Placement Drive Registration & Resume Workshop",
    message: `Dear Students,\n\nOur corporate placement cell is organizing a mandatory Resume Building and Mock Interview workshop this Friday at 3:00 PM in Seminar Hall 2.\n\nTop tech partner companies will begin campus shortlisting next month for Java Full Stack roles. Please submit your updated LinkedIn profile and resume.\n\nBest regards,\nPriya Sharma (Senior Academic Counsellor)`,
    type: "Placement Alert",
    authorRole: "Counsellor",
    courseName: "Java Programming",
    batchCode: "Batch A",
    batchName: "Batch A – Java Programming",
    facultyName: "Priya Sharma",
    facultyDesignation: "Senior Academic Counsellor",
    studentCount: 28,
    status: "Published",
    createdAt: "21 May 2026, 02:15 PM",
    publishedAt: "21 May 2026, 02:15 PM",
    sentCount: 28,
    readCount: 24,
    isImportant: true,
    attachmentName: "Placement_Drive_Guidelines_2026.pdf",
    attachmentSize: "1.2 MB",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
    readBy: [
      { studentId: "std-current", studentName: "Rahul Verma", readAt: "02:30 PM" },
    ],
  },
  // ─── 3. FACULTY ANNOUNCEMENT ───
  {
    id: "anc-2",
    title: "Assignment 2 – Submission Reminder",
    message: `Dear Students,\n\nPlease submit your Assignment 2 (Exception Handling & Collections Framework) before 25th May 11:59 PM. Submissions received after the deadline will be marked late. Upload your source code zip to the portal.`,
    type: "Assignment Reminder",
    authorRole: "Faculty",
    courseName: "Java Programming",
    batchCode: "Batch A",
    batchName: "Batch A – Java Programming",
    facultyName: "Ramesh Kumar",
    facultyDesignation: "Java Faculty",
    studentCount: 28,
    status: "Published",
    createdAt: "20 May 2026, 09:15 AM",
    publishedAt: "20 May 2026, 09:15 AM",
    sentCount: 28,
    readCount: 25,
    isImportant: false,
    attachmentName: "Assignment_2_Guidelines.pdf",
    attachmentSize: "512 KB",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    readBy: [
      { studentId: "std-current", studentName: "Rahul Verma", readAt: "09:30 AM" },
    ],
  },
  // ─── 4. COUNSELLOR ANNOUNCEMENT ───
  {
    id: "anc-c2",
    title: "One-on-One Career Mentorship Sessions",
    message: `Hello Batch A Students,\n\nWe are conducting personalized 1-on-1 career progression sessions this week to review your technical milestone performance and portfolio projects.\n\nSlots are open for booking via your student desk.\n\nWarm regards,\nRajesh Nair (Counsellor)`,
    type: "Career Guidance",
    authorRole: "Counsellor",
    courseName: "Java Programming",
    batchCode: "Batch A",
    batchName: "Batch A – Java Programming",
    facultyName: "Rajesh Nair",
    facultyDesignation: "Academic Counsellor",
    studentCount: 28,
    status: "Published",
    createdAt: "19 May 2026, 11:30 AM",
    publishedAt: "19 May 2026, 11:30 AM",
    sentCount: 28,
    readCount: 21,
    isImportant: false,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-700",
    readBy: [],
  },
  // ─── 5. FACULTY ANNOUNCEMENT ───
  {
    id: "anc-3",
    title: "New Module: Exception Handling",
    message: `We will be starting Exception Handling module from next class. Please download the reference slides and practice code templates attached before class.`,
    type: "Module Update",
    authorRole: "Faculty",
    courseName: "Java Programming",
    batchCode: "Batch A",
    batchName: "Batch A – Java Programming",
    facultyName: "Ramesh Kumar",
    facultyDesignation: "Java Faculty",
    studentCount: 28,
    status: "Published",
    createdAt: "18 May 2026, 04:45 PM",
    publishedAt: "18 May 2026, 04:45 PM",
    sentCount: 28,
    readCount: 26,
    isImportant: false,
    attachmentName: "Exception_Handling_Guide.pdf",
    attachmentSize: "2.4 MB",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    readBy: [],
  },
  // ─── 6. FACULTY ANNOUNCEMENT (DRAFT) ───
  {
    id: "anc-4",
    title: "Lab Session on Saturday",
    message: `Lab session will be conducted on Saturday at 2:00 PM. Attendance is compulsory for all students working on the mini project milestone.`,
    type: "Important Notice",
    authorRole: "Faculty",
    courseName: "Java Programming",
    batchCode: "Batch B",
    batchName: "Batch B – Java Programming",
    facultyName: "Ramesh Kumar",
    facultyDesignation: "Java Faculty",
    studentCount: 30,
    status: "Draft",
    createdAt: "16 May 2026, 02:20 PM",
    sentCount: 0,
    readCount: 0,
    isImportant: true,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    readBy: [],
  },
  // ─── 7. FACULTY ANNOUNCEMENT ───
  {
    id: "anc-5",
    title: "Syllabus Update",
    message: `Please find the updated syllabus for the next module. Additional practice problems on Multi-threading and Concurrency have been included in the study portal.`,
    type: "General Announcement",
    authorRole: "Faculty",
    courseName: "Java Programming",
    batchCode: "Batch A",
    batchName: "Batch A – Java Programming",
    facultyName: "Ramesh Kumar",
    facultyDesignation: "Java Faculty",
    studentCount: 28,
    status: "Published",
    createdAt: "10 May 2026, 11:00 AM",
    publishedAt: "10 May 2026, 11:00 AM",
    sentCount: 28,
    readCount: 28,
    isImportant: false,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    readBy: [],
  },
];

const loadInitial = (): AnnouncementItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load announcements from storage", e);
  }
  return INITIAL_ANNOUNCEMENTS;
};

export const useAnnouncementStore = create<AnnouncementStore>((set, get) => ({
  announcements: loadInitial(),

  addAnnouncement: (itemData) => {
    const newId = `anc-${Date.now()}`;
    const nowStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newAnnouncement: AnnouncementItem = {
      ...itemData,
      id: newId,
      createdAt: nowStr,
      publishedAt: itemData.status === "Published" ? nowStr : undefined,
      sentCount: itemData.status === "Published" ? itemData.studentCount : 0,
      readCount: 0,
      readBy: [],
    };

    set((state) => {
      const updated = [newAnnouncement, ...state.announcements];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return { announcements: updated };
    });

    return newAnnouncement;
  },

  updateAnnouncement: (id, updates) => {
    set((state) => {
      const updated = state.announcements.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return { announcements: updated };
    });
  },

  deleteAnnouncement: (id) => {
    set((state) => {
      const updated = state.announcements.filter((a) => a.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return { announcements: updated };
    });
  },

  markAsRead: (announcementId, studentId, studentName) => {
    set((state) => {
      const updated = state.announcements.map((a) => {
        if (a.id !== announcementId) return a;

        const alreadyRead = a.readBy.some((r) => r.studentId === studentId);
        if (alreadyRead) return a;

        const nowTime = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        const newReadRecord: StudentReadRecord = {
          studentId,
          studentName,
          readAt: nowTime,
        };

        return {
          ...a,
          readCount: a.readCount + 1,
          readBy: [...a.readBy, newReadRecord],
        };
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}

      return { announcements: updated };
    });
  },

  markAllAsRead: (studentId, studentName, batchName) => {
    set((state) => {
      const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const updated = state.announcements.map((a) => {
        if (a.status !== "Published") return a;
        if (batchName && a.batchName !== batchName) return a;

        const alreadyRead = a.readBy.some((r) => r.studentId === studentId);
        if (alreadyRead) return a;

        return {
          ...a,
          readCount: a.readCount + 1,
          readBy: [...a.readBy, { studentId, studentName, readAt: nowTime }],
        };
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}

      return { announcements: updated };
    });
  },
}));
