import { AppError } from "../middlewares/error.middleware";
import { loadInstitutePolicy } from "../modules/security/security.service";

export interface PasswordPolicyFields {
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicyFields = {
  minPasswordLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
};

/**
 * Validate a password against institute security policy.
 * Returns null when valid, otherwise a human-readable error message.
 */
export const validatePasswordAgainstPolicy = (
  password: string,
  policy: Partial<PasswordPolicyFields> | null | undefined
): string | null => {
  const p = { ...DEFAULT_PASSWORD_POLICY, ...(policy ?? {}) };

  if (!password || password.length < p.minPasswordLength) {
    return `Password must be at least ${p.minPasswordLength} characters`;
  }
  if (p.requireUppercase && !/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (p.requireLowercase && !/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (p.requireNumber && !/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  if (p.requireSpecialChar && !/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character";
  }

  return null;
};

/** Load institute policy and throw 400 if password does not comply. */
export const assertPasswordMeetsInstitutePolicy = async (
  instituteId: string,
  password: string
): Promise<void> => {
  const policy = await loadInstitutePolicy(instituteId);
  const error = validatePasswordAgainstPolicy(password, policy);
  if (error) {
    throw new AppError(error, 400);
  }
};

export const buildPasswordRequirementsSummary = (
  policy: Partial<PasswordPolicyFields> | null | undefined
): string[] => {
  const p = { ...DEFAULT_PASSWORD_POLICY, ...(policy ?? {}) };
  const rules = [`At least ${p.minPasswordLength} characters`];
  if (p.requireUppercase) rules.push("One uppercase letter");
  if (p.requireLowercase) rules.push("One lowercase letter");
  if (p.requireNumber) rules.push("One number");
  if (p.requireSpecialChar) rules.push("One special character");
  return rules;
};
