import React, { useEffect, useMemo, useState } from "react";
import {
  PhoneCall,
  Search,
  Phone,
  Loader2,
  AlertCircle,
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { FilterToolbar } from "@/components/layout";
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
import { LeadWorkspaceShell } from "./components/LeadWorkspaceShell";
import { LeadDataSurface, LeadListState } from "./components/LeadDataSurface";

type CallTypeTab = "ALL" | "AI" | "MANUAL";

const CALL_HISTORY_COLUMNS = 6;

const manualCallSchema = z.object({
  leadId: z.string().min(1, "Select a lead"),
  status: z.string().min(1),
  duration: z.coerce.number().int().min(0).default(0),
  outcome: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type ManualCallFormValues = z.infer<typeof manualCallSchema>;

function formatDuration(seconds?: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
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
    // Pass search to API once backend supports queryCallHistory.search (name/phone).
    search: searchTerm.trim() || undefined,
  });

  const { data: leadsResponse } = useLeads({
    page: 1,
    limit: 20,
    status: "ACTIVE",
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

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

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
    <LeadWorkspaceShell
      title="Call History"
      description="AI and manual call outcomes and next actions (details in drawer)."
      primaryAction={
        <PermissionGate itemKey="leads.all" mode="write">
          <Button
            onClick={() => {
              resetLogDialog();
              setLogDialogOpen(true);
            }}
          >
            <Phone className="mr-2 h-4 w-4" />
            Log Manual Call
          </Button>
        </PermissionGate>
      }
      toolbar={
        <FilterToolbar className="!py-0 gap-2">
          <div className="flex w-full flex-wrap items-center gap-2">
            <Tabs
              value={callTypeTab}
              onValueChange={(value) => {
                setCallTypeTab(value as CallTypeTab);
                setPage(1);
              }}
            >
              <TabsList className="h-9 shrink-0 gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
                <TabsTrigger
                  value="ALL"
                  className="h-8 px-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="AI"
                  className="h-8 px-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  AI
                </TabsTrigger>
                <TabsTrigger
                  value="MANUAL"
                  className="h-8 px-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  Manual
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative min-w-[180px] flex-1 basis-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search lead name or phone…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 rounded-md border-border bg-background pl-8"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 w-[160px] shrink-0 rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground"
              aria-label="Filter by status"
            >
              <option value="ALL">All statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="NO_ANSWER">No Answer</option>
              <option value="BUSY">Busy</option>
              <option value="CALLBACK_REQUESTED">Callback Requested</option>
            </select>
          </div>
        </FilterToolbar>
      }
    >
      <LeadDataSurface>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Call Type</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={CALL_HISTORY_COLUMNS} className="p-0">
                      <LeadListState kind="loading" message="Loading call history..." />
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={CALL_HISTORY_COLUMNS} className="p-0">
                      <LeadListState
                        kind="error"
                        message="Failed to load call history."
                        onRetry={() => refetch()}
                      />
                    </TableCell>
                  </TableRow>
                ) : callLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={CALL_HISTORY_COLUMNS} className="p-0">
                      <LeadListState
                        kind="empty"
                        message="No call records found."
                        icon={PhoneCall}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  callLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openCallDetail(log)}
                    >
                      <TableCell>
                        <div className="font-medium">{log.lead?.name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{log.lead?.phoneNumber}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.callType || "AI"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.startedAt || log.createdAt).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>{formatDuration(log.duration)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[140px] truncate">
                        {log.outcome || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {(meta.totalPages > 1 || meta.total > 0 || Boolean(searchTerm.trim())) && (
            <div className="flex justify-between items-center text-sm px-4 py-3 border-t border-border">
              <span className="text-muted-foreground">
                {searchTerm.trim()
                  ? `${meta.total} matching · Page ${meta.page} of ${meta.totalPages}`
                  : `Page ${meta.page} of ${meta.totalPages} · ${meta.total} calls`}
              </span>
              {meta.totalPages > 1 ? (
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
              ) : null}
            </div>
          )}
      </LeadDataSurface>

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
    </LeadWorkspaceShell>
  );
};
