export const PLATFORM_SETTINGS_ID = "default";

export const TERMINAL_AI_CALL_STATUSES = [
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "CALLBACK_REQUESTED",
] as const;

export type TerminalAiCallStatus = (typeof TERMINAL_AI_CALL_STATUSES)[number];

export const IN_FLIGHT_AI_CALL_STATUSES = [
  "INITIATED",
  "RINGING",
  "ANSWERED",
] as const;

export type AiCallingJobPayload = {
  callLogId: string;
  instituteId: string;
  /** Lead dial path (existing). */
  leadId?: string;
  /** Student dial path (discontinuation risk / outreach). */
  studentId?: string;
};

export type LeadTemperature = "HOT" | "WARM" | "COOL" | "COLD";

/** Score thresholds for HOT / WARM / COOL (below coolMin → COLD). */
export type ScoreTemperatureBands = {
  hotMin: number;
  warmMin: number;
  coolMin: number;
};

export const DEFAULT_SCORE_TEMPERATURE_BANDS: ScoreTemperatureBands = {
  hotMin: 80,
  warmMin: 60,
  coolMin: 40,
};

/** Default min leadScore to auto-assign a counsellor after an AI call. */
export const DEFAULT_MIN_SCORE_TO_AUTO_ASSIGN = 50;

export type ResolvedAiCallingConfig = {
  instituteId: string;
  isEnabled: boolean;
  fromNumber: string;
  agentId: string | null;
  callingScript: string | null;
  /** Institute map or null when using defaults at dial time. */
  agentVariableMap: Record<string, string> | null;
  scoreTemperatureBands: ScoreTemperatureBands;
  /** Effective threshold (null DB → DEFAULT_MIN_SCORE_TO_AUTO_ASSIGN). */
  minScoreToAutoAssign: number;
  callingHoursStart: string | null;
  callingHoursEnd: string | null;
  callingDays: number[] | null;
  dailyCallLimit: number | null;
  maxAttemptsPerLead: number;
  retryDelayMinutes: number;
  timezone: string;
  telephonyBaseUrl: string;
  telephonyApiKey: string;
  webhookSecret: string;
  providerAppId: string | null;
  agentName: string | null;
  hasTelephony: boolean;
  source: "integration" | "platform" | "env" | "mixed";
};

export type SarvamWebhookPayload = {
  attempt_id: string;
  customer_number?: string;
  status: string;
  interaction_id?: string;
  duration?: number;
  interaction_transcript?: Array<{ role: string; text: string }>;
  final_agent_variables?: Record<string, unknown>;
  failure_reason?: string;
  recording_url?: string;
  recordingUrl?: string;
  metadata?: Record<string, string>;
};

export function buildIdempotencyKey(
  instituteId: string,
  leadId: string,
  attemptNumber: number
): string {
  return `ai_call:${instituteId}:${leadId}:${attemptNumber}`;
}

export function buildStudentIdempotencyKey(
  instituteId: string,
  studentId: string,
  attemptNumber: number
): string {
  return `ai_call:${instituteId}:student:${studentId}:${attemptNumber}`;
}

export function mapProviderCallStatus(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/-/g, "_");
  const map: Record<string, string> = {
    connected: "COMPLETED",
    completed: "COMPLETED",
    answered: "COMPLETED",
    success: "COMPLETED",
    no_answer: "NO_ANSWER",
    unanswered: "NO_ANSWER",
    busy: "BUSY",
    failed: "FAILED",
    failure: "FAILED",
    error: "FAILED",
    ringing: "RINGING",
    initiated: "INITIATED",
    callback_requested: "CALLBACK_REQUESTED",
    callback: "CALLBACK_REQUESTED",
  };
  return map[key] || raw.toUpperCase();
}

export function isTerminalCallStatus(status: string): boolean {
  return TERMINAL_AI_CALL_STATUSES.includes(
    status.toUpperCase() as TerminalAiCallStatus
  );
}

export function isInFlightCallStatus(status: string): boolean {
  return IN_FLIGHT_AI_CALL_STATUSES.includes(
    status.toUpperCase() as (typeof IN_FLIGHT_AI_CALL_STATUSES)[number]
  );
}
