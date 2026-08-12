export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string; // Primary role for routing/sidebar (derived from roles[0])
  roles: string[]; // All assigned roles from backend
  instituteId: string;
  branchId?: string | null;
  permissions?: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
