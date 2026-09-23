import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  Flame,
  Plus,
  CheckCircle2,
} from "lucide-react";
import {
  useFollowUpDashboard,
  useUpdateFollowUp,
  useCreateFollowUp,
  useLeads,
} from "@/hooks/useLeads";
import { getPortalBasePath } from "@/utils/portal-path";
import {
  FOLLOW_UP_12H_TIME_OPTIONS,
  DEFAULT_FOLLOW_UP_12H_TIME,
  combineDateAnd12HourTime,
  toDateInputValue,
  to12HourTimeValue,
} from "@/utils/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ReadOnlyBanner, PermissionGate } from "@/components/permissions/PermissionGate";
import { FilterToolbar } from "@/components/layout";
import { type Lead, type LeadFollowUp } from "@/services/leads.api";
import {
  FollowUpActionMenu,
  type FollowUpMenuAction,
} from "./components/FollowUpActionMenu";
import { LeadWorkspaceShell } from "./components/LeadWorkspaceShell";
import { LeadDataSurface, LeadListState } from "./components/LeadDataSurface";
import { useAuthStore } from "@/store/auth.store";

type TabKey = "today" | "overdue" | "upcoming" | "completed" | "my" | "team";

const PAGE_LIMIT = 50;

function priorityBadgeVariant(priority?: string): "destructive" | "warning" | "secondary" | "outline" {
  if (priority === "HIGH") return "destructive";
  if (priority === "MEDIUM") return "warning";
  if (priority === "LOW") return "secondary";
  return "outline";
}

function statusBadgeClass(status?: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "MISSED":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-amber-100 text-amber-800 border-amber-200";
  }
}

function formatWhen(scheduledAt: string): string {
  const scheduled = new Date(scheduledAt);
  const date = scheduled.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = scheduled.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

function isHot(item: LeadFollowUp): boolean {
  return (item.lead?.leadScore ?? 0) >= 70;
}

function tabFromSearch(raw: string | null): TabKey | null {
  if (!raw) return null;
  const key = raw.toLowerCase() as TabKey;
  if (["today", "overdue", "upcoming", "completed", "my", "team"].includes(key)) {
    return key;
  }
  return null;
}

function isCounsellorOnlyUser(roles: string[] | undefined): boolean {
  const normalized = (roles || []).map((r) => String(r).toUpperCase());
  return (
    normalized.includes("COUNSELLOR") &&
    !normalized.includes("ADMIN") &&
    !normalized.includes("CENTER_MANAGER")
  );
}

export const FollowUps: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const basePath = getPortalBasePath(location.pathname);
  const { user } = useAuthStore();
  const counsellorOnly = isCounsellorOnlyUser(user?.roles);

  const urlTab = tabFromSearch(searchParams.get("tab"));
  const initialTab: TabKey =
    counsellorOnly && (urlTab === "team" || urlTab === "my")
      ? "today"
      : urlTab || "today";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [page, setPage] = useState(1);

  const [actionFollowUp, setActionFollowUp] = useState<LeadFollowUp | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState(DEFAULT_FOLLOW_UP_12H_TIME);

  const [createLeadIds, setCreateLeadIds] = useState<Set<string>>(new Set());
  const [createLeadSearch, setCreateLeadSearch] = useState("");
  const [createType, setCreateType] = useState("CALL");
  const [createPriority, setCreatePriority] = useState("MEDIUM");
  const [createScheduledDate, setCreateScheduledDate] = useState(() => toDateInputValue());
  const [createScheduledTime, setCreateScheduledTime] = useState(DEFAULT_FOLLOW_UP_12H_TIME);
  const [createNotes, setCreateNotes] = useState("");
  const [createBulkPending, setCreateBulkPending] = useState(false);

  const { data, isLoading, isError, refetch } = useFollowUpDashboard({
    page,
    limit: PAGE_LIMIT,
  });
  const updateFollowUp = useUpdateFollowUp();
  const createFollowUp = useCreateFollowUp();

  const resetCreateForm = () => {
    setCreateLeadIds(new Set());
    setCreateLeadSearch("");
    setCreateType("CALL");
    setCreatePriority("MEDIUM");
    setCreateScheduledDate(toDateInputValue());
    setCreateScheduledTime(DEFAULT_FOLLOW_UP_12H_TIME);
    setCreateNotes("");
    setCreateBulkPending(false);
  };

  const toggleCreateLead = (leadId: string) => {
    setCreateLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  useEffect(() => {
    const fromUrl = tabFromSearch(searchParams.get("tab"));
    if (counsellorOnly && (fromUrl === "team" || fromUrl === "my")) {
      if (activeTab !== "today") setActiveTab("today");
      const next = new URLSearchParams(searchParams);
      next.delete("tab");
      setSearchParams(next, { replace: true });
      return;
    }
    if (fromUrl && fromUrl !== activeTab) {
      setActiveTab(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync URL → tab only
  }, [searchParams, counsellorOnly]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const { data: leadsResponse } = useLeads({
    search: createLeadSearch.trim() || undefined,
    limit: 50,
    page: 1,
    status: "ACTIVE",
  });

  const leadOptions: Lead[] = Array.isArray(leadsResponse?.data?.data)
    ? leadsResponse.data.data
    : Array.isArray(leadsResponse?.data)
      ? leadsResponse.data
      : [];

  const dashboard = data?.data;
  const summary = dashboard?.summary || {
    overdue: 0,
    today: 0,
    upcoming: 0,
    completed: 0,
    totalPending: 0,
    my: 0,
    team: 0,
    hotWithPending: 0,
    highRisk: 0,
  };
  const lists = dashboard?.lists || {
    overdue: [],
    today: [],
    upcoming: [],
    all: [],
    completed: [],
    my: [],
    team: [],
    recommended: [],
  };
  const listMeta = dashboard?.meta || { page, limit: PAGE_LIMIT };

  const tabCounts: Record<TabKey, number> = {
    today: summary.today ?? 0,
    overdue: summary.overdue ?? 0,
    upcoming: summary.upcoming ?? 0,
    completed: summary.completed ?? 0,
    my: summary.my ?? lists.my?.length ?? 0,
    team: summary.team ?? lists.team?.length ?? 0,
  };

  const primaryTabs: {
    key: "today" | "overdue" | "upcoming" | "completed";
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: "today", label: "Due", icon: <Clock className="w-3.5 h-3.5" /> },
    { key: "overdue", label: "Overdue", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { key: "upcoming", label: "Upcoming", icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { key: "completed", label: "Completed", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ];

  const scopeValue: "all" | "my" | "team" =
    activeTab === "my" ? "my" : activeTab === "team" ? "team" : "all";

  const visibleTabKey: "today" | "overdue" | "upcoming" | "completed" =
    activeTab === "my" || activeTab === "team"
      ? "upcoming"
      : activeTab === "today" ||
          activeTab === "overdue" ||
          activeTab === "upcoming" ||
          activeTab === "completed"
        ? activeTab
        : "today";

  const activeList = useMemo((): LeadFollowUp[] => {
    if (activeTab === "upcoming") {
      return (lists.upcoming || []) as LeadFollowUp[];
    }
    if (activeTab === "completed") {
      return (lists.completed || []) as LeadFollowUp[];
    }
    return (lists[activeTab] || []) as LeadFollowUp[];
  }, [lists, activeTab]);

  const activeTotal = tabCounts[activeTab] ?? 0;
  const currentPage = listMeta.page ?? page;
  const pageLimit = listMeta.limit ?? PAGE_LIMIT;
  const totalPages = Math.max(1, Math.ceil(activeTotal / pageLimit));
  const showPagination = activeTotal > pageLimit;
  const rangeStart = activeTotal === 0 ? 0 : (currentPage - 1) * pageLimit + 1;
  const rangeEnd = Math.min(currentPage * pageLimit, activeTotal);

  const openLead = (leadId?: string) => {
    if (!leadId) return;
    navigate(`${basePath}/leads/${leadId}`);
  };

  const setTab = (tab: TabKey) => {
    if (counsellorOnly && (tab === "my" || tab === "team")) return;
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === "today") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const handleMenuAction = (item: LeadFollowUp, action: FollowUpMenuAction) => {
    const leadId = item.lead?.id || item.leadId;

    switch (action) {
      case "complete":
        setActionFollowUp(item);
        setOutcome("");
        setCompleteNotes("");
        setCompleteOpen(true);
        break;
      case "reschedule": {
        setActionFollowUp(item);
        const dt = new Date(item.scheduledAt);
        setRescheduleDate(toDateInputValue(dt));
        setRescheduleTime(to12HourTimeValue(dt));
        setRescheduleOpen(true);
        break;
      }
      case "cancel":
        if (!window.confirm("Cancel this follow-up?")) return;
        updateFollowUp.mutate(
          {
            leadId,
            followUpId: item.id,
            data: { status: "CANCELLED" },
          },
          {
            onError: (err: unknown) => {
              const message =
                (err as { response?: { data?: { message?: string } } })?.response
                  ?.data?.message || "Failed to cancel follow-up";
              alert(message);
            },
          }
        );
        break;
      case "view-lead":
        openLead(leadId);
        break;
      default:
        break;
    }
  };

  const submitComplete = () => {
    if (!actionFollowUp) return;
    const leadId = actionFollowUp.lead?.id || actionFollowUp.leadId;
    updateFollowUp.mutate(
      {
        leadId,
        followUpId: actionFollowUp.id,
        data: {
          status: "COMPLETED",
          outcome: outcome || undefined,
          notes: completeNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          setCompleteOpen(false);
          setActionFollowUp(null);
        },
        onError: (err: unknown) => {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to complete follow-up";
          alert(message);
        },
      }
    );
  };

  const submitReschedule = () => {
    if (!actionFollowUp) return;
    const scheduledAt = combineDateAnd12HourTime(rescheduleDate, rescheduleTime);
    if (!scheduledAt) return;
    const leadId = actionFollowUp.lead?.id || actionFollowUp.leadId;
    updateFollowUp.mutate(
      {
        leadId,
        followUpId: actionFollowUp.id,
        data: {
          status: "PENDING",
          scheduledAt,
        },
      },
      {
        onSuccess: () => {
          setRescheduleOpen(false);
          setActionFollowUp(null);
        },
        onError: (err: unknown) => {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to reschedule follow-up";
          alert(message);
        },
      }
    );
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = Array.from(createLeadIds);
    const remark = createNotes.trim();
    const scheduledAt = combineDateAnd12HourTime(createScheduledDate, createScheduledTime);
    if (ids.length === 0 || !scheduledAt || !remark) return;

    const payload = {
      type: createType,
      scheduledAt,
      notes: remark,
      priority: createPriority,
    };

    setCreateBulkPending(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => createFollowUp.mutateAsync({ id, data: payload }))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const ok = results.length - failed;
      if (failed > 0) {
        alert(
          ok > 0
            ? `Scheduled ${ok} follow-up(s); ${failed} failed.`
            : "Failed to create follow-ups"
        );
      }
      if (ok > 0) {
        setCreateOpen(false);
        resetCreateForm();
      }
    } finally {
      setCreateBulkPending(false);
    }
  };

  const mutating =
    updateFollowUp.isPending || createFollowUp.isPending || createBulkPending;
  const colCount = 6;

  return (
    <LeadWorkspaceShell
      title="Follow-ups"
      description="Daily action center for overdue, due, and upcoming counsellor tasks."
      banner={<ReadOnlyBanner itemKey="leads.followups" label="Follow-ups" />}
      primaryAction={
        <PermissionGate itemKey="leads.followups" mode="write">
          <Button
            type="button"
            className="gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Create Follow-up
          </Button>
        </PermissionGate>
      }
      toolbar={
        <FilterToolbar className="!py-0 gap-2">
          <div className="flex w-full flex-wrap items-center gap-2">
            <Tabs
              value={scopeValue === "all" ? visibleTabKey : "__scope__"}
              onValueChange={(v) => {
                if (v === "__scope__") return;
                setTab(v as TabKey);
              }}
            >
              <TabsList className="h-9 w-full sm:w-auto flex-wrap justify-start gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
                {primaryTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="h-8 gap-1.5 px-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
                  >
                    {tab.icon}
                    {tab.label}
                    <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px]">
                      {tabCounts[tab.key]}
                    </Badge>
                  </TabsTrigger>
                ))}
                <TabsTrigger value="__scope__" className="sr-only" tabIndex={-1}>
                  Scope
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {!counsellorOnly ? (
              <select
                value={scopeValue}
                onChange={(e) => {
                  const next = e.target.value as "all" | "my" | "team";
                  if (next === "my") setTab("my");
                  else if (next === "team") setTab("team");
                  else setTab(visibleTabKey === "upcoming" ? "today" : visibleTabKey);
                }}
                className="h-9 w-[160px] shrink-0 rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground"
                aria-label="Follow-up scope"
              >
                <option value="all">Everyone</option>
                <option value="my">My follow-ups ({tabCounts.my})</option>
                <option value="team">Team ({tabCounts.team})</option>
              </select>
            ) : (
              <span className="h-9 inline-flex items-center rounded-md border border-border bg-muted/30 px-2.5 text-sm font-medium text-muted-foreground">
                My follow-ups
              </span>
            )}
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
                <TableHead>When</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="min-w-[180px]">Remarks</TableHead>
                <TableHead className="w-12 text-right sticky right-0 bg-card">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="p-0">
                    <LeadListState kind="loading" message="Loading follow-ups..." />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="p-0">
                    <LeadListState
                      kind="error"
                      message="Failed to load follow-ups."
                      onRetry={() => refetch()}
                    />
                  </TableCell>
                </TableRow>
              ) : activeList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="p-0">
                    <LeadListState
                      kind="empty"
                      message="No scheduled follow-up tasks. Use Create Follow-up, or Schedule Follow-up from All Leads."
                      icon={CalendarDays}
                      action={
                        <PermissionGate itemKey="leads.followups" mode="write">
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setCreateOpen(true)}
                          >
                            <Plus className="w-4 h-4" />
                            Create Follow-up
                          </Button>
                        </PermissionGate>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                activeList.map((item: LeadFollowUp) => {
                  const leadId = item.lead?.id || item.leadId;
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openLead(leadId)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5">
                            {item.lead?.name || "—"}
                            {isHot(item) && (
                              <Flame className="w-3.5 h-3.5 text-orange-500" aria-label="Hot lead" />
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.lead?.phoneNumber || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatWhen(item.scheduledAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityBadgeVariant(item.priority)}>
                          {item.priority || "MEDIUM"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                        <span
                          title={
                            (item.notes || item.lead?.notes || "").trim() || undefined
                          }
                        >
                          {(item.notes || item.lead?.notes || "").trim() || "—"}
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-right sticky right-0 bg-card"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FollowUpActionMenu
                          followUp={item}
                          isPending={mutating}
                          onAction={(action) => handleMenuAction(item, action)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {showPagination && !isLoading && !isError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2">
            <p className="text-xs text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {activeTotal}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </LeadDataSurface>

      {/* Complete dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-text-secondary">
              {actionFollowUp?.lead?.name
                ? `Mark follow-up for ${actionFollowUp.lead.name} as completed.`
                : "Mark this follow-up as completed."}
            </p>
            <div>
              <Label htmlFor="fu-outcome">Outcome</Label>
              <Input
                id="fu-outcome"
                className="mt-1"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="e.g. Interested, Callback later"
              />
            </div>
            <div>
              <Label htmlFor="fu-complete-notes">Notes</Label>
              <Textarea
                id="fu-complete-notes"
                className="mt-1"
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary text-white"
              disabled={updateFollowUp.isPending}
              onClick={submitComplete}
            >
              {updateFollowUp.isPending ? "Saving..." : "Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <Label>New date & time</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input
                  id="fu-reschedule-date"
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                />
                <select
                  id="fu-reschedule-time"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  required
                >
                  {!FOLLOW_UP_12H_TIME_OPTIONS.includes(
                    rescheduleTime as (typeof FOLLOW_UP_12H_TIME_OPTIONS)[number]
                  ) && (
                    <option value={rescheduleTime}>{rescheduleTime}</option>
                  )}
                  {FOLLOW_UP_12H_TIME_OPTIONS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary text-white"
              disabled={!rescheduleDate || !rescheduleTime || updateFollowUp.isPending}
              onClick={submitReschedule}
            >
              {updateFollowUp.isPending ? "Saving..." : "Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create follow-up dialog — multi-select leads */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Follow-up</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4 py-1">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="fu-lead-search">Leads</Label>
                <span className="text-xs text-muted-foreground">
                  {createLeadIds.size} selected
                </span>
              </div>
              <Input
                id="fu-lead-search"
                className="mt-1"
                placeholder="Search lead by name or phone"
                value={createLeadSearch}
                onChange={(e) => setCreateLeadSearch(e.target.value)}
              />
              <div
                className="mt-2 max-h-44 overflow-y-auto rounded-md border border-border bg-background"
                role="group"
                aria-label="Select leads"
              >
                {leadOptions.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    No leads found. Try another search.
                  </p>
                ) : (
                  leadOptions.map((lead) => {
                    const checked = createLeadIds.has(lead.id);
                    return (
                      <label
                        key={lead.id}
                        className="flex cursor-pointer items-start gap-2.5 border-b border-border/60 px-3 py-2 last:border-b-0 hover:bg-muted/40"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 rounded border-border"
                          checked={checked}
                          onChange={() => toggleCreateLead(lead.id)}
                          aria-label={`Select ${lead.name}`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {lead.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground font-mono">
                            {lead.phoneNumber}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Select one or more leads — same schedule applies to all.
              </p>
            </div>
            <div>
              <Label>Type</Label>
              <select
                className="w-full mt-1 h-9 px-3 rounded-md border text-sm bg-background"
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
              >
                <option value="CALL">Phone Call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="MEETING">Meeting</option>
                <option value="REMINDER">Reminder</option>
              </select>
            </div>
            <div>
              <Label>Priority</Label>
              <select
                className="w-full mt-1 h-9 px-3 rounded-md border text-sm bg-background"
                value={createPriority}
                onChange={(e) => setCreatePriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <Label>Scheduled date & time</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input
                  id="fu-create-date"
                  type="date"
                  value={createScheduledDate}
                  onChange={(e) => setCreateScheduledDate(e.target.value)}
                  required
                />
                <select
                  id="fu-create-time"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={createScheduledTime}
                  onChange={(e) => setCreateScheduledTime(e.target.value)}
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
              <Label htmlFor="fu-create-notes">Notes *</Label>
              <Input
                id="fu-create-notes"
                className="mt-1"
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-white"
                disabled={
                  createLeadIds.size === 0 ||
                  !createScheduledDate ||
                  !createScheduledTime ||
                  !createNotes.trim() ||
                  createBulkPending
                }
              >
                {createBulkPending
                  ? "Scheduling..."
                  : createLeadIds.size > 1
                    ? `Schedule ${createLeadIds.size} Follow-ups`
                    : "Schedule Follow-up"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </LeadWorkspaceShell>
  );
};
