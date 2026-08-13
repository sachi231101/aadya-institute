import { create } from "zustand";
import { usersApi } from "../services/users.api";
import type { Counselor, CreateCounselorPayload, UpdateCounselorPayload } from "../types/counselor.types";

interface CounselorState {
  counselors: Counselor[];
  isLoading: boolean;
  error: string | null;
  fetchCounselors: (branchId?: string) => Promise<void>;
  addCounselor: (payload: CreateCounselorPayload) => Promise<Counselor | null>;
  updateCounselor: (id: string, payload: UpdateCounselorPayload) => Promise<boolean>;
  deleteCounselor: (id: string) => Promise<boolean>;
}

export const useCounselorStore = create<CounselorState>((set) => ({
  counselors: [],
  isLoading: false,
  error: null,

  fetchCounselors: async (branchId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await usersApi.getUsers({ 
        role: "COUNSELLOR", 
        limit: 100,
        ...(branchId ? { branchId } : {})
      });
      if (res.success && res.data) {
        const mapped: Counselor[] = res.data.map((u) => ({
          id: u.id,
          name: u.name,
          employeeCode: `CNS-${u.id.slice(-4).toUpperCase()}`,
          email: u.email || "",
          phone: u.phone || "",
          branchId: u.branchId || "main",
          branchName: u.branch?.name || "Aadya Central Branch",
          assignedLeadsCount: 0,
          activeStudentsCount: 0,
          status: u.status === "ACTIVE" ? "ACTIVE" : u.status === "INACTIVE" ? "INACTIVE" : "ON_LEAVE",
          createdAt: u.createdAt,
        }));
        set({ counselors: mapped, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch counselors", isLoading: false });
    }
  },

  addCounselor: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await usersApi.createUser({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password: payload.password || "Password@123",
        roles: ["COUNSELLOR"],
        branchId: payload.branchId || undefined,
      });

      if (res.success && res.data) {
        await get().fetchCounselors();
        set({ isLoading: false });
        const createdUser = res.data;
        const newCounselor = {
          id: createdUser.id,
          name: createdUser.name,
          employeeCode: payload.employeeCode || `CNS-${createdUser.id.slice(-4).toUpperCase()}`,
          email: createdUser.email || "",
          phone: createdUser.phone || "",
          branchId: createdUser.branchId || payload.branchId || "main",
          branchName: payload.branchName || "Main Campus",
          branchId: createdUser.branchId || "main",
          branchName: payload.branchName || "Aadya Central Branch",
          assignedLeadsCount: 0,
          activeStudentsCount: 0,
          status: payload.status || "ACTIVE",
          createdAt: createdUser.createdAt,
        };
        set((state) => ({ counselors: [...state.counselors, newCounselor] }));
        return newCounselor;
      }
      set({ isLoading: false });
      return null;
    } catch (err: any) {
      const backendErr = err.response?.data;
      let errMsg = backendErr?.message || err.message || "Failed to add counselor";
      if (backendErr?.errors && Array.isArray(backendErr.errors) && backendErr.errors.length > 0) {
        errMsg = backendErr.errors.map((e: any) => e.message || e.field).join(". ");
      }
      set({ error: errMsg, isLoading: false });
      return null;
    }
  },

  updateCounselor: async (id, payload) => {
    try {
      const res = await usersApi.updateUser(id, {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        branchId: payload.branchId,
      });
      if (payload.status) {
        await usersApi.updateUserStatus(id, {
          status: payload.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
        });
      }
      if (res.success) {
        set((state) => ({
          counselors: state.counselors.map((c) =>
            c.id === id
              ? {
                  ...c,
                  name: payload.name || c.name,
                  email: payload.email || c.email,
                  phone: payload.phone || c.phone,
                  branchId: payload.branchId || c.branchId,
                  status: payload.status || c.status,
                }
              : c
          ),
        }));
        return true;
      }
      return false;
    } catch (err: any) {
      const backendErr = err.response?.data;
      let errMsg = backendErr?.message || err.message || "Failed to update counselor";
      if (backendErr?.errors && Array.isArray(backendErr.errors) && backendErr.errors.length > 0) {
        errMsg = backendErr.errors.map((e: any) => e.message || e.field).join(". ");
      }
      set({ error: errMsg, isLoading: false });
      return false;
    }
  },

  deleteCounselor: async (id) => {
    try {
      const res = await usersApi.deleteUser(id);
      if (res.success) {
        set((state) => ({ counselors: state.counselors.filter((c) => c.id !== id) }));
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || "Failed to delete counselor" });
      return false;
    }
  },
}));
