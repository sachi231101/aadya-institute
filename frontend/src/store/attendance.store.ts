import { create } from "zustand";
import { attendanceApi } from "../services/attendance.api";
import { AttendanceStatus } from "../constants/status";
import type { AttendanceRecord } from "../types/attendance.types";

interface AttendanceState {
  records: AttendanceRecord[];
  isLoading: boolean;
  fetchSessionAttendance: (sessionId: string) => Promise<void>;
  markAttendance: (classSessionId: string, studentId: string, status: AttendanceStatus) => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  records: [],
  isLoading: false,
  fetchSessionAttendance: async (sessionId: string) => {
    set({ isLoading: true });
    try {
      const response = await attendanceApi.getSessionAttendance(sessionId);
      set({ records: response.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  markAttendance: async (classSessionId: string, studentId: string, status: AttendanceStatus) => {
    try {
      const response = await attendanceApi.mark({ classSessionId, studentId, status });
      set((state) => {
        const existing = state.records.findIndex(r => r.studentId === studentId && r.classSessionId === classSessionId);
        if (existing >= 0) {
          const updated = [...state.records];
          updated[existing] = response.data;
          return { records: updated };
        }
        return { records: [...state.records, response.data] };
      });
    } catch (err) {
      console.error("Failed to mark attendance", err);
    }
  },
}));
