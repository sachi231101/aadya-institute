import {
  decryptCredentials,
  fingerprintSecret,
  maskSecret,
} from "../../utils/integration-credentials.util";
import { AiCallingRepository } from "./ai-calling.repository";
import type { ResolvedAiCallingConfig } from "./ai-calling.types";

function asCallingDays(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const days = value
    .map((d) => (typeof d === "number" ? d : Number(d)))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return days.length ? days : null;
}

/**
 * Resolve dialer config for an institute.
 * Priority: Integration AI_CALLING override → AiCallingPlatformSettings → env.
 */
export async function resolveAiCallingConfig(
  instituteId: string
): Promise<ResolvedAiCallingConfig> {
  const [instituteConfig, integration, platform, timezone] = await Promise.all([
    AiCallingRepository.findInstituteConfig(instituteId),
    AiCallingRepository.findAiCallingIntegration(instituteId),
    AiCallingRepository.getPlatformSettings(),
    AiCallingRepository.findInstituteTimezone(instituteId),
  ]);

  const integrationCreds = decryptCredentials(integration?.encryptedCredentials);
  const platformCreds = decryptCredentials(platform.encryptedCredentials);
  const platformWebhook = decryptCredentials(platform.encryptedWebhookSecret);

  const integrationConfig = (integration?.configuration || {}) as {
    fromNumber?: string;
    baseUrl?: string;
  };

  const telephonyApiKey =
    integrationCreds.telephonyApiKey ||
    integrationCreds.apiKey ||
    platformCreds.telephonyApiKey ||
    platformCreds.apiKey ||
    process.env.TELEPHONY_API_KEY ||
    "";

  const telephonyBaseUrl =
    integrationConfig.baseUrl ||
    platform.telephonyBaseUrl ||
    process.env.TELEPHONY_BASE_URL ||
    "";

  const fromNumber =
    instituteConfig?.fromNumber ||
    integrationConfig.fromNumber ||
    process.env.TELEPHONY_FROM_NUMBER ||
    process.env.AI_CALLER_NUMBER ||
    "";

  const webhookSecret =
    platformWebhook.webhookSecret ||
    platformCreds.webhookSecret ||
    process.env.AI_CALLING_WEBHOOK_SECRET ||
    process.env.SARVAM_WEBHOOK_SECRET ||
    "";

  let source: ResolvedAiCallingConfig["source"] = "env";
  if (integrationCreds.apiKey || integrationCreds.telephonyApiKey || integrationConfig.baseUrl) {
    source = platform.telephonyBaseUrl || platformCreds.apiKey ? "mixed" : "integration";
  } else if (platform.telephonyBaseUrl || platformCreds.apiKey || platformCreds.telephonyApiKey) {
    source = "platform";
  }

  const hasInstituteConfigRow = Boolean(instituteConfig);
  const isEnabled = hasInstituteConfigRow
    ? Boolean(instituteConfig?.isEnabled)
    : Boolean(integration?.isEnabled) ||
      Boolean(
        (process.env.TELEPHONY_BASE_URL && process.env.TELEPHONY_API_KEY) ||
          platform.telephonyBaseUrl ||
          platformCreds.apiKey ||
          platformCreds.telephonyApiKey
      );

  return {
    instituteId,
    isEnabled,
    fromNumber,
    agentId: instituteConfig?.agentId ?? null,
    callingScript:
      instituteConfig?.callingScript ||
      instituteConfig?.agent?.defaultScript ||
      null,
    callingHoursStart: instituteConfig?.callingHoursStart ?? null,
    callingHoursEnd: instituteConfig?.callingHoursEnd ?? null,
    callingDays: asCallingDays(instituteConfig?.callingDays),
    dailyCallLimit: instituteConfig?.dailyCallLimit ?? null,
    maxAttemptsPerLead: instituteConfig?.maxAttemptsPerLead ?? 3,
    retryDelayMinutes: instituteConfig?.retryDelayMinutes ?? 60,
    timezone: timezone || "Asia/Kolkata",
    telephonyBaseUrl,
    telephonyApiKey,
    webhookSecret,
    providerAppId: instituteConfig?.agent?.providerAppId ?? null,
    agentName: instituteConfig?.agent?.name ?? null,
    hasTelephony: Boolean(telephonyBaseUrl && telephonyApiKey),
    source,
  };
}

export function toSafePlatformDto(
  row: Awaited<ReturnType<typeof AiCallingRepository.getPlatformSettings>>,
  extras?: { webhookConfigured?: boolean }
) {
  const creds = decryptCredentials(row.encryptedCredentials);
  const webhookCreds = decryptCredentials(row.encryptedWebhookSecret);
  const primary = creds.telephonyApiKey || creds.apiKey || null;
  const webhook = webhookCreds.webhookSecret || creds.webhookSecret || null;
  return {
    id: row.id,
    telephonyBaseUrl: row.telephonyBaseUrl,
    defaultConcurrency: row.defaultConcurrency,
    maskedCredential: maskSecret(primary),
    credentialFingerprint: row.credentialFingerprint || fingerprintSecret(primary),
    webhookConfigured: extras?.webhookConfigured ?? Boolean(webhook),
    maskedWebhookSecret: maskSecret(webhook),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toSafeInstituteConfigDto(
  row: NonNullable<Awaited<ReturnType<typeof AiCallingRepository.findInstituteConfig>>> | null,
  resolved?: ResolvedAiCallingConfig
) {
  return {
    instituteId: row?.instituteId ?? resolved?.instituteId ?? null,
    agentId: row?.agentId ?? null,
    agent: row?.agent
      ? {
          id: row.agent.id,
          name: row.agent.name,
          provider: row.agent.provider,
          isActive: row.agent.isActive,
        }
      : null,
    fromNumber: row?.fromNumber ?? null,
    callingScript: row?.callingScript ?? null,
    callingHoursStart: row?.callingHoursStart ?? null,
    callingHoursEnd: row?.callingHoursEnd ?? null,
    callingDays: row?.callingDays ?? null,
    dailyCallLimit: row?.dailyCallLimit ?? null,
    maxAttemptsPerLead: row?.maxAttemptsPerLead ?? 3,
    retryDelayMinutes: row?.retryDelayMinutes ?? 60,
    isEnabled: row?.isEnabled ?? false,
    resolved: resolved
      ? {
          hasTelephony: resolved.hasTelephony,
          source: resolved.source,
          timezone: resolved.timezone,
          fromNumber: resolved.fromNumber,
          agentName: resolved.agentName,
        }
      : undefined,
    updatedAt: row?.updatedAt ?? null,
  };
}
