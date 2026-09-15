import { z } from "zod";

export const listStudyMaterialsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  batchId: z.string().optional(),
  classSessionId: z.string().optional(),
  search: z.string().trim().optional(),
});

export const createStudyMaterialSchema = z
  .object({
    title: z.string().min(1).trim(),
    description: z.string().trim().optional(),
    fileType: z.enum(["pdf", "slides", "code", "doc", "notes"]).default("pdf"),
    fileName: z.string().min(1).trim(),
    fileUrl: z.string().url(),
    fileSize: z.coerce.number().int().nonnegative().optional(),
    mimeType: z.string().optional(),
    batchId: z.string().optional(),
    classSessionId: z.string().optional(),
  })
  .refine((d) => Boolean(d.batchId || d.classSessionId), {
    message: "batchId or classSessionId is required",
  });

export type ListStudyMaterialsQuery = z.infer<typeof listStudyMaterialsQuerySchema>;
export type CreateStudyMaterialInput = z.infer<typeof createStudyMaterialSchema>;
