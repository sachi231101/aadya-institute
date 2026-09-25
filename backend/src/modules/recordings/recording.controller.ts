import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import * as service from "./recording.service";
import type { RecordingQueryDTO } from "./recording.types";

export const getRecordings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getRecordings(
      toAuthUser(req),
      req.query as RecordingQueryDTO
    );
    sendPaginated(res, result.data, result.meta, "Recordings retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getRecordingById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const recording = await service.getRecordingById(
      toAuthUser(req),
      req.params.id as string
    );
    sendSuccess(res, recording, 200, "Recording retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const recording = await service.createRecording(
      toAuthUser(req),
      req.body
    );
    sendSuccess(res, recording, 201, "Recording created successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.deleteRecording(
      toAuthUser(req),
      req.params.id as string
    );
    sendSuccess(res, result, 200, "Recording deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getRecordingAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const access = await service.getRecordingAccess(
      toAuthUser(req),
      req.params.id as string
    );
    sendSuccess(res, access, 200, "Recording playback access retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const streamRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      typeof req.query.token === "string" ? req.query.token : undefined;
    const media = await service.streamRecording(
      req.params.id as string,
      token,
      typeof req.headers.range === "string" ? req.headers.range : undefined
    );

    res.status(media.status);
    res.setHeader(
      "Content-Type",
      media.contentType || "video/mp4"
    );
    // Allow <video src> from the Vite/prod frontend origin when API host differs.
    // Helmet defaults to Cross-Origin-Resource-Policy: same-origin which blocks that.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (media.contentLength != null) {
      res.setHeader("Content-Length", String(media.contentLength));
    }
    if (media.contentRange) {
      res.setHeader("Content-Range", media.contentRange);
    }
    res.setHeader("Accept-Ranges", media.acceptRanges || "bytes");
    res.setHeader("Cache-Control", "private, no-store");
    // Intentionally omit Content-Disposition: attachment (inline view-only).

    media.stream.on("error", (err) => {
      if (!res.headersSent) {
        next(err);
        return;
      }
      res.destroy(err);
    });
    req.on("close", () => {
      if (typeof (media.stream as { destroy?: () => void }).destroy === "function") {
        media.stream.destroy();
      }
    });
    media.stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const syncRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.syncRecording(
      toAuthUser(req),
      req.params.id as string
    );
    sendSuccess(res, result, 200, result.message);
  } catch (error) {
    next(error);
  }
};

export const expireRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.expireRecording(
      toAuthUser(req),
      req.params.id as string
    );
    sendSuccess(res, result, 200, "Recording expired and deleted successfully");
  } catch (error) {
    next(error);
  }
};
