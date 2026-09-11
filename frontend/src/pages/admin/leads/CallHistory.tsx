import React, { useMemo, useState } from "react";
import {
  PhoneCall,
  Search,
  Loader2,
  AlertCircle,
  Phone,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCallHistory,
  useCreateManualCallLog,
  useLeads,
} from "@/hooks/useLeads";
import type { CallLog } from "@/services/leads.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CallDetailDrawer } from "./components/CallDetailDrawer";
import { LeadModuleNavLinks } from "./components/LeadModuleNavLinks";

type CallTypeTab = "ALL" | "AI" | "MANUAL";

const manualCallSchema = z.object({
  leadId: z.string().min(1, "Select a lead"),
  status: z.string().min(1),
  duration: z.coerce.number().int().min(0).default(0),
  outcome: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  qualification: z.string().optional().or(z.literal("")),
  sentiment: z.string().optional().or(z.literal("")),
  nextAction: z.string().optional().or(z.literal("")),
  interestStatus: z.string().optional().or(z.literal("")),
});

type ManualCallFormValues = z.infer<typeof manualCallSchema>;

function formatDuration(seconds?: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function callerLabel(log: CallLog): string {
  if (log.caller?.name) return log.caller.name;
  if (log.callType === "MANUAL") return "Counsellor";
  return "AI Agent";
}

function interestLabel(log: CallLog): string {
  const parts = [
    log.aiScore,
    log.interestStatus,
    log.lead?.leadScore != null ? `${log.lead.leadScore}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

export const CallHistory: React.FC = () => {
  const [callTypeTab, setCallTypeTab] = useState<CallTypeTab>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useCallHistory({
    page,
    limit: 20,
    callType: callTypeTab,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  const { data: leadsResponse } = useLeads({
    page: 1,
    limit: 20,
    search: leadSearch.trim() || undefined,
  });

  const createManualCall = useCreateManualCallLog();

  const form = useForm<ManualCallFormValues>({
    resolver: zodResolver(manualCallSchema) as never,
    defaultValues: {
      leadId: "",
      status: "COMPLETED",
      duration: 0,
      outcome: "",
      notes: "",
      qualification: "",
      sentiment: "",
      nextAction: "",
      interestStatus: "",
    },
  });

  const callLogs: CallLog[] = Array.isArray(data?.data?.data)
    ? data.data.data
    : Array.isArray(data?.data)
      ? data.data
      : [];
  const meta = data?.data?.meta || data?.meta || { total: 0, page: 1, totalPages: 1 };

  const leadOptions = useMemo(() => {
    const raw = leadsResponse?.data?.data ?? leadsResponse?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [leadsResponse]);

  const filtered = callLogs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (log.lead?.name || "").toLowerCase().includes(q) ||
      (log.lead?.phoneNumber || "").includes(q) ||
      (log.caller?.name || "").toLowerCase().includes(q) ||
      (log.aiSummary || "").toLowerCase().includes(q) ||
      (log.outcome || "").toLowerCase().includes(q) ||
      (log.interestStatus || "").toLowerCase().includes(q) ||
      (log.nextAction || "").toLowerCase().includes(q)
    );
  });

  const openCallDetail = (log: CallLog) => {
    setSelectedCall(log);
    setDrawerOpen(true);
  };

  const resetLogDialog = () => {
    form.reset({
      leadId: "",
      status: "COMPLETED",
      duration: 0,
      outcome: "",
      notes: "",
      qualification: "",
      sentiment: "",
      nextAction: "",
      interestStatus: "",
    });
    setLeadSearch("");
    setFormError(null);
  };

  const onSubmitManualCall = (values: ManualCallFormValues) => {
    setFormError(null);
    createManualCall.mutate(
      {
        leadId: values.leadId,
        status: values.status,
        duration: values.duration ?? 0,
        outcome: values.outcome || null,
        notes: values.notes || null,
        qualification: values.qualification || null,
        sentiment: values.sentiment || null,
        nextAction: values.nextAction || null,
        interestStatus: values.interestStatus || null,
      },
      {
        onSuccess: () => {
          setLogDialogOpen(false);
          resetLogDialog();
          refetch();
        },
        onError: (err: unknown) => {
          const message =
            (err as { response?: { data?: { message?: string } }; message?: string })
              ?.response?.data?.message ||
            (err as Error)?.message ||
            "Failed to log manual call.";
          setFormError(message);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Call History</h2>
          <p className="text-sm text-text-secondary">
            Unified AI and manual call logs with recordings, outcomes, and next actions.
          </p>
          <LeadModuleNavLinks className="mt-2" />
        </div>
        <PermissionGate itemKey="leads.all" mode="write">
          <Button
            className="bg-[#2563EB] hover:bg-[#F39A16] text-white"
            onClick={() => {
              resetLogDialog();
              setLogDialogOpen(true);
            }}
          >
            <Phone className="mr-2 h-4 w-4" />
            Log Manual Call
          </Button>
        </PermissionGate>
      </div>

      <Tabs
        value={callTypeTab}
        onValueChange={(value) => {
          setCallTypeTab(value as CallTypeTab);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="ALL">All Calls</TabsTrigger>
          <TabsTrigger value="AI">AI Calls</TabsTrigger>
          <TabsTrigger value="MANUAL">Manual Calls</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by lead, caller, outcome, or next action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 border rounded-md text-sm bg-background"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="NO_ANSWER">No Answer</option>
              <option value="BUSY">Busy</option>
              <option value="CALLBACK_REQUESTED">Callback Requested</option>
              <option value="INITIATED">Initiated</option>
              <option value="RINGING">Ringing</option>
              <option value="ANSWERED">Answered</option>
            </select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Call Type</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>AI Score / Interest</TableHead>
                  <TableHead>Next Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Loading call history...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-red-600">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      Failed to load call history.
                      <Button variant="link" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-text-secondary">
                      <PhoneCall className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No call records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-bg-secondary/30"
                      onClick={() => openCallDetail(log)}
                    >
                      <TableCell>
                        <div className="font-medium">{log.lead?.name || "Unknown"}</div>
                        <div className="text-xs text-text-secondary">{log.lead?.phoneNumber}</div>
                      </TableCell>
                      <TableCell className="text-sm">{callerLabel(log)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.callType || "AI"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                        {new Date(log.startedAt || log.createdAt).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>{formatDuration(log.duration)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[140px] truncate">
                        {log.outcome || "—"}
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">
                        {interestLabel(log)}
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">
                        {log.nextAction || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">
                Page {meta.page} of {meta.totalPages} · {meta.total} calls
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CallDetailDrawer
        call={selectedCall}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelectedCall(null);
        }}
      />

      <Dialog
        open={logDialogOpen}
        onOpenChange={(open) => {
          setLogDialogOpen(open);
          if (!open) resetLogDialog();
        }}
      >
        <DialogContent className="max-w-lg bg-background">
          <DialogHeader>
            <DialogTitle>Log Manual Call</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitManualCall)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lead-search">Find lead</Label>
                <Input
                  id="lead-search"
                  placeholder="Search lead by name or phone..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                />
              </div>

              <FormField
                control={form.control}
                name="leadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        <option value="">Select a lead...</option>
                        {leadOptions.map(
                          (lead: {
                            id: string;
                            name: string;
                            phoneNumber?: string;
                          }) => (
                            <option key={lead.id} value={lead.id}>
                              {lead.name}
                              {lead.phoneNumber ? ` · ${lead.phoneNumber}` : ""}
                            </option>
                          )
                        )}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <option value="COMPLETED">Completed</option>
                          <option value="NO_ANSWER">No Answer</option>
                          <option value="BUSY">Busy</option>
                          <option value="FAILED">Failed</option>
                          <option value="CALLBACK_REQUESTED">Callback Requested</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (seconds)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Interested in counselling" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification</FormLabel>
                      <FormControl>
                        <Input placeholder="Hot / Warm / Cold" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sentiment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sentiment</FormLabel>
                      <FormControl>
                        <Input placeholder="Positive / Neutral / Negative" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="interestStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest status</FormLabel>
                    <FormControl>
                      <Input placeholder="INTERESTED / NOT_INTERESTED / ..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextAction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next action</FormLabel>
                    <FormControl>
                      <Input placeholder="Schedule counselling tomorrow" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes / summary</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Call notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {formError ? (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  {formError}
                </p>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createManualCall.isPending}
                  className="bg-[#2563EB] hover:bg-[#F39A16] text-white"
                >
                  {createManualCall.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save call log"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
