import { z } from "zod";

export const DocumentEntityEnum = z.enum(["STUDENT", "ADMISSION", "LEAD"]);
export const DocumentStatusEnum = z.enum(["PENDING", "UPLOADED", "VERIFIED", "REJECTED"]);

export const listDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  branchId: z.string().optional(),
  entityType: DocumentEntityEnum.optional(),
  entityId: z.string().optional(),
  status: DocumentStatusEnum.optional(),
  search: z.string().trim().optional(),
});

export const createDocumentSchema = z.object({
  entityType: DocumentEntityEnum,
  entityId: z.string().min(1),
  branchId: z.string().optional(),
  name: z.string().min(1).trim(),
  fileName: z.string().min(1).trim(),
  fileUrl: z.string().url().optional(),
  mimeType: z.string().optional(),
  fileSize: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export const updateDocumentSchema = z.object({
  name: z.string().min(1).trim().optional(),
  fileName: z.string().min(1).trim().optional(),
  fileUrl: z.string().url().optional(),
  mimeType: z.string().optional(),
  fileSize: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  status: DocumentStatusEnum.optional(),
});

export const verifyDocumentSchema = z.object({
  notes: z.string().optional(),
});

export const rejectDocumentSchema = z.object({
  rejectedReason: z.string().min(1, "Rejection reason is required").trim(),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
