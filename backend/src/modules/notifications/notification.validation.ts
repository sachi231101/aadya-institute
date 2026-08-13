import { z } from "zod";
import { NOTIFICATION_EVENTS } from "./notification.constants";

export const createTemplateSchema = z.object({
  name: z.string().min(2, "Template name is required"),
  event: z.enum(NOTIFICATION_EVENTS as [string, ...string[]]),
  providerTemplateName: z.string().min(2, "Provider template name is required"),
  language: z.string().default("en"),
  variables: z.array(z.string()).default([]),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  event: z.enum(NOTIFICATION_EVENTS as [string, ...string[]]).optional(),
  providerTemplateName: z.string().min(2).optional(),
  language: z.string().optional(),
  variables: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const toggleTemplateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const upsertRuleSchema = z.object({
  event: z.enum(NOTIFICATION_EVENTS as [string, ...string[]]),
  channel: z.enum(["WHATSAPP"]).default("WHATSAPP"),
  enabled: z.boolean(),
  configuration: z.record(z.string(), z.unknown()).optional(),
});

export const listNotificationsQuerySchema = z.object({
  branchId: z.string().optional(),
  studentId: z.string().optional(),
  event: z.string().optional(),
  status: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type UpsertRuleInput = z.infer<typeof upsertRuleSchema>;
