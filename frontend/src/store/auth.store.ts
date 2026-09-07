import { create } from "zustand";
import type { User } from "../types/auth.types";

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
}

const getInitialState = (): { token: string | null; user: User | null } => {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  if (!token) {
    return { token: null, user: null };
  }

  if (storedUser) {
    try {
      return { token, user: JSON.parse(storedUser) as User };
    } catch {
      localStorage.removeItem("user");
    }
  }

  return { token, user: null };
};

const initialState = getInitialState();

export const useAuthStore = create<AuthStore>((set) => ({
  user: initialState.user,
  token: initialState.token,
  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token });
  },
  updateUser: (data) => {
    set((state) => {
      if (!state.user) return { user: null };
      const updatedUser = {
        ...state.user,
        ...data,
        // Always keep a primary role for portal routing after /auth/me sync
        role:
          (data as User).role ||
          state.user.role ||
          (data.roles?.[0] ?? state.user.roles?.[0] ?? ""),
        roles: data.roles?.length ? data.roles : state.user.roles,
        // Replace permissions array entirely when provided (do not shallow-merge)
        permissions:
          data.permissions !== undefined ? data.permissions : state.user.permissions,
        modulePermissions:
          data.modulePermissions !== undefined
            ? data.modulePermissions
            : state.user.modulePermissions,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");
    set({ user: null, token: null });
  },
}));
