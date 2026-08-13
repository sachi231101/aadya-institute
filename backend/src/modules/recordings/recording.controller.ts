import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/response";
import type { AuthUser } from "../auth/auth.types";
import * as service from "./recording.service";
import type { RecordingQueryDTO } from "./recording.types";

export const getRecordings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getRecordings(
      req.user as unknown as AuthUser,
      req.query as RecordingQueryDTO
    );
    sendSuccess(res, result.data, 200, "Recordings retrieved successfully");
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
      req.user as unknown as AuthUser,
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
      req.user as unknown as AuthUser,
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
      req.user as unknown as AuthUser,
      req.params.id as string
    );
    sendSuccess(res, result, 200, "Recording deleted successfully");
  } catch (error) {
    next(error);
  }
};
