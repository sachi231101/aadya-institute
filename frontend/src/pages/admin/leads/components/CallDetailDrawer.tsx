import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ExternalLink,
  FileAudio,
  MessageSquareText,
  Sparkles,
  User,
  Phone,
  X,
  ListChecks,
} from "lucide-react";
import type { CallLog } from "@/services/leads.api";
import { getPortalBasePath } from "@/utils/portal-path";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LeadIntentBadge } from "./LeadIntentBadge";
import { LeadScoreBadge } from "./LeadScoreBadge";

function formatDuration(seconds?: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

const META_KEYS = new Set([
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

function DetailBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground whitespace-pre-wrap break-words">
        {children}
      </div>
    </div>
  );
}

function resolveScoreReason(call: CallLog): string | null {
  if (call.scoreReason?.trim()) return call.scoreReason.trim();
  const extracted = asRecord(call.extractedFields);
  const fromExtracted =
    extracted.score_reason ?? extracted.scoreReason ?? extracted.Score_Reason;
  if (typeof fromExtracted === "string" && fromExtracted.trim()) {
    return fromExtracted.trim();
  }
  return null;
}

export interface CallDetailDrawerProps {
  call: CallLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CallDetailDrawer: React.FC<CallDetailDrawerProps> = ({
  call,
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const leadId = call?.leadId || call?.lead?.id;

  const extracted = asRecord(call?.extractedFields);
  const missingRaw = extracted._missingFieldsAfterMerge;
  const missingFields: string[] = Array.isArray(missingRaw)
    ? missingRaw.filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
    : typeof missingRaw === "string" && missingRaw.trim()
      ? missingRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const extractedEntries = Object.entries(extracted).filter(
    ([key, value]) =>
      !META_KEYS.has(key) &&
      value != null &&
      !(typeof value === "string" && !value.trim())
  );

  const score =
    call?.lead?.leadScore ??
    (call?.aiScore != null && !Number.isNaN(Number(call.aiScore))
      ? Number(call.aiScore)
      : null);
  const temperature = call?.lead?.leadTemperature ?? null;
  const scoreReason = call ? resolveScoreReason(call) : null;

  const goToLead360 = () => {
    if (!leadId) return;
    onOpenChange(false);
    navigate(`${basePath}/leads/${leadId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-xl bg-card text-foreground border-l border-border"
      >
        {!call ? (
          <div className="p-8 text-sm text-muted-foreground">No call selected.</div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="shrink-0 space-y-3 border-b border-border bg-muted/30 p-5 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{call.callType || "AI"}</Badge>
                  <Badge variant="secondary">{call.status}</Badge>
                  <LeadIntentBadge intent={call.interestStatus} />
                  <LeadScoreBadge
                    score={score}
                    temperature={temperature}
                    showScore={false}
                  />
                </div>
                <SheetClose asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Close call details"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>
              <div>
                <SheetTitle className="text-lg font-bold">
                  {call.lead?.name || "Unknown lead"}
                </SheetTitle>
                <SheetDescription className="text-xs mt-1">
                  {formatDateTime(call.startedAt || call.createdAt)}
                  {" · "}
                  {formatDuration(call.duration)}
                  {call.lead?.phoneNumber ? ` · ${call.lead.phoneNumber}` : ""}
                </SheetDescription>
              </div>
              {leadId ? (
                <Button size="sm" className="w-fit" onClick={goToLead360}>
                  Open Lead 360
                  <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </Button>
              ) : null}
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/20 text-sm">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Caller</p>
                    <p className="font-medium">
                      {call.caller?.name ||
                        (call.callType === "MANUAL" ? "Counsellor" : "AI Agent")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Outcome</p>
                    <p className="font-medium">{call.outcome || "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Score</p>
                  <p className="font-medium">
                    {score != null ? `${score}/100` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Temperature</p>
                  <div className="mt-0.5">
                    <LeadScoreBadge
                      score={score}
                      temperature={temperature}
                      showScore={false}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">AI Intent</p>
                  <div className="mt-0.5">
                    <LeadIntentBadge intent={call.interestStatus} emptyLabel="—" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Counsellor</p>
                  <p className="font-medium">
                    {call.lead?.assignedCounsellor?.name || "Unassigned"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Sentiment</p>
                  <p className="font-medium">{call.sentiment || "—"}</p>
                </div>
              </div>

              {scoreReason ? (
                <DetailBlock label="Score reason">{scoreReason}</DetailBlock>
              ) : null}

              <DetailBlock label="Qualification">
                {call.qualification || "—"}
              </DetailBlock>

              <DetailBlock label="Next action / follow-up">
                {call.nextAction || "—"}
              </DetailBlock>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Summary
                </p>
                <div className="p-3 rounded-lg border border-border bg-muted/20 text-sm whitespace-pre-wrap">
                  {call.aiSummary || "No summary available."}
                </div>
              </div>

              {extractedEntries.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Extracted fields
                  </p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {extractedEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-md border border-border/60 px-3 py-2"
                      >
                        <dt className="text-[11px] text-muted-foreground">
                          {key.replace(/_/g, " ")}
                        </dt>
                        <dd className="font-medium break-words">
                          {typeof value === "string"
                            ? value
                            : JSON.stringify(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {missingFields.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5" />
                    Missing after merge
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {missingFields.map((field) => (
                      <Badge key={field} variant="warning">
                        {field.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  Transcript
                </p>
                <div className="p-3 rounded-lg border border-border bg-muted/20 text-sm max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {call.transcript || "No transcript available."}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileAudio className="h-3.5 w-3.5" />
                  Recording
                </p>
                {call.recordingUrl ? (
                  <div className="space-y-2">
                    <audio controls className="w-full" src={call.recordingUrl}>
                      Your browser does not support audio playback.
                    </audio>
                    <a
                      href={call.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary text-xs font-semibold inline-flex items-center gap-1"
                    >
                      Open recording <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recording available.</p>
                )}
              </div>

              {call.failureReason ? (
                <DetailBlock label="Failure reason">{call.failureReason}</DetailBlock>
              ) : null}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
