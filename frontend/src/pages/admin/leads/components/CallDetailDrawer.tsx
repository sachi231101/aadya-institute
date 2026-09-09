import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ExternalLink,
  FileAudio,
  MessageSquareText,
  Sparkles,
  User,
  Phone,
} from "lucide-react";
import type { CallLog } from "@/services/leads.api";
import { getPortalBasePath } from "@/utils/portal-path";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

  const goToLead360 = () => {
    if (!leadId) return;
    onOpenChange(false);
    navigate(`${basePath}/leads/${leadId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 overflow-y-auto bg-card text-foreground border-l border-border"
      >
        {!call ? (
          <div className="p-8 text-sm text-muted-foreground">No call selected.</div>
        ) : (
          <div className="flex flex-col h-full">
            <SheetHeader className="p-5 border-b border-border bg-muted/30 sticky top-0 z-10 space-y-3 text-left">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <Badge variant="outline">{call.callType || "AI"}</Badge>
                <Badge variant="secondary">{call.status}</Badge>
                {call.interestStatus ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {call.interestStatus}
                  </Badge>
                ) : null}
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
                <Button
                  size="sm"
                  className="w-fit bg-[#2563EB] hover:bg-[#F39A16] text-white"
                  onClick={goToLead360}
                >
                  Open Lead 360
                  <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </Button>
              ) : null}
            </SheetHeader>

            <div className="p-5 space-y-5 flex-1">
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
                  <p className="text-[11px] text-muted-foreground">AI / interest</p>
                  <p className="font-medium">
                    {[call.aiScore, call.interestStatus, call.lead?.leadScore != null ? `Score ${call.lead.leadScore}` : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Sentiment</p>
                  <p className="font-medium">{call.sentiment || "—"}</p>
                </div>
              </div>

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
                      className="text-[#2563EB] text-xs font-semibold inline-flex items-center gap-1"
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
