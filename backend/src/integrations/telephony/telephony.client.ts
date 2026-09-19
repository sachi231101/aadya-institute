import axios, { type AxiosInstance } from "axios";
import type { CallRequest, CallResponse } from "./telephony.types";
import { isValidIndianPhone, normalizePhone } from "../../utils/phone";

export type TelephonyClientConfig = {
  baseUrl: string;
  apiKey: string;
};

const clientCache = new Map<string, AxiosInstance>();

function cacheKey(config: TelephonyClientConfig & { authMode: string }): string {
  return `${config.baseUrl}::${config.authMode}::${config.apiKey.slice(0, 8)}`;
}

function isSarvamInstantOutboundBase(baseUrl: string): boolean {
  const u = baseUrl.toLowerCase();
  return u.includes("apps.sarvam.ai") || u.includes("/outbounds");
}

/**
 * Per-request telephony client (baseURL + API key).
 * Sarvam Voice Agents Instant Outbound uses `X-API-Key`.
 * Legacy / test providers may use Bearer.
 */
export function createTelephonyClient(
  config: TelephonyClientConfig,
  authMode: "x-api-key" | "bearer" = "x-api-key"
): AxiosInstance {
  const key = cacheKey({ ...config, authMode });
  const cached = clientCache.get(key);
  if (cached) return cached;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authMode === "x-api-key") {
    headers["X-API-Key"] = config.apiKey;
  } else {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const client = axios.create({
    baseURL: config.baseUrl,
    headers,
    timeout: 30_000,
  });
  clientCache.set(key, client);
  return client;
}

function resolveConfig(override?: TelephonyClientConfig): TelephonyClientConfig {
  return {
    baseUrl:
      override?.baseUrl ||
      process.env.TELEPHONY_BASE_URL ||
      "https://apps.sarvam.ai/api/outbounds",
    apiKey:
      override?.apiKey ||
      process.env.TELEPHONY_API_KEY ||
      process.env.SARVAM_API_KEY ||
      "",
  };
}

/** Voice Agents keys are typically much longer than a short sk_samvaad_ stub. */
function assertApiKeyLooksComplete(apiKey: string): void {
  const key = apiKey.trim();
  if (!key) {
    throw missingDialConfigError("Telephony API key missing");
  }
  // Observed: truncated Samvaad keys (~19 chars) → Sarvam 401 "Invalid API key format"
  if (key.startsWith("sk_samvaad_") && key.length < 32) {
    throw missingDialConfigError(
      "SARVAM_API_KEY looks truncated (sk_samvaad_… too short). Copy the full key from Sarvam Voice Agents → Settings → API Key."
    );
  }
  if (key.length < 24) {
    throw missingDialConfigError(
      "SARVAM_API_KEY / TELEPHONY_API_KEY looks too short. Copy the full Voice Agents API key from Settings → API Key."
    );
  }
}

function resolveSarvamDialIds(appIdOverride?: string) {
  return {
    orgId: process.env.SARVAM_ORG_ID || "",
    workspaceId: process.env.SARVAM_WORKSPACE_ID || "",
    appId: (appIdOverride || process.env.SARVAM_APP_ID || "").trim(),
    connectionId: process.env.SARVAM_CONNECTION_ID || "",
    appVersion: Number(process.env.SARVAM_APP_VERSION || "1") || 1,
  };
}

function missingDialConfigError(message: string): Error & {
  nonRetriable?: boolean;
  response?: { status: number; data?: unknown };
} {
  const err = new Error(message) as Error & {
    nonRetriable?: boolean;
    response?: { status: number; data?: unknown };
  };
  err.nonRetriable = true;
  err.response = { status: 400 };
  return err;
}

function telephonyHttpError(
  err: unknown,
  fallback: string
): Error & { nonRetriable?: boolean; response?: { status: number; data?: unknown } } {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 502;
    const data = err.response?.data as
      | { error?: { message?: string; data?: { details?: string } }; detail?: string }
      | undefined;
    const details =
      data?.error?.data?.details ||
      data?.error?.message ||
      (typeof data?.detail === "string" ? data.detail : null) ||
      err.message;
    const message =
      status === 401 || status === 403
        ? `Sarvam auth failed (${status}): ${details}. Use Voice Agents Settings → API Key (X-API-Key), not an api.sarvam.ai sk_ subscription key.`
        : `Sarvam dial failed (${status}): ${details}`;
    const wrapped = new Error(message) as Error & {
      nonRetriable?: boolean;
      response?: { status: number; data?: unknown };
    };
    wrapped.nonRetriable = status >= 400 && status < 500;
    wrapped.response = { status, data: err.response?.data };
    return wrapped;
  }
  return missingDialConfigError(fallback);
}

/**
 * Place an outbound call.
 * - Sarvam Instant Outbound: POST /v1/orgs/{org}/workspaces/{ws}/outbounds
 * - Legacy/test providers: POST /calls
 * @see https://docs.sarvam.ai/conversations/api/instant-outbound/create
 */
export const initiateCall = async (
  req: CallRequest,
  clientConfig?: TelephonyClientConfig
): Promise<CallResponse> => {
  const config = resolveConfig(clientConfig);

  if (!config.baseUrl || !config.apiKey) {
    throw missingDialConfigError("Telephony base URL or API key missing");
  }
  assertApiKeyLooksComplete(config.apiKey);
  if (!req.from) {
    throw missingDialConfigError("From number missing (TELEPHONY_FROM_NUMBER)");
  }
  if (!req.to) {
    throw missingDialConfigError("Lead phone number missing");
  }
  if (!isValidIndianPhone(req.to)) {
    throw missingDialConfigError(
      `Invalid lead phone for dial: ${req.to} — Sarvam requires E.164 (e.g. +919876543210)`
    );
  }
  const toE164 = normalizePhone(req.to);

  if (isSarvamInstantOutboundBase(config.baseUrl)) {
    const ids = resolveSarvamDialIds(req.appId);
    if (!ids.orgId || !ids.workspaceId || !ids.appId || !ids.connectionId) {
      throw missingDialConfigError(
        "Missing SARVAM_ORG_ID, SARVAM_WORKSPACE_ID, SARVAM_APP_ID (Conversation app_id), or SARVAM_CONNECTION_ID in backend .env"
      );
    }

    const client = createTelephonyClient(config, "x-api-key");
    const path = `/v1/orgs/${ids.orgId}/workspaces/${ids.workspaceId}/outbounds`;

    const buildPayload = (includeAgentVars: boolean) => {
      const appConfig: Record<string, unknown> = {
        app_id: ids.appId,
        app_version: ids.appVersion,
        connection_config: {
          connection_id: ids.connectionId,
          agent_phone_number: req.from,
        },
      };

      if (
        includeAgentVars &&
        req.agentVariables &&
        Object.keys(req.agentVariables).length > 0
      ) {
        appConfig.agent_variables = req.agentVariables;
      }

      const payload: Record<string, unknown> = {
        app_config: appConfig,
        user_config: {
          user_phone_number: toE164,
        },
      };

      if (req.callbackUrl) {
        payload.webhook_config = {
          url: req.callbackUrl,
          ...(req.metadata ? { metadata: req.metadata } : {}),
        };
      }
      return payload;
    };

    const postOutbound = async (includeAgentVars: boolean) => {
      const response = await client.post<{
        attempt_id?: string;
        callId?: string;
        status?: string;
      }>(path, buildPayload(includeAgentVars));

      return {
        callId: response.data.attempt_id || response.data.callId || "",
        status: response.data.status || "INITIATED",
      };
    };

    try {
      return await postOutbound(true);
    } catch (err) {
      const wrapped = telephonyHttpError(err, "Sarvam Instant Outbound initiate failed");
      const details = wrapped.message || "";
      const agentVarMismatch =
        wrapped.response?.status === 422 &&
        /agent variables/i.test(details) &&
        /not found/i.test(details);

      // App exists but Genie input chips don't match — still place the call without vars.
      if (
        agentVarMismatch &&
        req.agentVariables &&
        Object.keys(req.agentVariables).length > 0
      ) {
        try {
          return await postOutbound(false);
        } catch (retryErr) {
          throw telephonyHttpError(
            retryErr,
            "Sarvam Instant Outbound initiate failed (retry without agent_variables)"
          );
        }
      }

      throw wrapped;
    }
  }

  // Legacy / unit-test provider shape
  const client = createTelephonyClient(config, "bearer");
  try {
    const response = await client.post<CallResponse>("/calls", {
      ...req,
      to: toE164,
    });
    return response.data;
  } catch (err) {
    throw telephonyHttpError(err, "Telephony initiate failed");
  }
};

export const hangupCall = async (
  callId: string,
  clientConfig?: TelephonyClientConfig
): Promise<void> => {
  const config = resolveConfig(clientConfig);
  if (!config.baseUrl || !config.apiKey || !callId) return;
  if (isSarvamInstantOutboundBase(config.baseUrl)) {
    // Instant outbound hangup is not part of the documented create API.
    return;
  }
  const client = createTelephonyClient(config, "bearer");
  await client.post(`/calls/${callId}/hangup`);
};
