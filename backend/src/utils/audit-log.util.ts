import { prisma } from "../config/database";
import { logger } from "../config/logger";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "refreshToken",
  "encryptedRefreshToken",
  "accessToken",
  "secret",
  "clientSecret",
  "jwtSecret",
]);

/**
 * Recursively masks sensitive fields in data payloads before logging
 */
export const maskSensitiveData = (data: any): any => {
  if (!data) return data;
  if (typeof data !== "object") return data;
  if (data instanceof Date) return data.toISOString();
  if (typeof data.toNumber === "function") return data.toNumber();
  if (typeof data.toFixed === "function" && typeof data.d === "object") return Number(data.toString());
  if (Array.isArray(data)) return data.map(maskSensitiveData);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = "***MASKED***";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = maskSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export interface CreateAuditLogParams {
  userId?: string | null;
  instituteId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string | null;
}

/**
 * Creates an immutable activity/audit log entry with automatic credential masking.
 * Non-blocking: failures are logged and do not throw.
 */
export const createAuditLog = async (params: CreateAuditLogParams): Promise<void> => {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId || undefined,
        instituteId: params.instituteId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldData: params.oldData ? maskSensitiveData(params.oldData) : undefined,
        newData: params.newData ? maskSensitiveData(params.newData) : undefined,
        ipAddress: params.ipAddress || undefined,
      },
    });
  } catch (err) {
    logger.error({ err, action: params.action, entityId: params.entityId }, "Failed to write audit log");
  }
};
