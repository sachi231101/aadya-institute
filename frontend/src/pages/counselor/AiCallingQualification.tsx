import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Check,
  Clock,
  Flame,
  Loader2,
  Phone,
  PhoneCall,
  Play,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/store/auth.store";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { MasterSelect } from "@/components/common/MasterSelect";
import { getMasterLabel } from "@/utils/master.utils";
import {
  useCallHistory,
  useCreateLead,
  useLeads,
  useTriggerLeadCall,
} from "@/hooks/useLeads";
import { useAiCallingConfig } from "@/hooks/useAiCalling";
import {
  useConfirmImport,
  useImportJobs,
  usePreviewImport,
} from "@/hooks/useDataManagement";
import { useQueryClient } from "@tanstack/react-query";
import { PermissionGate, ReadOnlyBanner } from "@/components/permissions/PermissionGate";
import { getPortalBasePath } from "@/utils/portal-path";
import { ROUTES } from "@/constants/routes";
import type { CallLog, Lead } from "@/services/leads.api";
import { LeadScoreBadge } from "@/pages/admin/leads/components/LeadScoreBadge";
import { AiCallingResultCard } from "@/pages/admin/leads/components/AiCallingResultCard";
import { CallDetailDrawer } from "@/pages/admin/leads/components/CallDetailDrawer";

type WorkspaceTab = "queue" | "active" | "results";

type ImportFileJob = {
  fileName: string;
  jobId?: string;
  status: "pending" | "previewing" | "previewed" | "confirming" | "done" | "error";
  validRows?: number;
  errorRows?: number;
  message?: string;
};

const QUEUE_ELIGIBLE_STAGES = new Set([
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
]);

function extractCallLogs(data: unknown): CallLog[] {
  if (!data || typeof data !== "object") return [];
  const root = data as Record<string, unknown>;
  const inner = root.data;
  if (Array.isArray(inner)) return inner as CallLog[];
  if (inner && typeof inner === "object") {
    const nested = inner as Record<string, unknown>;
    if (Array.isArray(nested.data)) return nested.data as CallLog[];
    if (Array.isArray(nested.callLogs)) return nested.callLogs as CallLog[];
  }
  return [];
}

function extractMeta(data: unknown): { total: number; page: number; totalPages: number; limit?: number } {
  if (!data || typeof data !== "object") {
    return { total: 0, page: 1, totalPages: 1 };
  }
  const root = data as Record<string, unknown>;
  const inner = root.data;
  const meta =
    (inner && typeof inner === "object" && !Array.isArray(inner)
      ? (inner as Record<string, unknown>).meta
      : undefined) || root.meta;
  const m = (meta && typeof meta === "object" ? meta : {}) as Record<string, number>;
  return {
    total: m.total ?? 0,
    page: m.page ?? 1,
    totalPages: m.totalPages ?? 1,
    limit: m.limit,
  };
}

function extractLeads(data: unknown): Lead[] {
  if (!data || typeof data !== "object") return [];
  const root = data as Record<string, unknown>;
  const inner = root.data;
  if (Array.isArray(inner)) return inner as Lead[];
  if (inner && typeof inner === "object" && Array.isArray((inner as Record<string, unknown>).data)) {
    return (inner as Record<string, unknown>).data as Lead[];
  }
  return [];
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN");
}

export const AiCallingQualification: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const portalBase = getPortalBasePath(location.pathname);
  const aiConfigHref =
    portalBase === "/center"
      ? "/center/integrations/ai-calling"
      : ROUTES.ADMIN.ADMINISTRATION.INTEGRATIONS + "/ai-calling";
  const queryClient = useQueryClient();

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("queue");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [detailCall, setDetailCall] = useState<CallLog | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadCourse, setNewLeadCourse] = useState("");
  const [newLeadSourceMasterId, setNewLeadSourceMasterId] = useState("");
  const [triggerImmediateCall, setTriggerImmediateCall] = useState(true);
  const { options: leadSourceOptions } = useMasterDropdown("leadsource");

  const [showImportModal, setShowImportModal] = useState(false);
  const [importJobs, setImportJobs] = useState<ImportFileJob[]>([]);
  const [importBusy, setImportBusy] = useState(false);

  const { data: aiConfigRes } = useAiCallingConfig(true);
  const aiConfig = aiConfigRes?.data;
  const configMissingOrDisabled =
    !aiConfig || !aiConfig.isEnabled || !aiConfig.resolved?.hasTelephony;

  const createLeadMutation = useCreateLead();
  const triggerCallMutation = useTriggerLeadCall();
  const previewImportMutation = usePreviewImport();
  const confirmImportMutation = useConfirmImport();
  const { data: importJobsRes, refetch: refetchImportJobs } = useImportJobs({ limit: 10 });

  const queueCountQuery = useCallHistory(
    { page: 1, limit: 1, view: "queue", callType: "AI" },
    { refetchInterval: 15000 }
  );
  const activeCountQuery = useCallHistory(
    { page: 1, limit: 1, view: "active", callType: "AI" },
    { refetchInterval: 5000 }
  );
  const resultsCountQuery = useCallHistory(
    { page: 1, limit: 1, view: "results", callType: "AI" },
    { refetchInterval: 15000 }
  );
  const queueListQuery = useCallHistory(
    {
      page: 1,
      limit: 20,
      view: "queue",
      callType: "AI",
    },
    { enabled: workspaceTab === "queue", refetchInterval: 10000 }
  );
  const activeHistoryQuery = useCallHistory(
    {
      page: workspaceTab === "active" ? page : 1,
      limit: 20,
      view: "active",
      callType: "AI",
    },
    { enabled: workspaceTab === "active", refetchInterval: 5000 }
  );
  const resultsHistoryQuery = useCallHistory(
    {
      page: workspaceTab === "results" ? page : 1,
      limit: 20,
      view: "results",
      callType: "AI",
    },
    { enabled: workspaceTab === "results" }
  );

  const { data: leadsResponse, isFetching: leadsFetching } = useLeads({
    page: workspaceTab === "queue" ? page : 1,
    limit: 20,
    search: searchTerm || undefined,
    status: "ACTIVE",
    branchId: user?.branchId || undefined,
  });

  const queueMeta = extractMeta(queueCountQuery.data);
  const queuedCallLogs = extractCallLogs(queueListQuery.data);
  const queueListMeta = extractMeta(queueListQuery.data);
  const activeCalls = extractCallLogs(activeHistoryQuery.data);
  const activeMeta = extractMeta(
    workspaceTab === "active" ? activeHistoryQuery.data : activeCountQuery.data
  );
  const resultCalls = extractCallLogs(resultsHistoryQuery.data);
  const resultsMeta = extractMeta(
    workspaceTab === "results" ? resultsHistoryQuery.data : resultsCountQuery.data
  );

  const leads = extractLeads(leadsResponse);
  const leadsMeta = extractMeta(leadsResponse);

  const dialableLeads = useMemo(
    () =>
      leads.filter((lead) => {
        if (!QUEUE_ELIGIBLE_STAGES.has(String(lead.stage || "").toUpperCase())) return false;
        const latest = lead.callLogs?.[0];
        const status = String(latest?.status || "").toUpperCase();
        return !["RINGING", "ANSWERED"].includes(status);
      }),
    [leads]
  );

  const kpiStats = useMemo(
    () => ({
      queued: queueMeta.total,
      active: extractMeta(activeCountQuery.data).total,
      results: extractMeta(resultsCountQuery.data).total,
      dialable: dialableLeads.length,
    }),
    [queueMeta.total, activeCountQuery.data, resultsCountQuery.data, dialableLeads.length]
  );

  const recentImportJobs = importJobsRes?.data?.data || importJobsRes?.data || [];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  useEffect(() => {
    setPage(1);
    setSelectedLeadIds(new Set());
  }, [workspaceTab, searchTerm]);

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const toggleSelectAllDialable = () => {
    if (selectedLeadIds.size === dialableLeads.length && dialableLeads.length > 0) {
      setSelectedLeadIds(new Set());
      return;
    }
    setSelectedLeadIds(new Set(dialableLeads.map((l) => l.id)));
  };

  const handleStartAiCalls = async () => {
    const ids = Array.from(selectedLeadIds);
    if (!ids.length) {
      showToast("Select at least one lead to start AI calling");
      return;
    }
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await triggerCallMutation.mutateAsync(id);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    setSelectedLeadIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["leads", "call-history"] });
    showToast(
      failed
        ? `Queued ${ok} AI call(s); ${failed} failed`
        : `Queued ${ok} AI call(s)`
    );
    setWorkspaceTab("active");
  };

  const handlePickImportFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const csvFiles = Array.from(files).filter(
      (f) => f.name.toLowerCase().endsWith(".csv") || f.type === "text/csv"
    );
    if (!csvFiles.length) {
      showToast("Please select one or more CSV files");
      return;
    }
    setImportBusy(true);
    const next: ImportFileJob[] = csvFiles.map((f) => ({
      fileName: f.name,
      status: "previewing",
    }));
    setImportJobs(next);

    for (let i = 0; i < csvFiles.length; i++) {
      const file = csvFiles[i];
      try {
        const csv = await file.text();
        const res = await previewImportMutation.mutateAsync({
          entityType: "leads",
          csv,
          fileName: file.name,
          defaultLeadSource: "AI_CALLING",
        });
        setImportJobs((prev) =>
          prev.map((j, idx) =>
            idx === i
              ? {
                  ...j,
                  status: "previewed",
                  jobId: res.data?.jobId,
                  validRows: res.data?.validRows,
                  errorRows: res.data?.errorRows,
                  message: `${res.data?.validRows ?? 0} valid / ${res.data?.errorRows ?? 0} errors`,
                }
              : j
          )
        );
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Preview failed";
        setImportJobs((prev) =>
          prev.map((j, idx) => (idx === i ? { ...j, status: "error", message: msg } : j))
        );
      }
    }
    setImportBusy(false);
    refetchImportJobs();
  };

  const handleConfirmAllImports = async () => {
    const ready = importJobs.filter((j) => j.status === "previewed" && j.jobId);
    if (!ready.length) {
      showToast("No previewed imports to confirm");
      return;
    }
    setImportBusy(true);
    for (const job of ready) {
      try {
        const res = await confirmImportMutation.mutateAsync(job.jobId!);
        setImportJobs((prev) =>
          prev.map((j) =>
            j.jobId === job.jobId
              ? {
                  ...j,
                  status: "done",
                  message: `Import ${res.data?.status || "completed"} — AI calls will queue automatically`,
                }
              : j
          )
        );
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Confirm failed";
        setImportJobs((prev) =>
          prev.map((j) => (j.jobId === job.jobId ? { ...j, status: "error", message: msg } : j))
        );
      }
    }
    setImportBusy(false);
    refetchImportJobs();
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    showToast("Import confirmed — leads refreshed and AI calls queued where applicable");
  };

  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) return;
    if (!user?.branchId) {
      showToast("Your account has no branch assigned");
      return;
    }
    try {
      const created = await createLeadMutation.mutateAsync({
        name: newLeadName.trim(),
        phoneNumber: newLeadPhone.trim(),
        interestedIn: newLeadCourse.trim() || "General enquiry",
        sourceMasterId: newLeadSourceMasterId || undefined,
        branchId: user.branchId,
      });
      const createdId = created?.data?.id;
      if (triggerImmediateCall && createdId) {
        await triggerCallMutation.mutateAsync(createdId);
      }
      const sourceLabel = getMasterLabel(leadSourceOptions, newLeadSourceMasterId) || "manual";
      showToast(
        triggerImmediateCall
          ? `Lead ${newLeadName} created & AI call queued`
          : `Lead ${newLeadName} created from ${sourceLabel}`
      );
      setShowAddLeadModal(false);
      setNewLeadName("");
      setNewLeadPhone("");
      setNewLeadCourse("");
      setNewLeadSourceMasterId("");
      setTriggerImmediateCall(true);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to create lead";
      showToast(msg);
    }
  };

  const openLead360 = (leadId: string) => {
    navigate(`${portalBase}/leads/${leadId}`);
  };

  const openCallDetail = (call: CallLog) => {
    setDetailCall(call);
    setShowDetailDrawer(true);
  };

  const currentMeta =
    workspaceTab === "queue"
      ? leadsMeta
      : workspaceTab === "active"
        ? activeMeta
        : resultsMeta;

  const refreshCurrent = () => {
    if (workspaceTab === "queue") {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queueListQuery.refetch();
    } else if (workspaceTab === "active") {
      activeHistoryQuery.refetch();
    } else {
      resultsHistoryQuery.refetch();
    }
  };

  return (
    <div className="space-y-4 p-1">
      <ReadOnlyBanner itemKey="leads.ai_calling" label="AI Calling" />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-border bg-card px-4 py-3 shadow-lg text-sm font-medium flex items-start gap-2">
          <span className="flex-1">{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {configMissingOrDisabled && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              AI Calling is not fully configured for this institute
              {!aiConfig?.isEnabled ? " (disabled)" : ""}
              {!aiConfig?.resolved?.hasTelephony ? " — telephony credentials missing" : ""}.
              Imported leads may not dial until config is enabled.
            </span>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 h-8 text-xs font-bold">
            <Link to={aiConfigHref}>Open AI Calling config</Link>
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/40 rounded-2xl text-primary dark:text-sky-400 shrink-0 mt-0.5">
            <Bot className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              AI Calling & Voice Qualification
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Queue dials, monitor live calls, and review AI qualification results.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-xs font-bold gap-1.5"
            onClick={refreshCurrent}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <PermissionGate itemKey="leads.ai_calling" mode="write">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setImportJobs([]);
                setShowImportModal(true);
              }}
              className="font-bold px-4 py-2 rounded-xl gap-1.5 h-9.5 text-xs"
            >
              <Upload className="h-3.5 w-3.5 stroke-[3]" />
              Import CSV
            </Button>
            <Button
              type="button"
              onClick={() => setShowAddLeadModal(true)}
              className="bg-primary hover:bg-primary/90 text-white font-bold px-4 py-2 rounded-xl gap-1.5 h-9.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              Add New Lead
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <Card className="bg-card rounded-2xl border border-border shadow-xs">
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Dialable
              </span>
              <Users className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3 className="text-xl font-black text-foreground">{kpiStats.dialable}</h3>
          </CardContent>
        </Card>
        <Card className="bg-card rounded-2xl border border-border shadow-xs">
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Queued
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <h3 className="text-xl font-black text-amber-600">{kpiStats.queued}</h3>
          </CardContent>
        </Card>
        <Card className="bg-card rounded-2xl border border-border shadow-xs">
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Active
              </span>
              <PhoneCall className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <h3 className="text-xl font-black text-cyan-600">{kpiStats.active}</h3>
          </CardContent>
        </Card>
        <Card className="bg-card rounded-2xl border border-border shadow-xs">
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Results
              </span>
              <Flame className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-emerald-600">{kpiStats.results}</h3>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={workspaceTab}
        onValueChange={(v) => setWorkspaceTab(v as WorkspaceTab)}
        className="space-y-3"
      >
        <TabsList className="bg-muted/60 h-auto flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="queue" className="gap-1.5 text-xs sm:text-sm">
            <Phone className="h-3.5 w-3.5" />
            Calling Queue
            {kpiStats.queued > 0 ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {kpiStats.queued}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-1.5 text-xs sm:text-sm">
            <PhoneCall className="h-3.5 w-3.5" />
            Active Calls
            {kpiStats.active > 0 ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {kpiStats.active}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5 text-xs sm:text-sm">
            <Flame className="h-3.5 w-3.5" />
            AI Call Results
          </TabsTrigger>
        </TabsList>

        {/* ─── Calling Queue ─── */}
        <TabsContent value="queue" className="space-y-3 mt-0">
          <Card className="bg-card rounded-2xl border border-border shadow-xs">
            <CardContent className="p-3 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search dialable leads by name or phone..."
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <PermissionGate itemKey="leads.ai_calling" mode="write">
                <Button
                  type="button"
                  className="h-9 text-xs font-bold gap-1.5"
                  disabled={!selectedLeadIds.size || triggerCallMutation.isPending}
                  onClick={handleStartAiCalls}
                >
                  {triggerCallMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Start AI Call ({selectedLeadIds.size})
                </Button>
              </PermissionGate>
            </CardContent>
          </Card>

          <Card className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-foreground">Dialable leads</p>
                <p className="text-[11px] text-muted-foreground">
                  Select leads and start AI calling (requires ai_call.create). Already RINGING/ANSWERED leads are hidden.
                </p>
              </div>
              {leadsFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all dialable"
                      checked={
                        dialableLeads.length > 0 && selectedLeadIds.size === dialableLeads.length
                      }
                      onChange={toggleSelectAllDialable}
                    />
                  </TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Last call</TableHead>
                  <TableHead>Next action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dialableLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground text-sm">
                      No dialable leads on this page. Import CSV or add a lead to build the queue.
                    </TableCell>
                  </TableRow>
                ) : (
                  dialableLeads.map((lead) => {
                    const latest = lead.callLogs?.[0];
                    const lastStatus = latest?.status || "Not called";
                    return (
                      <TableRow key={lead.id} className="hover:bg-muted/40">
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.has(lead.id)}
                            onChange={() => toggleLeadSelection(lead.id)}
                            aria-label={`Select ${lead.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left"
                            onClick={() => openLead360(lead.id)}
                          >
                            <div className="font-semibold text-sm hover:text-primary">{lead.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {lead.phoneNumber}
                            </div>
                          </button>
                        </TableCell>
                        <TableCell className="text-xs">
                          {lead.course?.name || lead.interestedIn || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {lead.stage}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <LeadScoreBadge score={lead.leadScore} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              lastStatus === "INITIATED"
                                ? "border-amber-200 text-amber-700 bg-amber-50"
                                : undefined
                            }
                          >
                            {lastStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {lead.nextBestAction || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          {queuedCallLogs.length > 0 ? (
            <Card className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-bold text-foreground">Initiated / queued calls</p>
                <p className="text-[11px] text-muted-foreground">
                  Call logs with status INITIATED (provider queue).
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Queued at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queuedCallLogs.map((call) => (
                    <TableRow
                      key={call.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openCallDetail(call)}
                    >
                      <TableCell>
                        <div className="font-medium text-sm">{call.lead?.name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {call.lead?.phoneNumber || call.fromNumber || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{call.attemptNumber ?? 1}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(call.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {queueListMeta.total > 20 ? (
                <div className="p-3 border-t border-border text-xs text-muted-foreground">
                  Showing latest 20 of {queueListMeta.total} initiated calls.
                </div>
              ) : null}
            </Card>
          ) : null}
        </TabsContent>

        {/* ─── Active Calls ─── */}
        <TabsContent value="active" className="space-y-3 mt-0">
          <Card className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Live calls</p>
                <p className="text-[11px] text-muted-foreground">
                  RINGING / ANSWERED — auto-refreshes every 5 seconds.
                </p>
              </div>
              {activeHistoryQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Polling
                </span>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempt</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeHistoryQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Loading active calls...
                    </TableCell>
                  </TableRow>
                ) : activeCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No active calls right now.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeCalls.map((call) => (
                    <TableRow
                      key={call.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openCallDetail(call)}
                    >
                      <TableCell>
                        <div className="font-medium text-sm">{call.lead?.name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {call.lead?.phoneNumber || call.fromNumber || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            call.status === "ANSWERED"
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                              : "border-cyan-200 text-cyan-700 bg-cyan-50"
                          }
                        >
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{call.attemptNumber ?? 1}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(call.startedAt || call.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {call.duration != null ? `${call.duration}s` : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─── AI Call Results ─── */}
        <TabsContent value="results" className="space-y-3 mt-0">
          {resultsHistoryQuery.isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
              Loading AI call results...
            </div>
          ) : resultCalls.length === 0 ? (
            <Card className="border-border shadow-xs">
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No terminal AI call results yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {resultCalls.map((call) => (
                <AiCallingResultCard
                  key={call.id}
                  call={call}
                  onOpenDetail={openCallDetail}
                  onViewLead={openLead360}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {(workspaceTab === "queue" && leadsMeta.totalPages > 1) ||
      (workspaceTab === "active" && activeMeta.totalPages > 1) ||
      (workspaceTab === "results" && resultsMeta.totalPages > 1) ? (
        <div className="flex justify-end items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} / {currentMeta.totalPages || 1}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= (currentMeta.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <CallDetailDrawer
        call={detailCall}
        open={showDetailDrawer}
        onOpenChange={setShowDetailDrawer}
      />

      {/* Add lead */}
      <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add lead for AI calling</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLeadSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ai-lead-name">Name</Label>
              <Input
                id="ai-lead-name"
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-lead-phone">Phone</Label>
              <Input
                id="ai-lead-phone"
                value={newLeadPhone}
                onChange={(e) => setNewLeadPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-lead-course">Interested in</Label>
              <Input
                id="ai-lead-course"
                value={newLeadCourse}
                onChange={(e) => setNewLeadCourse(e.target.value)}
                placeholder="e.g. NEET / Digital Marketing"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <MasterSelect
                entityType="leadsource"
                value={newLeadSourceMasterId}
                onChange={(id) => setNewLeadSourceMasterId(id || "")}
                placeholder="Select source"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={triggerImmediateCall}
                onChange={(e) => setTriggerImmediateCall(e.target.checked)}
              />
              Start AI call immediately after create
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddLeadModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLeadMutation.isPending}>
                {createLeadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import CSV */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import leads for AI calling</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground text-xs">
              Upload one or more lead CSVs. Each file becomes an import job with source{" "}
              <strong>AI_CALLING</strong>. After confirm, new leads queue for AI dial automatically.
            </p>
            <Input
              type="file"
              accept=".csv,text/csv"
              multiple
              disabled={importBusy}
              onChange={(e) => handlePickImportFiles(e.target.files)}
            />
            {importJobs.length > 0 && (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {importJobs.map((job) => (
                  <li
                    key={`${job.fileName}-${job.jobId || job.status}`}
                    className="rounded-lg border border-border px-3 py-2 text-xs"
                  >
                    <div className="font-semibold">{job.fileName}</div>
                    <div className="text-muted-foreground">
                      {job.status}
                      {job.message ? ` — ${job.message}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {Array.isArray(recentImportJobs) && recentImportJobs.length > 0 ? (
              <div className="text-xs">
                <p className="font-bold mb-2 text-muted-foreground">Recent import jobs</p>
                <ul className="space-y-1 max-h-28 overflow-y-auto">
                  {recentImportJobs.slice(0, 5).map((job: { id?: string; fileName?: string; status?: string }) => (
                    <li key={job.id || job.fileName} className="text-muted-foreground">
                      {job.fileName || job.id} — {job.status}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowImportModal(false)}>
              Close
            </Button>
            <Button
              type="button"
              disabled={importBusy || !importJobs.some((j) => j.status === "previewed")}
              onClick={handleConfirmAllImports}
            >
              {importBusy ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Confirm import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
