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

// Behind Nginx on Hostinger — required for correct client IP / rate limits
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.NODE_ENV === "production" ? true : true,
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
