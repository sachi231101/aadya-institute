import type { Response } from "express";
import type { PaginationMeta } from "./pagination";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  message = "Success"
): Response => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = "Success"
): Response => {
  return res.status(200).json({ success: true, message, data, meta });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown
): Response => {
  return res.status(statusCode).json({ success: false, message, errors });
};
