// ─── Student (aligned with Prisma Student + User + Branch) ──────────────

export type StudentStatus = "ACTIVE" | "ON_LEAVE" | "COMPLETED" | "DISCONTINUED" | "CANCELLED";

export interface StudentUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
}

export interface StudentBranch {
  id: string;
  name: string;
  code: string;
}

export interface Student {
  id: string;
  userId: string | null;
  instituteId: string;
  branchId: string;
  studentCode: string;
  dateOfBirth: string | null;
  qualification: string | null;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
  user: StudentUser | null;
  branch: StudentBranch;
}

// ─── Student with details (from getById) ────────────────────────────────

export interface StudentAdmission {
  id: string;
  courseId: string;
  admissionDate: string;
  status: string;
  course: { id: string; name: string; code: string };
}

export interface StudentBatchEnrollment {
  id: string;
  batchId: string;
  status: string;
  joinedAt: string;
  batch: {
    id: string;
    name: string;
    code: string;
    status: string;
    course: { id: string; name: string; code: string };
  };
}

export interface StudentDetail extends Student {
  admissions: StudentAdmission[];
  batchEnrollments: StudentBatchEnrollment[];
}

// ─── Student Performance Metrics ────────────────────────────────────────

export interface TestScore {
  testName: string;
  score: number;
  maxScore: number;
}

export interface EnrolledCourse {
  courseId: string;
  courseName: string;
  courseCode: string;
  batchName: string;
  batchCode: string;
  completionPercentage: number;
  totalModules: number;
  completedModules: number;
}

export interface StudentPerformanceMetrics {
  studentId: string;
  overallAttendancePercent: number;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  testScores: TestScore[];
  enrolledCourses: EnrolledCourse[];
  discontinuationAlert: boolean;
  maxConsecutiveAbsences: number;
}

// ─── API Payloads ───────────────────────────────────────────────────────

export interface CreateStudentPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  studentCode: string;
  dateOfBirth?: string;
  qualification?: string;
  branchId: string;
}

export interface UpdateStudentPayload {
  name?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  qualification?: string;
  status?: StudentStatus;
}

export interface StudentListParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: StudentStatus;
}

// ─── Paginated Response ─────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
