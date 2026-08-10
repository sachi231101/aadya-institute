import type { Request, Response } from "express";
import { sendError } from "../utils/response";

export const notFoundMiddleware = (req: Request, res: Response): void => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};
