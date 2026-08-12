import { api } from "./api";
import type {
  DailyRosterItem,
  AttendanceRecord,
  MarkAttendancePayload,
  BulkMarkAttendancePayload,
  RosterQuery,
  PaginatedResponse,
  SingleResponse,
} from "../types/attendance.types";

export const attendanceApi = {
  // ─── Daily Student Roster ──────────────────────────────────────────────

  getRoster: async (params: RosterQuery): Promise<PaginatedResponse<DailyRosterItem>> => {
    const response = await api.get<PaginatedResponse<DailyRosterItem>>("/attendance/roster", { params });
    return response.data;
  },

  // ─── Mark Attendance ──────────────────────────────────────────────────

  mark: async (data: MarkAttendancePayload): Promise<SingleResponse<AttendanceRecord>> => {
    const response = await api.post<SingleResponse<AttendanceRecord>>("/attendance/mark", data);
    return response.data;
  },

  bulkMark: async (data: BulkMarkAttendancePayload): Promise<SingleResponse<AttendanceRecord[]>> => {
    const response = await api.post<SingleResponse<AttendanceRecord[]>>("/attendance/bulk", data);
    return response.data;
  },
};
