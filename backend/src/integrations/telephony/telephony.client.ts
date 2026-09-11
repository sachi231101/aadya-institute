import axios, { type AxiosInstance } from "axios";
import type { CallRequest, CallResponse } from "./telephony.types";

export type TelephonyClientConfig = {
  baseUrl: string;
  apiKey: string;
};

const clientCache = new Map<string, AxiosInstance>();

function cacheKey(config: TelephonyClientConfig): string {
  return `${config.baseUrl}::${config.apiKey.slice(0, 8)}`;
}

/**
 * Per-request telephony client (baseURL + API key).
 * Avoids a process-global axios instance so multi-tenant dialing can inject config.
 */
export function createTelephonyClient(config: TelephonyClientConfig): AxiosInstance {
  const key = cacheKey(config);
  const cached = clientCache.get(key);
  if (cached) return cached;

  const client = axios.create({
    baseURL: config.baseUrl,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    timeout: 30_000,
  });
  clientCache.set(key, client);
  return client;
}

function resolveConfig(override?: TelephonyClientConfig): TelephonyClientConfig {
  return {
    baseUrl: override?.baseUrl || process.env.TELEPHONY_BASE_URL || "",
    apiKey: override?.apiKey || process.env.TELEPHONY_API_KEY || "",
  };
}

export const initiateCall = async (
  req: CallRequest,
  clientConfig?: TelephonyClientConfig
): Promise<CallResponse> => {
  const config = resolveConfig(clientConfig);
  if (!config.baseUrl || !config.apiKey) {
    const err = new Error("Telephony base URL or API key missing") as Error & {
      nonRetriable?: boolean;
      response?: { status: number };
    };
    err.nonRetriable = true;
    err.response = { status: 400 };
    throw err;
  }

  const client = createTelephonyClient(config);
  const response = await client.post<CallResponse>("/calls", req);
  return response.data;
};

export const hangupCall = async (
  callId: string,
  clientConfig?: TelephonyClientConfig
): Promise<void> => {
  const config = resolveConfig(clientConfig);
  const client = createTelephonyClient(config);
  await client.post(`/calls/${callId}/hangup`);
};
