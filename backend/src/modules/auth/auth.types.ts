export interface LoginInput {
  emailOrPhone: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  instituteId: string;
  branchId?: string | null;
  roles: string[];
  permissions: string[];
}
