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
  workLatitude?: number | null;
  workLongitude?: number | null;
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
  batchId: string;
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
  schedules: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    facultyId?: string | null;
    batchCourseId?: string | null;
  }[];
  classSessions?: { sessionStatus: string; facultyId?: string }[];
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
    branch?: { id: string; name: string; code: string } | null;
  };
  classSession: {
    id: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    roomNo?: string | null;
    sessionStatus?: string | null;
    batch: {
      id: string;
      name: string;
      code: string;
      course?: { id: string; name: string; code: string } | null;
    };
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
    workLatitude?: number | null;
    workLongitude?: number | null;
  };
  counts: {
    todayClasses: number;
    upcomingClasses: number;
    weekClasses?: number;
    liveClasses: number;
    completedThisWeek: number;
    pendingSubmissions: number;
    avgRating: number | null;
    totalRatings: number;
  };
  /** Own daily attendance summary for the faculty dashboard. */
  dailyAttendance?: {
    today: ({
      status: FacultyDailyAttendanceStatus;
      inTime: string | null;
      outTime: string | null;
      comments: string | null;
    } & FacultyDaySessionSummary) | null;
    monthPct: number;
  };
  todaySessions: FacultyDashboardSession[];
  upcomingSessions: FacultyDashboardSession[];
  /** Current calendar week (Mon–Sun) — admin-assigned sessions for this faculty */
  weekSessions?: FacultyDashboardSession[];
  /** Week start → +14 days flat list for Scheduled Classes UI */
  scheduledSessions?: FacultyDashboardSession[];
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
  presentCount?: number;
  conductedCount?: number;
  attendancePercentage?: number;
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
  workLatitude?: number | null;
  workLongitude?: number | null;
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
  workLatitude?: number | null;
  workLongitude?: number | null;
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

export interface MyStudentAttendanceParams {
  page?: number;
  limit?: number;
  search?: string;
  batchId?: string;
  studentId?: string;
  fromDate?: string;
  toDate?: string;
  month?: string;
}

export interface FacultyStudentAttendanceRecord {
  id: string;
  status: string;
  markedAt: string | null;
  studentId: string;
  studentCode: string;
  studentName: string;
  sessionId: string;
  sessionTitle?: string | null;
  date: string;
  startTime?: string;
  endTime?: string;
  batchId: string;
  batchName: string | null;
  batchCode: string | null;
  courseId: string | null;
  courseName: string | null;
  courseCode: string | null;
}

export interface FacultyStudentAttendanceStudentSummary {
  studentId: string;
  studentCode: string;
  studentName: string;
  present: number;
  absent: number;
  leave: number;
  total: number;
  attendancePercentage: number;
  batchCodes?: string[];
}

export interface FacultyStudentAttendanceData {
  records: FacultyStudentAttendanceRecord[];
  students: FacultyStudentAttendanceStudentSummary[];
  calendar: Record<string, { present: number; absent: number; leave: number; total: number }>;
  summary: {
    present: number;
    absent: number;
    leave: number;
    total: number;
    overallPercentage: number;
  };
}

export interface FacultyStudentAttendanceResponse {
  success: boolean;
  message?: string;
  data: FacultyStudentAttendanceData;
  meta: PaginationMeta;
}

export interface AssignCoursePayload {
  batchId: string;
  facultyId: string;
  /** Subject within a multi-course batch; updates BatchCourse.facultyId. */
  courseId?: string;
}

export interface MarkAttendancePayload {
  facultyId?: string;
  classSessionId: string;
  loginAt?: string;
  logoutAt?: string;
}

// ─── Faculty Daily Attendance (desk) ────────────────────────────────────

export type FacultyDailyAttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "WEEKLY_OFF";

/** Statuses accepted on desk bulk save (WEEKLY_OFF is legacy / not writable). */
export type FacultyDailyAttendanceWritableStatus = "PRESENT" | "ABSENT" | "LEAVE";

export type FacultyPunchType = "CHECK_IN" | "CHECK_OUT";
export type FacultyPunchSource = "MANUAL" | "AUTO_GEOFENCE";

export interface FacultyAttendancePunch {
  id: string;
  type: FacultyPunchType;
  /** IST HH:mm */
  timeHmm: string;
  /** ISO timestamp */
  punchedAt: string;
  source: FacultyPunchSource;
  latitude: number | null;
  longitude: number | null;
}

/** Derived per-day session summary (sessions = CHECK_IN → next CHECK_OUT). */
export interface FacultyDaySessionSummary {
  /** Sorted by punchedAt ascending. */
  punches: FacultyAttendancePunch[];
  /** True when the last punch of the day is CHECK_IN. */
  openSession: boolean;
  firstIn: string | null;
  lastOut: string | null;
  /** Sessions started (including the open one). */
  sessionCount: number;
  /** Sum of completed sessions only. */
  totalMinutes: number;
}

export interface FacultyDailyAttendanceRecord extends FacultyDaySessionSummary {
  id: string;
  facultyId: string;
  date: string;
  status: FacultyDailyAttendanceStatus;
  /** Day summary: first CHECK_IN (or admin-entered time). */
  inTime: string | null;
  /** Day summary: last CHECK_OUT; null while a session is open. */
  outTime: string | null;
  comments: string | null;
  markedBy?: string | null;
  updatedAt?: string;
}

export interface FacultyDailyAttendanceDeskRow {
  facultyId: string;
  employeeCode: string;
  designation: string | null;
  specialization: string | null;
  status: FacultyStatus;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
  branch: FacultyBranch | null;
  attendance: FacultyDailyAttendanceRecord | null;
}

export interface FacultyDailyAttendanceDeskResponse {
  mode: "desk";
  date: string;
  records: FacultyDailyAttendanceDeskRow[];
}

export interface FacultyDailyAttendanceHistoryResponse {
  mode: "history";
  facultyId: string;
  attendancePct: number;
  records: FacultyDailyAttendanceRecord[];
}

export type FacultyDailyAttendanceResponse =
  | FacultyDailyAttendanceDeskResponse
  | FacultyDailyAttendanceHistoryResponse;

export interface DailyAttendanceParams {
  date?: string;
  branchId?: string;
  facultyId?: string;
  from?: string;
  to?: string;
}

export interface BulkDailyAttendancePayload {
  date: string;
  records: Array<{
    facultyId: string;
    status: FacultyDailyAttendanceWritableStatus;
    inTime?: string | null;
    outTime?: string | null;
    comments?: string | null;
  }>;
}

// ─── Geo Check-In / Check-Out ───────────────────────────────────────────

export interface FacultyGeoCheckPayload {
  latitude: number;
  longitude: number;
}

export interface FacultyGeoCheckOutPayload {
  /** Required for AUTO_GEOFENCE; omitted for MANUAL (no GPS / geofence). */
  latitude?: number;
  longitude?: number;
  /** AUTO_GEOFENCE requires coords and >100 m; MANUAL skips location entirely. */
  source?: FacultyPunchSource;
}

export interface FacultyCheckInOutResult extends FacultyDaySessionSummary {
  id: string;
  facultyId: string;
  /** YYYY-MM-DD (IST) */
  date: string;
  status: FacultyDailyAttendanceStatus;
  inTime: string | null;
  outTime: string | null;
  comments: string | null;
  distanceMeters: number;
  /** The punch just recorded. */
  punch: FacultyAttendancePunch;
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
