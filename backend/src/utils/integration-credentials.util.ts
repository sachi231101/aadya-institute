import { env } from "../config/env";
import { encrypt, decrypt } from "./encryption";

export type CredentialMap = Record<string, string | undefined | null>;

export const getIntegrationEncryptionSecret = (): string =>
  env.INTEGRATION_ENCRYPTION_KEY;

/** Encrypt a JSON credentials object for storage. */
export const encryptCredentials = (credentials: CredentialMap): string => {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === "string" && value.trim().length > 0) {
      cleaned[key] = value.trim();
    }
  }
  return encrypt(JSON.stringify(cleaned), getIntegrationEncryptionSecret());
};

/** Decrypt stored credentials. Returns empty object on failure/empty. */
export const decryptCredentials = (
  ciphertext: string | null | undefined
): Record<string, string> => {
  if (!ciphertext) return {};
  try {
    const raw = decrypt(ciphertext, getIntegrationEncryptionSecret());
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
};

/** Mask a secret for safe API responses, e.g. sk-••••abcd */
export const maskSecret = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "••••";
  const prefix =
    trimmed.startsWith("sk-") || trimmed.startsWith("rk_")
      ? trimmed.slice(0, 3)
      : trimmed.length > 8
        ? trimmed.slice(0, 2)
        : "";
  return `${prefix}••••${trimmed.slice(-4)}`;
};

/** Fingerprint used for "configured" display without decrypting every time. */
export const fingerprintSecret = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < 4) return "••••";
  return trimmed.slice(-4);
};

/** Primary secret key to mask for an integration type. */
export const pickPrimarySecret = (
  credentials: Record<string, string>
): string | null =>
  credentials.apiKey ||
  credentials.keySecret ||
  credentials.password ||
  credentials.webhookSecret ||
  Object.values(credentials)[0] ||
  null;
