import { z } from "zod";

export const listEmailTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1).trim(),
  subject: z.string().min(1).trim(),
  body: z.string().min(1),
  variables: z.array(z.string()).optional(),
});

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const sendTestEmailSchema = z.object({
  templateId: z.string().min(1),
  toEmail: z.string().email(),
  variables: z.record(z.string(), z.string()).optional(),
});

export const listEmailLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  templateId: z.string().optional(),
  status: z.enum(["PENDING", "SENT", "FAILED"]).optional(),
  search: z.string().trim().optional(),
});

export type ListEmailTemplatesQuery = z.infer<typeof listEmailTemplatesQuerySchema>;
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;
export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;
export type ListEmailLogsQuery = z.infer<typeof listEmailLogsQuerySchema>;
