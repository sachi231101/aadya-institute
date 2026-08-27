import { create } from "zustand";

export interface ClassFeedbackItem {
  id: string;
  sessionId: string;
  courseName: string;
  batchCode: string;
  facultyName: string;
  classDate: string;
  classTime: string;
  studentId: string;
  studentName: string;
  rating: number; // 1 to 5
  ratingLabel: "Poor" | "Fair" | "Good" | "Very Good" | "Excellent";
  classExperienceRating?: number;
  facultyRating?: number;
  teachingQuality?: "Excellent" | "Good" | "Average" | "Needs Improvement";
  comments?: string;
  submittedAt: string;
}

interface FeedbackStore {
  feedbacks: ClassFeedbackItem[];
  submitFeedback: (feedback: Omit<ClassFeedbackItem, "id" | "submittedAt">) => ClassFeedbackItem;
  getFeedbackForSession: (sessionId: string, studentId: string) => ClassFeedbackItem | undefined;
  getFacultyAverageRating: (facultyName: string) => { average: number; count: number };
}

const STORAGE_KEY = "aadya_class_feedbacks_v3";

const INITIAL_FEEDBACKS: ClassFeedbackItem[] = [
  {
    id: "fb-re-104",
    sessionId: "sc-re-104",
    courseName: "React Development Basics",
    batchCode: "RE-104",
    facultyName: "Adithya HM",
    classDate: "2025-05-27",
    classTime: "07:00 PM – 09:00 PM",
    studentId: "std-current",
    studentName: "Rahul Verma",
    rating: 4.5,
    ratingLabel: "Very Good",
    classExperienceRating: 5,
    facultyRating: 4,
    teachingQuality: "Excellent",
    comments: "Great live coding session on React Hooks, useEffect dependency arrays, and state optimization.",
    submittedAt: "27 May 2025, 09:10 PM",
  },
];

const loadInitialFeedbacks = (): ClassFeedbackItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load feedback from localStorage", e);
  }
  return INITIAL_FEEDBACKS;
};

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  feedbacks: loadInitialFeedbacks(),

  submitFeedback: (data) => {
    const newId = `fb-${Date.now()}`;
    const nowStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newFeedback: ClassFeedbackItem = {
      ...data,
      id: newId,
      submittedAt: nowStr,
    };

    set((state) => {
      // Remove any existing feedback for the same session by the same student to avoid duplicates
      const filtered = state.feedbacks.filter(
        (f) => !(f.sessionId === data.sessionId && f.studentId === data.studentId)
      );
      const updated = [newFeedback, ...filtered];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return { feedbacks: updated };
    });

    return newFeedback;
  },

  getFeedbackForSession: (sessionId, studentId) => {
    return get().feedbacks.find(
      (f) => f.sessionId === sessionId && f.studentId === studentId
    );
  },

  getFacultyAverageRating: (facultyName) => {
    const facultyFeedbacks = get().feedbacks.filter(
      (f) => f.facultyName.toLowerCase() === facultyName.toLowerCase()
    );
    if (facultyFeedbacks.length === 0) return { average: 5.0, count: 0 };
    const sum = facultyFeedbacks.reduce((acc, curr) => acc + curr.rating, 0);
    return {
      average: Number((sum / facultyFeedbacks.length).toFixed(1)),
      count: facultyFeedbacks.length,
    };
  },
}));
