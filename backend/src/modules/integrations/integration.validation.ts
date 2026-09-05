import { z } from "zod";
import { INTEGRATION_TYPES } from "./integration.types";

export const integrationTypeParamSchema = z.object({
  type: z
    .string()
    .transform((v) => v.trim().toUpperCase().replace(/-/g, "_"))
    .pipe(
      z.enum([
        "AI",
        "WHATSAPP",
        "AI_CALLING",
        "GOOGLE_WORKSPACE",
        "GOOGLE_SHEETS",
        "PAYMENT",
        "EMAIL",
      ])
    ),
});

const credentialsSchema = z
  .record(z.string(), z.union([z.string(), z.null(), z.undefined()]))
  .optional();

export const upsertIntegrationSchema = z.object({
  provider: z.string().min(1).max(64).optional(),
  isEnabled: z.boolean().optional(),
  configuration: z.record(z.string(), z.unknown()).optional(),
  credentials: credentialsSchema,
  replaceCredentials: z.boolean().optional(),
});

export const upsertAiSchema = upsertIntegrationSchema.extend({
  provider: z.enum(["OPENAI"]).optional(),
  configuration: z
    .object({
      model: z.string().optional(),
      baseUrl: z.string().url().optional().or(z.literal("")),
    })
    .passthrough()
    .optional(),
  credentials: z
    .object({
      apiKey: z.string().optional(),
    })
    .optional(),
});

export const upsertWhatsappSchema = upsertIntegrationSchema.extend({
  provider: z.enum(["AISENSY"]).optional(),
  configuration: z
    .object({
      phoneNumber: z.string().optional(),
      campaignName: z.string().optional(),
    })
    .passthrough()
    .optional(),
  credentials: z
    .object({
      apiKey: z.string().optional(),
    })
    .optional(),
});

export const upsertAiCallingSchema = upsertIntegrationSchema.extend({
  provider: z.enum(["SARVAM"]).optional(),
  configuration: z
    .object({
      fromNumber: z.string().optional(),
      baseUrl: z.string().optional(),
    })
    .passthrough()
    .optional(),
  credentials: z
    .object({
      apiKey: z.string().optional(),
      telephonyApiKey: z.string().optional(),
    })
    .optional(),
});

export const upsertPaymentSchema = upsertIntegrationSchema.extend({
  provider: z.enum(["RAZORPAY"]).optional(),
  configuration: z
    .object({
      keyId: z.string().optional(),
    })
    .passthrough()
    .optional(),
  credentials: z
    .object({
      keySecret: z.string().optional(),
      webhookSecret: z.string().optional(),
    })
    .optional(),
});

export const upsertEmailSchema = upsertIntegrationSchema.extend({
  provider: z.enum(["SMTP"]).optional(),
  configuration: z
    .object({
      host: z.string().optional(),
      port: z.coerce.number().int().min(1).max(65535).optional(),
      username: z.string().optional(),
      fromName: z.string().optional(),
      fromEmail: z.string().email().optional().or(z.literal("")),
      secure: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
  credentials: z
    .object({
      password: z.string().optional(),
    })
    .optional(),
});

export const upsertGoogleSheetsSchema = upsertIntegrationSchema.extend({
  provider: z.enum(["GOOGLE"]).optional(),
  configuration: z
    .object({
      spreadsheetId: z.string().optional(),
      email: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export type UpsertIntegrationDto = z.infer<typeof upsertIntegrationSchema>;

export const schemaForType = (type: string) => {
  switch (type) {
    case "AI":
      return upsertAiSchema;
    case "WHATSAPP":
      return upsertWhatsappSchema;
    case "AI_CALLING":
      return upsertAiCallingSchema;
    case "PAYMENT":
      return upsertPaymentSchema;
    case "EMAIL":
      return upsertEmailSchema;
    case "GOOGLE_SHEETS":
      return upsertGoogleSheetsSchema;
    case "GOOGLE_WORKSPACE":
      return upsertIntegrationSchema;
    default:
      return upsertIntegrationSchema;
  }
};

export { INTEGRATION_TYPES };
