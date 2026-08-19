import { api } from "./api";

export interface Assignment {
  id: string;
  classSessionId: string;
  batchId: string;
  facultyId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  classSession?: { id: string; title: string; scheduledDate: string };
  submissions?: AssignmentSubmission[];
  _count?: { submissions: number };
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt?: string;
  fileKey?: string;
  marks?: number;
  feedback?: string;
  evaluatedAt?: string;
  evaluatedBy?: string;
  status: string;
  student?: { id: string; user?: { name: string } };
}

export interface AssignmentQueryParams {
  page?: number;
  limit?: number;
  batchId?: string;
  facultyId?: string;
  classSessionId?: string;
  status?: string;
}

export const assignmentsApi = {
  getAssignments: async (params?: AssignmentQueryParams) => {
    const response = await api.get("/assignments", { params });
    return response.data;
  },

  getAssignmentById: async (id: string) => {
    const response = await api.get(`/assignments/${id}`);
    return response.data;
  },

  createAssignment: async (data: {
    classSessionId: string;
    batchId: string;
    facultyId: string;
    title: string;
    description?: string;
    dueDate?: string;
  }) => {
    const response = await api.post("/assignments", data);
    return response.data;
  },

  updateAssignment: async (id: string, data: Partial<Assignment>) => {
    const response = await api.patch(`/assignments/${id}`, data);
    return response.data;
  },

  deleteAssignment: async (id: string) => {
    const response = await api.delete(`/assignments/${id}`);
    return response.data;
  },
};
