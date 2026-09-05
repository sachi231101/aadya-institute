import { api } from "./api";

export interface SecurityPolicy {
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
}

export interface PasswordRequirements {
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

export type UpdateSecurityPolicyPayload = Partial<
  Omit<SecurityPolicy, "id" | "instituteId">
>;

export interface LoginHistoryItem {
  id: string;
  instituteId: string;
  userId: string | null;
  emailOrPhone: string | null;
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  message: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string | null } | null;
}

export interface SecuritySession {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
  tokenMasked: string;
  isCurrent?: boolean;
}

export interface AllowedIp {
  id: string;
  instituteId: string;
  cidr: string;
  label: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface SecurityAlert {
  id: string;
  instituteId: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  metadata?: unknown;
  resolvedAt: string | null;
  createdAt: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const securityApi = {
  getPolicy: async () => {
    const res = await api.get("/security/policy");
    return res.data.data as SecurityPolicy;
  },

  getPasswordRequirements: async () => {
    const res = await api.get("/security/password-requirements");
    return res.data.data as PasswordRequirements;
  },

  updatePolicy: async (payload: UpdateSecurityPolicyPayload) => {
    const res = await api.patch("/security/policy", payload);
    return res.data.data as SecurityPolicy;
  },

  getLoginHistory: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => {
    const res = await api.get("/security/login-history", { params });
    return {
      data: (res.data.data ?? []) as LoginHistoryItem[],
      meta: res.data.meta as PaginatedMeta,
    };
  },

  getSessions: async (refreshToken?: string | null) => {
    const res = await api.get("/security/sessions", {
      params: refreshToken ? { refreshToken } : undefined,
      headers: refreshToken ? { "x-refresh-token": refreshToken } : undefined,
    });
    return res.data.data as SecuritySession[];
  },

  revokeSession: async (id: string) => {
    const res = await api.delete(`/security/sessions/${id}`);
    return res.data;
  },

  logoutOtherSessions: async (keepCurrent?: string | null) => {
    const res = await api.delete("/security/sessions", {
      data: keepCurrent ? { keepCurrent } : {},
    });
    return res.data;
  },

  getAllowedIps: async () => {
    const res = await api.get("/security/allowed-ips");
    return res.data.data as AllowedIp[];
  },

  addAllowedIp: async (payload: { cidr: string; label?: string }) => {
    const res = await api.post("/security/allowed-ips", payload);
    return res.data.data as AllowedIp;
  },

  removeAllowedIp: async (id: string) => {
    const res = await api.delete(`/security/allowed-ips/${id}`);
    return res.data;
  },

  getAlerts: async (params?: {
    page?: number;
    limit?: number;
    resolved?: boolean;
  }) => {
    const res = await api.get("/security/alerts", { params });
    return {
      data: (res.data.data ?? []) as SecurityAlert[],
      meta: res.data.meta as PaginatedMeta,
    };
  },

  resolveAlert: async (id: string) => {
    const res = await api.patch(`/security/alerts/${id}/resolve`);
    return res.data.data as SecurityAlert;
  },
};
