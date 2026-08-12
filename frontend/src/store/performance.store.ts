import { create } from "zustand";
import { studentsApi } from "../services/students.api";
import type { StudentPerformanceMetrics } from "../types/student.types";

interface PerformanceState {
  performanceMap: Record<string, StudentPerformanceMetrics>;
  isLoading: boolean;
  fetchPerformance: (studentId: string) => Promise<StudentPerformanceMetrics | null>;
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  performanceMap: {},
  isLoading: false,
  fetchPerformance: async (studentId: string) => {
    if (get().performanceMap[studentId]) {
      return get().performanceMap[studentId];
    }
    set({ isLoading: true });
    try {
      const response = await studentsApi.getPerformance(studentId);
      const data = response.data;
      set((state) => ({
        performanceMap: { ...state.performanceMap, [studentId]: data },
        isLoading: false,
      }));
      return data;
    } catch {
      set({ isLoading: false });
      return null;
    }
  },
}));
