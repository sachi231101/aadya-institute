import React from "react";
import { CalendarCheck, ExternalLink, FileAudio, MessageSquareText, Sparkles } from "lucide-react";
import type { CallLog } from "@/services/leads.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeadScoreBadge, getLeadScoreBand } from "./LeadScoreBadge";
import { cn } from "@/utils";

function formatInterest(value?: string | null): string {
  if (!value) return "No interest status";
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDuration(seconds?: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

/** Heuristic aligned with LeadAiOutcomeService.createFollowUp when API flag absent. */
export function detectAiFollowUpCreated(call: CallLog): boolean {
  if ((call as CallLog & { followUpCreated?: boolean }).followUpCreated === true) {
    return true;
  }
  const interest = (call.interestStatus || "").toUpperCase();
  const status = (call.status || "").toUpperCase();
  const next = (call.nextAction || "").toLowerCase();

  if (status === "CALLBACK_REQUESTED") return true;
  if (interest.includes("HIGH") || interest.includes("INTERESTED") || interest === "HOT") {
    return true;
  }
  if (interest.includes("WARM") || interest.includes("MAYBE")) return true;
  if (interest.includes("NOT") || interest.includes("LOW") || interest === "COLD") {
    return false;
  }
  if (status === "COMPLETED" && (call.duration ?? 0) >= 30) return true;
  if (
    next.includes("follow-up") ||
    next.includes("follow up") ||
    next.includes("schedule counselling")
  ) {
    return true;
  }
  return false;
}

export interface AiCallingResultCardProps {
  call: CallLog;
  onOpenDetail?: (call: CallLog) => void;
  onViewLead?: (leadId: string, tab?: string) => void;
  className?: string;
}

/** Result card: Hot Lead — 87/100 · interest · next action */
export const AiCallingResultCard: React.FC<AiCallingResultCardProps> = ({
  call,
  onOpenDetail,
  onViewLead,
  className,
}) => {
  const leadId = call.leadId || call.lead?.id;
  const score = call.lead?.leadScore ?? (call.aiScore != null ? Number(call.aiScore) : null);
  const band = getLeadScoreBand(score);
  const bandLabel = band === "hot" ? "Hot Lead" : band === "warm" ? "Warm Lead" : band === "cold" ? "Cold Lead" : "Lead";
  const nextAction = call.nextAction || "Review and follow up";
  const interest = formatInterest(call.interestStatus || call.outcome);
  const summary = call.aiSummary || "No AI summary yet.";
  const followUpCreated = detectAiFollowUpCreated(call);

  return (
    <Card
      className={cn(
        "border-border shadow-xs hover:shadow-md transition-shadow cursor-pointer",
        className
      )}
      onClick={() => onOpenDetail?.(call)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-foreground truncate">
              {call.lead?.name || "Unknown lead"}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {call.lead?.phoneNumber || call.fromNumber || "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className="text-[10px] uppercase">
              {call.status.replace(/_/g, " ")}
            </Badge>
            <LeadScoreBadge score={score} />
          </div>
        </div>

        {followUpCreated ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="gap-1 bg-amber-50 text-amber-900 border-amber-200"
            >
              <CalendarCheck className="h-3 w-3" />
              Follow-up created
            </Badge>
            {leadId ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-[#2563EB]"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLead?.(leadId, "follow-ups");
                }}
              >
                Open follow-ups
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            ) : null}
          </div>
        ) : null}

        <p className="text-sm font-medium text-foreground leading-snug">
          {bandLabel}
          {score != null && score > 0 ? ` — ${score}/100` : ""}
          <span className="text-muted-foreground font-normal">
            {" · "}
            {interest}
            {" · "}
            Next: {nextAction}
          </span>
        </p>

        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Summary
          </p>
          <p className="text-sm text-foreground line-clamp-3 whitespace-pre-wrap">{summary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Attempt {call.attemptNumber ?? 1}</span>
          <span>·</span>
          <span>{formatDuration(call.duration)}</span>
          {call.recordingUrl ? (
            <>
              <span>·</span>
              <a
                href={call.recordingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary font-semibold"
                onClick={(e) => e.stopPropagation()}
              >
                <FileAudio className="h-3.5 w-3.5" />
                Recording
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : null}
          {call.transcript ? (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquareText className="h-3.5 w-3.5" />
                Transcript
              </span>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2 pt-1">
          {leadId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onViewLead?.(leadId);
              }}
            >
              Open Lead 360
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail?.(call);
            }}
          >
            Call details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
