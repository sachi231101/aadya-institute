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
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const parseConfiguredOrigins = (): string[] =>
  env.CORS_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

const isAllowedDevOrigin = (origin: string): boolean => {
  if (env.NODE_ENV === "production") return false;
  // localhost / loopback
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Private LAN (RFC1918) — same Wi‑Fi access during local development
  if (
    /^https?:\/\/(10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(:\d+)?$/.test(
      origin
    )
  ) {
    return true;
  }
  // ngrok tunnels (hostname rotates on free plan)
  return /^https:\/\/[a-z0-9-]+\.(ngrok-free\.dev|ngrok-free\.app|ngrok\.app)$/i.test(origin);
};

const allowedOrigins =
  env.NODE_ENV === "production"
    ? parseConfiguredOrigins()
    : [...new Set([...DEV_ORIGINS, ...parseConfiguredOrigins(), env.FRONTEND_URL].filter(Boolean))];

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
      if (allowedOrigins.includes(origin) || isAllowedDevOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(
  compression({
    // Never gzip recording streams — breaks Content-Length / Range for HTML5 video.
    filter: (req, res) => {
      const path = req.path || "";
      if (/\/recordings\/[^/]+\/stream$/i.test(path)) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);
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
