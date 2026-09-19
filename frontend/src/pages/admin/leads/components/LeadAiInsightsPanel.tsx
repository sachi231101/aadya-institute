import React, { useMemo } from "react";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CallLog, Lead } from "@/services/leads.api";
import { LeadIntentBadge } from "./LeadIntentBadge";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { LeadStageBadge } from "@/components/common/LeadStageBadge";
import { useAiCallingConfig } from "@/hooks/useAiCalling";
import {
  DEFAULT_SCORE_TEMPERATURE_BANDS,
  type ScoreTemperatureBands,
} from "@/services/ai-calling.api";

const META_EXTRACTED_KEYS = new Set([
  "_missingFieldsAfterMerge",
  "interestStatus",
  "interest_status",
  "lead_intent",
  "leadIntent",
  "intent",
  "summary",
  "aiSummary",
  "ai_summary",
  "lead_score",
  "leadScore",
  "score_reason",
  "scoreReason",
  "lead_temperature",
  "leadTemperature",
]);

const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  interestedIn: "Course interest",
  course_interest: "Course interest",
  course_name: "Course name",
  branch_name: "Branch name",
  phone_number: "Phone number",
  lead_name: "Name",
  preferred_timing: "Preferred timing",
  budget: "Budget",
  objections: "Objections",
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function formatFieldValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "—";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function humanizeKey(key: string): string {
  if (FIELD_LABEL_OVERRIDES[key]) return FIELD_LABEL_OVERRIDES[key];
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractMissingFields(extracted: Record<string, unknown>): string[] {
  const raw = extracted._missingFieldsAfterMerge;
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function formatFollowUp(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function collectAiDisplayEntries(
  lead: Lead,
  latestCall?: CallLog | null
): Array<{ key: string; label: string; value: string; source: "lead" | "call" }> {
  const entries: Array<{
    key: string;
    label: string;
    value: string;
    source: "lead" | "call";
  }> = [];
  const seen = new Set<string>();

  const aiFields = asRecord(lead.aiCollectedFields);
  for (const [key, value] of Object.entries(aiFields)) {
    if (META_EXTRACTED_KEYS.has(key)) continue;
    const formatted = formatFieldValue(value);
    if (formatted === "—") continue;
    seen.add(key);
    entries.push({
      key,
      label: humanizeKey(key),
      value: formatted,
      source: "lead",
    });
  }

  const extracted = asRecord(latestCall?.extractedFields);
  for (const [key, value] of Object.entries(extracted)) {
    if (META_EXTRACTED_KEYS.has(key) || seen.has(key)) continue;
    const formatted = formatFieldValue(value);
    if (formatted === "—") continue;
    seen.add(key);
    entries.push({
      key,
      label: humanizeKey(key),
      value: formatted,
      source: "call",
    });
  }

  return entries;
}

export interface LeadAiInsightsPanelProps {
  lead: Lead;
  latestCall?: CallLog | null;
}

export const LeadAiInsightsPanel: React.FC<LeadAiInsightsPanelProps> = ({
  lead,
  latestCall,
}) => {
  const { data: aiConfigRes } = useAiCallingConfig(true);
  const bands: ScoreTemperatureBands =
    aiConfigRes?.data?.scoreTemperatureBands ?? DEFAULT_SCORE_TEMPERATURE_BANDS;

  const intent = lead.leadIntent || latestCall?.interestStatus || null;
  const summary = latestCall?.aiSummary || null;
  const scoreReason =
    latestCall?.scoreReason ||
    (asRecord(lead.aiCollectedFields).score_reason as string | undefined) ||
    (asRecord(latestCall?.extractedFields).score_reason as string | undefined) ||
    null;
  const extracted = useMemo(
    () => asRecord(latestCall?.extractedFields),
    [latestCall?.extractedFields]
  );
  const missingFields = useMemo(() => extractMissingFields(extracted), [extracted]);
  const aiEntries = useMemo(
    () => collectAiDisplayEntries(lead, latestCall),
    [lead, latestCall]
  );

  const hasAnyAiSignal =
    Boolean(intent) ||
    Boolean(summary) ||
    lead.leadScore != null ||
    Boolean(lead.leadTemperature) ||
    Boolean(lead.nextFollowUpAt) ||
    aiEntries.length > 0 ||
    missingFields.length > 0 ||
    Boolean(lead.aiCollectedFields && Object.keys(asRecord(lead.aiCollectedFields)).length);

  if (!hasAnyAiSignal) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            AI calling insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No AI-collected data yet. After an AI call completes, intent, score, extracted fields, and
            missing information appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            AI calling insights
          </CardTitle>
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            <LeadScoreBadge
              score={lead.leadScore}
              temperature={lead.leadTemperature}
              bands={bands}
              showScore={false}
            />
            <LeadIntentBadge intent={intent} emptyLabel="No intent yet" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border border-border/60 px-3 py-2">
              <dt className="text-text-muted text-xs">Score</dt>
              <dd className="font-semibold mt-0.5">
                {lead.leadScore != null ? `${lead.leadScore}/100` : "—"}
              </dd>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2">
              <dt className="text-text-muted text-xs">Temperature</dt>
              <dd className="mt-0.5">
                <LeadScoreBadge
                  score={lead.leadScore}
                  temperature={lead.leadTemperature}
                  bands={bands}
                  showScore={false}
                />
              </dd>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2">
              <dt className="text-text-muted text-xs">AI Intent</dt>
              <dd className="mt-0.5">
                <LeadIntentBadge intent={intent} emptyLabel="—" />
              </dd>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2">
              <dt className="text-text-muted text-xs">Stage</dt>
              <dd className="mt-0.5">
                <LeadStageBadge stage={lead.stage} />
              </dd>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2">
              <dt className="text-text-muted text-xs">Counsellor</dt>
              <dd className="font-medium mt-0.5">
                {lead.assignedCounsellor?.name || "Unassigned"}
              </dd>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2">
              <dt className="text-text-muted text-xs">Branch</dt>
              <dd className="font-medium mt-0.5">{lead.branch?.name || "—"}</dd>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2 sm:col-span-2 lg:col-span-3">
              <dt className="text-text-muted text-xs">Next Follow-up</dt>
              <dd className="font-medium mt-0.5">{formatFollowUp(lead.nextFollowUpAt)}</dd>
            </div>
          </dl>

          {scoreReason ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Score reason
              </p>
              <p className="text-sm rounded-lg border border-border bg-muted/20 p-3">{scoreReason}</p>
            </div>
          ) : null}

          {summary ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                AI Summary
              </p>
              <p className="text-sm whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3">
                {summary}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              AI-collected information
            </p>
            {aiEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No structured fields extracted yet.
              </p>
            ) : (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {aiEntries.map((entry) => (
                  <div key={entry.key} className="rounded-md border border-border/60 px-3 py-2">
                    <dt className="text-text-muted text-xs flex items-center gap-1.5">
                      {entry.label}
                      {entry.source === "call" ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Last call
                        </Badge>
                      ) : null}
                    </dt>
                    <dd className="font-medium mt-0.5 break-words">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {missingFields.length > 0 ? (
              <AlertCircle size={16} className="text-amber-600" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600" />
            )}
            Missing information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!latestCall?.extractedFields ||
          !("_missingFieldsAfterMerge" in asRecord(latestCall.extractedFields)) ? (
            <p className="text-sm text-muted-foreground">
              Missing-field checklist appears after an AI call merge completes.
            </p>
          ) : missingFields.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              All mapped fields are filled after the latest AI call merge.
            </p>
          ) : (
            <ul className="space-y-2">
              {missingFields.map((field) => (
                <li
                  key={field}
                  className="flex items-center gap-2 text-sm rounded-md border border-amber-200/80 bg-amber-50/50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20"
                >
                  <AlertCircle
                    size={14}
                    className="text-amber-700 shrink-0 dark:text-amber-400"
                  />
                  <span className="font-medium">{humanizeKey(field)}</span>
                  <span className="text-xs text-muted-foreground font-mono">({field})</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">
            Based on the institute Sarvam variable map vs values after the last AI merge
            {latestCall ? ` (call ${latestCall.status})` : ""}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
