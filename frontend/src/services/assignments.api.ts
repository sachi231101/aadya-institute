import { api } from "./api";

export type AssignmentSubmissionStatus = "PENDING" | "SUBMITTED" | "LATE" | "GRADED";

export interface AssignmentTarget {
  id?: string;
  courseId: string;
  courseModuleId?: string | null;
  topic?: string | null;
  batchId: string;
  course?: { id: string; name: string; code?: string };
  courseModule?: { id: string; name: string; code?: string; topics?: unknown };
  batch?: { id: string; name: string; code?: string; courseId?: string };
}

export interface AssignmentRecipient {
  id?: string;
  studentId: string;
  student?: {
    id: string;
    studentCode?: string;
    user?: { id: string; name: string; email?: string };
  };
}

export interface Assignment {
  id: string;
  classSessionId?: string | null;
  batchId: string;
  facultyId: string;
  title: string;
  description?: string;
  dueDate?: string;
  assignedAt?: string;
  validTill?: string | null;
  maxMarks?: number;
  allowLate?: boolean;
  restrictStudentUpload?: boolean;
  youtubeVideoId?: string | null;
  attachmentFileKey?: string | null;
  attachmentFileName?: string | null;
  assignmentTypeMasterId?: string | null;
  academicYearMasterId?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  classSession?: {
    id: string;
    title?: string;
    scheduledDate: string;
    startTime?: string;
    endTime?: string;
    batch?: { id: string; name: string; instituteId?: string; branchId?: string };
  };
  batch?: {
    id: string;
    name: string;
    code?: string;
    instituteId?: string;
    branchId?: string;
    facultyId?: string | null;
    course?: { id: string; name: string; code?: string };
  };
  faculty?: {
    id: string;
    employeeCode?: string;
    user?: { id: string; name: string; email?: string };
  };
  assignmentTypeMaster?: { id: string; name: string; code?: string };
  academicYearMaster?: { id: string; name: string; code?: string };
  targets?: AssignmentTarget[];
  recipients?: AssignmentRecipient[];
  submissions?: AssignmentSubmission[];
  _count?: { submissions: number; targets?: number; recipients?: number };
}

export interface AssignmentSubmission {
  id: string;
  assignmentId?: string;
  studentId: string;
  submittedAt?: string;
  fileKey?: string;
  fileName?: string;
  notes?: string;
  marks?: number;
  feedback?: string;
  evaluatedAt?: string;
  evaluatedBy?: string;
  submissionStatus?: AssignmentSubmissionStatus;
  status: string;
  student?: { id: string; studentCode?: string; user?: { name: string; email?: string } };
  assignment?: {
    id: string;
    title: string;
    dueDate?: string;
    maxMarks?: number;
    allowLate?: boolean;
    status?: string;
    batchId?: string;
    facultyId?: string;
    batch?: { id: string; name: string; code?: string };
    faculty?: { id: string; user?: { name: string } };
  };
}

export interface AssignmentQueryParams {
  page?: number;
  limit?: number;
  batchId?: string;
  facultyId?: string;
  classSessionId?: string;
  status?: string;
  search?: string;
  assignedFrom?: string;
  assignedTo?: string;
  academicYearMasterId?: string;
  assignmentTypeMasterId?: string;
}

export interface SubmissionQueryParams {
  page?: number;
  limit?: number;
  batchId?: string;
  facultyId?: string;
  status?: AssignmentSubmissionStatus;
  /** Comma-separated: SUBMITTED,LATE,GRADED */
  statuses?: string;
  submittedOnly?: boolean;
  ungradedOnly?: boolean;
  search?: string;
}

export interface AssignmentStats {
  activeAssignments: number;
  pendingSubmissions: number;
  pendingGrading: number;
}

export interface CreateAssignmentPayload {
  classSessionId?: string;
  batchId?: string;
  facultyId?: string;
  title: string;
  description?: string;
  dueDate: string;
  assignedAt?: string;
  validTill?: string | null;
  maxMarks?: number;
  allowLate?: boolean;
  restrictStudentUpload?: boolean;
  youtubeVideoId?: string | null;
  assignmentTypeMasterId?: string | null;
  academicYearMasterId: string;
  targets: Array<{
    courseId: string;
    courseModuleId?: string | null;
    topic?: string | null;
    batchId: string;
  }>;
  recipientStudentIds?: string[];
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

  getStats: async (): Promise<{ data: AssignmentStats }> => {
    const response = await api.get("/assignments/stats");
    return response.data;
  },

  listSubmissions: async (params?: SubmissionQueryParams) => {
    const response = await api.get("/assignments/submissions", { params });
    return response.data;
  },

  getEnrolledStudents: async (batchIds: string[]) => {
    const response = await api.get("/assignments/enrolled-students", {
      params: { batchIds: batchIds.join(",") },
    });
    return response.data as {
      data: Array<{
        id: string;
        studentCode: string;
        name: string;
        email?: string;
        batches: Array<{ id: string; name: string; code?: string }>;
      }>;
    };
  },

  createAssignment: async (data: CreateAssignmentPayload) => {
    const response = await api.post("/assignments", data);
    return response.data;
  },

  updateAssignment: async (
    id: string,
    data: Partial<CreateAssignmentPayload> & { status?: string }
  ) => {
    const response = await api.patch(`/assignments/${id}`, data);
    return response.data;
  },

  deleteAssignment: async (id: string) => {
    const response = await api.delete(`/assignments/${id}`);
    return response.data;
  },

  gradeSubmission: async (
    submissionId: string,
    data: { marks: number; feedback?: string }
  ) => {
    const response = await api.patch(`/assignments/submissions/${submissionId}/grade`, data);
    return response.data;
  },

  submitAssignment: async (
    assignmentId: string,
    data: { fileKey: string; fileName?: string; notes?: string }
  ) => {
    const response = await api.post(`/assignments/${assignmentId}/submissions`, data);
    return response.data;
  },

  uploadSubmissionFile: async (assignmentId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/assignments/${assignmentId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data as { data: { fileKey: string; fileName: string; url?: string } };
  },

  uploadAttachment: async (assignmentId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/assignments/${assignmentId}/attachment`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data as {
      data: { fileKey: string; fileName: string; url?: string };
    };
  },

  getDownloadUrl: (submissionId: string) =>
    `${api.defaults.baseURL}/assignments/submissions/${submissionId}/download`,

  getAttachmentDownloadUrl: (assignmentId: string) =>
    `${api.defaults.baseURL}/assignments/${assignmentId}/attachment/download`,
};
