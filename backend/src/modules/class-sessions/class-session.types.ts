export type ClassMode = "OFFLINE" | "ONLINE" | "HYBRID";
export type ClassStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface CreateClassSessionDto {
  title: string;
  batchId: string;
  batchModuleId?: string;
  facultyId: string;
  branchId?: string;
  scheduledDate: string; // ISO date string e.g. YYYY-MM-DD
  startTime: string; // e.g. "10:00 AM" or "10:00"
  endTime: string; // e.g. "12:00 PM" or "12:00"
  roomNo?: string;
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
