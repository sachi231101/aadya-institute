import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import { sendError } from "../utils/response";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  console.error("🔴 UNHANDLED ERROR:", err);
  logger.error({ err }, "Unhandled error");
  sendError(res, "Internal Server Error", 500);
};
