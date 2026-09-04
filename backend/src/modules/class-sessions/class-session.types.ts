export type ClassMode = "OFFLINE" | "ONLINE" | "HYBRID";
export type SessionType = "THEORY" | "PRACTICAL";
export type ClassStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";

export interface CreateClassSessionDto {
  title: string;
  batchId: string;
  batchModuleId?: string;
  batchCourseId?: string;
  facultyId: string;
  branchId?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  roomNo?: string;
  classroomMasterId?: string;
  timeslotMasterId?: string;
  mode?: ClassMode;
  meetingUrl?: string;
  notes?: string;
  sessionType?: SessionType;
}

export interface UpdateClassSessionDto {
  title?: string;
  batchId?: string;
  batchModuleId?: string;
  batchCourseId?: string | null;
  facultyId?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  roomNo?: string;
  classroomMasterId?: string;
  timeslotMasterId?: string;
  mode?: ClassMode;
  meetingUrl?: string;
  notes?: string;
  sessionType?: SessionType;
  status?: ClassStatus;
}

export interface QueryClassSessionsDto {
  batchId?: string;
  batchIds?: string[];
  facultyId?: string;
  branchId?: string;
  status?: ClassStatus;
  mode?: ClassMode;
  sessionType?: SessionType;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}
