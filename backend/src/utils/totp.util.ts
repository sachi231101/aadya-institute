import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Encode a buffer to RFC 4648 Base32 (no padding). */
export const base32Encode = (buffer: Buffer): string => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

/** Decode RFC 4648 Base32 (padding optional, case-insensitive). */
export const base32Decode = (input: string): Buffer => {
  const cleaned = input.replace(/=+$/, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

/** Generate a random Base32 TOTP secret (20 bytes → 32 chars). */
export const generateTotpSecret = (): string => {
  return base32Encode(crypto.randomBytes(20));
};

const hotp = (secret: Buffer, counter: number, digits = 6): string => {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = code % 10 ** digits;
  return otp.toString().padStart(digits, "0");
};

/**
 * Verify a TOTP code (RFC 6238 HMAC-SHA1, 30s step, ± ±1).
 */
export const verifyTotp = (
  base32Secret: string,
  token: string,
  options?: { window?: number; stepSeconds?: number; digits?: number }
): boolean => {
  const window = options?.window ?? 1;
  const step = options?.stepSeconds ?? 30;
  const digits = options?.digits ?? 6;
  const cleaned = String(token).replace(/\s/g, "");

  if (!/^\d{6}$/.test(cleaned)) return false;

  const secret = base32Decode(base32Secret);
  if (secret.length === 0) return false;

  const counter = Math.floor(Date.now() / 1000 / step);

  for (let i = -window; i <= window; i++) {
    if (hotp(secret, counter + i, digits) === cleaned) {
      return true;
    }
  }

  return false;
};

export const buildOtpAuthUrl = (
  secret: string,
  accountName: string,
  issuer = "Aadya Institute"
): string => {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
};
