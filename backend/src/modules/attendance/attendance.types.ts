export interface RosterQuery {
  date: string;      // ISO date string, e.g. "2026-08-12"
  branchId?: string;
  batchId?: string;
  page?: number;
  limit?: number;
}

export interface MarkAttendanceDto {
  classSessionId: string;
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks?: string;
}

export interface BulkMarkAttendanceDto {
  classSessionId: string;
  entries: {
    studentId: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    remarks?: string;
  }[];
}
