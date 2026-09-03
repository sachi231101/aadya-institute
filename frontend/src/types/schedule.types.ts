export type ClassMode = "OFFLINE" | "ONLINE" | "HYBRID";
export type SessionType = "THEORY" | "PRACTICAL";
export type ClassStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";

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
  date: string;
  startTime: string;
  endTime: string;
  roomNo: string;
  classroomMasterId?: string;
  mode: ClassMode;
  sessionType?: SessionType;
  status: ClassStatus;
  attendanceMarked: boolean;
  attendanceStatus?: "PENDING" | "IN_PROGRESS" | "MARKED";
  meetingUrl?: string;
  notes?: string;
  enrolledStudentsCount?: number;
}

export interface CreateClassSessionPayload {
  title: string;
  batchId: string;
  batchModuleId?: string;
  facultyId: string;
  branchId?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  roomNo?: string;
  classroomMasterId?: string;
  timeslotMasterId?: string;
  mode?: ClassMode;
  sessionType?: SessionType;
  meetingUrl?: string;
  notes?: string;
}

export interface UpdateClassSessionPayload {
  title?: string;
  batchId?: string;
  batchModuleId?: string;
  facultyId?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  roomNo?: string;
  classroomMasterId?: string;
  timeslotMasterId?: string;
  mode?: ClassMode;
  sessionType?: SessionType;
  meetingUrl?: string;
  notes?: string;
  status?: ClassStatus;
}
