import crypto from "crypto";
import { comparePassword } from "../../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map a Prisma user record (with roles + permissions joins) to the safe AuthUser shape.
 * Never exposes passwordHash or refresh tokens.
 */
const buildAuthUser = (user: any): AuthUser => {
  const roles = (user.userRoles ?? []).map((ur: any) => ur.role.name);
  const permissionsSet = new Set<string>();
  (user.userRoles ?? []).forEach((ur: any) => {
    (ur.role?.rolePermissions ?? []).forEach((rp: any) => {
      if (rp.permission?.name) {
        permissionsSet.add(rp.permission.name);
      }
    });
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    instituteId: user.instituteId,
    branchId: user.branchId,
    roles,
    permissions: Array.from(permissionsSet),
  };
};

/**
 * Generate a cryptographically secure random raw refresh token string.
 * This raw value is returned to the client once; only its SHA-256 hash is stored.
 */
const generateRawRefreshToken = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

// ─── Services ────────────────────────────────────────────────────────────────

export const loginService = async (
  input: LoginInput
): Promise<{ user: AuthUser; tokens: TokenPair }> => {
  const user = await findUserByEmailOrPhone(input.emailOrPhone);

  // Always return the same generic error to prevent user enumeration
  if (!user) throw new AppError("Invalid credentials", 401);

  // Verify status BEFORE password check (still return generic error)
  if (user.status !== "ACTIVE") throw new AppError("Invalid credentials", 401);

  const isValid = await comparePassword(input.password, user.passwordHash);
  if (!isValid) throw new AppError("Invalid credentials", 401);

  const authUser = buildAuthUser(user);

  const jwtPayload = {
    userId: user.id,
    instituteId: user.instituteId,
    branchId: user.branchId,
    roles: authUser.roles,
  };

  const accessToken = signAccessToken(jwtPayload);

  // Generate a random raw refresh token; store only its hash in the DB
  const rawRefreshToken = generateRawRefreshToken();
  await createRefreshToken(user.id, rawRefreshToken);

  logger.info({ userId: user.id, roles: authUser.roles }, "User logged in");

  return {
    user: authUser,
    tokens: {
      accessToken,
      refreshToken: rawRefreshToken,
    },
  };
};

export const refreshTokenService = async (rawRefreshToken: string): Promise<TokenPair> => {
  // Look up the stored token record by its hash
  const storedToken = await findRefreshToken(rawRefreshToken);

  if (!storedToken) {
    throw new AppError("Invalid refresh token", 401);
  }

  // Check for reuse of a revoked token — possible token theft
  if (storedToken.revokedAt !== null) {
    logger.warn(
      { userId: storedToken.userId },
      "Revoked refresh token reuse detected — revoking all user sessions"
    );
    // Revoke ALL sessions for this user as a security response
    await revokeAllRefreshTokens(storedToken.userId);
    throw new AppError("Refresh token has been revoked", 401);
  }

  // Check expiry
  if (storedToken.expiresAt < new Date()) {
    await revokeRefreshToken(storedToken.id);
    throw new AppError("Refresh token has expired", 401);
  }

  // Check associated user is still active
  const user = await findUserById(storedToken.userId);
  if (!user || user.status !== "ACTIVE") {
    await revokeRefreshToken(storedToken.id);
    throw new AppError("User account is not active", 401);
  }

  // Revoke the old token (rotation)
  await revokeRefreshToken(storedToken.id);

  const authUser = buildAuthUser(user);
  const jwtPayload = {
    userId: user.id,
    instituteId: user.instituteId,
    branchId: user.branchId,
    roles: authUser.roles,
  };

  const accessToken = signAccessToken(jwtPayload);
  const newRawRefreshToken = generateRawRefreshToken();
  await createRefreshToken(user.id, newRawRefreshToken);

  logger.info({ userId: user.id }, "Tokens refreshed");

  return {
    accessToken,
    refreshToken: newRawRefreshToken,
  };
};

export const logoutService = async (userId: string, rawRefreshToken: string): Promise<void> => {
  const storedToken = await findRefreshToken(rawRefreshToken);

  if (!storedToken || storedToken.userId !== userId) {
    // Token not found or doesn't belong to this user — still succeed (idempotent)
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
