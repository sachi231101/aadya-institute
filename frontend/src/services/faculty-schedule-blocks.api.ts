import { api } from "./api";

export type FacultyScheduleBlockType = "BREAK" | "LUNCH";

export interface BackendFacultyScheduleBlock {
  id: string;
  instituteId: string;
  branchId: string;
  facultyId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  timeslotMasterId?: string | null;
  blockType: FacultyScheduleBlockType;
  createdAt: string;
  updatedAt: string;
  faculty?: {
    id: string;
    employeeCode: string;
    branchId: string;
    user?: { id: string; name: string; email?: string };
  };
  timeslotMaster?: { id: string; name: string; code?: string | null } | null;
}

export interface UpsertFacultyScheduleBlockPayload {
  facultyId: string;
  branchId?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  timeslotMasterId?: string;
  blockType: FacultyScheduleBlockType;
}

export interface FacultyScheduleBlockListParams {
  from?: string;
  to?: string;
  startDate?: string;
  endDate?: string;
  facultyId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

interface ListResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface SingleResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const facultyScheduleBlocksApi = {
  getAll: async (params?: FacultyScheduleBlockListParams) => {
    const { data } = await api.get<ListResponse<BackendFacultyScheduleBlock>>(
      "/faculty-schedule-blocks",
      { params }
    );
    return data;
  },

  upsert: async (payload: UpsertFacultyScheduleBlockPayload) => {
    const { data } = await api.put<SingleResponse<BackendFacultyScheduleBlock>>(
      "/faculty-schedule-blocks",
      payload
    );
    return data;
  },

  deleteById: async (id: string) => {
    const { data } = await api.delete<SingleResponse<{ id: string }>>(
      `/faculty-schedule-blocks/${id}`
    );
    return data;
  },

  deleteByKey: async (params: {
    facultyId: string;
    scheduledDate: string;
    startTime: string;
  }) => {
    const { data } = await api.delete<SingleResponse<{ deleted: number }>>(
      "/faculty-schedule-blocks",
      { params }
    );
    return data;
  },
};
