import crypto from "crypto";
import { prisma } from "../../config/database";
import { env } from "../../config/env";

/**
 * Hash a raw refresh token using SHA-256.
 * We never store the raw token — only its hash.
 */
export const hashRefreshToken = (rawToken: string): string => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

/**
 * Parse JWT_REFRESH_EXPIRES_IN ("7d", "30d", "1h") into a future Date.
 */
const parseExpiresIn = (expiresIn: string): Date => {
  const now = Date.now();
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(now + 7 * 24 * 60 * 60 * 1000); // default 7d
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(now + value * multipliers[unit]);
};

/**
 * Store a new refresh token for a user.
 * Accepts the raw token, hashes it before storing.
 */
export const createRefreshToken = async (userId: string, rawToken: string) => {
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN);

  return prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
};

/**
 * Find a stored refresh token record by the raw token.
 */
export const findRefreshToken = async (rawToken: string) => {
  const tokenHash = hashRefreshToken(rawToken);
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
};

/**
 * Revoke a single refresh token by its ID.
 */
export const revokeRefreshToken = async (id: string) => {
  return prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
};

/**
 * Revoke ALL refresh tokens for a user (logout-all / reuse attack response).
 */
export const revokeAllRefreshTokens = async (userId: string) => {
  return prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
};

/**
 * Clean up expired tokens for a user (optional housekeeping).
 */
export const deleteExpiredRefreshTokens = async (userId: string) => {
  return prisma.refreshToken.deleteMany({
    where: {
      userId,
      expiresAt: { lt: new Date() },
    },
  });
};
