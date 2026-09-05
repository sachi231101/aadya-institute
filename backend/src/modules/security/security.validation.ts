import { z } from "zod";

const cidrRegex =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\/(?:[0-9]|[1-2]\d|3[0-2]))?$/;

export const updateSecurityPolicySchema = z.object({
  maxLoginAttempts: z.number().int().min(1).max(50).optional(),
  lockDurationMinutes: z.number().int().min(1).max(1440).optional(),
  loginRateLimitPerMinute: z.number().int().min(1).max(120).optional(),
  minPasswordLength: z.number().int().min(6).max(128).optional(),
  requireUppercase: z.boolean().optional(),
  requireLowercase: z.boolean().optional(),
  requireNumber: z.boolean().optional(),
  requireSpecialChar: z.boolean().optional(),
  passwordExpiryDays: z.number().int().min(1).max(3650).nullable().optional(),
  preventPasswordReuse: z.number().int().min(1).max(24).nullable().optional(),
  ipRestrictionEnabled: z.boolean().optional(),
});

export const loginHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z
    .enum(["SUCCESS", "FAILED", "LOGOUT", "PASSWORD_RESET", "PASSWORD_CHANGE", "LOCKED"])
    .optional(),
  userId: z.string().min(1).optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const securityAlertsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  type: z
    .enum([
      "MULTIPLE_FAILED_LOGINS",
      "SUSPICIOUS_AUTH",
      "PERMISSION_CHANGED",
      "ROLE_CHANGED",
      "INTEGRATION_CREDENTIAL_CHANGED",
      "DATA_EXPORTED",
      "SECURITY_SETTING_CHANGED",
      "SESSION_REVOKED",
    ])
    .optional(),
  resolved: z
    .preprocess((v) => {
      if (v === "true" || v === true) return true;
      if (v === "false" || v === false) return false;
      return undefined;
    }, z.boolean().optional()),
});

export const createAllowedIpSchema = z.object({
  cidr: z
    .string()
    .trim()
    .min(7)
    .max(43)
    .refine((v) => cidrRegex.test(v), {
      message: "Invalid IPv4 address or CIDR (e.g. 192.168.1.0/24)",
    }),
  label: z.string().trim().max(120).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const logoutOtherSessionsSchema = z.preprocess(
  (v) => (v == null || typeof v !== "object" ? {} : v),
  z.object({
    keepCurrent: z.string().min(1).optional(),
    refreshToken: z.string().min(1).optional(),
  })
);

export const verify2faSchema = z.object({
  code: z.string().trim().min(6).max(8),
});

export const disable2faSchema = z
  .object({
    password: z.string().min(1).optional(),
    code: z.string().trim().min(6).max(8).optional(),
  })
  .refine((d) => Boolean(d.password) || Boolean(d.code), {
    message: "Password or TOTP code is required",
  });

export const recovery2faSchema = z.object({
  code: z.string().trim().min(6).max(32),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});
