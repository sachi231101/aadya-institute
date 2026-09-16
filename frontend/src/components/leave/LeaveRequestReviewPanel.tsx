import React, { useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { usePendingLeaveRequests, useReviewLeaveRequest } from "@/hooks/useLeaveRequests";

const formatRange = (startDate: string, endDate: string) => {
  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return startDate === endDate ? format(startDate) : `${format(startDate)} – ${format(endDate)}`;
};

const apiMessage = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  "Unable to review this leave request";

export const LeaveRequestReviewPanel: React.FC = () => {
  const { data, isLoading, isError, refetch } = usePendingLeaveRequests();
  const review = useReviewLeaveRequest();
  const requests = data?.data ?? [];
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const decide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setError(null);
    setActingId(id);
    try {
      await review.mutateAsync({
        id,
        decision,
        reviewNote: notes[id]?.trim() || undefined,
      });
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setActingId(null);
    }
  };

  return (
    <Card className="bg-card rounded-xl border border-border p-4 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-foreground">Leave requests</h3>
        </div>
        <Badge variant="warning" className="text-[10px]">
          {requests.length} pending
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Approve or reject student leave. Approved days are marked as leave, not absent.
      </p>

      <div className="mt-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading leave requests…
          </div>
        ) : isError ? (
          <div className="text-xs text-rose-600 flex items-center justify-between gap-2">
            <span>Could not load leave requests.</span>
            <button type="button" className="underline" onClick={() => void refetch()}>
              Retry
            </button>
          </div>
        ) : requests.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">No pending leave requests.</p>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {request.studentName} · {request.studentCode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRange(request.startDate, request.endDate)}
                  </p>
                </div>
                <Badge variant="warning" className="text-[10px] shrink-0">
                  Pending
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{request.reason}</p>
              <Textarea
                rows={2}
                placeholder="Optional note"
                value={notes[request.id] ?? ""}
                onChange={(event) =>
                  setNotes((current) => ({ ...current, [request.id]: event.target.value }))
                }
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  className="h-8 rounded-xl text-xs"
                  disabled={review.isPending && actingId === request.id}
                  onClick={() => void decide(request.id, "APPROVED")}
                >
                  {review.isPending && actingId === request.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Approve"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-xl text-xs"
                  disabled={review.isPending && actingId === request.id}
                  onClick={() => void decide(request.id, "REJECTED")}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    </Card>
  );
};
