/**
 * Canonical LeadIntent taxonomy for AI calling outcomes.
 * Stored on CallLog.interestStatus and Lead.leadIntent (denormalized).
 */

export const LEAD_INTENTS = [
  "INTERESTED",
  "HIGHLY_INTERESTED",
  "NOT_INTERESTED",
  "FOLLOW_UP_REQUIRED",
  "CALL_BACK_LATER",
  "NOT_REACHABLE",
  "WRONG_NUMBER",
  "ALREADY_JOINED_ANOTHER",
  "NEED_MORE_INFORMATION",
  "ADMISSION_INTERESTED",
  "CONVERTED",
] as const;

export type LeadIntent = (typeof LEAD_INTENTS)[number];

const INTENT_SET = new Set<string>(LEAD_INTENTS);

/** Synonyms / provider variants → canonical LeadIntent. */
const SYNONYM_MAP: Record<string, LeadIntent> = {
  INTERESTED: "INTERESTED",
  INTEREST: "INTERESTED",
  YES: "INTERESTED",
  WARM: "INTERESTED",
  MAYBE: "NEED_MORE_INFORMATION",
  HIGHLY_INTERESTED: "HIGHLY_INTERESTED",
  HIGH_INTEREST: "HIGHLY_INTERESTED",
  VERY_INTERESTED: "HIGHLY_INTERESTED",
  HOT: "HIGHLY_INTERESTED",
  HIGH: "HIGHLY_INTERESTED",
  NOT_INTERESTED: "NOT_INTERESTED",
  NO_INTEREST: "NOT_INTERESTED",
  UNINTERESTED: "NOT_INTERESTED",
  LOW: "NOT_INTERESTED",
  COLD: "NOT_INTERESTED",
  NO: "NOT_INTERESTED",
  FOLLOW_UP_REQUIRED: "FOLLOW_UP_REQUIRED",
  FOLLOW_UP: "FOLLOW_UP_REQUIRED",
  FOLLOWUP: "FOLLOW_UP_REQUIRED",
  FOLLOW_UP_NEEDED: "FOLLOW_UP_REQUIRED",
  CALL_BACK_LATER: "CALL_BACK_LATER",
  CALLBACK_LATER: "CALL_BACK_LATER",
  CALLBACK: "CALL_BACK_LATER",
  CALL_BACK: "CALL_BACK_LATER",
  CALLBACK_REQUESTED: "CALL_BACK_LATER",
  NOT_REACHABLE: "NOT_REACHABLE",
  UNREACHABLE: "NOT_REACHABLE",
  NO_ANSWER: "NOT_REACHABLE",
  DID_NOT_PICK: "NOT_REACHABLE",
  WRONG_NUMBER: "WRONG_NUMBER",
  INVALID_NUMBER: "WRONG_NUMBER",
  ALREADY_JOINED_ANOTHER: "ALREADY_JOINED_ANOTHER",
  ALREADY_JOINED: "ALREADY_JOINED_ANOTHER",
  JOINED_ELSEWHERE: "ALREADY_JOINED_ANOTHER",
  COMPETITOR: "ALREADY_JOINED_ANOTHER",
  NEED_MORE_INFORMATION: "NEED_MORE_INFORMATION",
  NEED_INFO: "NEED_MORE_INFORMATION",
  MORE_INFO: "NEED_MORE_INFORMATION",
  INFORMATION: "NEED_MORE_INFORMATION",
  ADMISSION_INTERESTED: "ADMISSION_INTERESTED",
  READY_FOR_ADMISSION: "ADMISSION_INTERESTED",
  WANT_ADMISSION: "ADMISSION_INTERESTED",
  ENROLL: "ADMISSION_INTERESTED",
  CONVERTED: "CONVERTED",
  CONVERSION: "CONVERTED",
  ENROLLED: "CONVERTED",
  ADMISSION_DONE: "CONVERTED",
};

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

/**
 * Normalize free-form / Sarvam interest strings to a canonical LeadIntent.
 * Returns null when unknown (caller may keep raw or leave null).
 */
export function normalizeLeadIntent(
  raw: string | null | undefined
): LeadIntent | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;

  const key = normalizeKey(text);
  if (INTENT_SET.has(key)) return key as LeadIntent;
  if (SYNONYM_MAP[key]) return SYNONYM_MAP[key];

  // Phrase heuristics (order matters: more specific first)
  const lower = text.toLowerCase();
  if (
    lower.includes("highly interested") ||
    lower.includes("very interested") ||
    lower.includes("hot lead")
  ) {
    return "HIGHLY_INTERESTED";
  }
  if (
    lower.includes("already joined") ||
    lower.includes("joined another") ||
    lower.includes("other institute") ||
    lower.includes("joined elsewhere") ||
    lower.includes("competitor")
  ) {
    return "ALREADY_JOINED_ANOTHER";
  }
  if (
    lower.includes("converted") ||
    lower.includes("already enrolled") ||
    lower.includes("admission done") ||
    lower.includes("admission completed") ||
    lower.includes("has enrolled") ||
    lower.includes("successfully enrolled")
  ) {
    return "CONVERTED";
  }
  if (
    lower.includes("admission") &&
    (lower.includes("interest") || lower.includes("ready") || lower.includes("want"))
  ) {
    return "ADMISSION_INTERESTED";
  }
  if (
    lower.includes("not interested") ||
    lower.includes("no interest") ||
    lower.includes("not interested")
  ) {
    return "NOT_INTERESTED";
  }
  if (lower.includes("wrong number") || lower.includes("invalid number")) {
    return "WRONG_NUMBER";
  }
  if (
    lower.includes("call back") ||
    lower.includes("callback") ||
    lower.includes("call later")
  ) {
    return "CALL_BACK_LATER";
  }
  if (
    lower.includes("not reachable") ||
    lower.includes("no answer") ||
    lower.includes("did not pick") ||
    lower.includes("unreachable")
  ) {
    return "NOT_REACHABLE";
  }
  if (
    lower.includes("more information") ||
    lower.includes("more info") ||
    lower.includes("need info")
  ) {
    return "NEED_MORE_INFORMATION";
  }
  if (lower.includes("follow up") || lower.includes("follow-up")) {
    return "FOLLOW_UP_REQUIRED";
  }
  if (lower.includes("interested")) {
    return "INTERESTED";
  }

  return null;
}

/**
 * Pick intent from final_agent_variables (common key variants).
 */
export function extractIntentFromAgentVariables(
  vars: Record<string, unknown> | null | undefined
): LeadIntent | null {
  if (!vars) return null;
  const candidates = [
    vars.lead_intent,
    vars.leadIntent,
    vars.interestStatus,
    vars.interest_status,
    vars.intent,
    vars.disposition,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    const normalized = normalizeLeadIntent(String(c));
    if (normalized) return normalized;
  }
  return null;
}

/**
 * Extract a human summary from final_agent_variables.
 */
export function extractSummaryFromAgentVariables(
  vars: Record<string, unknown> | null | undefined
): string | null {
  if (!vars) return null;
  const candidates = [vars.summary, vars.aiSummary, vars.ai_summary, vars.remarks];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

/**
 * Parse optional callback datetime from agent variables.
 */
export function extractCallbackAtFromAgentVariables(
  vars: Record<string, unknown> | null | undefined
): Date | null {
  if (!vars) return null;
  const candidates = [
    vars.callback_at,
    vars.callbackAt,
    vars.call_back_at,
    vars.follow_up_at,
    vars.followUpAt,
    vars.next_follow_up_at,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    if (typeof c === "number" && Number.isFinite(c)) {
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) return d;
    }
    if (typeof c === "string" && c.trim()) {
      const d = new Date(c.trim());
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

/** Flatten agent variables to string-keyed JSON-safe object for storage. */
export function toExtractedFieldsRecord(
  vars: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!vars || typeof vars !== "object") return null;
  return { ...vars };
}
