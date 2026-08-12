import { create } from "zustand";
import type { User } from "../types/auth.types";

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
}

const defaultAdminUser: User = {
  id: "admin-001",
  name: "Aadya Admin",
  email: "admin@aadya.in",
  phone: "+91 98765 43210",
  role: "ADMIN",
  roles: ["ADMIN"],
  instituteId: "inst-aadya-01",
  branchId: "branch-blr-01",
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: defaultAdminUser,
  token: localStorage.getItem("token"),
  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    set({ user, token });
  },
  updateUser: (data) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    }));
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },
}));
