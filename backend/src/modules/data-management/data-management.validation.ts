import { z } from "zod";

export const importEntityTypeSchema = z.enum(["students", "leads", "users"]);
export const exportEntityTypeSchema = z.enum(["students", "leads", "users", "branches"]);

export const templateQuerySchema = z.object({
  entityType: importEntityTypeSchema,
});

export const importPreviewSchema = z.object({
  entityType: importEntityTypeSchema,
  csv: z.string().min(1, "CSV content is required"),
  fileName: z.string().optional(),
});

export const exportSchema = z.object({
  entityType: exportEntityTypeSchema,
  filters: z.record(z.string(), z.unknown()).optional(),
});

export const listImportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const downloadTokenParamSchema = z.object({
  token: z.string().min(1),
});

export type ImportPreviewInput = z.infer<typeof importPreviewSchema>;
export type ExportInput = z.infer<typeof exportSchema>;
export type ListImportsQuery = z.infer<typeof listImportsQuerySchema>;
export type TemplateQuery = z.infer<typeof templateQuerySchema>;
