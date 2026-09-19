/**
 * Build Sarvam Instant Outbound `app_config.agent_variables` from a lead
 * and an institute-level agentVariableMap (Sarvam var → Aadya field path).
 *
 * Separate from WhatsApp NotificationRule.variableMap.
 */

export type AgentVariableMap = Record<string, string>;

/** Default Sarvam variable name → Aadya lead field path. */
export const DEFAULT_AGENT_VARIABLE_MAP: AgentVariableMap = {
  lead_name: "name",
  phone_number: "phoneNumber",
  email: "email",
  /** Pre-call Sarvam INPUT — prefer @course_name, else this. */
  known_course_interest: "interestedIn",
  /** Still sent for agents that read it; Sarvam often treats this as OUTPUT only. */
  course_interest: "interestedIn",
  course_name: "course.name",
  branch_name: "branch.name",
  source: "source",
  notes: "notes",
  lead_stage: "stage",
};

/** Aadya field paths allowed in agentVariableMap. */
export const ALLOWED_AGENT_VARIABLE_FIELDS = [
  "name",
  "phoneNumber",
  "email",
  "interestedIn",
  "course.name",
  "branch.name",
  "source",
  "notes",
  "stage",
  "priority",
  "tags",
] as const;

export type LeadAgentVariableSource = {
  name: string;
  phoneNumber: string;
  email?: string | null;
  interestedIn?: string | null;
  source?: string | null;
  notes?: string | null;
  stage?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  course?: { name?: string | null } | null;
  branch?: { name?: string | null } | null;
};

export function parseAgentVariableMap(value: unknown): AgentVariableMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: AgentVariableMap = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof k === "string" && k.trim() && typeof v === "string" && v.trim()) {
      out[k.trim()] = v.trim();
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function resolveAgentVariableMap(
  stored: unknown
): AgentVariableMap {
  return parseAgentVariableMap(stored) ?? { ...DEFAULT_AGENT_VARIABLE_MAP };
}

/** Invalid map entries as `sarvamVar→aadyaField`. */
export function invalidAgentVariableMapTargets(
  map: AgentVariableMap
): string[] {
  const allowed = new Set<string>(ALLOWED_AGENT_VARIABLE_FIELDS);
  const bad: string[] = [];
  for (const [sarvamVar, field] of Object.entries(map)) {
    if (!allowed.has(field)) bad.push(`${sarvamVar}→${field}`);
  }
  return bad;
}

function resolveFieldPath(
  lead: LeadAgentVariableSource,
  path: string
): string {
  const parts = path.split(".");
  let current: unknown = lead;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  if (current == null) return "";
  if (Array.isArray(current)) return current.filter(Boolean).join(", ");
  return String(current).trim();
}

export type BuiltAgentVariables = {
  /** Non-empty known values for Sarvam input variables. */
  agentVariables: Record<string, string>;
  /** Sarvam variable names still empty on the lead (comma-separated for the agent). */
  missingFields: string[];
};

/**
 * Build outbound agent_variables:
 * - Seed known non-empty mapped values
 * - Always include `missing_fields` (comma-separated Sarvam var names still empty)
 */
export function buildAgentVariables(
  lead: LeadAgentVariableSource,
  mapInput?: unknown
): BuiltAgentVariables {
  const map = resolveAgentVariableMap(mapInput);
  const agentVariables: Record<string, string> = {};
  const missingFields: string[] = [];

  for (const [sarvamVar, aadyaPath] of Object.entries(map)) {
    const value = resolveFieldPath(lead, aadyaPath);
    if (value) {
      agentVariables[sarvamVar] = value;
    } else {
      missingFields.push(sarvamVar);
    }
  }

  if (missingFields.length > 0) {
    agentVariables.missing_fields = missingFields.join(",");
  } else {
    agentVariables.missing_fields = "";
  }

  return { agentVariables, missingFields };
}

/**
 * After merge, which mapped Sarvam vars are still empty on the lead.
 * Used for UI missing checklist / CallLog metadata.
 */
export function computeMissingMappedFields(
  lead: LeadAgentVariableSource,
  mapInput?: unknown
): string[] {
  const map = resolveAgentVariableMap(mapInput);
  const missing: string[] = [];
  for (const [sarvamVar, aadyaPath] of Object.entries(map)) {
    if (!resolveFieldPath(lead, aadyaPath)) missing.push(sarvamVar);
  }
  return missing;
}
