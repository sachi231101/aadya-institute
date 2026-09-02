export interface BatchCourseScheduleSlotDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface ScheduleLineDto {
  courseId: string;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  timeSlot?: string;
  timeslotMasterId?: string;
  classroomMasterId?: string;
  facultyId?: string;
  status?: "ACTIVE" | "INACTIVE";
  attendanceEnabled?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface BatchCourseItemDto {
  courseId: string;
  facultyId?: string;
  sequence?: number;
  startDate?: string;
  expectedEndDate?: string;
  schedulePattern?: "MWF" | "TTS" | "WEEKEND" | "CUSTOM" | string;
  timeSlot?: string;
  timeslotMasterId?: string;
  classroomMasterId?: string;
  schedules?: BatchCourseScheduleSlotDto[];
}

export interface CreateBatchScheduleDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  batchCourseId?: string;
  facultyId?: string;
  timeslotMasterId?: string;
  classroomMasterId?: string;
  status?: "ACTIVE" | "INACTIVE";
  attendanceEnabled?: boolean;
}

export interface UpdateBatchScheduleDto {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  batchCourseId?: string | null;
  facultyId?: string | null;
  timeslotMasterId?: string | null;
  classroomMasterId?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  attendanceEnabled?: boolean;
}

export interface GenerateSessionsDto {
  startDate?: string;
  endDate?: string;
}

export interface CreateBatchDto {
  name: string;
  code: string;
  courseId?: string;
  facultyId?: string;
  courses?: BatchCourseItemDto[];
  scheduleLines?: ScheduleLineDto[];
  branchId?: string;
  startDate?: string;
  expectedEndDate?: string;
  capacity?: number;
  remark?: string;
  schedulePattern?: "MWF" | "TTS" | "WEEKEND" | "CUSTOM";
  timeSlot?: string;
  timeslotMasterId?: string;
  classroomMasterId?: string;
  schedules?: CreateBatchScheduleDto[];
}

export interface UpdateBatchDto {
  name?: string;
  code?: string;
  courseId?: string;
  facultyId?: string;
  courses?: BatchCourseItemDto[];
  scheduleLines?: ScheduleLineDto[];
  startDate?: string;
  expectedEndDate?: string;
  capacity?: number;
  remark?: string;
  status?: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  schedulePattern?: "MWF" | "TTS" | "WEEKEND" | "CUSTOM";
  timeSlot?: string;
  timeslotMasterId?: string;
  classroomMasterId?: string;
}

export interface BatchQueryFilters {
  search?: string;
  courseId?: string;
  facultyId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AvailableFacultyQuery {
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  timeslotMasterId?: string;
  startDate?: string;
  endDate?: string;
  branchId?: string;
  excludeBatchId?: string;
}
