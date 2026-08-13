export type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE";

export interface AttendanceEntryItem {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceSummary {
  studentId: string;
  studentCode?: string;
  studentName?: string;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  attendancePercentage: number;
}
