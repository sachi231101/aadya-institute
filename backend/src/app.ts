import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import routes from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { globalApiRateLimiter } from "./middlewares/rate-limit.middleware";
import { logger } from "./config/logger";
import { prisma } from "./config/database";
import { env } from "./config/env";

const app = express();

const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const parseConfiguredOrigins = (): string[] =>
  env.CORS_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

const allowedOrigins =
  env.NODE_ENV === "production"
    ? parseConfiguredOrigins()
    : [...new Set([...DEV_ORIGINS, ...parseConfiguredOrigins()])];

if (env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  logger.warn(
    "CORS_ORIGIN is empty in production — browser cross-origin requests will be rejected. Set CORS_ORIGIN to your frontend URL(s)."
  );
}

// Behind Nginx on Hostinger — required for correct client IP / rate limits
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser clients (curl, Postman, same-origin server) often send no Origin
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.originalUrl }, "Incoming request");
  next();
});

app.use(globalApiRateLimiter);

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Aadya Institute API is running",
    peakMode: env.PEAK_MODE,
  });
});

app.get("/api/v1/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, message: "Ready", database: "up" });
  } catch {
    res.status(503).json({ success: false, message: "Database unavailable", database: "down" });
  }
});

app.use("/api/v1", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
