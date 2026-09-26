export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/** Keep digits only, max 10 (Indian mobile). */
export const sanitizeMobileInput = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 10);

export const isValidPhone = (phone: string): boolean => {
  return /^[0-9]{10}$/.test(sanitizeMobileInput(phone));
};

/** Optional phone: empty OK, otherwise must be exactly 10 digits. */
export const isValidOptionalPhone = (phone: string): boolean => {
  const digits = sanitizeMobileInput(phone);
  return digits.length === 0 || digits.length === 10;
};
