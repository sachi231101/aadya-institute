import { create } from "zustand";
import { studentsApi } from "../services/students.api";
import type { Student } from "../types/student.types";

interface StudentState {
  students: Student[];
  isLoading: boolean;
  error: string | null;
  fetchStudents: (branchId?: string) => Promise<void>;
  setStudents: (students: Student[]) => void;
}

export const useStudentStore = create<StudentState>((set) => ({
  students: [],
  isLoading: false,
  error: null,
  fetchStudents: async (branchId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await studentsApi.getAll({ limit: 100, branchId });
      set({ students: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch students", isLoading: false });
    }
  },
  setStudents: (students) => set({ students }),
}));
