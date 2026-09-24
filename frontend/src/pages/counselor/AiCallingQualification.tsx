import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Check,
  Download,
  Flame,
  Loader2,
  MoreHorizontal,
  Phone,
  PhoneCall,
  Play,
  RefreshCw,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  useCallHistory,
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
import { dataManagementApi } from "@/services/data-management.api";
import { PermissionGate, ReadOnlyBanner } from "@/components/permissions/PermissionGate";
import { getPortalBasePath } from "@/utils/portal-path";
import { ROUTES } from "@/constants/routes";
import type { CallLog, Lead } from "@/services/leads.api";
import { AiCallingResultCard } from "@/pages/admin/leads/components/AiCallingResultCard";
import { CallDetailDrawer } from "@/pages/admin/leads/components/CallDetailDrawer";
import { LeadWorkspaceShell } from "@/pages/admin/leads/components/LeadWorkspaceShell";
import {
  LeadDataSurface,
  LeadListState,
} from "@/pages/admin/leads/components/LeadDataSurface";
import { FilterToolbar } from "@/components/layout";

type WorkspaceTab = "queue" | "active" | "results";

type ImportFileJob = {
  fileName: string;
  jobId?: string;
  status: "pending" | "previewing" | "previewed" | "confirming" | "done" | "error";
  validRows?: number;
  errorRows?: number;
  message?: string;
  errors?: Array<{ row?: number; field?: string; message?: string }>;
};

function extractApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data || typeof data !== "object") return fallback;

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  const errors = data.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const parts = errors
      .map((e) => {
        if (typeof e === "string") return e;
        if (e && typeof e === "object") {
          const row = e as { message?: string; path?: string[] | string; field?: string };
          const path = Array.isArray(row.path)
            ? row.path.join(".")
            : typeof row.path === "string"
              ? row.path
              : row.field || "";
          const msg = row.message || "";
          return path && msg ? `${path}: ${msg}` : msg || path;
        }
        return "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }

  if (typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }

  return fallback;
}

/** Read a File as raw base64 (no data-URL prefix) for preview API. */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

const QUEUE_ELIGIBLE_STAGES = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
] as const;

const QUEUE_STAGES_PARAM = QUEUE_ELIGIBLE_STAGES.join(",");

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
  const canOpenAiConfig = portalBase === "/admin" || portalBase === "/center";
  const aiConfigHref =
    portalBase === "/admin"
      ? `${ROUTES.ADMIN.ADMINISTRATION.INTEGRATIONS}/ai-calling`
      : `${portalBase}/integrations/ai-calling`;
  const queryClient = useQueryClient();

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("queue");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"default" | "error">("default");
  const [detailCall, setDetailCall] = useState<CallLog | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importJobs, setImportJobs] = useState<ImportFileJob[]>([]);
  const [importBusy, setImportBusy] = useState(false);

  const { data: aiConfigRes } = useAiCallingConfig(true);
  const aiConfig = aiConfigRes?.data;
  const configMissingOrDisabled =
    !aiConfig || !aiConfig.isEnabled || !aiConfig.resolved?.hasTelephony;

  const triggerCallMutation = useTriggerLeadCall();
  const previewImportMutation = usePreviewImport();
  const confirmImportMutation = useConfirmImport();
  const { data: importJobsRes, refetch: refetchImportJobs } = useImportJobs({ limit: 10 });

  const activeCountQuery = useCallHistory(
    { page: 1, limit: 1, view: "active", callType: "AI" },
    { refetchInterval: 5000 }
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
    { enabled: workspaceTab === "results", refetchInterval: 5000 }
  );

  const { data: leadsResponse, isFetching: leadsFetching } = useLeads({
    page: workspaceTab === "queue" ? page : 1,
    limit: 20,
    search: searchTerm || undefined,
    status: "ACTIVE",
    stages: QUEUE_STAGES_PARAM,
    branchId: user?.branchId || undefined,
  });

  const activeCalls = extractCallLogs(activeHistoryQuery.data);
  const activeMeta = extractMeta(
    workspaceTab === "active" ? activeHistoryQuery.data : activeCountQuery.data
  );
  const resultCalls = extractCallLogs(resultsHistoryQuery.data);
  const resultsMeta = extractMeta(resultsHistoryQuery.data);

  const leads = extractLeads(leadsResponse);
  const leadsMeta = extractMeta(leadsResponse);

  /** Server-filtered queue-eligible leads (stages query); no client stage re-filter. */
  const queueLeads = leads;

  /** Selectable for Start AI Call — exclude in-flight statuses. */
  const dialableLeads = useMemo(
    () =>
      queueLeads.filter((lead) => {
        const latest = lead.callLogs?.[0];
        const status = String(latest?.status || "").toUpperCase();
        return !["INITIATED", "RINGING", "ANSWERED"].includes(status);
      }),
    [queueLeads]
  );

  const dialableIdSet = useMemo(
    () => new Set(dialableLeads.map((l) => l.id)),
    [dialableLeads]
  );

  const tabCounts = useMemo(
    () => ({
      // Badge uses server total so pagination pages match eligibility
      queued: leadsMeta.total,
      active: extractMeta(activeCountQuery.data).total,
    }),
    [leadsMeta.total, activeCountQuery.data]
  );

  const recentImportJobs = importJobsRes?.data?.data || importJobsRes?.data || [];

  const showToast = (msg: string, tone: "default" | "error" = "default") => {
    setToastTone(tone);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), tone === "error" ? 8000 : 4500);
  };

  const prevResultIdsRef = useRef<string>("");
  const prevActiveIdsRef = useRef<string>("");

  const activeCallIdsKey = activeCalls
    .map((c) => c.id)
    .sort()
    .join(",");
  const resultCallIdsKey = resultCalls
    .map((c) => c.id)
    .sort()
    .join(",");

  useEffect(() => {
    setPage(1);
    setSelectedLeadIds(new Set());
  }, [workspaceTab, searchTerm]);

  // When Active set changes (call left → terminal) or Results gains new terminals, refresh leads.
  useEffect(() => {
    if (workspaceTab !== "active") return;
    if (prevActiveIdsRef.current && prevActiveIdsRef.current !== activeCallIdsKey) {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    }
    prevActiveIdsRef.current = activeCallIdsKey;
  }, [activeCallIdsKey, workspaceTab, queryClient]);

  useEffect(() => {
    if (workspaceTab !== "results") return;
    if (prevResultIdsRef.current) {
      const prev = new Set(
        prevResultIdsRef.current.split(",").filter(Boolean)
      );
      const nextIds = resultCallIdsKey.split(",").filter(Boolean);
      const hasNewTerminal = nextIds.some((id) => !prev.has(id));
      if (hasNewTerminal) {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
      }
    }
    prevResultIdsRef.current = resultCallIdsKey;
  }, [resultCallIdsKey, workspaceTab, queryClient]);

  const toggleLeadSelection = (leadId: string) => {
    if (!dialableIdSet.has(leadId)) return;
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
    let skipped = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        const res = await triggerCallMutation.mutateAsync(id);
        const payload =
          res && typeof res === "object" && "data" in res
            ? (res as { data?: { success?: boolean; queued?: boolean } }).data
            : (res as { success?: boolean; queued?: boolean } | undefined);
        const queued =
          payload?.queued === true || payload?.success === true;
        if (queued) ok += 1;
        else skipped += 1;
      } catch {
        failed += 1;
      }
    }
    setSelectedLeadIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["leads", "call-history"] });
    const parts: string[] = [];
    if (ok) parts.push(`Queued ${ok} AI call(s)`);
    if (skipped) parts.push(`${skipped} skipped`);
    if (failed) parts.push(`${failed} failed`);
    showToast(
      parts.length ? parts.join("; ") : "No AI calls queued",
      failed && !ok ? "error" : "default"
    );
  };

  const handlePickImportFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const importFiles = Array.from(files).filter((f) => {
      const name = f.name.toLowerCase();
      return (
        name.endsWith(".csv") ||
        name.endsWith(".xlsx") ||
        f.type === "text/csv" ||
        f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    });
    if (!importFiles.length) {
      showToast("Please select one or more .xlsx or .csv files");
      return;
    }
    setImportBusy(true);
    const next: ImportFileJob[] = importFiles.map((f) => ({
      fileName: f.name,
      status: "previewing",
    }));
    setImportJobs(next);

    for (let i = 0; i < importFiles.length; i++) {
      const file = importFiles[i];
      const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
      try {
        const payload = isXlsx
          ? {
              entityType: "leads" as const,
              fileBase64: await readFileAsBase64(file),
              fileName: file.name,
              defaultLeadSource: "AI_CALLING",
            }
          : {
              entityType: "leads" as const,
              csv: await file.text(),
              fileName: file.name,
              defaultLeadSource: "AI_CALLING",
            };
        const res = await previewImportMutation.mutateAsync(payload);
        const valid = res.data?.validRows ?? 0;
        const errCount = res.data?.errorRows ?? 0;
        const previewErrors = Array.isArray(res.data?.errors)
          ? (res.data.errors as Array<{ row?: number; field?: string; message?: string }>)
          : [];
        setImportJobs((prev) =>
          prev.map((j, idx) =>
            idx === i
              ? {
                  ...j,
                  status: valid > 0 ? "previewed" : "error",
                  jobId: res.data?.jobId,
                  validRows: valid,
                  errorRows: errCount,
                  errors: previewErrors,
                  message:
                    valid > 0
                      ? `${valid} valid / ${errCount} errors — click Confirm to create leads & queue AI calls`
                      : `${valid} valid / ${errCount} errors — fix Branch Name / Phone Number and re-upload`,
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
        const data = res.data as {
          status?: string;
          successRows?: number;
          errorRows?: number;
          errorReport?: Array<{ row?: number; message?: string }>;
        } | undefined;
        const errReport = Array.isArray(data?.errorReport) ? data!.errorReport! : [];
        const ok = data?.successRows ?? 0;
        const failed = data?.errorRows ?? errReport.length;
        setImportJobs((prev) =>
          prev.map((j) =>
            j.jobId === job.jobId
              ? {
                  ...j,
                  status: ok > 0 ? "done" : "error",
                  errors: errReport,
                  message:
                    ok > 0
                      ? `Import ${data?.status || "completed"} — ${ok} lead(s) created/dialed${
                          failed ? `, ${failed} skipped` : ""
                        }`
                      : `Import finished with no dials — ${
                          errReport[0]?.message || "see errors below"
                        }`,
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
    queryClient.invalidateQueries({ queryKey: ["leads", "call-history"] });
    showToast("Import confirmed — leads refreshed and AI calls queued where applicable");
  };

  const handleDownloadLeadTemplate = async () => {
    try {
      const res = await dataManagementApi.getTemplate("leads");
      const csv =
        res.data?.csv ||
        "Name,Phone Number,Email,Interested In,Branch Name,Source\n";
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data?.fileName || "ai-calling-leads-template.csv";
      a.click();
      URL.revokeObjectURL(url);
      showToast("Template downloaded — fill rows, then Import Excel/CSV");
    } catch {
      showToast("Failed to download template");
    }
  };

  const openLead360 = (leadId: string, tab?: string) => {
    const qs = tab ? `?tab=${encodeURIComponent(tab)}` : "";
    navigate(`${portalBase}/leads/${leadId}${qs}`);
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
      queryClient.invalidateQueries({ queryKey: ["leads", "call-history"] });
    } else if (workspaceTab === "active") {
      activeHistoryQuery.refetch();
      activeCountQuery.refetch();
    } else {
      resultsHistoryQuery.refetch();
    }
  };

  return (
    <LeadWorkspaceShell
      title="AI Calling"
      description="Queue dials, monitor live calls, and review AI qualification results."
      banner={
        <>
          <ReadOnlyBanner itemKey="leads.ai_calling" label="AI Calling" />
          {toastMessage ? (
            <div
              className={
                toastTone === "error"
                  ? "fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 shadow-lg text-sm font-medium flex items-start gap-2"
                  : "fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-border bg-card px-4 py-3 shadow-lg text-sm font-medium flex items-start gap-2"
              }
            >
              {toastTone === "error" ? (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              ) : null}
              <span className="flex-1">{toastMessage}</span>
              <button type="button" onClick={() => setToastMessage(null)} aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {configMissingOrDisabled ? (
            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  AI Calling is not fully configured for this institute
                  {!aiConfig?.isEnabled ? " (disabled)" : ""}
                  {!aiConfig?.resolved?.hasTelephony ? " — telephony credentials missing" : ""}.
                  Imported leads may not dial until config is enabled.
                </span>
              </div>
              {canOpenAiConfig ? (
                <Button asChild variant="outline" size="sm" className="shrink-0 h-8 text-xs">
                  <Link to={aiConfigHref}>Open AI Calling config</Link>
                </Button>
              ) : (
                <span className="text-[11px] font-medium text-amber-800/80 shrink-0">
                  Ask an admin or center manager to enable AI Calling config.
                </span>
              )}
            </div>
          ) : null}
        </>
      }
      primaryAction={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={refreshCurrent}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <PermissionGate itemKey="leads.ai_calling" mode="write">
            <Button
              type="button"
              className="gap-1.5"
              disabled={
                workspaceTab !== "queue" ||
                !selectedLeadIds.size ||
                triggerCallMutation.isPending
              }
              onClick={handleStartAiCalls}
            >
              {triggerCallMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start AI Call
              {selectedLeadIds.size > 0 ? ` (${selectedLeadIds.size})` : ""}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadLeadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setImportJobs([]);
                    setShowImportModal(true);
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Excel/CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
        </>
      }
    >
      <Tabs
        value={workspaceTab}
        onValueChange={(v) => setWorkspaceTab(v as WorkspaceTab)}
        className="space-y-3"
      >
        <FilterToolbar className="!py-0 gap-2">
          <div className="flex w-full flex-wrap items-center gap-2">
            <TabsList className="h-9 w-full sm:w-auto flex-wrap justify-start gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
              <TabsTrigger
                value="queue"
                className="h-8 gap-1.5 px-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Phone className="h-3.5 w-3.5" />
                Queue
                {tabCounts.queued > 0 ? (
                  <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px]">
                    {tabCounts.queued}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="h-8 gap-1.5 px-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                Active
                {tabCounts.active > 0 ? (
                  <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px]">
                    {tabCounts.active}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger
                value="results"
                className="h-8 gap-1.5 px-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Flame className="h-3.5 w-3.5" />
                Results
              </TabsTrigger>
            </TabsList>

            {workspaceTab === "queue" ? (
              <div className="relative min-w-[180px] flex-1 basis-[220px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, phone…"
                  className="h-9 rounded-md border-border bg-background pl-8"
                />
              </div>
            ) : null}
          </div>
        </FilterToolbar>

        {/* ─── Calling Queue ─── */}
        <TabsContent value="queue" className="space-y-3 mt-0">
          <LeadDataSurface>
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Select dialable leads to start AI calling. INITIATED/RINGING/ANSWERED stay visible but
                cannot be re-dialed.
              </p>
              {leadsFetching ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              ) : null}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all dialable"
                      disabled={dialableLeads.length === 0}
                      checked={
                        dialableLeads.length > 0 && selectedLeadIds.size === dialableLeads.length
                      }
                      onChange={toggleSelectAllDialable}
                    />
                  </TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Last call</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="p-0">
                      <LeadListState
                        kind="empty"
                        message="No queue-eligible leads on this page. Import Excel/CSV or add a lead."
                        icon={Users}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  queueLeads.map((lead) => {
                    const latest = lead.callLogs?.[0];
                    const lastStatus = latest?.status || "Not called";
                    const canDial = dialableIdSet.has(lead.id);
                    return (
                      <TableRow
                        key={lead.id}
                        className={canDial ? "hover:bg-muted/40" : "opacity-80"}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            disabled={!canDial}
                            checked={canDial && selectedLeadIds.has(lead.id)}
                            onChange={() => toggleLeadSelection(lead.id)}
                            aria-label={
                              canDial
                                ? `Select ${lead.name}`
                                : `${lead.name} not dialable (${lastStatus})`
                            }
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
                        <TableCell>
                          <div className="space-y-0.5">
                            <Badge
                              variant="outline"
                              className={
                                lastStatus === "INITIATED"
                                  ? "border-amber-200 text-amber-700 bg-amber-50"
                                  : lastStatus === "RINGING" || lastStatus === "ANSWERED"
                                    ? "border-sky-200 text-sky-700 bg-sky-50"
                                    : lastStatus === "FAILED"
                                      ? "border-destructive/40 text-destructive bg-destructive/10"
                                      : undefined
                              }
                            >
                              {lastStatus}
                            </Badge>
                            {lastStatus === "FAILED" && latest?.failureReason ? (
                              <p
                                className="text-[10px] text-destructive max-w-[220px] leading-snug line-clamp-3"
                                title={latest.failureReason}
                              >
                                {latest.failureReason}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </LeadDataSurface>
        </TabsContent>

        {/* ─── Active Calls ─── */}
        <TabsContent value="active" className="space-y-3 mt-0">
          <LeadDataSurface>
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                RINGING / ANSWERED — auto-refreshes every 5 seconds.
              </p>
              {activeHistoryQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 shrink-0">
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
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeHistoryQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="p-0">
                      <LeadListState kind="loading" message="Loading active calls..." />
                    </TableCell>
                  </TableRow>
                ) : activeCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="p-0">
                      <LeadListState
                        kind="empty"
                        message="No active calls right now."
                        icon={PhoneCall}
                      />
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
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(call.startedAt || call.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </LeadDataSurface>
        </TabsContent>

        {/* ─── AI Call Results ─── */}
        <TabsContent value="results" className="space-y-3 mt-0">
          {resultsHistoryQuery.isLoading ? (
            <LeadDataSurface>
              <LeadListState kind="loading" message="Loading AI call results..." />
            </LeadDataSurface>
          ) : resultCalls.length === 0 ? (
            <LeadDataSurface>
              <LeadListState
                kind="empty"
                message="No terminal AI call results yet."
                icon={Bot}
              />
            </LeadDataSurface>
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

      {/* Import Excel/CSV */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import leads for AI calling</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground text-xs">
              Upload one or more .xlsx or .csv files. Each file becomes an import job with source{" "}
              <strong>AI_CALLING</strong>. After confirm, new leads stay unassigned and queue for AI
              dial; a branch counsellor is auto-assigned only when the post-call lead score meets the
              institute threshold (default 50).
            </p>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground text-xs">Columns (required format)</p>
              <code className="block text-[10px] break-all">
                Name,Phone Number,Email,Interested In,Branch Name,Source
              </code>
              <p>
                Required: <strong>Name</strong>, <strong>Phone Number</strong>,{" "}
                <strong>Branch Name</strong> (must match an existing branch name or code exactly —
                e.g. <strong>Malleshwaram</strong> or code <strong>02</strong>). Optional: Email,
                Interested In (defaults to General enquiry), Source (defaults to AI_CALLING).
                Phone can be 10 digits (e.g. <strong>9876543210</strong>) — we convert to{" "}
                <strong>+91…</strong> for Sarvam. Format the Phone column as text in Excel.
                Download the empty template below, fill rows, then upload.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleDownloadLeadTemplate}
              >
                <Download className="h-3.5 w-3.5" />
                Download empty template
              </Button>
            </div>
            <Input
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
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
                    {job.errors && job.errors.length > 0 ? (
                      <ul className="mt-1.5 space-y-0.5 text-[11px] text-destructive">
                        {job.errors.slice(0, 5).map((err, i) => (
                          <li key={`${job.fileName}-err-${i}`}>
                            Row {err.row ?? "?"}
                            {err.field ? ` (${err.field})` : ""}: {err.message || "Invalid"}
                          </li>
                        ))}
                        {job.errors.length > 5 ? (
                          <li>…and {job.errors.length - 5} more</li>
                        ) : null}
                      </ul>
                    ) : null}
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
              disabled={
                importBusy ||
                !importJobs.some((j) => j.status === "previewed" && (j.validRows ?? 0) > 0)
              }
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
    </LeadWorkspaceShell>
  );
};
