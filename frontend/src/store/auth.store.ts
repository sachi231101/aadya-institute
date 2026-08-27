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

  if (token && storedUser) {
    try {
      return { token, user: JSON.parse(storedUser) as User };
    } catch {
      localStorage.removeItem("user");
    }
  }
  return { token: null, user: null };
};

const initialState = getInitialState();

export const useAuthStore = create<AuthStore>((set) => ({
  user: initialState.user,
  token: initialState.token,
  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    // #region agent log
    fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'student-e2e',hypothesisId:'D',location:'auth.store.ts:setAuth',message:'Auth user set',data:{userId:user?.id,hasStudentId:!!(user as any)?.studentId,roles:(user as any)?.roles||(user as any)?.role,keys:user?Object.keys(user):[]},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
