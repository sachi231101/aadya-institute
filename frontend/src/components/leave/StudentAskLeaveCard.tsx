import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCancelLeaveRequest,
  useCreateLeaveRequest,
  useMyLeaveRequests,
} from "@/hooks/useLeaveRequests";
import type { LeaveRequestStatus } from "@/services/leave-requests.api";

const todayKey = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
};

const leaveFormSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date"),
    reason: z.string().trim().min(5, "Reason must be at least 5 characters").max(500),
  })
  .refine((value) => value.startDate >= todayKey() && value.endDate >= todayKey(), {
    message: "Leave dates cannot be in the past",
    path: ["startDate"],
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date cannot be before start date",
    path: ["endDate"],
  })
  .refine((value) => {
    const start = new Date(`${value.startDate}T00:00:00Z`).getTime();
    const end = new Date(`${value.endDate}T00:00:00Z`).getTime();
    return Math.round((end - start) / 86_400_000) + 1 <= 14;
  }, {
    message: "Leave cannot be longer than 14 days",
    path: ["endDate"],
  });

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

const statusLabel: Record<LeaveRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const statusVariant = (status: LeaveRequestStatus) => {
  if (status === "APPROVED") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  if (status === "REJECTED") return "destructive" as const;
  return "outline" as const;
};

const formatRange = (startDate: string, endDate: string) => {
  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  return startDate === endDate ? format(startDate) : `${format(startDate)} – ${format(endDate)}`;
};

const apiMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export const StudentAskLeaveCard: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useMyLeaveRequests();
  const createRequest = useCreateLeaveRequest();
  const cancelRequest = useCancelLeaveRequest();
  const requests = data?.data ?? [];
  const today = todayKey();

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      startDate: today,
      endDate: today,
      reason: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createRequest.mutateAsync(values);
      form.reset({ startDate: today, endDate: today, reason: "" });
      setOpen(false);
    } catch (err) {
      form.setError("root", { message: apiMessage(err, "Unable to submit leave request") });
    }
  });

  return (
    <Card className="bg-card rounded-xl border border-border p-4 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Ask Leave</h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            Request time off. Your counsellor or faculty can approve it.
          </p>
        </div>
        <Button type="button" className="h-8 rounded-xl text-xs shrink-0" onClick={() => setOpen(true)}>
          Ask Leave
        </Button>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading leave requests…
          </div>
        ) : isError ? (
          <div className="text-xs text-rose-600 flex items-center justify-between gap-2">
            <span>Could not load leave requests.</span>
            <button type="button" className="underline" onClick={() => void refetch()}>
              Retry
            </button>
          </div>
        ) : requests.length === 0 ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">No leave requests yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {requests.slice(0, 5).map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">
                    {formatRange(request.startDate, request.endDate)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{request.reason}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={statusVariant(request.status)} className="text-[10px]">
                    {statusLabel[request.status]}
                  </Badge>
                  {request.status === "PENDING" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 px-2 text-[10px] rounded-lg"
                      disabled={cancelRequest.isPending}
                      onClick={() => cancelRequest.mutate(request.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ask for leave</DialogTitle>
            <DialogDescription>
              Choose the dates you will be away. Approved leave is not counted as an absence.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="leave-start">From</Label>
                <Input id="leave-start" type="date" min={today} {...form.register("startDate")} />
                {form.formState.errors.startDate && (
                  <p className="text-[11px] text-rose-600">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="leave-end">To</Label>
                <Input id="leave-end" type="date" min={today} {...form.register("endDate")} />
                {form.formState.errors.endDate && (
                  <p className="text-[11px] text-rose-600">{form.formState.errors.endDate.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="leave-reason">Reason</Label>
              <Textarea id="leave-reason" rows={3} placeholder="Why do you need leave?" {...form.register("reason")} />
              {form.formState.errors.reason && (
                <p className="text-[11px] text-rose-600">{form.formState.errors.reason.message}</p>
              )}
            </div>
            {form.formState.errors.root && (
              <p className="text-[11px] text-rose-600">{form.formState.errors.root.message}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
