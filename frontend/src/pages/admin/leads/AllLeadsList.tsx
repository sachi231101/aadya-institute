import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Users,
  LayoutList,
  Columns3,
  Filter,
  Upload,
  Download,
  MoreHorizontal,
  Check,
  MessageCircle,
  Phone,
  PhoneCall,
  Bot,
  Tag,
  StickyNote,
  Calendar,
  UserCheck,
  Archive,
  GitMerge,
  GraduationCap,
} from "lucide-react";
import {
  useLeads,
  useLeadDashboard,
  useAssignLead,
  useChangeLeadStage,
  useUpdateLeadTags,
  useArchiveLead,
  useTriggerLeadCall,
  useCreateFollowUp,
  useCreateManualCallLog,
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
import { MasterSelect } from "@/components/common/MasterSelect";
import { useAuthStore } from "@/store/auth.store";
import { getPortalBasePath } from "@/utils/portal-path";
import { Card, CardContent } from "@/components/ui/card";
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
import { LeadSummaryCards, type LeadKpiKey } from "./components/LeadSummaryCards";
import {
  LeadAdvancedFilters,
  countActiveAdvancedFilters,
  type LeadAdvancedFilterValues,
} from "./components/LeadAdvancedFilters";
import { BulkAssignDialog } from "./components/BulkAssignDialog";
import { MergeLeadsDialog } from "./components/MergeLeadsDialog";
import { LeadScoreBadge } from "./components/LeadScoreBadge";

type ViewMode = "list" | "kanban";
type RowAction =
  | "assign"
  | "stage"
  | "note"
  | "tags"
  | "manualCall"
  | "followUp"
  | null;

type ImportFileJob = {
  fileName: string;
  status: "previewing" | "previewed" | "confirming" | "done" | "error";
  jobId?: string;
  validRows?: number;
  errorRows?: number;
  message?: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatShortDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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
  const basePath = getPortalBasePath(location.pathname);
  const queryClient = useQueryClient();
  const { user, token } = useAuthStore();
  const isAdmin = user?.roles?.includes("ADMIN");

  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [stageMasterId, setStageMasterId] = useState("");
  const [counsellorFilter, setCounsellorFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [page, setPage] = useState(1);
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
  const updateTagsMutation = useUpdateLeadTags();
  const archiveMutation = useArchiveLead();
  const triggerCallMutation = useTriggerLeadCall();
  const createFollowUpMutation = useCreateFollowUp();
  const manualCallMutation = useCreateManualCallLog();

  const stagePipeline = useMemo(() => {
    if (stageOptions.length > 0) {
      return stageOptions.map((opt) => ({
        key: opt.code || opt.label.toUpperCase().replace(/\s+/g, "_"),
        label: opt.label,
      }));
    }
    return [...DEFAULT_LEAD_STAGE_PIPELINE, "LOST"].map((s) => ({
      key: s,
      label: s.replace(/_/g, " "),
    }));
  }, [stageOptions]);

  const listParams = useMemo((): LeadQueryParams => {
    const params: LeadQueryParams = {
      page: view === "list" ? page : 1,
      limit: view === "kanban" ? 100 : 20,
      search: searchTerm || undefined,
      stage: stageFilter !== "ALL" ? stageFilter : undefined,
      assignedCounsellorId:
        counsellorFilter !== "ALL" ? counsellorFilter : undefined,
      branchId: isAdmin && branchFilter !== "ALL" ? branchFilter : undefined,
      source: advancedApplied.source,
      sourceMasterId: advancedApplied.sourceMasterId,
      status: advancedApplied.status,
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

    return params;
  }, [
    view,
    page,
    searchTerm,
    stageFilter,
    counsellorFilter,
    branchFilter,
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

  const selectedLeads = useMemo(
    () => leads.filter((l) => selectedIds.includes(l.id)),
    [leads, selectedIds]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openLead = (id: string) => navigate(`${basePath}/leads/${id}`);

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

    const today = todayIsoDate();
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
    if (key === "new") {
      setStageFilter("NEW");
      setAdvancedApplied(nextAdv);
      setAdvancedDraft(nextAdv);
      return;
    }
    if (key === "hot" || key === "warm" || key === "cold") {
      nextAdv.scoreBand = key;
    } else if (key === "unassigned") {
      nextAdv.unassigned = true;
    } else if (key === "today") {
      nextAdv.dateFrom = today;
      nextAdv.dateTo = today;
    } else if (key === "overdue") {
      nextAdv.overdueFollowUps = true;
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
  };

  const closeRowAction = () => {
    setActionLead(null);
    setRowAction(null);
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

  const handleWhatsApp = (lead: Lead) => {
    const phone = lead.phoneNumber.replace(/\D/g, "");
    const digits = phone.startsWith("91") ? phone : `91${phone}`;
    window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
  };

  const handleArchive = (lead: Lead) => {
    if (!window.confirm(`Archive lead "${lead.name}"?`)) return;
    archiveMutation.mutate(lead.id, {
      onSuccess: () => {
        showToast("Lead archived");
        setSelectedIds((prev) => prev.filter((id) => id !== lead.id));
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Archive failed";
        showToast(msg);
      },
    });
  };

  const activeFilterCount = countActiveAdvancedFilters(advancedApplied);

  return (
    <div className="space-y-6">
      <ReadOnlyBanner itemKey="leads.all" label="All Leads" />

      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 text-white text-sm px-4 py-2.5 shadow-lg">
          {toastMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            All Leads
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control center for lead pipeline, assignment, and follow-up
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex rounded-xl border border-border bg-muted/40 p-0.5 overflow-hidden shadow-xs">
            <Button
              type="button"
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className={`rounded-lg text-xs font-bold h-8 px-3 transition-all ${
                view === "list"
                  ? "bg-white dark:bg-slate-800 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setView("list")}
            >
              <LayoutList className="h-3.5 w-3.5 mr-1.5" /> List
            </Button>
            <Button
              type="button"
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              className={`rounded-lg text-xs font-bold h-8 px-3 transition-all ${
                view === "kanban"
                  ? "bg-white dark:bg-slate-800 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setView("kanban")}
            >
              <Columns3 className="h-3.5 w-3.5 mr-1.5" /> Pipeline
            </Button>
          </div>
          <PermissionGate itemKey="leads.all" mode="write">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl"
              onClick={() => {
                setImportJobs([]);
                setShowImportModal(true);
              }}
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl"
              onClick={handleExport}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export
            </Button>
            <Button
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs gap-1.5 shadow-sm h-9 px-3.5 rounded-xl cursor-pointer"
              onClick={() =>
                navigate(`${basePath}/leads/${basePath === "/admin" ? "new" : "add"}`)
              }
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </PermissionGate>
        </div>
      </div>

      <LeadSummaryCards
        summary={summary}
        activeKey={activeKpi}
        onSelect={applyKpi}
        isLoading={dashboardLoading}
      />

      <Card className="border-border/60 shadow-xs rounded-2xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1 w-full min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-10 rounded-xl bg-background border-border"
              />
            </div>
            <div className="w-full sm:w-[170px]">
              <MasterSelect
                entityType="leadstage"
                value={stageMasterId}
                allowCreate={false}
                onChange={(id) => {
                  setStageMasterId(id);
                  setPage(1);
                  clearKpiAndAdvancedOverlaps();
                  if (!id) {
                    setStageFilter("ALL");
                    return;
                  }
                  const opt = stageOptions.find((o) => o.value === id);
                  setStageFilter(
                    opt?.code ||
                      opt?.label.toUpperCase().replace(/\s+/g, "_") ||
                      "ALL"
                  );
                }}
                placeholder="All Stages"
                className="mt-0"
              />
            </div>
            <select
              value={counsellorFilter}
              onChange={(e) => {
                setCounsellorFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 border border-border rounded-xl text-xs sm:text-sm bg-card font-medium text-foreground cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="ALL">All Counsellors</option>
              {counsellors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {isAdmin && (
              <select
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 px-3 border border-border rounded-xl text-xs sm:text-sm bg-card font-medium text-foreground cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
              >
                <option value="ALL">All Branches</option>
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
              className="h-10 gap-1.5 rounded-xl relative"
              onClick={() => {
                setAdvancedDraft(advancedApplied);
                setAdvancedOpen(true);
              }}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {selectedIds.length > 0 && view === "list" && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="text-sm font-semibold">
                {selectedIds.length} selected
              </span>
              <PermissionGate itemKey="leads.all" mode="write">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={() => setBulkAssignOpen(true)}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Bulk Assign
                </Button>
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

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Loading leads...
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-red-600">
              <AlertCircle className="w-5 h-5 inline mr-2" />
              Failed to load leads.
              <Button variant="link" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : view === "kanban" ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {stagePipeline.map(({ key: stage, label }) => {
                const columnLeads = leads.filter((l) => l.stage === stage);
                return (
                  <div
                    key={stage}
                    className="min-w-[250px] w-[250px] shrink-0 rounded-2xl bg-muted/20 border border-border p-3.5 shadow-xs flex flex-col"
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
                              <LeadScoreBadge score={lead.leadScore} showScore={false} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {lead.phoneNumber}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">
                              {lead.course?.name || lead.interestedIn}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">
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
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={
                            leads.length > 0 && selectedIds.length === leads.length
                          }
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-border"
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Course/Program</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lead Score</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Counsellor</TableHead>
                      <TableHead>Last Contact</TableHead>
                      <TableHead>Next Follow-up</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={13}
                          className="text-center py-8 text-text-secondary"
                        >
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No leads found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      leads.map((lead) => (
                        <TableRow
                          key={lead.id}
                          className="hover:bg-bg-secondary/30"
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(lead.id)}
                              onChange={() => toggleSelect(lead.id)}
                              className="h-4 w-4 rounded border-border"
                              aria-label={`Select ${lead.name}`}
                            />
                          </TableCell>
                          <TableCell
                            className="cursor-pointer"
                            onClick={() => openLead(lead.id)}
                          >
                            <div>
                              <p className="font-medium">{lead.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {lead.phoneNumber}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {lead.course?.name || lead.interestedIn || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {lead.source || "—"}
                          </TableCell>
                          <TableCell>
                            <LeadStageBadge
                              stage={lead.stage}
                              label={
                                stageOptions.find(
                                  (o) =>
                                    o.code === lead.stage || o.value === lead.stage
                                )?.label
                              }
                            />
                          </TableCell>
                          <TableCell className="text-sm">
                            {lead.status || "—"}
                          </TableCell>
                          <TableCell>
                            <LeadScoreBadge score={lead.leadScore} />
                          </TableCell>
                          <TableCell className="text-sm">
                            {lead.priority || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {lead.assignedCounsellor?.name || "Unassigned"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDateTime(lead.lastContactedAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDateTime(lead.nextFollowUpAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatShortDate(lead.createdAt)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => openLead(lead.id)}>
                                  Open Lead 360
                                </DropdownMenuItem>
                                <PermissionGate itemKey="leads.all" mode="write">
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openRowAction(lead, "assign")}
                                  >
                                    <UserCheck className="h-4 w-4" /> Assign
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openRowAction(lead, "stage")}
                                  >
                                    Change Stage
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openRowAction(lead, "note")}
                                  >
                                    <StickyNote className="h-4 w-4" /> Add Note
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openRowAction(lead, "tags")}
                                  >
                                    <Tag className="h-4 w-4" /> Tags
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openRowAction(lead, "manualCall")}
                                  >
                                    <Phone className="h-4 w-4" /> Log Manual Call
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      triggerCallMutation.mutate(lead.id, {
                                        onSuccess: () =>
                                          showToast(`AI call queued for ${lead.name}`),
                                        onError: (err: unknown) =>
                                          showToast(
                                            (err as { response?: { data?: { message?: string } } })
                                              ?.response?.data?.message ||
                                              "AI call failed"
                                          ),
                                      })
                                    }
                                  >
                                    <Bot className="h-4 w-4" /> AI Call
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleWhatsApp(lead)}
                                  >
                                    <MessageCircle className="h-4 w-4" /> WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openRowAction(lead, "followUp")}
                                  >
                                    <Calendar className="h-4 w-4" /> Follow-up
                                  </DropdownMenuItem>
                                  {lead.stage !== "CONVERTED" &&
                                    lead.stage !== "LOST" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          navigate(
                                            `${basePath}/admissions/direct-entry`,
                                            {
                                              state: {
                                                lead: {
                                                  id: lead.id,
                                                  name: lead.name,
                                                  phone: lead.phoneNumber,
                                                  email: lead.email,
                                                  courseId: lead.courseId,
                                                  course:
                                                    lead.course?.name ||
                                                    lead.interestedIn,
                                                  source: lead.source,
                                                  notes: lead.notes,
                                                  branchId: lead.branchId,
                                                },
                                                leadId: lead.id,
                                              },
                                            }
                                          )
                                        }
                                      >
                                        <GraduationCap className="h-4 w-4" /> Convert
                                      </DropdownMenuItem>
                                    )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => handleArchive(lead)}
                                  >
                                    <Archive className="h-4 w-4" /> Archive
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
                <div className="flex justify-between items-center text-sm">
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
        </CardContent>
      </Card>

      <LeadAdvancedFilters
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        values={advancedDraft}
        onChange={setAdvancedDraft}
        onApply={() => {
          setAdvancedApplied(advancedDraft);
          setActiveKpi(null);
          setPage(1);
        }}
        onClear={() => {
          const empty = {};
          setAdvancedDraft(empty);
          setAdvancedApplied(empty);
          setActiveKpi(null);
          setPage(1);
        }}
      />

      <BulkAssignDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        leadIds={selectedIds}
        counsellors={counsellors}
        onSuccess={() => {
          setSelectedIds([]);
          showToast("Leads assigned");
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!actionLead) return;
              const form = new FormData(e.currentTarget);
              const counsellorId = String(form.get("counsellorId") || "");
              if (!counsellorId) return;
              assignMutation.mutate(
                {
                  id: actionLead.id,
                  data: {
                    counsellorId,
                    notes: String(form.get("notes") || "") || undefined,
                  },
                },
                {
                  onSuccess: () => {
                    showToast("Lead assigned");
                    closeRowAction();
                  },
                }
              );
            }}
            className="space-y-4"
          >
            <div>
              <Label>Counsellor</Label>
              <select
                name="counsellorId"
                required
                defaultValue={actionLead?.assignedCounsellorId || ""}
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
                className="bg-[#2563EB] text-white"
                disabled={assignMutation.isPending}
              >
                {assignMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </form>
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
                className="bg-[#2563EB] text-white"
                disabled={changeStageMutation.isPending}
              >
                {changeStageMutation.isPending ? "Saving..." : "Update"}
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
            <DialogTitle>Add note — {actionLead?.name}</DialogTitle>
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
                  title: "Note added",
                  description,
                });
                await queryClient.invalidateQueries({ queryKey: ["leads"] });
                showToast("Note added");
                closeRowAction();
              } catch (err: unknown) {
                showToast(
                  (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message || "Failed to add note"
                );
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Note</Label>
              <Textarea name="description" className="mt-1" required rows={4} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRowAction}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#2563EB] text-white">
                Save note
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rowAction === "tags" && !!actionLead}
        onOpenChange={(o) => !o && closeRowAction()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tags — {actionLead?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!actionLead) return;
              const form = new FormData(e.currentTarget);
              const raw = String(form.get("tags") || "");
              const tags = raw
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              updateTagsMutation.mutate(
                { id: actionLead.id, data: { tags } },
                {
                  onSuccess: () => {
                    showToast("Tags updated");
                    closeRowAction();
                  },
                }
              );
            }}
            className="space-y-4"
          >
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                name="tags"
                className="mt-1"
                defaultValue={(actionLead?.tags || []).join(", ")}
                placeholder="NEET, callback, fees"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRowAction}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2563EB] text-white"
                disabled={updateTagsMutation.isPending}
              >
                {updateTagsMutation.isPending ? "Saving..." : "Save tags"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rowAction === "manualCall" && !!actionLead}
        onOpenChange={(o) => !o && closeRowAction()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4" />
              Log manual call — {actionLead?.name}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!actionLead) return;
              const form = new FormData(e.currentTarget);
              manualCallMutation.mutate(
                {
                  leadId: actionLead.id,
                  status: String(form.get("status") || "COMPLETED"),
                  duration: Number(form.get("duration") || 0) || undefined,
                  outcome: String(form.get("outcome") || "") || null,
                  notes: String(form.get("notes") || "") || null,
                  interestStatus: String(form.get("interestStatus") || "") || null,
                },
                {
                  onSuccess: () => {
                    showToast("Manual call logged");
                    closeRowAction();
                  },
                  onError: (err: unknown) =>
                    showToast(
                      (err as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message || "Failed to log call"
                    ),
                }
              );
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <select
                  name="status"
                  defaultValue="COMPLETED"
                  className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
                >
                  <option value="COMPLETED">Completed</option>
                  <option value="NO_ANSWER">No answer</option>
                  <option value="BUSY">Busy</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
              <div>
                <Label>Duration (sec)</Label>
                <Input name="duration" type="number" min={0} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Interest</Label>
              <select
                name="interestStatus"
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="">—</option>
                <option value="INTERESTED">Interested</option>
                <option value="NOT_INTERESTED">Not interested</option>
                <option value="CALLBACK">Callback</option>
                <option value="NEUTRAL">Neutral</option>
              </select>
            </div>
            <div>
              <Label>Outcome</Label>
              <Input name="outcome" className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea name="notes" className="mt-1" rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRowAction}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2563EB] text-white"
                disabled={manualCallMutation.isPending}
              >
                {manualCallMutation.isPending ? "Saving..." : "Log call"}
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
              createFollowUpMutation.mutate(
                {
                  id: actionLead.id,
                  data: {
                    type: String(form.get("type") || "CALL"),
                    scheduledAt: String(form.get("scheduledAt") || ""),
                    notes: String(form.get("notes") || "") || undefined,
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
              <Input name="scheduledAt" type="datetime-local" className="mt-1" required />
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
              <Label>Notes</Label>
              <Input name="notes" className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRowAction}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2563EB] text-white"
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
            Upload one or more lead CSVs via data-management import (same flow as AI
            Calling).
          </p>
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
              className="bg-[#2563EB] text-white gap-1"
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
    </div>
  );
};
