import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import * as service from "./assignment.service";
import type { AssignmentQueryDTO, SubmissionQueryDTO } from "./assignment.types";

export const getAssignments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getAssignments(toAuthUser(req), req.query as AssignmentQueryDTO);
    sendPaginated(res, result.data, result.meta, "Assignments retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await service.getAssignmentById(toAuthUser(req), req.params.id as string);
    sendSuccess(res, assignment, 200, "Assignment retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await service.createAssignment(toAuthUser(req), req.body);
    sendSuccess(res, assignment, 201, "Assignment created successfully");
  } catch (error) {
    next(error);
  }
};

export const updateAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await service.updateAssignment(
      toAuthUser(req),
      req.params.id as string,
      req.body
    );
    sendSuccess(res, assignment, 200, "Assignment updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.deleteAssignment(toAuthUser(req), req.params.id as string);
    sendSuccess(res, result, 200, "Assignment deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const listSubmissions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.listSubmissions(toAuthUser(req), req.query as SubmissionQueryDTO);
    sendPaginated(res, result.data, result.meta, "Submissions retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const gradeSubmission = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.gradeSubmission(
      toAuthUser(req),
      req.params.submissionId as string,
      req.body
    );
    sendSuccess(res, result, 200, "Submission graded successfully");
  } catch (error) {
    next(error);
  }
};

export const submitAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.submitAssignment(
      toAuthUser(req),
      req.params.id as string,
      req.body
    );
    sendSuccess(res, result, 201, "Assignment submitted successfully");
  } catch (error) {
    next(error);
  }
};

export const uploadSubmissionFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: "File is required" });
      return;
    }
    const result = await service.uploadSubmissionFile(
      toAuthUser(req),
      req.params.id as string,
      file
    );
    sendSuccess(res, result, 201, "File uploaded successfully");
  } catch (error) {
    next(error);
  }
};

export const downloadSubmissionFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getSubmissionDownload(
      toAuthUser(req),
      req.params.submissionId as string
    );
    res.download(result.filePath, result.fileName);
  } catch (error) {
    next(error);
  }
};

export const getAssignmentStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await service.getAssignmentStats(toAuthUser(req));
    sendSuccess(res, stats, 200, "Assignment stats retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const uploadAttachment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: "File is required" });
      return;
    }
    const result = await service.uploadAttachment(
      toAuthUser(req),
      req.params.id as string,
      file
    );
    sendSuccess(res, result, 201, "Attachment uploaded successfully");
  } catch (error) {
    next(error);
  }
};

export const downloadAttachment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getAttachmentDownload(
      toAuthUser(req),
      req.params.id as string
    );
    res.download(result.filePath, result.fileName);
  } catch (error) {
    next(error);
  }
};

export const getEnrolledStudentsForBatches = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const raw = (req.query.batchIds as string) || "";
    const batchIds = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const students = await service.getBatchEnrolledStudents(toAuthUser(req), batchIds);
    sendSuccess(res, students, 200, "Enrolled students retrieved successfully");
  } catch (error) {
    next(error);
  }
};
