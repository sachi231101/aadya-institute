import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { logger } from "./config/logger";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.originalUrl }, "Incoming request");
  next();
});

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ success: true, message: "Aadya Institute API is running" });
});

// All API routes
app.use("/api/v1", routes);

// 404 handler
app.use(notFoundMiddleware);

// Error handler (must be last)
app.use(errorMiddleware);

export default app;
