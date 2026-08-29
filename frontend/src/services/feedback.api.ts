import { api } from "./api";

export interface Feedback {
  id: string;
  classSessionId: string;
  studentId: string;
  facultyId: string;
  rating: number;
  comment?: string;
  submittedAt: string;
  classSession?: {
    id: string;
    title: string;
    scheduledDate: string;
    batch?: { id: string; name: string };
  };
  student?: { id: string; user?: { name: string } };
}

export interface FacultyRating {
  facultyId: string;
  facultyName: string;
  branchName?: string | null;
  averageRating: number;
  totalFeedbacks: number;
  ratings: { rating: number; count: number }[];
}

export const feedbackApi = {
  submitFeedback: async (data: {
    classSessionId: string;
    studentId: string;
    facultyId: string;
    rating: number;
    comment?: string;
  }) => {
    const response = await api.post("/feedback", data);
    return response.data;
  },

  getFeedbackBySession: async (classSessionId: string) => {
    const response = await api.get(`/feedback`, { params: { classSessionId } });
    return response.data;
  },

  getFeedbackByStudent: async (studentId: string) => {
    const response = await api.get(`/feedback`, { params: { studentId } });
    return response.data;
  },

  getFeedbackByFaculty: async (facultyId: string) => {
    const response = await api.get(`/feedback`, { params: { facultyId, limit: 50 } });
    return response.data;
  },

  getFeedbackByFacultyMe: async () => {
    const response = await api.get(`/feedback`, { params: { limit: 50 } });
    return response.data;
  },

  getFacultyRatings: async (params?: { facultyId?: string; batchId?: string; branchId?: string }) => {
    const response = await api.get("/feedback/ratings", { params });
    return response.data;
  },
};
