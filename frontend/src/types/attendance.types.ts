import type { AttendanceStatus } from "../constants/status";

export type StudentAttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE";

export interface AttendanceRecord {
  id: string;
  classSessionId: string;
  studentId: string;
  status: AttendanceStatus | StudentAttendanceStatus;
  markedAt: string;
  markedBy?: string;
  remarks?: string;
}

export interface StudentAttendanceHistoryItem {
  id: string;
  classSessionId: string;
  studentId: string;
  status: StudentAttendanceStatus | string;
  markedAt: string;
  markedBy?: string | null;
  remarks?: string | null;
  classSession?: {
    id: string;
    title?: string | null;
    scheduledDate?: string;
    startTime?: string | null;
    endTime?: string | null;
    faculty?: {
      id?: string;
      user?: { id?: string; name?: string | null } | null;
    } | null;
    batch?: {
      id: string;
      name: string;
      code: string;
      courseId?: string;
      course?: { id: string; name: string; code?: string | null } | null;
      batchCourses?: Array<{
        courseId: string;
        course?: { id: string; name: string; code?: string | null } | null;
      }>;
    } | null;
    batchCourse?: {
      courseId: string;
      course?: { id: string; name: string; code?: string | null } | null;
    } | null;
    batchModule?: {
      id: string;
      courseModule?: { id?: string; name?: string; code?: string | null } | null;
    } | null;
  } | null;
}

export interface StudentAttendanceSummary {
  studentId: string;
  studentCode?: string;
  studentName?: string;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  attendancePercentage: number;
}

// Daily roster item containing student information and attendance status for a given date
export interface DailyRosterItem {
  studentId: string;
  studentCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  branchId: string;
  branchName: string;
  classSessionId: string;
  status: AttendanceStatus | null;
  markedAt: string | null;
  remarks: string | null;
}

// ─── API Payloads ───────────────────────────────────────────────────────

export interface RosterQuery {
  date: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface MarkAttendancePayload {
  classSessionId: string;
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface BulkMarkAttendancePayload {
  classSessionId?: string;
  entries: {
    classSessionId?: string;
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }[];
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
