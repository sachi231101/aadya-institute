// ─── Faculty (aligned with Prisma Faculty + User + Branch) ──────────────

export type FacultyStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";

export interface FacultyUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
}

export interface FacultyBranch {
  id: string;
  name: string;
  code: string;
}

export interface Faculty {
  id: string;
  userId: string;
  instituteId: string;
  branchId: string;
  employeeCode: string;
  specialization: string | null;
  status: FacultyStatus;
  createdAt: string;
  updatedAt: string;
  user: FacultyUser;
  branch: FacultyBranch;
}

// ─── Faculty Course Assignment (via Batch model) ────────────────────────

export interface FacultyCourseAssignment {
  id: string;
  instituteId: string;
  branchId: string;
  courseId: string;
  facultyId: string;
  name: string;
  code: string;
  startDate: string;
  expectedEndDate: string | null;
  status: string;
  createdAt: string;
  course: { id: string; name: string; code: string };
  faculty: {
    id: string;
    employeeCode: string;
    specialization: string | null;
    user: { id: string; name: string; email: string | null };
  } | null;
  branch: { id: string; name: string; code: string };
  schedules: { dayOfWeek: number; startTime: string; endTime: string }[];
  _count: { enrollments: number };
}

// ─── Faculty Attendance ─────────────────────────────────────────────────

export interface FacultyAttendanceRecord {
  id: string;
  facultyId: string;
  classSessionId: string;
  loginAt: string | null;
  logoutAt: string | null;
  faculty: {
    id: string;
    employeeCode: string;
    user: { id: string; name: string; email: string | null };
  };
  classSession: {
    id: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    batch: { id: string; name: string; code: string };
  };
}

// ─── API Payloads ───────────────────────────────────────────────────────

export interface CreateFacultyPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  employeeCode: string;
  specialization?: string;
  branchId: string;
}

export interface UpdateFacultyPayload {
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  status?: FacultyStatus;
}

export interface FacultyListParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: FacultyStatus;
}

export interface FacultyCoursesParams {
  page?: number;
  limit?: number;
  facultyId?: string;
  branchId?: string;
}

export interface FacultyAttendanceParams {
  page?: number;
  limit?: number;
  facultyId?: string;
  branchId?: string;
  date?: string;
}

export interface AssignCoursePayload {
  batchId: string;
  facultyId: string;
}

export interface MarkAttendancePayload {
  facultyId: string;
  classSessionId: string;
  loginAt?: string;
  logoutAt?: string;
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
