/**
 * Apply NotificationRule.configuration.variableMap to fill MSG91 template slots.
 *
 * @module modules/whatsapp/variable-map.util
 */

export type VariableMap = Record<string, string>;

/**
 * Map semantic Aadya params onto template slot keys (var_1, body_1, …).
 * Returns a new params object: original semantic keys + filled slot keys.
 */
export const applyTemplateVariableMap = (
  semanticParams: Record<string, string>,
  variableMap: VariableMap | null | undefined,
  requiredVars: string[]
): Record<string, string> => {
  const out: Record<string, string> = { ...semanticParams };
  if (!variableMap || Object.keys(variableMap).length === 0) {
    return out;
  }

  for (const slot of requiredVars) {
    const fieldKey = variableMap[slot];
    if (!fieldKey) continue;
    const value = semanticParams[fieldKey];
    if (value !== undefined && value !== null && String(value) !== "") {
      out[slot] = String(value);
    }
  }

  return out;
};

/** True when every required template slot has a non-empty mapping target. */
export const isVariableMapComplete = (
  requiredVars: string[],
  variableMap: VariableMap | null | undefined
): boolean => {
  if (requiredVars.length === 0) return true;
  if (!variableMap) return false;
  return requiredVars.every((slot) => {
    const target = variableMap[slot];
    return typeof target === "string" && target.trim().length > 0;
  });
};

/** Extract variableMap from rule configuration JSON. */
export const getVariableMapFromConfig = (
  configuration: unknown
): VariableMap => {
  if (!configuration || typeof configuration !== "object") return {};
  const map = (configuration as { variableMap?: unknown }).variableMap;
  if (!map || typeof map !== "object" || Array.isArray(map)) return {};
  const out: VariableMap = {};
  for (const [k, v] of Object.entries(map as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
};

/**
 * Validate that every mapped target is an allowed Aadya field for the automation.
 * Returns list of invalid slot→target pairs.
 */
export const invalidVariableMapTargets = (
  variableMap: VariableMap,
  allowedFields: string[]
): string[] => {
  const allowed = new Set(allowedFields);
  const bad: string[] = [];
  for (const [slot, field] of Object.entries(variableMap)) {
    if (!allowed.has(field)) bad.push(`${slot}→${field}`);
  }
  return bad;
};
