import dotenv from "dotenv";

dotenv.config({ override: true });

const bool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL || "",
  REDIS_URL: process.env.REDIS_URL || "",
  // JWT — access token
  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || "change-this-access-secret-in-production",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "change-this-access-secret-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES_IN || "1d",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "1d",
  // JWT — refresh token
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "change-this-refresh-secret-in-production",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  // Seeding
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || "ChangeMe@123",
  // AiSensy WhatsApp
  AISENSY_API_KEY: process.env.AISENSY_API_KEY || "",
  AISENSY_BASE_URL: process.env.AISENSY_BASE_URL || "https://backend.aisensy.com/campaign/t1/api/v2",
  // Webhook security
  WHATSAPP_WEBHOOK_SECRET: process.env.WHATSAPP_WEBHOOK_SECRET || "",
  // Queue config
  WHATSAPP_MAX_RETRIES: Number(process.env.WHATSAPP_MAX_RETRIES) || 3,
  WHATSAPP_QUEUE_CONCURRENCY: Number(process.env.WHATSAPP_QUEUE_CONCURRENCY) || 5,
  // Google Workspace & Google Meet OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/v1/integrations/google/callback",
  GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID || "",
  GOOGLE_MEET_SCOPES: process.env.GOOGLE_MEET_SCOPES || "https://www.googleapis.com/auth/meetings.space.created https://www.googleapis.com/auth/meetings.space.readonly",
  GOOGLE_DRIVE_SCOPES: process.env.GOOGLE_DRIVE_SCOPES || "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly",
  GOOGLE_TOKEN_ENCRYPTION_KEY: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || "aadya-google-token-encryption-secret-key-32",
  /**
   * When false, BullMQ workers are not started in this process (API-only).
   * Defaults to true in development so `npm run dev` still processes jobs.
   */
  RUN_WORKERS: bool(process.env.RUN_WORKERS, (process.env.NODE_ENV || "development") !== "production"),
  /** Throttle low-priority automation during large live exams / peak traffic. */
  PEAK_MODE: bool(process.env.PEAK_MODE, false),
  /** Prisma-friendly default pool hint documented in deploy/; URL may override. */
  PRISMA_CONNECTION_LIMIT: Number(process.env.PRISMA_CONNECTION_LIMIT) || 15,
  /**
   * Comma-separated allowed browser origins for CORS (e.g. https://app.aadya.example).
   * Required in production. In development, localhost Vite ports are always allowed.
   */
  CORS_ORIGIN: process.env.CORS_ORIGIN || "",
  /** Public frontend base URL for invite links (e.g. http://localhost:5173). */
  FRONTEND_URL: process.env.FRONTEND_URL || "",
};
