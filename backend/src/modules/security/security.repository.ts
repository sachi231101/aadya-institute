import type { LoginEventStatus, Prisma, SecurityAlertType } from "@prisma/client";
import { prisma } from "../../config/database";
import type { UpdateSecurityPolicyInput } from "./security.types";

export const DEFAULT_SECURITY_POLICY = {
  maxLoginAttempts: 5,
  lockDurationMinutes: 30,
  loginRateLimitPerMinute: 10,
  minPasswordLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
  passwordExpiryDays: null as number | null,
  preventPasswordReuse: null as number | null,
  ipRestrictionEnabled: false,
};

export const findPolicyByInstituteId = async (instituteId: string) => {
  return prisma.instituteSecurityPolicy.findUnique({
    where: { instituteId },
  });
};

export const upsertPolicy = async (
  instituteId: string,
  data: UpdateSecurityPolicyInput
) => {
  return prisma.instituteSecurityPolicy.upsert({
    where: { instituteId },
    create: {
      instituteId,
      ...DEFAULT_SECURITY_POLICY,
      ...data,
    },
    update: data,
  });
};

export const createLoginHistory = async (data: {
  instituteId: string;
  userId?: string | null;
  emailOrPhone?: string | null;
  status: LoginEventStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
  message?: string | null;
}) => {
  return prisma.loginHistory.create({
    data: {
      instituteId: data.instituteId,
      userId: data.userId ?? undefined,
      emailOrPhone: data.emailOrPhone ?? undefined,
      status: data.status,
      ipAddress: data.ipAddress ?? undefined,
      userAgent: data.userAgent ?? undefined,
      message: data.message ?? undefined,
    },
  });
};

export const countRecentFailedLogins = async (
  instituteId: string,
  emailOrPhone: string,
  since: Date
) => {
  return prisma.loginHistory.count({
    where: {
      instituteId,
      emailOrPhone,
      status: "FAILED",
      createdAt: { gte: since },
    },
  });
};

export const findLoginHistory = async (params: {
  instituteId: string;
  skip: number;
  take: number;
  status?: LoginEventStatus;
  userId?: string;
  search?: string;
  from?: Date;
  to?: Date;
}) => {
  const where: Prisma.LoginHistoryWhereInput = {
    instituteId: params.instituteId,
  };

  if (params.status) where.status = params.status;
  if (params.userId) where.userId = params.userId;
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = params.from;
    if (params.to) where.createdAt.lte = params.to;
  }
  if (params.search) {
    where.OR = [
      { emailOrPhone: { contains: params.search, mode: "insensitive" } },
      { ipAddress: { contains: params.search, mode: "insensitive" } },
      { message: { contains: params.search, mode: "insensitive" } },
      { user: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.loginHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.loginHistory.count({ where }),
  ]);

  return { items, total };
};

export const findActiveSessionsForInstitute = async (instituteId: string) => {
  return prisma.refreshToken.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { instituteId },
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

export const findActiveSessionsForUser = async (userId: string) => {
  return prisma.refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

export const findRefreshTokenById = async (id: string) => {
  return prisma.refreshToken.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, instituteId: true } },
    },
  });
};

export const revokeRefreshTokenById = async (id: string) => {
  return prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
};

export const revokeOtherUserSessions = async (
  userId: string,
  keepTokenHash?: string | null
) => {
  return prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(keepTokenHash ? { tokenHash: { not: keepTokenHash } } : {}),
    },
    data: { revokedAt: new Date() },
  });
};

export const findAllowedIps = async (instituteId: string) => {
  return prisma.allowedIp.findMany({
    where: { instituteId },
    orderBy: { createdAt: "desc" },
  });
};

export const findActiveAllowedIps = async (instituteId: string) => {
  return prisma.allowedIp.findMany({
    where: { instituteId, isActive: true },
  });
};

export const createAllowedIp = async (data: {
  instituteId: string;
  cidr: string;
  label?: string | null;
  isActive?: boolean;
}) => {
  return prisma.allowedIp.create({
    data: {
      instituteId: data.instituteId,
      cidr: data.cidr,
      label: data.label ?? undefined,
      isActive: data.isActive ?? true,
    },
  });
};

export const deleteAllowedIp = async (id: string, instituteId: string) => {
  return prisma.allowedIp.deleteMany({
    where: { id, instituteId },
  });
};

export const createSecurityAlert = async (data: {
  instituteId: string;
  type: SecurityAlertType;
  severity?: string;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}) => {
  return prisma.securityAlert.create({
    data: {
      instituteId: data.instituteId,
      type: data.type,
      severity: data.severity ?? "MEDIUM",
      title: data.title,
      message: data.message,
      metadata: data.metadata,
    },
  });
};

export const findSecurityAlerts = async (params: {
  instituteId: string;
  skip: number;
  take: number;
  type?: SecurityAlertType;
  resolved?: boolean;
}) => {
  const where: Prisma.SecurityAlertWhereInput = {
    instituteId: params.instituteId,
  };
  if (params.type) where.type = params.type;
  if (params.resolved === true) where.resolvedAt = { not: null };
  if (params.resolved === false) where.resolvedAt = null;

  const [items, total] = await Promise.all([
    prisma.securityAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.securityAlert.count({ where }),
  ]);

  return { items, total };
};

export const resolveSecurityAlert = async (id: string, instituteId: string) => {
  const alert = await prisma.securityAlert.findFirst({
    where: { id, instituteId },
  });
  if (!alert) return null;
  if (alert.resolvedAt) return alert;

  return prisma.securityAlert.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });
};

export const upsertTotpSecret = async (
  userId: string,
  encryptedSecret: string
) => {
  return prisma.userTotpSecret.upsert({
    where: { userId },
    create: {
      userId,
      encryptedSecret,
      enabled: false,
      verifiedAt: null,
    },
    update: {
      encryptedSecret,
      enabled: false,
      verifiedAt: null,
    },
  });
};

export const findTotpSecret = async (userId: string) => {
  return prisma.userTotpSecret.findUnique({ where: { userId } });
};

export const enableTotpSecret = async (userId: string) => {
  return prisma.userTotpSecret.update({
    where: { userId },
    data: { enabled: true, verifiedAt: new Date() },
  });
};

export const deleteTotpSecret = async (userId: string) => {
  return prisma.userTotpSecret.deleteMany({ where: { userId } });
};

export const replaceRecoveryCodes = async (
  userId: string,
  codeHashes: string[]
) => {
  await prisma.userRecoveryCode.deleteMany({ where: { userId } });
  if (codeHashes.length === 0) return [];
  await prisma.userRecoveryCode.createMany({
    data: codeHashes.map((codeHash) => ({ userId, codeHash })),
  });
  return prisma.userRecoveryCode.findMany({ where: { userId } });
};

export const findUnusedRecoveryCodes = async (userId: string) => {
  return prisma.userRecoveryCode.findMany({
    where: { userId, usedAt: null },
  });
};

export const markRecoveryCodeUsed = async (id: string) => {
  return prisma.userRecoveryCode.update({
    where: { id },
    data: { usedAt: new Date() },
  });
};

export const deleteAllRecoveryCodes = async (userId: string) => {
  return prisma.userRecoveryCode.deleteMany({ where: { userId } });
};

export const findUserPasswordHash = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, email: true, name: true, instituteId: true },
  });
};
