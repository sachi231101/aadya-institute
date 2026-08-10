import { api } from "./api";
import type { LoginResponse } from "../types/auth.types";

export const authApi = {
  login: async (emailOrPhone: string, passwordHash: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/auth/login", {
      emailOrPhone,
      password: passwordHash,
    });
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};
