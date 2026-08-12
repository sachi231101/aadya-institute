export type ClassMode = "OFFLINE" | "ONLINE" | "HYBRID";
export type ClassStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface ClassSession {
  id: string;
  title: string;
  batchId: string;
  batchCode: string;
  courseId: string;
  courseName: string;
  facultyId: string;
  facultyName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "10:00 AM"
  endTime: string; // e.g. "12:00 PM"
  roomNo: string; // e.g. "Lab 101" or "Hall A"
  mode: ClassMode;
  status: ClassStatus;
  attendanceMarked: boolean;
  meetingUrl?: string;
  notes?: string;
}
