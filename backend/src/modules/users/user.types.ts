import type { UserStatus } from "@prisma/client";

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  branchId?: string;
  status?: UserStatus;
}

export interface CreateUserInput {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  roles: string[]; // role names e.g. ["FACULTY"]
  instituteId: string;
  branchId?: string;
  modulePermissions?: string[]; // module keys e.g. ["students", "faculty", "leads_ai_calling"]
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string;
  branchId?: string;
  whatsappEnabled?: boolean;
}

export interface UpdateUserPermissionsInput {
  modulePermissions: string[]; // module keys e.g. ["students", "faculty"]
}

export interface UpdateWhatsappPreferenceInput {
  whatsappEnabled: boolean;
}

export interface UpdateUserStatusInput {
  status: UserStatus;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  instituteId: string;
  branchId: string | null;
  whatsappEnabled: boolean;
  roles: string[];
  modulePermissions: string[];
  createdAt: Date;
  updatedAt: Date;
}
