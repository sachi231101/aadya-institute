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
  userId?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  instituteId: string;
  branchId?: string | null;
  roles: string[];
  permissions: string[];
  modulePermissions?: string[];
  /** Linked Student row id when the user has a student profile */
  studentId?: string | null;
  /** Linked Faculty row id when the user has a faculty profile */
  facultyId?: string | null;
}
