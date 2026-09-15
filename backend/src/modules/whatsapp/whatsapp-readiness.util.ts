/**
 * Pure helpers for WhatsApp setup readiness aggregation.
 *
 * @module modules/whatsapp/whatsapp-readiness.util
 */
import {
  getVariableMapFromConfig,
  isVariableMapComplete,
} from "./variable-map.util";

export interface ReadinessRuleInput {
  event: string;
  enabled: boolean;
  templateId?: string | null;
  configuration?: unknown;
  template?: {
    id: string;
    status: string;
    variables?: unknown;
  } | null;
}

export interface ReadyAutomationCounts {
  enabledCount: number;
  readyCount: number;
}

/**
 * Count enabled vs "ready" system automations.
 * Ready = enabled + ACTIVE template + complete variableMap for template slots.
 */
export const countReadyAutomations = (
  rules: ReadinessRuleInput[],
  systemEvents: readonly string[]
): ReadyAutomationCounts => {
  const systemSet = new Set(systemEvents);
  let enabledCount = 0;
  let readyCount = 0;

  for (const rule of rules) {
    if (!systemSet.has(rule.event)) continue;
    if (!rule.enabled) continue;
    enabledCount += 1;

    const template = rule.template;
    if (!template || template.status !== "ACTIVE") continue;

    const requiredVars = Array.isArray(template.variables)
      ? (template.variables as string[])
      : [];
    const variableMap = getVariableMapFromConfig(rule.configuration);
    if (!isVariableMapComplete(requiredVars, variableMap)) continue;

    readyCount += 1;
  }

  return { enabledCount, readyCount };
};

export interface ReadinessCheckInputs {
  providerConfigured: boolean;
  redisOk: boolean;
  workerOnline: boolean;
  globalEnabled: boolean;
  activeTemplateCount: number;
  readyAutomationCount: number;
}

/**
 * Build short human-readable blocking issues for the readiness panel.
 */
export const buildBlockingIssues = (input: ReadinessCheckInputs): string[] => {
  const issues: string[] = [];
  if (!input.providerConfigured) {
    issues.push("MSG91 credentials or integrated WhatsApp number are missing.");
  }
  if (!input.redisOk) {
    issues.push("Redis is unavailable — the WhatsApp queue cannot run.");
  }
  if (!input.workerOnline) {
    issues.push("WhatsApp worker is offline. Run `npm run worker` in the backend.");
  }
  if (!input.globalEnabled) {
    issues.push("Global WhatsApp automation is OFF.");
  }
  if (input.activeTemplateCount === 0) {
    issues.push("No ACTIVE templates. Sync from MSG91 and activate at least one.");
  }
  if (input.readyAutomationCount === 0) {
    issues.push(
      "No ready automations. Enable an automation with an ACTIVE template and complete variable mapping."
    );
  }
  return issues;
};

export const isOverallReady = (input: ReadinessCheckInputs): boolean =>
  input.providerConfigured &&
  input.redisOk &&
  input.workerOnline &&
  input.globalEnabled &&
  input.activeTemplateCount > 0 &&
  input.readyAutomationCount > 0;

export const maskPhoneTail = (phone?: string | null): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `***${digits.slice(-4)}`;
};
