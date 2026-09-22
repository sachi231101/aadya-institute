import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { toAuthUser } from "../../utils/auth-user.util";
import { sendSuccess } from "../../utils/response";
import * as service from "./document-template.service";
import type {
  DocumentTemplateParams,
  UpsertDocumentTemplateBody,
} from "./document-template.validation";

export const getDocumentTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type } = req.params as unknown as DocumentTemplateParams;
    const data = await service.getDocumentTemplate(toAuthUser(req), type);
    sendSuccess(res, data, 200, "Document template retrieved");
  } catch (err) {
    next(err);
  }
};

export const saveDocumentTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type } = req.params as unknown as DocumentTemplateParams;
    const body = req.body as UpsertDocumentTemplateBody;
    const data = await service.saveDocumentTemplate(toAuthUser(req), type, body);
    sendSuccess(res, data, 200, "Document template saved");
  } catch (err) {
    next(err);
  }
};

export const uploadDocumentLogo = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.saveDocumentLogo(req.file);
    sendSuccess(res, data, 201, "Logo uploaded");
  } catch (err) {
    next(err);
  }
};

export const streamDocumentLogo = (req: Request, res: Response): void => {
  const filename = String(req.params.filename || "");
  const filePath = service.resolveDocumentLogoPath(filename);
  if (!filePath) {
    res.status(404).json({ success: false, message: "Logo not found" });
    return;
  }
  res.sendFile(filePath);
};
