export type ClassMode = "OFFLINE" | "ONLINE" | "HYBRID";
export type ClassStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface ClassSession {
  id: string;
  title: string;
  batchId: string;
  batchCode: string;
  branchId?: string;
  courseId: string;
  courseName: string;
  facultyId: string;
  facultyName: string;
  facultyDesignation?: string;
  facultyAvatar?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "10:00 AM"
  endTime: string; // e.g. "12:00 PM"
  roomNo: string;
  mode: ClassMode;
  status: ClassStatus;
  attendanceMarked: boolean;
  attendanceStatus?: "PENDING" | "IN_PROGRESS" | "MARKED";
  meetingUrl?: string;
  notes?: string;
}

export interface CreateClassSessionPayload {
  title: string;
  batchId: string;
  batchModuleId?: string;
  facultyId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  roomNo?: string;
  mode?: ClassMode;
  meetingUrl?: string;
  notes?: string;
}

export interface UpdateClassSessionPayload {
  title?: string;
  batchId?: string;
  facultyId?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  roomNo?: string;
  mode?: ClassMode;
  meetingUrl?: string;
  notes?: string;
  status?: ClassStatus;
}
