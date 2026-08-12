import { api } from "./api";
import type { User } from "../types/auth.types";

interface ApiLoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

interface ApiMeResponse {
  success: boolean;
  data: User;
}

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: async (emailOrPhone: string, password: string): Promise<LoginResult> => {
    const response = await api.post<ApiLoginResponse>("/auth/login", {
      emailOrPhone,
      password,
    });
    return response.data.data;
  },
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiMeResponse>("/auth/me");
    return response.data.data;
  },
};
