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

export interface FacultyMasterRef {
  id: string;
  name: string;
  code: string | null;
}

export interface Faculty {
  id: string;
  userId: string;
  instituteId: string;
  branchId: string;
  employeeCode: string;
  specialization: string | null;
  designation: string | null;
  designationMasterId: string | null;
  qualification: string | null;
  qualificationMasterId: string | null;
  status: FacultyStatus;
  createdAt: string;
  updatedAt: string;
  user: FacultyUser;
  branch: FacultyBranch;
  designationMaster?: FacultyMasterRef | null;
  qualificationMaster?: FacultyMasterRef | null;
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
  classSessions?: { sessionStatus: string }[];
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

// ─── Faculty Dashboard ──────────────────────────────────────────────────

export interface FacultyDashboardSession {
  id: string;
  title: string | null;
  courseName: string | null;
  courseCode: string | null;
  subjectName: string | null;
  batchId: string | null;
  batchName: string | null;
  batchCode: string | null;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  roomNo: string | null;
  mode: string | null;
  meetingUrl: string | null;
  sessionStatus: string;
  assignedStudents: number;
}

export interface FacultyDashboardData {
  profile: {
    id: string;
    employeeCode: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    specialization: string | null;
    designation: string | null;
    qualification: string | null;
    status: FacultyStatus;
    branch: FacultyBranch | null;
  };
  counts: {
    todayClasses: number;
    upcomingClasses: number;
    liveClasses: number;
    completedThisWeek: number;
    pendingSubmissions: number;
    avgRating: number | null;
    totalRatings: number;
  };
  todaySessions: FacultyDashboardSession[];
  upcomingSessions: FacultyDashboardSession[];
  myBatches: {
    id: string;
    name: string;
    code: string;
    status: string;
    courseName: string | null;
    courseCode: string | null;
    studentCount: number;
  }[];
  recentFeedback: {
    id: string;
    rating: number;
    comment: string | null;
    submittedAt: string;
    studentName: string;
    batchName: string | null;
    sessionTitle: string | null;
  }[];
  pendingGrading: {
    id: string;
    title: string;
    dueDate: string | null;
    batchId: string;
    batchName: string | null;
    batchCode: string | null;
    pendingCount: number;
  }[];
}

export interface FacultyMyStudent {
  id: string;
  studentCode: string;
  status: string;
  user: { id: string; name: string; email: string | null; phone: string | null } | null;
  branch: FacultyBranch | null;
  batches: { id: string; name: string; code: string; courseName: string | null }[];
}

// ─── API Payloads ───────────────────────────────────────────────────────

export interface CreateFacultyPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  employeeCode?: string;
  specialization?: string;
  branchId: string;
  designationMasterId?: string;
  qualificationMasterId?: string;
}

export interface UpdateFacultyPayload {
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  designation?: string;
  designationMasterId?: string | null;
  qualificationMasterId?: string | null;
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

export interface MyStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
  batchId?: string;
}

export interface AssignCoursePayload {
  batchId: string;
  facultyId: string;
}

export interface MarkAttendancePayload {
  facultyId?: string;
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
