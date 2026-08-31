export interface CreateBatchScheduleDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdateBatchScheduleDto {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface GenerateSessionsDto {
  startDate?: string;
  endDate?: string;
}

export interface CreateBatchDto {
  name: string;
  code: string;
  courseId: string;
  facultyId?: string;
  branchId?: string;
  startDate: string;
  expectedEndDate?: string;
  capacity?: number;
  schedulePattern?: "MWF" | "TTS" | "WEEKEND" | "CUSTOM";
  timeSlot?: string;
  schedules?: CreateBatchScheduleDto[];
}

export interface UpdateBatchDto {
  name?: string;
  code?: string;
  courseId?: string;
  facultyId?: string;
  startDate?: string;
  expectedEndDate?: string;
  capacity?: number;
  status?: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  schedulePattern?: "MWF" | "TTS" | "WEEKEND" | "CUSTOM";
  timeSlot?: string;
}

export interface BatchQueryFilters {
  search?: string;
  courseId?: string;
  facultyId?: string;
  status?: string;
  page?: number;
  limit?: number;
}
