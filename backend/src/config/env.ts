import dotenv from "dotenv";

dotenv.config({ override: true });

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
};
