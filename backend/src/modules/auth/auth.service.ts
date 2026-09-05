import crypto from "crypto";
import { comparePassword } from "../../utils/password";
import { signAccessToken } from "../../utils/jwt";
import { findUserByEmailOrPhone, findUserById } from "./auth.repository";
import {
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} from "./auth.refresh-token.repository";
import { AppError } from "../../middlewares/error.middleware";
import { logger } from "../../config/logger";
import type { LoginInput, TokenPair, AuthUser } from "./auth.types";
import { resolvePermissionsToModules } from "../../utils/module-permissions";
import {
  ALWAYS_ON_PERMISSIONS,
  type PermissionRoleScope,
} from "../../utils/permission-catalog";
import {
  loadInstitutePolicy,
  getFailedLoginCount,
  recordLoginFailure,
  recordLoginSuccess,
} from "../security/security.service";

/**
 * Map a Prisma user record (with roles + permissions joins) to the safe AuthUser shape.
 * Never exposes passwordHash or refresh tokens.
 */
const buildAuthUser = (user: any): AuthUser => {
  const roles = (user.userRoles ?? []).map((ur: any) => ur.role.name);
  const permissionsSet = new Set<string>();
  const allowedBranchIds: string[] = (user.branchAccesses ?? [])
    .map((ba: { branchId?: string }) => ba.branchId)
    .filter((id: string | undefined): id is string => Boolean(id));

  (user.userRoles ?? []).forEach((ur: any) => {
    (ur.role?.rolePermissions ?? []).forEach((rp: any) => {
      if (rp.permission?.name) {
        permissionsSet.add(rp.permission.name);
      }
    });
  });

  const hasUserPermissions = (user.userPermissions ?? []).length > 0;
  const isCenterManager = roles.includes("CENTER_MANAGER");
  const isCounsellor = roles.includes("COUNSELLOR");

  if (isCenterManager || isCounsellor) {
    const roleScope: PermissionRoleScope = isCounsellor ? "COUNSELLOR" : "CENTER_MANAGER";
    const permsList = hasUserPermissions
      ? (user.userPermissions ?? [])
          .map((up: { permission?: { name?: string } }) => up.permission?.name)
          .filter((name: string | undefined): name is string => Boolean(name))
      : [...ALWAYS_ON_PERMISSIONS];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      instituteId: user.instituteId,
      branchId: user.branchId,
      allowedBranchIds,
      roles,
      permissions: permsList,
      modulePermissions: resolvePermissionsToModules(permsList, roleScope),
      studentId: user.student?.id ?? null,
      facultyId: user.faculty?.id ?? null,
    };
  }

  (user.userPermissions ?? []).forEach((up: any) => {
    if (up.permission?.name) {
      permissionsSet.add(up.permission.name);
    }
  });

  const allPermsList = Array.from(permissionsSet);
  const roleScope: PermissionRoleScope = roles.includes("COUNSELLOR")
    ? "COUNSELLOR"
    : "CENTER_MANAGER";
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    instituteId: user.instituteId,
    branchId: user.branchId,
    allowedBranchIds,
    roles,
    permissions: allPermsList,
    modulePermissions: resolvePermissionsToModules(allPermsList, roleScope),
    studentId: user.student?.id ?? null,
    facultyId: user.faculty?.id ?? null,
  };
};

const generateRawRefreshToken = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

export const loginService = async (
  input: LoginInput
): Promise<{ user: AuthUser; tokens: TokenPair }> => {
  const user = await findUserByEmailOrPhone(input.emailOrPhone);

  // Always return the same generic error to prevent user enumeration
  if (!user) throw new AppError("Invalid credentials", 401);

  if (user.status !== "ACTIVE") throw new AppError("Invalid credentials", 401);

  const policy = await loadInstitutePolicy(user.instituteId);
  const failedCount = await getFailedLoginCount(
    user.instituteId,
    input.emailOrPhone.trim(),
    policy.lockDurationMinutes
  );

  if (failedCount >= policy.maxLoginAttempts) {
    throw new AppError(
      `Account temporarily locked. Try again after ${policy.lockDurationMinutes} minutes.`,
      429
    );
  }

  const isValid = await comparePassword(input.password, user.passwordHash);
  if (!isValid) {
    await recordLoginFailure({
      instituteId: user.instituteId,
      userId: user.id,
      emailOrPhone: input.emailOrPhone.trim(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      maxLoginAttempts: policy.maxLoginAttempts,
      lockDurationMinutes: policy.lockDurationMinutes,
    });
    throw new AppError("Invalid credentials", 401);
  }

  const authUser = buildAuthUser(user);

  const jwtPayload = {
    userId: user.id,
    instituteId: user.instituteId,
    branchId: user.branchId,
    allowedBranchIds: authUser.allowedBranchIds,
    roles: authUser.roles,
  };

  const accessToken = signAccessToken(jwtPayload);

  const rawRefreshToken = generateRawRefreshToken();
  await createRefreshToken(user.id, rawRefreshToken, {
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  await recordLoginSuccess({
    instituteId: user.instituteId,
    userId: user.id,
    emailOrPhone: input.emailOrPhone.trim(),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  logger.info({ userId: user.id, roles: authUser.roles }, "User logged in");

  return {
    user: authUser,
    tokens: {
      accessToken,
      refreshToken: rawRefreshToken,
    },
  };
};

export const refreshTokenService = async (
  rawRefreshToken: string,
  meta?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<TokenPair> => {
  const storedToken = await findRefreshToken(rawRefreshToken);

  if (!storedToken) {
    throw new AppError("Invalid refresh token", 401);
  }

  if (storedToken.revokedAt !== null) {
    logger.warn(
      { userId: storedToken.userId },
      "Revoked refresh token reuse detected — revoking all user sessions"
    );
    await revokeAllRefreshTokens(storedToken.userId);
    throw new AppError("Refresh token has been revoked", 401);
  }

  if (storedToken.expiresAt < new Date()) {
    await revokeRefreshToken(storedToken.id);
    throw new AppError("Refresh token has expired", 401);
  }

  const user = await findUserById(storedToken.userId);
  if (!user || user.status !== "ACTIVE") {
    await revokeRefreshToken(storedToken.id);
    throw new AppError("User account is not active", 401);
  }

  await revokeRefreshToken(storedToken.id);

  const authUser = buildAuthUser(user);
  const jwtPayload = {
    userId: user.id,
    instituteId: user.instituteId,
    branchId: user.branchId,
    allowedBranchIds: authUser.allowedBranchIds,
    roles: authUser.roles,
  };

  const accessToken = signAccessToken(jwtPayload);
  const newRawRefreshToken = generateRawRefreshToken();
  await createRefreshToken(user.id, newRawRefreshToken, {
    ipAddress: meta?.ipAddress ?? storedToken.ipAddress,
    userAgent: meta?.userAgent ?? storedToken.userAgent,
  });

  logger.info({ userId: user.id }, "Tokens refreshed");

  return {
    accessToken,
    refreshToken: newRawRefreshToken,
  };
};

export const logoutService = async (userId: string, rawRefreshToken: string): Promise<void> => {
  const storedToken = await findRefreshToken(rawRefreshToken);

  if (!storedToken || storedToken.userId !== userId) {
    return;
  }

  await revokeRefreshToken(storedToken.id);
  logger.info({ userId }, "User logged out — session revoked");
};

export const logoutAllService = async (userId: string): Promise<void> => {
  await revokeAllRefreshTokens(userId);
  logger.info({ userId }, "User logged out of all sessions");
};

export const getMeService = async (userId: string): Promise<AuthUser> => {
  const user = await findUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  if (user.status !== "ACTIVE") throw new AppError("Account is not active", 403);
  return buildAuthUser(user);
};
