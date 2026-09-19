import {
  decryptCredentials,
  fingerprintSecret,
  maskSecret,
} from "../../utils/integration-credentials.util";
import { AiCallingRepository } from "./ai-calling.repository";
import type {
  ResolvedAiCallingConfig,
  ScoreTemperatureBands,
  LeadTemperature,
} from "./ai-calling.types";
import {
  DEFAULT_MIN_SCORE_TO_AUTO_ASSIGN,
  DEFAULT_SCORE_TEMPERATURE_BANDS,
} from "./ai-calling.types";
import {
  DEFAULT_AGENT_VARIABLE_MAP,
  ALLOWED_AGENT_VARIABLE_FIELDS,
  parseAgentVariableMap,
} from "./agent-variables.util";

function asCallingDays(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const days = value
    .map((d) => (typeof d === "number" ? d : Number(d)))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return days.length ? days : null;
}

function clampBand(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Null/invalid → DEFAULT_MIN_SCORE_TO_AUTO_ASSIGN (50). */
export function parseMinScoreToAutoAssign(value: unknown): number {
  if (value == null) return DEFAULT_MIN_SCORE_TO_AUTO_ASSIGN;
  return clampBand(value, DEFAULT_MIN_SCORE_TO_AUTO_ASSIGN);
}

/**
 * Parse institute score→temperature bands with defaults.
 * Ensures hotMin >= warmMin >= coolMin.
 */
export function parseScoreTemperatureBands(
  value: unknown
): ScoreTemperatureBands {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  let hotMin = clampBand(raw.hotMin, DEFAULT_SCORE_TEMPERATURE_BANDS.hotMin);
  let warmMin = clampBand(raw.warmMin, DEFAULT_SCORE_TEMPERATURE_BANDS.warmMin);
  let coolMin = clampBand(raw.coolMin, DEFAULT_SCORE_TEMPERATURE_BANDS.coolMin);

  if (warmMin > hotMin) warmMin = hotMin;
  if (coolMin > warmMin) coolMin = warmMin;

  return { hotMin, warmMin, coolMin };
}

export function scoreToTemperature(
  score: number,
  bands: ScoreTemperatureBands = DEFAULT_SCORE_TEMPERATURE_BANDS
): LeadTemperature {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s >= bands.hotMin) return "HOT";
  if (s >= bands.warmMin) return "WARM";
  if (s >= bands.coolMin) return "COOL";
  return "COLD";
}

/** True when Instant Outbound dial env is complete (dial-only mode). */
export function envTelephonyConfigured(): boolean {
  const baseUrl =
    process.env.TELEPHONY_BASE_URL || "https://apps.sarvam.ai/api/outbounds";
  const apiKey =
    process.env.TELEPHONY_API_KEY || process.env.SARVAM_API_KEY || "";
  const orgId = process.env.SARVAM_ORG_ID || "";
  const workspaceId = process.env.SARVAM_WORKSPACE_ID || "";
  const appId = process.env.SARVAM_APP_ID || "";
  const connectionId = process.env.SARVAM_CONNECTION_ID || "";
  return Boolean(baseUrl && apiKey && orgId && workspaceId && appId && connectionId);
}

/**
 * Resolve dialer config for an institute (dial-only mode).
 * Priority: Integration AI_CALLING override → AiCallingPlatformSettings → env.
 *
 * Voice Agent create/commit/deploy is NOT done here — that lives in the Sarvam dashboard.
 * Backend .env TELEPHONY_* / SARVAM_API_KEY is enough for local/testing dialing.
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
    process.env.SARVAM_API_KEY ||
    "";

  const telephonyBaseUrl =
    integrationConfig.baseUrl ||
    platform.telephonyBaseUrl ||
    process.env.TELEPHONY_BASE_URL ||
    process.env.SARVAM_API_BASE_URL ||
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
  } else if (envTelephonyConfigured() || telephonyBaseUrl || telephonyApiKey) {
    source = "env";
  }

  const hasInstituteConfigRow = Boolean(instituteConfig);
  /**
   * Enablement:
   * - If institute config row exists → respect isEnabled (OFF stops dialing).
   * - If no row yet → auto-enable when backend env/platform telephony is configured
   *   so first-time testers can dial after only setting .env.
   */
  const isEnabled = hasInstituteConfigRow
    ? Boolean(instituteConfig?.isEnabled)
    : Boolean(
        integration?.isEnabled ||
          envTelephonyConfigured() ||
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
    agentVariableMap: parseAgentVariableMap(instituteConfig?.agentVariableMap),
    scoreTemperatureBands: parseScoreTemperatureBands(
      instituteConfig?.scoreTemperatureBands
    ),
    minScoreToAutoAssign: parseMinScoreToAutoAssign(
      instituteConfig?.minScoreToAutoAssign
    ),
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
    hasTelephony: envTelephonyConfigured(),
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
  const storedMap = parseAgentVariableMap(row?.agentVariableMap);
  const bands = parseScoreTemperatureBands(
    row?.scoreTemperatureBands ?? resolved?.scoreTemperatureBands
  );
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
    /** Effective map used on dial (stored or defaults). */
    agentVariableMap: storedMap ?? { ...DEFAULT_AGENT_VARIABLE_MAP },
    /** True when institute has a custom map saved. */
    agentVariableMapIsDefault: !storedMap,
    defaultAgentVariableMap: { ...DEFAULT_AGENT_VARIABLE_MAP },
    allowedAgentVariableFields: [...ALLOWED_AGENT_VARIABLE_FIELDS],
    /** Effective HOT/WARM/COOL mins (stored or defaults). */
    scoreTemperatureBands: bands,
    scoreTemperatureBandsIsDefault: !row?.scoreTemperatureBands,
    defaultScoreTemperatureBands: { ...DEFAULT_SCORE_TEMPERATURE_BANDS },
    /** Effective min score for post-call counsellor auto-assign. */
    minScoreToAutoAssign: parseMinScoreToAutoAssign(
      row?.minScoreToAutoAssign ?? resolved?.minScoreToAutoAssign
    ),
    minScoreToAutoAssignIsDefault: row?.minScoreToAutoAssign == null,
    defaultMinScoreToAutoAssign: DEFAULT_MIN_SCORE_TO_AUTO_ASSIGN,
    callingHoursStart: row?.callingHoursStart ?? null,
    callingHoursEnd: row?.callingHoursEnd ?? null,
    callingDays: row?.callingDays ?? null,
    dailyCallLimit: row?.dailyCallLimit ?? null,
    maxAttemptsPerLead: row?.maxAttemptsPerLead ?? 3,
    retryDelayMinutes: row?.retryDelayMinutes ?? 60,
    // When no institute row, surface resolved enablement so Admin UI can default correctly.
    isEnabled: row ? Boolean(row.isEnabled) : Boolean(resolved?.isEnabled),
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
