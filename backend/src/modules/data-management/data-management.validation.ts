import { z } from "zod";

export const importEntityTypeSchema = z.enum(["students", "leads", "users"]);
export const exportEntityTypeSchema = z.enum(["students", "leads", "users", "branches"]);

export const templateQuerySchema = z.object({
  entityType: importEntityTypeSchema,
});

export const importPreviewSchema = z
  .object({
    entityType: importEntityTypeSchema,
    /** CSV text. Optional when fileBase64 is provided for .xlsx. */
    csv: z.string().optional(),
    fileName: z.string().optional(),
    /** Base64-encoded file body (used for .xlsx when csv is omitted). */
    fileBase64: z.string().optional(),
    /** When set (e.g. AI_CALLING), used as Lead.source if row has no source. */
    defaultLeadSource: z.string().max(64).optional(),
  })
  .superRefine((data, ctx) => {
    const hasCsv = Boolean(data.csv?.trim());
    const hasFile = Boolean(data.fileBase64?.trim());
    if (!hasCsv && !hasFile) {
      ctx.addIssue({
        code: "custom",
        message: "CSV content or fileBase64 is required",
        path: ["csv"],
      });
    }
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
