import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import { DocumentService } from "./document.service";
import type {
  ListDocumentsQuery,
  CreateDocumentInput,
  UpdateDocumentInput,
} from "./document.validation";

export const listDocuments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await DocumentService.list(toAuthUser(req), req.query as unknown as ListDocumentsQuery);
    sendPaginated(res, result.data, result.meta, "Documents retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const getDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doc = await DocumentService.getById(toAuthUser(req), String(req.params.id));
    sendSuccess(res, doc, 200, "Document retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const createDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doc = await DocumentService.create(toAuthUser(req), req.body as CreateDocumentInput);
    sendSuccess(res, doc, 201, "Document created successfully");
  } catch (err) {
    next(err);
  }
};

export const updateDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doc = await DocumentService.update(
      toAuthUser(req),
      String(req.params.id),
      req.body as UpdateDocumentInput
    );
    sendSuccess(res, doc, 200, "Document updated successfully");
  } catch (err) {
    next(err);
  }
};

export const verifyDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doc = await DocumentService.verify(
      toAuthUser(req),
      String(req.params.id),
      req.body?.notes
    );
    sendSuccess(res, doc, 200, "Document verified successfully");
  } catch (err) {
    next(err);
  }
};

export const rejectDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doc = await DocumentService.reject(
      toAuthUser(req),
      String(req.params.id),
      req.body.rejectedReason
    );
    sendSuccess(res, doc, 200, "Document rejected successfully");
  } catch (err) {
    next(err);
  }
};

export const deleteDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await DocumentService.remove(toAuthUser(req), String(req.params.id));
    sendSuccess(res, null, 200, "Document deleted successfully");
  } catch (err) {
    next(err);
  }
};
