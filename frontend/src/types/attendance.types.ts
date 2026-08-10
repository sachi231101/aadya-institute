import type { AttendanceStatus } from "../constants/status";

export interface AttendanceRecord {
  id: string;
  classSessionId: string;
  studentId: string;
  status: AttendanceStatus;
  markedAt: string;
  remarks?: string;
}
