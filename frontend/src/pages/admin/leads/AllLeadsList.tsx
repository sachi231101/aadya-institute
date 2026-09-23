import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Loader2,
  Users,
  LayoutList,
  Columns3,
  Filter,
  Upload,
  Download,
  FileDown,
  MoreHorizontal,
  Check,
  StickyNote,
  Calendar,
  UserCheck,
  GitMerge,
  Eye,
  GitBranch,
} from "lucide-react";
import {
  useLeads,
  useLeadDashboard,
  useAssignLead,
  useChangeLeadStage,
  useCreateFollowUp,
  useMarkLeadLost,
} from "@/hooks/useLeads";
import {
  useConfirmImport,
  useExportData,
  useImportJobs,
  usePreviewImport,
} from "@/hooks/useDataManagement";
import { useAdminUsers } from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { useAuthStore } from "@/store/auth.store";
import { getPortalBasePath } from "@/utils/portal-path";
import { FilterToolbar } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ReadOnlyBanner, PermissionGate } from "@/components/permissions/PermissionGate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_LEAD_STAGE_PIPELINE,
  LeadStageBadge,
} from "@/components/common/LeadStageBadge";
import type { Lead, LeadQueryParams } from "@/services/leads.api";
import { leadsApi } from "@/services/leads.api";
import { dataManagementApi } from "@/services/data-management.api";
import { LeadSummaryCards, type LeadKpiKey } from "./components/LeadSummaryCards";
import {
  LeadAdvancedFilters,
  countActiveAdvancedFilters,
  type LeadAdvancedFilterValues,
} from "./components/LeadAdvancedFilters";
import { BulkAssignDialog } from "./components/BulkAssignDialog";
import { MergeLeadsDialog } from "./components/MergeLeadsDialog";
import { LeadScoreBadge } from "./components/LeadScoreBadge";
import { LeadWorkspaceShell } from "./components/LeadWorkspaceShell";
import { LeadDataSurface, LeadListState } from "./components/LeadDataSurface";
import { getApiErrorMessage } from "@/utils/api-error";
import {
  FOLLOW_UP_12H_TIME_OPTIONS,
  DEFAULT_FOLLOW_UP_12H_TIME,
  combineDateAnd12HourTime,
  toDateInputValue,
} from "@/utils/date";

type ViewMode = "list" | "kanban";
type RowAction = "assign" | "stage" | "note" | "followUp" | null;

type ImportFileJob = {
  fileName: string;
  status: "previewing" | "previewed" | "confirming" | "done" | "error";
  jobId?: string;
  validRows?: number;
  errorRows?: number;
  message?: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const AllLeadsList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const basePath = getPortalBasePath(location.pathname);
  const queryClient = useQueryClient();
  const { user, token } = useAuthStore();
  const isAdmin = user?.roles?.includes("ADMIN");
  const canAssignLeads =
    Boolean(user?.roles?.includes("ADMIN")) ||
    Boolean(user?.roles?.includes("SUPER_ADMIN")) ||
    Boolean(user?.roles?.includes("CENTER_MANAGER"));

  const counsellorFromUrl = searchParams.get("assignedCounsellorId") || "";
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [stageMasterId, setStageMasterId] = useState("");
  const [counsellorFilter, setCounsellorFilter] = useState(
    counsellorFromUrl || "ALL"
  );
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [page, setPage] = useState(1);
  const [kanbanLimit, setKanbanLimit] = useState(100);
  const [view, setView] = useState<ViewMode>("list");
  const [activeKpi, setActiveKpi] = useState<LeadKpiKey | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedDraft, setAdvancedDraft] = useState<LeadAdvancedFilterValues>({});
  const [advancedApplied, setAdvancedApplied] = useState<LeadAdvancedFilterValues>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [actionLead, setActionLead] = useState<Lead | null>(null);
  const [rowAction, setRowAction] = useState<RowAction>(null);
  const [assignCounsellorId, setAssignCounsellorId] = useState("");
  const [assignConfirmReassign, setAssignConfirmReassign] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importJobs, setImportJobs] = useState<ImportFileJob[]>([]);
  const [importBusy, setImportBusy] = useState(false);

  const { options: stageOptions } = useMasterDropdown("leadstage");
  const { data: usersData } = useAdminUsers({ role: "COUNSELLOR", limit: 100 });
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const counsellors = (usersData?.data ?? []) as { id: string; name: string }[];
  const branches = branchesResponse?.data || [];

  const dashboardBranchId =
    isAdmin && branchFilter !== "ALL" ? branchFilter : undefined;
  const { data: dashboardRes, isLoading: dashboardLoading } =
    useLeadDashboard(dashboardBranchId);
  const summary = (dashboardRes?.data ?? dashboardRes) as
    | import("@/services/leads.api").LeadDashboardSummary
    | undefined;

  const previewImportMutation = usePreviewImport();
  const confirmImportMutation = useConfirmImport();
  const exportMutation = useExportData();
  const { data: importJobsRes, refetch: refetchImportJobs } = useImportJobs({
    limit: 10,
  });
  const recentImportJobs = importJobsRes?.data?.data || importJobsRes?.data || [];

  const assignMutation = useAssignLead();
  const changeStageMutation = useChangeLeadStage();
  const createFollowUpMutation = useCreateFollowUp();
  const markLostMutation = useMarkLeadLost();

  useEffect(() => {
    const fromUrl = searchParams.get("assignedCounsellorId");
    if (fromUrl && fromUrl !== counsellorFilter) {
      setCounsellorFilter(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate filter from URL once / on param change
  }, [searchParams]);

  const stagePipeline = useMemo(() => {
    const fromMasters =
      stageOptions.length > 0
        ? stageOptions.map((opt) => ({
            key: opt.code || opt.label.toUpperCase().replace(/\s+/g, "_"),
            label: opt.label,
          }))
        : [];

    const fallback = [...DEFAULT_LEAD_STAGE_PIPELINE, "LOST"].map((s) => ({
      key: s,
      label: s.replace(/_/g, " "),
    }));

    const base = fromMasters.length > 0 ? fromMasters : fallback;
    const seen = new Set(base.map((s) => s.key));
    // Always keep terminal stages visible (converted leads must remain findable).
    for (const required of [
      { key: "CONVERTED", label: "Converted" },
      { key: "LOST", label: "Lost" },
    ]) {
      if (!seen.has(required.key)) {
        base.push(required);
        seen.add(required.key);
      }
    }
    return base;
  }, [stageOptions]);

  // Default view: open pipeline + Lost last (lost leads are kept, not deleted).
  const kanbanColumns = useMemo(() => {
    if (statusFilter === "LOST" || stageFilter === "LOST") {
      return stagePipeline.filter((s) => s.key === "LOST");
    }
    if (statusFilter === "CONVERTED" || stageFilter === "CONVERTED") {
      return stagePipeline.filter((s) => s.key === "CONVERTED");
    }
    if (statusFilter === "ALL" || stageFilter !== "ALL") {
      return stageFilter === "ALL"
        ? stagePipeline
        : stagePipeline.filter((s) => s.key === stageFilter);
    }
    // ACTIVE (default): pipeline stages + Lost at the end; hide Converted
    const open = stagePipeline.filter(
      (s) => s.key !== "CONVERTED" && s.key !== "LOST"
    );
    const lost = stagePipeline.filter((s) => s.key === "LOST");
    return [...open, ...lost];
  }, [stagePipeline, stageFilter, statusFilter]);

  // Deep-link: /leads?stage=CONVERTED after admission conversion
  useEffect(() => {
    const stageFromUrl = searchParams.get("stage");
    if (!stageFromUrl) return;
    const normalized = stageFromUrl.toUpperCase().replace(/\s+/g, "_");
    if (normalized === stageFilter) return;
    setStageFilter(normalized);
    setStageMasterId("");
    setPage(1);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps -- hydrate stage from URL

  const listParams = useMemo((): LeadQueryParams => {
    const params: LeadQueryParams = {
      page: view === "list" ? page : 1,
      limit: view === "kanban" ? kanbanLimit : 20,
      search: searchTerm || undefined,
      stage: stageFilter !== "ALL" ? stageFilter : undefined,
      assignedCounsellorId:
        counsellorFilter !== "ALL" ? counsellorFilter : undefined,
      branchId: isAdmin && branchFilter !== "ALL" ? branchFilter : undefined,
      source: advancedApplied.source,
      sourceMasterId: advancedApplied.sourceMasterId,
      priority: advancedApplied.priority,
      scoreBand: advancedApplied.scoreBand,
      tag: advancedApplied.tag,
      dateFrom: advancedApplied.dateFrom,
      dateTo: advancedApplied.dateTo,
      unassigned: advancedApplied.unassigned,
    };

    if (advancedApplied.overdueFollowUps) {
      params.followUpTo = new Date().toISOString();
    }

    // Default Lead Management = open pipeline + lost (lost sorts last; not deleted).
    // Use Status filter for Converted-only / Lost-only / All when needed.
    if (advancedApplied.status) {
      params.status = advancedApplied.status;
    } else if (statusFilter === "ALL") {
      // no status filter
    } else if (statusFilter === "ACTIVE") {
      params.statuses = "ACTIVE,LOST";
    } else if (statusFilter && statusFilter !== "ALL") {
      params.status = statusFilter;
    } else if (stageFilter === "CONVERTED") {
      params.status = "CONVERTED";
    } else if (stageFilter === "LOST") {
      params.status = "LOST";
    } else {
      params.statuses = "ACTIVE,LOST";
    }

    return params;
  }, [
    view,
    page,
    kanbanLimit,
    searchTerm,
    stageFilter,
    counsellorFilter,
    branchFilter,
    statusFilter,
    isAdmin,
    advancedApplied,
  ]);

  const { data, isLoading, isError, refetch } = useLeads(listParams);

  const leads: Lead[] = Array.isArray(data?.data?.data)
    ? data.data.data
    : Array.isArray(data?.data)
      ? data.data
      : [];
  const meta = data?.data?.meta || data?.meta || { totalPages: 1, page: 1 };

  // Avoid multi-page bulk assign/merge acting on stale selections
  useEffect(() => {
    setSelectedIds([]);
    setKanbanLimit(100);
  }, [page, searchTerm, stageFilter, counsellorFilter, branchFilter, advancedApplied, view]);

  const selectedLeads = useMemo(
    () => leads.filter((l) => selectedIds.includes(l.id)),
    [leads, selectedIds]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openLead = (id: string, tab?: string) => {
    const qs = tab ? `?tab=${encodeURIComponent(tab)}` : "";
    navigate(`${basePath}/leads/${id}${qs}`);
  };

  const clearKpiAndAdvancedOverlaps = () => {
    setActiveKpi(null);
  };

  const applyKpi = (key: LeadKpiKey) => {
    setPage(1);
    setSelectedIds([]);
    if (activeKpi === key) {
      setActiveKpi(null);
      setStageFilter("ALL");
      setStageMasterId("");
      setAdvancedApplied((prev) => ({
        ...prev,
        scoreBand: undefined,
        unassigned: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        overdueFollowUps: undefined,
      }));
      setAdvancedDraft((prev) => ({
        ...prev,
        scoreBand: undefined,
        unassigned: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        overdueFollowUps: undefined,
      }));
      return;
    }

    setActiveKpi(key);
    setStageFilter("ALL");
    setStageMasterId("");

    const nextAdv: LeadAdvancedFilterValues = {
      ...advancedApplied,
      scoreBand: undefined,
      unassigned: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      overdueFollowUps: undefined,
    };

    if (key === "total") {
      setAdvancedApplied(nextAdv);
      setAdvancedDraft(nextAdv);
      return;
    }
    if (key === "hot") {
      nextAdv.scoreBand = key;
    } else if (key === "unassigned") {
      nextAdv.unassigned = true;
    } else if (key === "overdue") {
      navigate(`${basePath}/leads/follow-ups?tab=overdue`);
      return;
    }
    setAdvancedApplied(nextAdv);
    setAdvancedDraft(nextAdv);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const openRowAction = (lead: Lead, action: RowAction) => {
    setActionLead(lead);
    setRowAction(action);
    if (action === "assign") {
      if (!canAssignLeads) return;
      setAssignCounsellorId(lead.assignedCounsellorId || "");
      setAssignConfirmReassign(false);
      setAssignError(null);
    }
  };

  const closeRowAction = () => {
    setActionLead(null);
    setRowAction(null);
    setAssignCounsellorId("");
    setAssignConfirmReassign(false);
    setAssignError(null);
  };

  const handleExport = async () => {
    try {
      const res = await exportMutation.mutateAsync({
        entityType: "leads",
        filters: {
          branchId: listParams.branchId,
          stage: listParams.stage,
          status: listParams.status,
        },
      });
      const tokenValue = res.data?.downloadToken;
      if (tokenValue && token) {
        const url = `${import.meta.env.VITE_API_URL || "/api/v1"}/data-management/export/${tokenValue}/download`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = "leads-export.csv";
        a.click();
        URL.revokeObjectURL(objectUrl);
        showToast(`Exported ${res.data?.rowCount ?? 0} leads`);
      } else {
        showToast("Export created");
      }
    } catch {
      showToast("Export failed");
    }
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
      a.download = res.data?.fileName || "leads-import-template.csv";
      a.click();
      URL.revokeObjectURL(url);
      showToast("Template downloaded — fill rows, then upload the CSV");
    } catch {
      showToast("Failed to download template");
    }
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
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Preview failed";
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
      setImportJobs((prev) =>
        prev.map((j) => (j.jobId === job.jobId ? { ...j, status: "confirming" } : j))
      );
      try {
        const res = await confirmImportMutation.mutateAsync(job.jobId!);
        setImportJobs((prev) =>
          prev.map((j) =>
            j.jobId === job.jobId
              ? {
                  ...j,
                  status: "done",
                  message: `Import ${res.data?.status || "completed"}`,
                }
              : j
          )
        );
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Confirm failed";
        setImportJobs((prev) =>
          prev.map((j) => (j.jobId === job.jobId ? { ...j, status: "error", message: msg } : j))
        );
      }
    }
    setImportBusy(false);
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
    refetchImportJobs();
    showToast("Import confirmed — leads refreshed");
  };

  const activeFilterCount = countActiveAdvancedFilters(advancedApplied);

  return (
    <LeadWorkspaceShell
      title="All Leads"
      description="Lead pipeline, assignment, and follow-up."
      banner={
        <>
          <ReadOnlyBanner itemKey="leads.all" label="All Leads" />
          {toastMessage ? (
            <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 text-white text-sm px-4 py-2.5 shadow-lg">
              {toastMessage}
            </div>
          ) : null}
        </>
      }
      primaryAction={
        <PermissionGate itemKey="leads.all" mode="write">
          <Button
            onClick={() =>
              navigate(`${basePath}/leads/${basePath === "/admin" ? "new" : "add"}`)
            }
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setImportJobs([]);
                  setShowImportModal(true);
                }}
              >
                <Upload className="h-4 w-4 mr-2" /> Import
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} disabled={exportMutation.isPending}>
                {exportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PermissionGate>
      }
      metrics={
        <LeadSummaryCards
          summary={summary}
          activeKey={activeKpi}
          onSelect={applyKpi}
          isLoading={dashboardLoading}
        />
      }
      toolbar={
        <FilterToolbar className="!py-0 gap-2">
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="flex h-9 shrink-0 items-center rounded-md border border-border bg-muted/40 p-0.5">
              <Button
                type="button"
                variant={view === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-sm px-2.5 text-xs font-semibold"
                onClick={() => setView("list")}
              >
                <LayoutList className="h-3.5 w-3.5 mr-1.5" /> List
              </Button>
              <Button
                type="button"
                variant={view === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-sm px-2.5 text-xs font-semibold"
                onClick={() => setView("kanban")}
              >
                <Columns3 className="h-3.5 w-3.5 mr-1.5" /> Pipeline
              </Button>
            </div>

            <div className="relative min-w-[180px] flex-1 basis-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, email…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border-border bg-background pl-8"
              />
            </div>

            <select
              value={stageMasterId || (stageFilter === "ALL" ? "" : stageFilter)}
              onChange={(e) => {
                const id = e.target.value;
                setPage(1);
                clearKpiAndAdvancedOverlaps();
                if (!id) {
                  setStageMasterId("");
                  setStageFilter("ALL");
                  return;
                }
                const byId = stageOptions.find((o) => o.value === id);
                if (byId) {
                  setStageMasterId(id);
                  setStageFilter(
                    byId.code ||
                      byId.label.toUpperCase().replace(/\s+/g, "_") ||
                      "ALL"
                  );
                  return;
                }
                setStageMasterId("");
                setStageFilter(id);
              }}
              className="h-9 w-[140px] shrink-0 rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground"
              aria-label="Filter by stage"
            >
              <option value="">All stages</option>
              {stagePipeline.map((s) => {
                const master = stageOptions.find(
                  (o) =>
                    (o.code || o.label.toUpperCase().replace(/\s+/g, "_")) === s.key
                );
                return (
                  <option key={s.key} value={master?.value || s.key}>
                    {s.label}
                  </option>
                );
              })}
            </select>

            <select
              value={counsellorFilter}
              onChange={(e) => {
                const value = e.target.value;
                setCounsellorFilter(value);
                setPage(1);
                const next = new URLSearchParams(searchParams);
                if (value === "ALL") next.delete("assignedCounsellorId");
                else next.set("assignedCounsellorId", value);
                setSearchParams(next, { replace: true });
              }}
              className="h-9 w-[150px] shrink-0 rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground"
              aria-label="Filter by counsellor"
            >
              <option value="ALL">All counsellors</option>
              {counsellors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={advancedApplied.status || statusFilter}
              onChange={(e) => {
                const value = e.target.value;
                setPage(1);
                setActiveKpi(null);
                setStatusFilter(value);
                setAdvancedApplied((prev) => ({
                  ...prev,
                  status: value === "ACTIVE" ? undefined : value === "ALL" ? undefined : value,
                }));
                setAdvancedDraft((prev) => ({
                  ...prev,
                  status: value === "ACTIVE" ? undefined : value === "ALL" ? undefined : value,
                }));
              }}
              className="h-9 w-[140px] shrink-0 rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground"
              aria-label="Filter by status"
            >
              <option value="ACTIVE">Active & Lost</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost only</option>
              <option value="ALL">All statuses</option>
            </select>

            {isAdmin && (
              <select
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-[150px] shrink-0 rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground"
                aria-label="Filter by branch"
              >
                <option value="ALL">All branches</option>
                {branches.map((b: { id: string; name: string }) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 gap-1.5 rounded-md px-3"
              onClick={() => {
                setAdvancedDraft(advancedApplied);
                setAdvancedOpen(true);
              }}
            >
              <Filter className="h-3.5 w-3.5" />
              More
              {activeFilterCount > 0 && (
                <Badge className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </FilterToolbar>
      }
    >
          {selectedIds.length > 0 && view === "list" && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
              <span className="text-sm font-semibold">
                {selectedIds.length} selected
              </span>
              <PermissionGate itemKey="leads.all" mode="write">
                {canAssignLeads && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1"
                    onClick={() => setBulkAssignOpen(true)}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Bulk Assign
                  </Button>
                )}
                {selectedIds.length === 2 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1"
                    onClick={() => setMergeOpen(true)}
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                    Merge
                  </Button>
                )}
              </PermissionGate>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => setSelectedIds([])}
              >
                Clear
              </Button>
            </div>
          )}

          <LeadDataSurface>
          {isLoading ? (
            <LeadListState kind="loading" message="Loading leads..." />
          ) : isError ? (
            <LeadListState
              kind="error"
              message="Failed to load leads."
              onRetry={() => refetch()}
            />
          ) : view === "kanban" ? (
            <div className="flex flex-col gap-3 p-4 pb-2">
              <div className="flex gap-3 overflow-x-auto">
              {kanbanColumns.map(({ key: stage, label }) => {
                const columnLeads = leads.filter((l) => l.stage === stage);
                return (
                  <div
                    key={stage}
                    className="min-w-[250px] w-[250px] shrink-0 rounded-xl bg-muted/20 border border-border p-3.5 shadow-xs flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <LeadStageBadge stage={stage} label={label} />
                      <span className="text-xs font-bold text-muted-foreground">
                        {columnLeads.length}
                      </span>
                    </div>
                    <div className="space-y-2.5 max-h-[70vh] overflow-y-auto">
                      {columnLeads.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-8 text-center font-medium">
                          No leads
                        </p>
                      ) : (
                        columnLeads.map((lead) => (
                          <button
                            key={lead.id}
                            type="button"
                            onClick={() => openLead(lead.id)}
                            className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/60 hover:shadow-xs transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-sm text-foreground">
                                {lead.name}
                              </p>
                              <LeadScoreBadge
                                score={lead.leadScore}
                                temperature={lead.leadTemperature}
                                showScore={false}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {lead.phoneNumber}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1 truncate">
                              {lead.source
                                ? lead.source.replace(/_/g, " ")
                                : "No source"}
                              {" · "}
                              {lead.assignedCounsellor?.name || "Unassigned"}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
              {(meta.total ?? 0) > leads.length ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground font-medium">
                    Showing {leads.length} of {meta.total}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={isLoading}
                    onClick={() => setKanbanLimit((n) => n + 100)}
                  >
                    Load more
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-0">
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={
                            leads.length > 0 && selectedIds.length === leads.length
                          }
                          onChange={toggleSelectAll}
                          className="h-3.5 w-3.5 rounded border-border"
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead className="min-w-[140px]">Lead</TableHead>
                      <TableHead className="min-w-[100px]">Source</TableHead>
                      <TableHead className="w-[92px]">Stage</TableHead>
                      <TableHead className="w-[72px]">Score</TableHead>
                      <TableHead className="min-w-[120px]">Course</TableHead>
                      <TableHead className="min-w-[110px]">Counsellor</TableHead>
                      <TableHead className="w-[100px]">Follow-up</TableHead>
                      <TableHead className="w-10 text-right"> </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.length === 0 ? (
                      <TableRow className="hover:bg-transparent border-0">
                        <TableCell colSpan={9} className="p-0 border-0">
                          <LeadListState
                            kind="empty"
                            message="No leads found."
                            icon={Users}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      leads.map((lead) => (
                        <TableRow
                          key={lead.id}
                          className="group border-0"
                        >
                          <TableCell
                            className="w-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(lead.id)}
                              onChange={() => toggleSelect(lead.id)}
                              className="h-3.5 w-3.5 rounded border-border"
                              aria-label={`Select ${lead.name}`}
                            />
                          </TableCell>
                          <TableCell
                            className="cursor-pointer"
                            onClick={() => openLead(lead.id)}
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-[13px] leading-tight truncate">
                                {lead.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                                {lead.phoneNumber}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px] text-foreground/90 whitespace-nowrap">
                            {lead.source
                              ? lead.source.replace(/_/g, " ")
                              : "—"}
                          </TableCell>
                          <TableCell className="w-[92px]">
                            <LeadStageBadge
                              size="sm"
                              stage={lead.stage}
                              label={
                                stageOptions.find(
                                  (o) =>
                                    o.code === lead.stage || o.value === lead.stage
                                )?.label
                              }
                            />
                          </TableCell>
                          <TableCell className="w-[72px]">
                            <LeadScoreBadge
                              score={lead.leadScore}
                              temperature={lead.leadTemperature}
                              showScore
                              className="h-5 px-1.5 py-0 text-[10px] leading-none font-medium"
                            />
                          </TableCell>
                          <TableCell className="text-[13px] text-foreground/90 max-w-[160px]">
                            <span className="line-clamp-2">
                              {lead.course?.name || lead.interestedIn || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-[13px] whitespace-nowrap">
                            {lead.assignedCounsellor?.name ? (
                              <span className="text-foreground/90">
                                {lead.assignedCounsellor.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[12px]">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {formatDateTime(lead.nextFollowUpAt)}
                          </TableCell>
                          <TableCell
                            className="w-10 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-60 group-hover:opacity-100"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => openLead(lead.id)}>
                                  <Eye className="h-4 w-4" /> Open Lead 360
                                </DropdownMenuItem>
                                <PermissionGate itemKey="leads.all" mode="write">
                                  <DropdownMenuSeparator />
                                  {canAssignLeads && (
                                    <DropdownMenuItem
                                      onClick={() => openRowAction(lead, "assign")}
                                    >
                                      <UserCheck className="h-4 w-4" /> Assign
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => openRowAction(lead, "stage")}
                                  >
                                    <GitBranch className="h-4 w-4" /> Change Stage
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openRowAction(lead, "followUp")}
                                  >
                                    <Calendar className="h-4 w-4" /> Schedule Follow-up
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openRowAction(lead, "note")}
                                  >
                                    <StickyNote className="h-4 w-4" /> Add Remark
                                  </DropdownMenuItem>
                                </PermissionGate>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {meta.totalPages > 1 && (
                <div className="flex justify-between items-center text-sm px-4 py-3 border-t border-border">
                  <span>
                    Page {meta.page} of {meta.totalPages}
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
            </>
          )}
          </LeadDataSurface>

      <LeadAdvancedFilters
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        values={advancedDraft}
        onChange={setAdvancedDraft}
        onApply={() => {
          setAdvancedApplied(advancedDraft);
          setStatusFilter(advancedDraft.status || "ACTIVE");
          setActiveKpi(null);
          setPage(1);
        }}
        onClear={() => {
          const empty = {};
          setAdvancedDraft(empty);
          setAdvancedApplied(empty);
          setStatusFilter("ACTIVE");
          setActiveKpi(null);
          setPage(1);
        }}
      />

      <BulkAssignDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        leads={selectedLeads}
        counsellors={counsellors}
        onSuccess={({ succeeded, failed }) => {
          if (failed === 0) {
            setSelectedIds([]);
            showToast(
              succeeded === 1
                ? "Lead assigned"
                : `${succeeded} leads assigned`
            );
            return;
          }
          if (succeeded > 0) {
            showToast(`${succeeded} assigned, ${failed} failed`);
          }
        }}
      />

      <MergeLeadsDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        leads={selectedLeads}
        onSuccess={(primaryId) => {
          setSelectedIds([]);
          showToast("Leads merged");
          openLead(primaryId);
        }}
      />

      {/* Row action dialogs */}
      <Dialog
        open={rowAction === "assign" && !!actionLead}
        onOpenChange={(o) => !o && closeRowAction()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {actionLead?.name}</DialogTitle>
          </DialogHeader>
          {(() => {
            const currentAssignee = actionLead?.assignedCounsellor;
            const currentAssigneeId =
              actionLead?.assignedCounsellorId || currentAssignee?.id || "";
            const currentAssigneeName = currentAssignee?.name || "another counsellor";
            const selectedCounsellor = counsellors.find(
              (c) => c.id === assignCounsellorId
            );
            const isSameCounsellor =
              Boolean(currentAssigneeId) &&
              assignCounsellorId === currentAssigneeId;
            const isReassign =
              Boolean(currentAssigneeId) &&
              Boolean(assignCounsellorId) &&
              assignCounsellorId !== currentAssigneeId;
            const canSubmitAssign =
              Boolean(assignCounsellorId) &&
              !isSameCounsellor &&
              (!isReassign || assignConfirmReassign) &&
              !assignMutation.isPending;

            return (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!actionLead || !canSubmitAssign) return;
                  setAssignError(null);
                  const form = new FormData(e.currentTarget);
                  assignMutation.mutate(
                    {
                      id: actionLead.id,
                      data: {
                        counsellorId: assignCounsellorId,
                        notes: String(form.get("notes") || "") || undefined,
                      },
                    },
                    {
                      onSuccess: () => {
                        showToast("Lead assigned");
                        closeRowAction();
                      },
                      onError: (err: unknown) => {
                        const msg = getApiErrorMessage(err, "Assign failed");
                        setAssignError(msg);
                        showToast(msg);
                      },
                    }
                  );
                }}
                className="space-y-4"
              >
                {currentAssigneeId ? (
                  <p className="text-sm text-muted-foreground">
                    Currently assigned to <strong>{currentAssigneeName}</strong>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                )}
                <div>
                  <Label>Counsellor</Label>
                  <select
                    name="counsellorId"
                    required
                    value={assignCounsellorId}
                    onChange={(e) => {
                      setAssignCounsellorId(e.target.value);
                      setAssignConfirmReassign(false);
                      setAssignError(null);
                    }}
                    className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
                  >
                    <option value="">Select counsellor</option>
                    {counsellors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {isSameCounsellor && (
                  <p className="text-sm text-muted-foreground">
                    Already assigned to this counsellor.
                  </p>
                )}
                {isReassign && (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={assignConfirmReassign}
                      onChange={(e) => {
                        setAssignConfirmReassign(e.target.checked);
                        setAssignError(null);
                      }}
                    />
                    <span>
                      Reassign from {currentAssigneeName} to{" "}
                      {selectedCounsellor?.name || "selected counsellor"}
                    </span>
                  </label>
                )}
                <div>
                  <Label>Notes</Label>
                  <Input name="notes" className="mt-1" />
                </div>
                {assignError && (
                  <p role="alert" className="text-sm text-destructive">
                    {assignError}
                  </p>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeRowAction}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary text-white"
                    disabled={!canSubmitAssign}
                  >
                    {assignMutation.isPending ? "Assigning..." : "Assign"}
                  </Button>
                </DialogFooter>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog
        open={rowAction === "stage" && !!actionLead}
        onOpenChange={(o) => !o && closeRowAction()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change stage — {actionLead?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!actionLead) return;
              const form = new FormData(e.currentTarget);
              const stage = String(form.get("stage") || "");
              if (!stage) return;
              if (stage === "CONVERTED") {
                closeRowAction();
                navigate(`${basePath}/admissions/direct-entry`, {
                  state: {
                    lead: {
                      id: actionLead.id,
                      name: actionLead.name,
                      phone: actionLead.phoneNumber,
                      email: actionLead.email,
                      courseId: actionLead.courseId,
                      course: actionLead.course?.name || actionLead.interestedIn,
                      source: actionLead.source,
                      notes: actionLead.notes,
                      branchId: actionLead.branchId,
                    },
                    leadId: actionLead.id,
                  },
                });
                return;
              }
              if (stage === "LOST") {
                markLostMutation.mutate(
                  {
                    id: actionLead.id,
                    data: {
                      reason: "OTHER",
                      notes: String(form.get("notes") || "") || undefined,
                    },
                  },
                  {
                    onSuccess: () => {
                      showToast("Lead marked as Lost (kept in list at the end)");
                      closeRowAction();
                    },
                    onError: (err: unknown) => {
                      showToast(getApiErrorMessage(err, "Mark lost failed"));
                    },
                  }
                );
                return;
              }
              // FOLLOW_UP requires a scheduled task — open Schedule dialog (not bare changeStage)
              if (stage === "FOLLOW_UP") {
                setRowAction("followUp");
                return;
              }
              changeStageMutation.mutate(
                {
                  id: actionLead.id,
                  data: {
                    stage,
                    notes: String(form.get("notes") || "") || undefined,
                  },
                },
                {
                  onSuccess: () => {
                    showToast("Stage updated");
                    closeRowAction();
                  },
                  onError: (err: unknown) => {
                    showToast(getApiErrorMessage(err, "Stage update failed"));
                  },
                }
              );
            }}
            className="space-y-4"
          >
            <div>
              <Label>Stage</Label>
              <select
                name="stage"
                required
                defaultValue={actionLead?.stage}
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                {stagePipeline.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input name="notes" className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRowAction}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-white"
                disabled={
                  changeStageMutation.isPending || markLostMutation.isPending
                }
              >
                {changeStageMutation.isPending || markLostMutation.isPending
                  ? "Saving..."
                  : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rowAction === "note" && !!actionLead}
        onOpenChange={(o) => !o && closeRowAction()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add remark — {actionLead?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!actionLead) return;
              const form = new FormData(e.currentTarget);
              const description = String(form.get("description") || "").trim();
              if (!description) return;
              try {
                await leadsApi.addActivity(actionLead.id, {
                  type: "NOTE_ADDED",
                  title: "Remark added",
                  description,
                });
                await queryClient.invalidateQueries({ queryKey: ["leads"] });
                showToast("Remark added");
                closeRowAction();
              } catch (err: unknown) {
                showToast(
                  (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message || "Failed to add remark"
                );
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Remark</Label>
              <Textarea
                name="description"
                className="mt-1"
                required
                rows={4}
                placeholder="Counsellor or admin remark for this lead…"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRowAction}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-white">
                Save remark
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rowAction === "followUp" && !!actionLead}
        onOpenChange={(o) => !o && closeRowAction()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule follow-up — {actionLead?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!actionLead) return;
              const form = new FormData(e.currentTarget);
              const scheduledDate = String(form.get("scheduledDate") || "");
              const scheduledTime = String(form.get("scheduledTime") || "");
              const scheduledAt = combineDateAnd12HourTime(scheduledDate, scheduledTime);
              const notes = String(form.get("notes") || "").trim();
              if (!scheduledAt || !notes) {
                if (!scheduledAt) showToast("Select a valid date and time");
                else if (!notes) showToast("Follow-up remark is required");
                return;
              }
              createFollowUpMutation.mutate(
                {
                  id: actionLead.id,
                  data: {
                    type: String(form.get("type") || "CALL"),
                    scheduledAt,
                    notes,
                    priority: String(form.get("priority") || "MEDIUM"),
                    counsellorId:
                      actionLead.assignedCounsellorId || undefined,
                  },
                },
                {
                  onSuccess: () => {
                    showToast("Follow-up scheduled");
                    closeRowAction();
                  },
                }
              );
            }}
            className="space-y-4"
          >
            <div>
              <Label>Type</Label>
              <select
                name="type"
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="CALL">Phone Call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="MEETING">Meeting</option>
                <option value="REMINDER">Reminder</option>
              </select>
            </div>
            <div>
              <Label>Scheduled at</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input
                  name="scheduledDate"
                  type="date"
                  defaultValue={toDateInputValue()}
                  required
                />
                <select
                  name="scheduledTime"
                  defaultValue={DEFAULT_FOLLOW_UP_12H_TIME}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  {FOLLOW_UP_12H_TIME_OPTIONS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>Priority</Label>
              <select
                name="priority"
                defaultValue="MEDIUM"
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <Label>Notes *</Label>
              <Input name="notes" className="mt-1" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRowAction}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-white"
                disabled={createFollowUpMutation.isPending}
              >
                {createFollowUpMutation.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import leads</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Download the CSV template, fill in your leads, then upload the file.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleDownloadLeadTemplate}
          >
            <FileDown className="h-4 w-4" />
            Download CSV template
          </Button>
          <Input
            type="file"
            accept=".csv,text/csv"
            multiple
            disabled={importBusy}
            onChange={(e) => handlePickImportFiles(e.target.files)}
          />
          {importJobs.length > 0 && (
            <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
              {importJobs.map((job) => (
                <li
                  key={`${job.fileName}-${job.jobId || job.status}`}
                  className="rounded-md border px-3 py-2 flex justify-between gap-2"
                >
                  <span className="font-medium truncate">{job.fileName}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {job.status}
                    {job.message ? ` · ${job.message}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {Array.isArray(recentImportJobs) && recentImportJobs.length > 0 && (
            <div className="text-xs">
              <p className="font-bold mb-2 text-muted-foreground">Recent import jobs</p>
              <ul className="space-y-1 max-h-28 overflow-y-auto">
                {(
                  recentImportJobs as {
                    id: string;
                    fileName?: string;
                    status?: string;
                    entityType?: string;
                  }[]
                )
                  .filter((j) => !j.entityType || j.entityType === "leads")
                  .slice(0, 5)
                  .map((j) => (
                    <li key={j.id} className="flex justify-between gap-2">
                      <span className="truncate">{j.fileName || j.id}</span>
                      <span>{j.status}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              Close
            </Button>
            <Button
              className="bg-primary text-white gap-1"
              disabled={
                importBusy || !importJobs.some((j) => j.status === "previewed")
              }
              onClick={handleConfirmAllImports}
            >
              {importBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Confirm import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LeadWorkspaceShell>
  );
};
