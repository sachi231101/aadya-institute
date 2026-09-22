import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AuthUser } from "../auth/auth.types";
import { AppError } from "../../middlewares/error.middleware";
import { saveFile } from "../../integrations/storage/storage.client";
import {
  DEFAULT_TEMPLATE_NAMES,
  defaultDocumentLayout,
} from "./document-template.defaults";
import { DocumentTemplateRepository } from "./document-template.repository";
import type {
  ApiDocumentType,
  DocumentLayout,
  DocumentTemplateResponse,
} from "./document-template.types";
import {
  assertLayoutBindings,
  documentLayoutSchema,
} from "./document-template.validation";

const requireInstituteId = (currentUser: AuthUser): string => {
  if (!currentUser.instituteId) {
    throw new AppError("Institute context is required", 403);
  }
  return currentUser.instituteId;
};

const toResponse = (
  documentType: ApiDocumentType,
  name: string,
  layout: DocumentLayout,
  saved: boolean
): DocumentTemplateResponse => ({
  documentType,
  name,
  paperSize: "A4",
  layout,
  saved,
});

/** Layout used when generating a document for this institute. */
export const getTemplateLayout = async (
  instituteId: string,
  documentType: ApiDocumentType
): Promise<DocumentLayout> => {
  const row = await DocumentTemplateRepository.findByInstituteAndType(
    instituteId,
    documentType
  );
  if (!row) return defaultDocumentLayout(documentType);
  const parsed = documentLayoutSchema.safeParse(row.layout);
  return parsed.success ? parsed.data : defaultDocumentLayout(documentType);
};

export const getDocumentTemplate = async (
  currentUser: AuthUser,
  documentType: ApiDocumentType
): Promise<DocumentTemplateResponse> => {
  const instituteId = requireInstituteId(currentUser);
  const row = await DocumentTemplateRepository.findByInstituteAndType(
    instituteId,
    documentType
  );

  if (!row) {
    return toResponse(
      documentType,
      DEFAULT_TEMPLATE_NAMES[documentType],
      defaultDocumentLayout(documentType),
      false
    );
  }

  const parsed = documentLayoutSchema.safeParse(row.layout);
  return toResponse(
    documentType,
    row.name,
    parsed.success ? parsed.data : defaultDocumentLayout(documentType),
    true
  );
};

export const saveDocumentTemplate = async (
  currentUser: AuthUser,
  documentType: ApiDocumentType,
  input: { name?: string; layout: DocumentLayout }
): Promise<DocumentTemplateResponse> => {
  const instituteId = requireInstituteId(currentUser);
  const bindingError = assertLayoutBindings(documentType, input.layout);
  if (bindingError) {
    throw new AppError(bindingError, 422);
  }

  const name = input.name?.trim() || DEFAULT_TEMPLATE_NAMES[documentType];
  const row = await DocumentTemplateRepository.upsert(
    instituteId,
    documentType,
    name,
    input.layout
  );
  await DocumentTemplateRepository.clearGeneratedDocuments(instituteId, documentType);

  return toResponse(documentType, row.name, input.layout, true);
};

const LOGO_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const LOGO_NAME = /^logo-[0-9a-f-]{36}\.(png|jpe?g|webp|gif)$/i;

const logoDirectory = (): string =>
  path.resolve(process.env.LOCAL_UPLOADS_DIR || "./uploads", "document-logos");

export const saveDocumentLogo = async (
  file: Express.Multer.File | undefined
): Promise<{ url: string }> => {
  if (!file) {
    throw new AppError("Choose an image file", 400);
  }
  const extension = LOGO_TYPES[file.mimetype];
  if (!extension) {
    throw new AppError("Upload a PNG, JPG, WEBP, or GIF", 400);
  }

  const filename = `logo-${randomUUID()}${extension}`;
  await saveFile(file.buffer, filename, "document-logos");
  return { url: `/api/v1/administration/document-logos/${filename}` };
};

export const resolveDocumentLogoPath = (filename: string): string | null => {
  if (!LOGO_NAME.test(filename)) return null;
  const root = logoDirectory();
  const filePath = path.resolve(root, filename);
  const relative = path.relative(root, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  if (!fs.existsSync(filePath)) return null;
  return filePath;
};
