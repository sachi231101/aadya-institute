import type { LoginEventStatus, SecurityAlertType } from "@prisma/client";

export interface SecurityPolicyDto {
  id?: string;
  instituteId: string;
  maxLoginAttempts: number;
  lockDurationMinutes: number;
  loginRateLimitPerMinute: number;
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  passwordExpiryDays: number | null;
  preventPasswordReuse: number | null;
  ipRestrictionEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateSecurityPolicyInput {
  maxLoginAttempts?: number;
  lockDurationMinutes?: number;
  loginRateLimitPerMinute?: number;
  minPasswordLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecialChar?: boolean;
  passwordExpiryDays?: number | null;
  preventPasswordReuse?: number | null;
  ipRestrictionEnabled?: boolean;
}

export interface LoginHistoryQuery {
  page?: number;
  limit?: number;
  status?: LoginEventStatus;
  userId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface SecurityAlertsQuery {
  page?: number;
  limit?: number;
  type?: SecurityAlertType;
  resolved?: boolean;
}

export interface CreateAllowedIpInput {
  cidr: string;
  label?: string | null;
  isActive?: boolean;
}

export interface Setup2faResult {
  secret: string;
  otpauthUrl: string;
}

export interface Verify2faResult {
  enabled: true;
  recoveryCodes: string[];
}

export interface SessionView {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  expiresAt: Date;
  tokenMasked: string;
  isCurrent?: boolean;
}

export interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}
