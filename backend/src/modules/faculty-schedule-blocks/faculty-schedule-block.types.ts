export type FacultyScheduleBlockType = "BREAK" | "LUNCH";

export interface UpsertFacultyScheduleBlockDto {
  facultyId: string;
  branchId?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  timeslotMasterId?: string;
  blockType: FacultyScheduleBlockType;
}

export interface QueryFacultyScheduleBlocksDto {
  facultyId?: string;
  branchId?: string;
  branchIds?: string[];
  from?: string;
  to?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DeleteFacultyScheduleBlockByKeyDto {
  facultyId: string;
  scheduledDate: string;
  startTime: string;
}
