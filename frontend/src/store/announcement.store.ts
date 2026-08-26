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

const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [];

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
