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
      const updatedUser = state.user ? { ...state.user, ...data } : null;
      if (updatedUser) {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
      return { user: updatedUser };
    });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null });
  },
}));
