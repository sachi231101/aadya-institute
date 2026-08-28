export type ClassMode = "OFFLINE" | "ONLINE" | "HYBRID";
export type ClassStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface CreateClassSessionDto {
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
  meetingUrl?: string;
  notes?: string;
}

export interface UpdateClassSessionDto {
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
  meetingUrl?: string;
  notes?: string;
  status?: ClassStatus;
}

export interface QueryClassSessionsDto {
  batchId?: string;
  facultyId?: string;
  branchId?: string;
  status?: ClassStatus;
  mode?: ClassMode;
  startDate?: string;
  endDate?: string;
  search?: string;
}
