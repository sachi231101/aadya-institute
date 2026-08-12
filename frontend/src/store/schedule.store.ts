import { create } from "zustand";
import { classSessionsApi, mapBackendSession } from "../services/class-sessions.api";
import type { ClassSession, CreateClassSessionPayload, UpdateClassSessionPayload } from "../types/schedule.types";

interface ScheduleState {
  classes: ClassSession[];
  isLoading: boolean;
  error: string | null;

  fetchClasses: (filters?: Record<string, any>) => Promise<void>;
  addClassSession: (payload: CreateClassSessionPayload) => Promise<ClassSession | null>;
  updateClassSession: (id: string, payload: UpdateClassSessionPayload) => Promise<boolean>;
  deleteClassSession: (id: string) => Promise<boolean>;
  cancelClassSession: (id: string) => Promise<boolean>;
  toggleAttendanceMarked: (id: string) => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  classes: [],
  isLoading: false,
  error: null,

  fetchClasses: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const res = await classSessionsApi.getAll(filters);
      if (res.success && res.data) {
        const mapped = res.data.map(mapBackendSession);
        set({ classes: mapped, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch class sessions", isLoading: false });
    }
  },

  addClassSession: async (payload) => {
    try {
      const res = await classSessionsApi.create(payload);
      if (res.success && res.data) {
        await get().fetchClasses();
        return mapBackendSession(res.data);
      }
      return null;
    } catch (err: any) {
      set({ error: err.message || "Failed to add class session" });
      return null;
    }
  },

  updateClassSession: async (id, payload) => {
    try {
      const res = await classSessionsApi.update(id, payload);
      if (res.success) {
        await get().fetchClasses();
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || "Failed to update class session" });
      return false;
    }
  },

  cancelClassSession: async (id) => {
    try {
      const res = await classSessionsApi.cancel(id);
      if (res.success) {
        await get().fetchClasses();
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || "Failed to cancel class session" });
      return false;
    }
  },

  deleteClassSession: async (id) => {
    try {
      const res = await classSessionsApi.delete(id);
      if (res.success) {
        set((state) => ({ classes: state.classes.filter((c) => c.id !== id) }));
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || "Failed to delete class session" });
      return false;
    }
  },

  toggleAttendanceMarked: (id) => {
    set((state) => ({
      classes: state.classes.map((c) =>
        c.id === id ? { ...c, attendanceMarked: !c.attendanceMarked } : c
      ),
    }));
  },
}));
