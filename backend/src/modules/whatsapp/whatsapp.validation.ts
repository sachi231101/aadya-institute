import { z } from "zod";
import { NOTIFICATION_EVENTS, SYSTEM_AUTOMATION_EVENTS } from "./whatsapp.constants";

const eventEnum = z.enum(NOTIFICATION_EVENTS as [string, ...string[]]);
const systemEventEnum = z.enum(SYSTEM_AUTOMATION_EVENTS as unknown as [string, ...string[]]);

export const sendTestMessageSchema = z.object({
  phone: z.string().min(10, "Valid phone number is required"),
  name: z.string().default("Test User"),
  campaignName: z.string().min(1).optional(),
  templateParams: z.array(z.string()).default([]),
});

export const automationTestSchema = z.object({
  phone: z.string().min(10, "Valid phone number is required"),
  name: z.string().optional(),
});

export const patchAutomationConfigSchema = z.object({
  enabled: z.boolean(),
});

export const patchAutomationSchema = z.object({
  enabled: z.boolean().optional(),
  templateId: z.string().nullable().optional(),
  configuration: z
    .object({
      variableMap: z.record(z.string(), z.string()).optional(),
      delayMinutes: z.number().int().min(0).max(10080).optional(),
      offsetMinutes: z.number().int().min(-10080).max(-30).optional(),
      daysBeforeDue: z.number().int().min(0).max(30).optional(),
      daysBefore: z.number().int().min(0).max(30).optional(),
      includeFaculty: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(2, "Template name is required"),
  event: eventEnum,
  providerTemplateName: z.string().trim().min(2, "MSG91 template name is required"),
  providerTemplateId: z.string().optional().nullable(),
  providerNamespace: z.string().optional().nullable(),
  language: z.string().default("en"),
  variables: z.array(z.string()).default([]),
  category: z.string().optional(),
  body: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SYNCED"]).optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  event: eventEnum.optional(),
  providerTemplateName: z.string().trim().min(2).optional(),
  providerTemplateId: z.string().optional().nullable(),
  providerNamespace: z.string().optional().nullable(),
  language: z.string().optional(),
  variables: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SYNCED"]).optional(),
  category: z.string().optional(),
  body: z.string().optional(),
});

export const toggleTemplateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SYNCED"]),
});

export const syncTemplatesSchema = z.object({
  templateStatus: z.string().optional(),
  pageSize: z.number().int().min(1).max(500).optional(),
});

export const upsertRuleSchema = z.object({
  event: eventEnum,
  channel: z.enum(["WHATSAPP"]).default("WHATSAPP"),
  enabled: z.boolean(),
  templateId: z.string().nullable().optional(),
  configuration: z.record(z.string(), z.unknown()).optional(),
});

export const listNotificationsQuerySchema = z.object({
  branchId: z.string().optional(),
  studentId: z.string().optional(),
  event: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  isTest: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const automationTypeParamSchema = z.object({
  type: systemEventEnum,
});

export type SendTestMessageInput = z.infer<typeof sendTestMessageSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type UpsertRuleInput = z.infer<typeof upsertRuleSchema>;
