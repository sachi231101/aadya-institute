import { create } from "zustand";
import { AttendanceStatus } from "../constants/status";
import type { AttendanceRecord } from "../types/attendance.types";

interface AttendanceState {
  records: AttendanceRecord[];
  getAttendanceForDate: (date: string) => AttendanceRecord[];
  markAttendance: (studentId: string, status: AttendanceStatus, date: string) => void;
  markBulkAttendance: (studentIds: string[], status: AttendanceStatus, date: string) => void;
}

// Generate some mock initial data for today
const today = new Date().toISOString().split('T')[0];

const mockRecords: AttendanceRecord[] = [
  {
    id: "ATT001",
    classSessionId: "SESSION-1",
    studentId: "STD001",
    status: AttendanceStatus.PRESENT,
    markedAt: today,
  },
  {
    id: "ATT002",
    classSessionId: "SESSION-1",
    studentId: "STD002",
    status: AttendanceStatus.PRESENT,
    markedAt: today,
  },
];

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  records: mockRecords,
  
  getAttendanceForDate: (date: string) => {
    return get().records.filter(r => r.markedAt.startsWith(date));
  },
  
  markAttendance: (studentId: string, status: AttendanceStatus, date: string) => set((state) => {
    const existingIndex = state.records.findIndex(r => r.studentId === studentId && r.markedAt.startsWith(date));
    
    if (existingIndex >= 0) {
      // Update existing record
      const newRecords = [...state.records];
      newRecords[existingIndex] = { ...newRecords[existingIndex], status };
      return { records: newRecords };
    } else {
      // Create new record
      const newRecord: AttendanceRecord = {
        id: `ATT${Math.floor(1000 + Math.random() * 9000)}`,
        classSessionId: "SESSION-1", // Mock session
        studentId,
        status,
        markedAt: date,
      };
      return { records: [...state.records, newRecord] };
    }
  }),
  
  markBulkAttendance: (studentIds: string[], status: AttendanceStatus, date: string) => set((state) => {
    let newRecords = [...state.records];
    
    studentIds.forEach(studentId => {
      const existingIndex = newRecords.findIndex(r => r.studentId === studentId && r.markedAt.startsWith(date));
      if (existingIndex >= 0) {
        newRecords[existingIndex] = { ...newRecords[existingIndex], status };
      } else {
        newRecords.push({
          id: `ATT${Math.floor(1000 + Math.random() * 9000)}`,
          classSessionId: "SESSION-1",
          studentId,
          status,
          markedAt: date,
        });
      }
    });
    
    return { records: newRecords };
  }),
}));
