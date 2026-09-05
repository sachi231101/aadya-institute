import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import { DataManagementService } from "./data-management.service";
import type {
  ImportPreviewInput,
  ExportInput,
  ListImportsQuery,
  TemplateQuery,
} from "./data-management.validation";

export const getTemplate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query as unknown as TemplateQuery;
    const data = DataManagementService.getTemplate(query.entityType);
    sendSuccess(res, data, 200, "Import template retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const previewImport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await DataManagementService.previewImport(
      toAuthUser(req),
      req.body as ImportPreviewInput
    );
    sendSuccess(res, data, 200, "Import preview generated successfully");
  } catch (err) {
    next(err);
  }
};

export const confirmImport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await DataManagementService.confirmImport(toAuthUser(req), String(req.params.id));
    sendSuccess(res, data, 200, "Import confirmed successfully");
  } catch (err) {
    next(err);
  }
};

export const listImports = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await DataManagementService.listImports(
      toAuthUser(req),
      req.query as unknown as ListImportsQuery
    );
    sendPaginated(res, result.data, result.meta, "Import jobs retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const exportData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await DataManagementService.exportData(toAuthUser(req), req.body as ExportInput, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    sendSuccess(res, data, 201, "Export created successfully");
  } catch (err) {
    next(err);
  }
};

export const downloadExport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const file = await DataManagementService.downloadExport(toAuthUser(req), String(req.params.token));
    res.download(file.filePath, file.fileName);
  } catch (err) {
    next(err);
  }
};

export const listDeleted = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await DataManagementService.listDeleted(toAuthUser(req));
    sendSuccess(res, data, 200, "Deleted records retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const restoreBranch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await DataManagementService.restoreBranch(toAuthUser(req), String(req.params.id));
    sendSuccess(res, data, 200, "Branch restored successfully");
  } catch (err) {
    next(err);
  }
};

export const getBackupStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await DataManagementService.getBackupStatus(toAuthUser(req));
    sendSuccess(res, data, 200, "Backup status retrieved successfully");
  } catch (err) {
    next(err);
  }
};
