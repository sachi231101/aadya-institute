export interface CallRequest {
  to: string;
  from: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
  /** Sarvam Instant Outbound `app_config.agent_variables` (string values). */
  agentVariables?: Record<string, string>;
  /** Override SARVAM_APP_ID (institute agent providerAppId / outbound deployment). */
  appId?: string;
}

export interface CallResponse {
  callId: string;
  status: string;
}
