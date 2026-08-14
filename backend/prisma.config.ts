import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  earlyAccess: true,
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || "postgresql://postgres:231101@localhost:5433/aadya_shadow",
  },
});
