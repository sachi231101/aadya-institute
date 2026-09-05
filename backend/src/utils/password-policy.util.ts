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
