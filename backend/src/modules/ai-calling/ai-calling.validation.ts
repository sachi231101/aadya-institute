import { z } from "zod";

const timeHhMm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM")
  .optional()
  .nullable();

const callingDaysSchema = z
  .array(z.number().int().min(0).max(6))
  .max(7)
  .optional()
  .nullable();

export const updateInstituteConfigSchema = z.object({
  agentId: z.string().min(1).optional().nullable(),
  fromNumber: z.string().max(32).optional().nullable(),
  callingScript: z.string().max(20_000).optional().nullable(),
  callingHoursStart: timeHhMm,
  callingHoursEnd: timeHhMm,
  callingDays: callingDaysSchema,
  dailyCallLimit: z.coerce.number().int().positive().max(100_000).optional().nullable(),
  maxAttemptsPerLead: z.coerce.number().int().min(1).max(20).optional(),
  retryDelayMinutes: z.coerce.number().int().min(1).max(10_080).optional(),
  isEnabled: z.boolean().optional(),
});

export const updatePlatformSettingsSchema = z.object({
  telephonyBaseUrl: z.string().url().optional().nullable().or(z.literal("")),
  defaultConcurrency: z.coerce.number().int().min(1).max(50).optional(),
  credentials: z
    .object({
      apiKey: z.string().optional(),
      telephonyApiKey: z.string().optional(),
      webhookSecret: z.string().optional(),
    })
    .optional(),
  replaceCredentials: z.boolean().optional(),
  webhookSecret: z.string().optional().nullable(),
});

export const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  provider: z.string().min(1).max(64).optional().default("SARVAM"),
  providerAppId: z.string().max(200).optional().nullable(),
  defaultScript: z.string().max(20_000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateAgentSchema = createAgentSchema.partial();

export const instituteIdParamSchema = z.object({
  instituteId: z.string().min(1),
});

export const callLogIdParamSchema = z.object({
  id: z.string().min(1),
});

export const agentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const usageQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  days: z.coerce.number().int().min(1).max(90).optional().default(14),
});

export type UpdateInstituteConfigInput = z.infer<typeof updateInstituteConfigSchema>;
export type UpdatePlatformSettingsInput = z.infer<typeof updatePlatformSettingsSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type UsageQuery = z.infer<typeof usageQuerySchema>;
