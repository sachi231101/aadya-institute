import crypto from "crypto";
import { AppError } from "../../middlewares/error.middleware";
import { env } from "../../config/env";
import { encrypt, decrypt } from "../../utils/encryption";
import { comparePassword, hashPassword } from "../../utils/password";
import { createAuditLog } from "../../utils/audit-log.util";
import { buildMeta } from "../../utils/pagination";
import {
  generateTotpSecret,
  verifyTotp,
  buildOtpAuthUrl,
} from "../../utils/totp.util";
import { hashRefreshToken } from "../auth/auth.refresh-token.repository";
import type { AuthUser } from "../auth/auth.types";
import type {
  UpdateSecurityPolicyInput,
  LoginHistoryQuery,
  SecurityAlertsQuery,
  CreateAllowedIpInput,
  RequestMeta,
  SessionView,
  SecurityPolicyDto,
} from "./security.types";
import * as repo from "./security.repository";

const getEncryptionSecret = () =>
  env.GOOGLE_TOKEN_ENCRYPTION_KEY || env.JWT_SECRET;

const maskTokenHash = (hash: string): string => {
  if (hash.length <= 12) return "••••••••";
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
};

const ipv4ToInt = (ip: string): number | null => {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const v = Number(part);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
};

/** Basic IPv4 / CIDR membership check. */
export const ipMatchesCidr = (ip: string, cidr: string): boolean => {
  const cleanedIp = ip.replace(/^::ffff:/, "").trim();
  const [network, prefixStr] = cidr.includes("/")
    ? cidr.split("/")
    : [cidr, "32"];
  const prefix = Number(prefixStr);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const ipInt = ipv4ToInt(cleanedIp);
  const netInt = ipv4ToInt(network);
  if (ipInt === null || netInt === null) return false;

  if (prefix === 0) return true;
  const mask = prefix === 32 ? 0xffffffff : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (netInt & mask);
};

const mapPolicy = (
  instituteId: string,
  row: Awaited<ReturnType<typeof repo.findPolicyByInstituteId>>
): SecurityPolicyDto => {
  if (!row) {
    return {
      instituteId,
      ...repo.DEFAULT_SECURITY_POLICY,
    };
  }
  return {
    id: row.id,
    instituteId: row.instituteId,
    maxLoginAttempts: row.maxLoginAttempts,
    lockDurationMinutes: row.lockDurationMinutes,
    loginRateLimitPerMinute: row.loginRateLimitPerMinute,
    minPasswordLength: row.minPasswordLength,
    requireUppercase: row.requireUppercase,
    requireLowercase: row.requireLowercase,
    requireNumber: row.requireNumber,
    requireSpecialChar: row.requireSpecialChar,
    passwordExpiryDays: row.passwordExpiryDays,
    preventPasswordReuse: row.preventPasswordReuse,
    ipRestrictionEnabled: row.ipRestrictionEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

export const getSecurityPolicyService = async (
  currentUser: AuthUser
): Promise<SecurityPolicyDto> => {
  const row = await repo.findPolicyByInstituteId(currentUser.instituteId);
  return mapPolicy(currentUser.instituteId, row);
};

/** Load policy for login / password checks (creates nothing). */
export const loadInstitutePolicy = async (instituteId: string) => {
  const row = await repo.findPolicyByInstituteId(instituteId);
  return mapPolicy(instituteId, row);
};

export const updateSecurityPolicyService = async (
  currentUser: AuthUser,
  input: UpdateSecurityPolicyInput,
  meta: RequestMeta
) => {
  if (input.ipRestrictionEnabled === true) {
    const ips = await repo.findActiveAllowedIps(currentUser.instituteId);
    const requestIp = (meta.ipAddress || "").replace(/^::ffff:/, "");
    if (!requestIp) {
      throw new AppError(
        "Cannot enable IP restriction without a detectable client IP",
        400
      );
    }
    const allowed =
      ips.length > 0 &&
      ips.some((entry) => ipMatchesCidr(requestIp, entry.cidr));
    if (!allowed) {
      throw new AppError(
        "Add your current IP to the allowlist before enabling IP restriction (lockout prevention)",
        400
      );
    }
  }

  const updated = await repo.upsertPolicy(currentUser.instituteId, input);

  await createAuditLog({
    userId: currentUser.id,
    instituteId: currentUser.instituteId,
    branchId: currentUser.branchId,
    action: "SECURITY_POLICY_UPDATED",
    entityType: "InstituteSecurityPolicy",
    entityId: updated.id,
    newData: input,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await repo.createSecurityAlert({
    instituteId: currentUser.instituteId,
    type: "SECURITY_SETTING_CHANGED",
    severity: "MEDIUM",
    title: "Security policy updated",
    message: `Security policy was updated by ${currentUser.name || currentUser.email || currentUser.id}`,
    metadata: { fields: Object.keys(input) },
  });

  return mapPolicy(currentUser.instituteId, updated);
};

export const listLoginHistoryService = async (
  currentUser: AuthUser,
  query: LoginHistoryQuery
) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const { items, total } = await repo.findLoginHistory({
    instituteId: currentUser.instituteId,
    skip,
    take: limit,
    status: query.status,
    userId: query.userId,
    search: query.search,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
  });

  return { items, meta: buildMeta(total, page, limit) };
};

const toSessionView = (
  token: {
    id: string;
    userId: string;
    tokenHash: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    lastSeenAt: Date | null;
    expiresAt: Date;
    user?: { name: string; email: string | null } | null;
  },
  currentHash?: string | null
): SessionView => ({
  id: token.id,
  userId: token.userId,
  userName: token.user?.name ?? null,
  userEmail: token.user?.email ?? null,
  ipAddress: token.ipAddress,
  userAgent: token.userAgent,
  createdAt: token.createdAt,
  lastSeenAt: token.lastSeenAt,
  expiresAt: token.expiresAt,
  tokenMasked: maskTokenHash(token.tokenHash),
  isCurrent: currentHash ? token.tokenHash === currentHash : false,
});

export const listSessionsService = async (
  currentUser: AuthUser,
  currentRefreshToken?: string | null
) => {
  const isAdmin = currentUser.roles?.includes("ADMIN");
  const tokens = isAdmin
    ? await repo.findActiveSessionsForInstitute(currentUser.instituteId)
    : await repo.findActiveSessionsForUser(currentUser.id);

  const currentHash = currentRefreshToken
    ? hashRefreshToken(currentRefreshToken)
    : null;

  return tokens.map((t) => toSessionView(t, currentHash));
};

export const revokeSessionService = async (
  currentUser: AuthUser,
  sessionId: string,
  meta: RequestMeta
) => {
  const session = await repo.findRefreshTokenById(sessionId);
  if (!session || session.user.instituteId !== currentUser.instituteId) {
    throw new AppError("Session not found", 404);
  }

  const isAdmin = currentUser.roles?.includes("ADMIN");
  if (!isAdmin && session.userId !== currentUser.id) {
    throw new AppError("Forbidden — cannot revoke another user's session", 403);
  }

  if (session.revokedAt) {
    return { success: true };
  }

  await repo.revokeRefreshTokenById(session.id);

  await createAuditLog({
    userId: currentUser.id,
    instituteId: currentUser.instituteId,
    branchId: currentUser.branchId,
    action: "SESSION_REVOKED",
    entityType: "RefreshToken",
    entityId: session.id,
    newData: { targetUserId: session.userId },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await repo.createSecurityAlert({
    instituteId: currentUser.instituteId,
    type: "SESSION_REVOKED",
    severity: "LOW",
    title: "Session revoked",
    message: `A session for ${session.user.name || session.userId} was revoked`,
    metadata: {
      sessionId: session.id,
      targetUserId: session.userId,
      revokedBy: currentUser.id,
    },
  });

  return { success: true };
};

export const logoutOtherSessionsService = async (
  currentUser: AuthUser,
  keepCurrent?: string | null,
  meta?: RequestMeta
) => {
  const keepHash = keepCurrent ? hashRefreshToken(keepCurrent) : null;
  const result = await repo.revokeOtherUserSessions(currentUser.id, keepHash);

  await createAuditLog({
    userId: currentUser.id,
    instituteId: currentUser.instituteId,
    branchId: currentUser.branchId,
    action: "SESSION_REVOKED",
    entityType: "RefreshToken",
    entityId: currentUser.id,
    newData: { revokedCount: result.count, scope: "other_sessions" },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });

  return { revokedCount: result.count };
};

export const listAllowedIpsService = async (currentUser: AuthUser) => {
  return repo.findAllowedIps(currentUser.instituteId);
};

export const addAllowedIpService = async (
  currentUser: AuthUser,
  input: CreateAllowedIpInput,
  meta: RequestMeta
) => {
  try {
    const created = await repo.createAllowedIp({
      instituteId: currentUser.instituteId,
      cidr: input.cidr.trim(),
      label: input.label,
      isActive: input.isActive,
    });

    await createAuditLog({
      userId: currentUser.id,
      instituteId: currentUser.instituteId,
      branchId: currentUser.branchId,
      action: "ALLOWED_IP_ADDED",
      entityType: "AllowedIp",
      entityId: created.id,
      newData: { cidr: created.cidr, label: created.label },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return created;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new AppError("This CIDR is already in the allowlist", 409);
    }
    throw err;
  }
};

export const deleteAllowedIpService = async (
  currentUser: AuthUser,
  id: string,
  meta: RequestMeta
) => {
  const policy = await loadInstitutePolicy(currentUser.instituteId);
  if (policy.ipRestrictionEnabled) {
    const remaining = await repo.findActiveAllowedIps(currentUser.instituteId);
    const after = remaining.filter((r) => r.id !== id);
    const requestIp = (meta.ipAddress || "").replace(/^::ffff:/, "");
    const stillAllowed =
      requestIp && after.some((entry) => ipMatchesCidr(requestIp, entry.cidr));
    if (!stillAllowed) {
      throw new AppError(
        "Cannot remove this IP while IP restriction is enabled — you would lock yourself out",
        400
      );
    }
  }

  const result = await repo.deleteAllowedIp(id, currentUser.instituteId);
  if (result.count === 0) throw new AppError("Allowed IP not found", 404);

  await createAuditLog({
    userId: currentUser.id,
    instituteId: currentUser.instituteId,
    branchId: currentUser.branchId,
    action: "ALLOWED_IP_REMOVED",
    entityType: "AllowedIp",
    entityId: id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { success: true };
};

export const listAlertsService = async (
  currentUser: AuthUser,
  query: SecurityAlertsQuery
) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const { items, total } = await repo.findSecurityAlerts({
    instituteId: currentUser.instituteId,
    skip,
    take: limit,
    type: query.type,
    resolved: query.resolved,
  });

  return { items, meta: buildMeta(total, page, limit) };
};

export const resolveAlertService = async (
  currentUser: AuthUser,
  alertId: string
) => {
  const alert = await repo.resolveSecurityAlert(
    alertId,
    currentUser.instituteId
  );
  if (!alert) throw new AppError("Security alert not found", 404);
  return alert;
};

export const setup2faService = async (currentUser: AuthUser) => {
  const secret = generateTotpSecret();
  const encrypted = encrypt(secret, getEncryptionSecret());
  await repo.upsertTotpSecret(currentUser.id, encrypted);

  const account =
    currentUser.email || currentUser.phone || currentUser.name || currentUser.id;
  const otpauthUrl = buildOtpAuthUrl(secret, account);

  return { secret, otpauthUrl };
};

export const verify2faService = async (
  currentUser: AuthUser,
  code: string
) => {
  const record = await repo.findTotpSecret(currentUser.id);
  if (!record) {
    throw new AppError("2FA setup not started — call setup first", 400);
  }

  const secret = decrypt(record.encryptedSecret, getEncryptionSecret());
  if (!verifyTotp(secret, code)) {
    throw new AppError("Invalid authenticator code", 400);
  }

  await repo.enableTotpSecret(currentUser.id);

  const plainCodes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const codePlain = crypto.randomBytes(5).toString("hex").toUpperCase();
    plainCodes.push(codePlain);
    hashes.push(await hashPassword(codePlain));
  }
  await repo.replaceRecoveryCodes(currentUser.id, hashes);

  return { enabled: true as const, recoveryCodes: plainCodes };
};

export const disable2faService = async (
  currentUser: AuthUser,
  input: { password?: string; code?: string }
) => {
  const record = await repo.findTotpSecret(currentUser.id);
  if (!record || !record.enabled) {
    throw new AppError("2FA is not enabled", 400);
  }

  const user = await repo.findUserPasswordHash(currentUser.id);
  if (!user) throw new AppError("User not found", 404);

  let ok = false;
  if (input.password) {
    ok = await comparePassword(input.password, user.passwordHash);
  }
  if (!ok && input.code) {
    const secret = decrypt(record.encryptedSecret, getEncryptionSecret());
    ok = verifyTotp(secret, input.code);
  }

  if (!ok) {
    throw new AppError("Invalid password or authenticator code", 401);
  }

  await repo.deleteTotpSecret(currentUser.id);
  await repo.deleteAllRecoveryCodes(currentUser.id);

  return { disabled: true };
};

export const consumeRecoveryCodeService = async (
  currentUser: AuthUser,
  code: string
) => {
  const cleaned = code.replace(/\s|-/g, "").toUpperCase();
  const codes = await repo.findUnusedRecoveryCodes(currentUser.id);
  if (codes.length === 0) {
    throw new AppError("No recovery codes available", 400);
  }

  for (const entry of codes) {
    const match = await comparePassword(cleaned, entry.codeHash);
    if (match) {
      await repo.markRecoveryCodeUsed(entry.id);
      return { consumed: true, remaining: codes.length - 1 };
    }
  }

  throw new AppError("Invalid recovery code", 400);
};

/** Used by auth login to record history / alerts. */
export const recordLoginFailure = async (params: {
  instituteId: string;
  userId?: string | null;
  emailOrPhone: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  message?: string;
  maxLoginAttempts: number;
  lockDurationMinutes: number;
}) => {
  await repo.createLoginHistory({
    instituteId: params.instituteId,
    userId: params.userId,
    emailOrPhone: params.emailOrPhone,
    status: "FAILED",
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    message: params.message ?? "Invalid credentials",
  });

  const since = new Date(
    Date.now() - params.lockDurationMinutes * 60 * 1000
  );
  const failedCount = await repo.countRecentFailedLogins(
    params.instituteId,
    params.emailOrPhone,
    since
  );

  if (failedCount >= params.maxLoginAttempts) {
    await repo.createSecurityAlert({
      instituteId: params.instituteId,
      type: "MULTIPLE_FAILED_LOGINS",
      severity: "HIGH",
      title: "Multiple failed login attempts",
      message: `${failedCount} failed login attempts for ${params.emailOrPhone} within ${params.lockDurationMinutes} minutes`,
      metadata: {
        emailOrPhone: params.emailOrPhone,
        failedCount,
        ipAddress: params.ipAddress,
      },
    });

    await repo.createLoginHistory({
      instituteId: params.instituteId,
      userId: params.userId,
      emailOrPhone: params.emailOrPhone,
      status: "LOCKED",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      message: "Account temporarily locked due to failed attempts",
    });
  }

  return failedCount;
};

export const recordLoginSuccess = async (params: {
  instituteId: string;
  userId: string;
  emailOrPhone: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  return repo.createLoginHistory({
    instituteId: params.instituteId,
    userId: params.userId,
    emailOrPhone: params.emailOrPhone,
    status: "SUCCESS",
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
};

export const getFailedLoginCount = async (
  instituteId: string,
  emailOrPhone: string,
  lockDurationMinutes: number
) => {
  const since = new Date(Date.now() - lockDurationMinutes * 60 * 1000);
  return repo.countRecentFailedLogins(instituteId, emailOrPhone, since);
};
