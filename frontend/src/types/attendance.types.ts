import type { AttendanceStatus } from "../constants/status";

export interface AttendanceRecord {
  id: string;
  classSessionId: string;
  studentId: string;
  status: AttendanceStatus;
  markedAt: string;
  markedBy?: string;
  remarks?: string;
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
