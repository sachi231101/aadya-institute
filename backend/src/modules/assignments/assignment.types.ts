export interface AssignmentTargetDTO {
  courseId: string;
  courseModuleId?: string | null;
  topic?: string | null;
  batchId: string;
}

export interface CreateAssignmentDTO {
  classSessionId?: string;
  batchId?: string;
  facultyId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  assignedAt?: string;
  validTill?: string | null;
  maxMarks?: number;
  allowLate?: boolean;
  restrictStudentUpload?: boolean;
  youtubeVideoId?: string | null;
  assignmentTypeMasterId?: string | null;
  academicYearMasterId?: string;
  targets?: AssignmentTargetDTO[];
  recipientStudentIds?: string[];
}

export interface UpdateAssignmentDTO {
  title?: string;
  description?: string;
  dueDate?: string;
  assignedAt?: string;
  validTill?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  maxMarks?: number;
  allowLate?: boolean;
  restrictStudentUpload?: boolean;
  youtubeVideoId?: string | null;
  facultyId?: string;
  assignmentTypeMasterId?: string | null;
  academicYearMasterId?: string | null;
  classSessionId?: string | null;
  targets?: AssignmentTargetDTO[];
  recipientStudentIds?: string[] | null;
  attachmentFileKey?: string | null;
  attachmentFileName?: string | null;
}

export interface AssignmentQueryDTO {
  batchId?: string;
  classSessionId?: string;
  facultyId?: string;
  status?: string;
  search?: string;
  assignedFrom?: string;
  assignedTo?: string;
  academicYearMasterId?: string;
  assignmentTypeMasterId?: string;
  page?: number;
  limit?: number;
}

export interface SubmissionQueryDTO {
  status?: "PENDING" | "SUBMITTED" | "LATE" | "GRADED";
  statuses?: string;
  batchId?: string;
  facultyId?: string;
  search?: string;
  submittedOnly?: boolean;
  ungradedOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface SubmitAssignmentDTO {
  fileKey: string;
  fileName?: string;
  notes?: string;
}

export interface GradeSubmissionDTO {
  marks: number;
  feedback?: string;
}
