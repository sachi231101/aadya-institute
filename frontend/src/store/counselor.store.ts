import { create } from "zustand";
import { usersApi } from "../services/users.api";
import { notifyPermissionChange } from "../hooks/useAuth";
import type { Counselor, CreateCounselorPayload, UpdateCounselorPayload, CounselorStatus } from "../types/counselor.types";

const mapUserStatus = (status: string): CounselorStatus => {
  if (status === "INACTIVE") return "INACTIVE";
  if (status === "BLOCKED") return "BLOCKED";
  return "ACTIVE";
};

const toCounselor = (
  u: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    branchId?: string | null;
    branch?: { name?: string } | null;
    status: string;
    createdAt: string;
  },
  extras?: Partial<Pick<Counselor, "assignedLeadsCount" | "convertedLeadsCount" | "branchName">>
): Counselor => ({
  id: u.id,
  name: u.name,
  employeeCode: `CNS-${u.id.slice(-4).toUpperCase()}`,
  email: u.email || "",
  phone: u.phone || "",
  branchId: u.branchId || "",
  branchName: extras?.branchName || u.branch?.name || "—",
  assignedLeadsCount: extras?.assignedLeadsCount ?? 0,
  convertedLeadsCount: extras?.convertedLeadsCount ?? 0,
  status: mapUserStatus(u.status),
  createdAt: u.createdAt,
});

interface CounselorState {
  counselors: Counselor[];
  isLoading: boolean;
  error: string | null;
  fetchCounselors: (branchId?: string) => Promise<void>;
  addCounselor: (payload: CreateCounselorPayload) => Promise<Counselor | null>;
  updateCounselor: (id: string, payload: UpdateCounselorPayload) => Promise<boolean>;
  deleteCounselor: (id: string) => Promise<boolean>;
}

export const useCounselorStore = create<CounselorState>((set, get) => ({
  counselors: [],
  isLoading: false,
  error: null,

  fetchCounselors: async (branchId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await usersApi.getUsers({
        role: "COUNSELLOR",
        limit: 100,
        ...(branchId ? { branchId } : {}),
      });
      if (res.success && res.data) {
        set({
          counselors: res.data.map((u) => toCounselor(u)),
          isLoading: false,
        });
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
        modulePermissions: payload.modulePermissions,
      });

      if (res.success && res.data) {
        await get().fetchCounselors(payload.branchId);
        set({ isLoading: false });
        notifyPermissionChange();
        return toCounselor(res.data, { branchName: payload.branchName });
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
          status: payload.status === "ACTIVE" ? "ACTIVE" : payload.status === "BLOCKED" ? "BLOCKED" : "INACTIVE",
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
                  branchId: payload.branchId ?? c.branchId,
                  branchName: payload.branchName || c.branchName,
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
