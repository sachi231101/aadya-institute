/**
 * Normalize an Indian phone number to E.164 (+91XXXXXXXXXX)
 */
export const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+91${digits.slice(1)}`;
  return `+${digits}`;
};

export const isValidIndianPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return last10.length === 10 && /^[6-9]\d{9}$/.test(last10);
};
