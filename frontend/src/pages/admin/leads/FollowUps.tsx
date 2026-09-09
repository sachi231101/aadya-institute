import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Plus,
  Sparkles,
  CheckCircle2,
  User,
  Users,
} from "lucide-react";
import {
  useFollowUpDashboard,
  useUpdateFollowUp,
  useCreateFollowUp,
  useTriggerLeadCall,
  useLeads,
} from "@/hooks/useLeads";
import { getPortalBasePath } from "@/utils/portal-path";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import type { Lead, LeadFollowUp } from "@/services/leads.api";
import {
  FollowUpActionMenu,
  type FollowUpMenuAction,
} from "./components/FollowUpActionMenu";

type TabKey = "today" | "overdue" | "upcoming" | "completed" | "my" | "team";
type HighlightKey = "overdue" | "hot" | "highRisk" | "today" | null;

function formatPhoneForWhatsApp(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits || null;
}

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

function sortByRecommended(items: LeadFollowUp[], recommended: LeadFollowUp[]): LeadFollowUp[] {
  if (!recommended.length || !items.length) return items;
  const rank = new Map(recommended.map((r, i) => [r.id, i]));
  return [...items].sort((a, b) => {
    const ra = rank.get(a.id);
    const rb = rank.get(b.id);
    if (ra != null && rb != null) return ra - rb;
    if (ra != null) return -1;
    if (rb != null) return 1;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });
}

function isHot(item: LeadFollowUp): boolean {
  return (item.lead?.leadScore ?? 0) >= 70;
}

function isHighRisk(item: LeadFollowUp, startOfToday: Date): boolean {
  const overdue = new Date(item.scheduledAt) < startOfToday;
  return overdue && (item.priority === "HIGH" || isHot(item));
}

export const FollowUps: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);

  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [highlight, setHighlight] = useState<HighlightKey>(null);
  const [useRecommendedOrder, setUseRecommendedOrder] = useState(true);

  const [actionFollowUp, setActionFollowUp] = useState<LeadFollowUp | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const [rescheduleAt, setRescheduleAt] = useState("");

  const [createLeadId, setCreateLeadId] = useState("");
  const [createLeadSearch, setCreateLeadSearch] = useState("");
  const [createType, setCreateType] = useState("CALL");
  const [createPriority, setCreatePriority] = useState("MEDIUM");
  const [createScheduledAt, setCreateScheduledAt] = useState("");
  const [createNotes, setCreateNotes] = useState("");

  const { data, isLoading, isError, refetch } = useFollowUpDashboard();
  const updateFollowUp = useUpdateFollowUp();
  const createFollowUp = useCreateFollowUp();
  const triggerAiCall = useTriggerLeadCall();

  const { data: leadsResponse } = useLeads({
    search: createLeadSearch || undefined,
    limit: 20,
    page: 1,
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
    hotWithPending: 0,
    highRisk: 0,
  };
  const highlights = dashboard?.highlights || {
    overdue: summary.overdue,
    hot: summary.hotWithPending,
    highRisk: summary.highRisk,
    today: summary.today,
  };
  const lists = dashboard?.lists || {
    overdue: [],
    today: [],
    upcoming: [],
    completed: [],
    my: [],
    team: [],
    recommended: [],
  };

  const recommended: LeadFollowUp[] = lists.recommended || [];
  const startOfToday = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const tabCounts: Record<TabKey, number> = {
    today: summary.today ?? 0,
    overdue: summary.overdue ?? 0,
    upcoming: summary.upcoming ?? 0,
    completed: summary.completed ?? lists.completed?.length ?? 0,
    my: lists.my?.length ?? 0,
    team: lists.team?.length ?? 0,
  };

  const activeList = useMemo(() => {
    let items: LeadFollowUp[] = lists[activeTab] || [];

    // Hot / high-risk chips scan pending pool (recommended), not only the active tab slice.
    if (highlight === "hot") {
      items = (recommended.length ? recommended : items).filter(isHot);
    } else if (highlight === "highRisk") {
      items = (recommended.length ? recommended : items).filter((item) =>
        isHighRisk(item, startOfToday)
      );
    }

    if (
      useRecommendedOrder &&
      activeTab !== "completed" &&
      highlight !== "hot" &&
      highlight !== "highRisk"
    ) {
      items = sortByRecommended(items, recommended);
    }

    return items;
  }, [lists, activeTab, highlight, useRecommendedOrder, recommended, startOfToday]);

  const openLead = (leadId?: string) => {
    if (!leadId) return;
    navigate(`${basePath}/leads/${leadId}`);
  };

  const handleHighlightClick = (key: HighlightKey) => {
    if (highlight === key) {
      setHighlight(null);
      return;
    }
    setHighlight(key);
    if (key === "overdue") setActiveTab("overdue");
    if (key === "today") setActiveTab("today");
    if (key === "hot" || key === "highRisk") {
      if (activeTab === "completed") setActiveTab("today");
    }
  };

  const handleMenuAction = (item: LeadFollowUp, action: FollowUpMenuAction) => {
    const leadId = item.lead?.id || item.leadId;
    const phone = item.lead?.phoneNumber;

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
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setRescheduleAt(local);
        setRescheduleOpen(true);
        break;
      }
      case "cancel":
        if (!window.confirm("Cancel this follow-up?")) return;
        updateFollowUp.mutate({
          leadId,
          followUpId: item.id,
          data: { status: "CANCELLED" },
        });
        break;
      case "call":
        if (phone) {
          window.open(`tel:${phone}`, "_self");
        } else {
          openLead(leadId);
        }
        break;
      case "ai-call":
        if (!leadId) return;
        triggerAiCall.mutate(leadId, {
          onError: (err: unknown) => {
            const message =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              "Failed to start AI call";
            alert(message);
          },
        });
        break;
      case "whatsapp": {
        const wa = formatPhoneForWhatsApp(phone);
        if (wa) {
          const name = item.lead?.name || "there";
          window.open(
            `https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${name}, following up from Aadya Institute.`)}`,
            "_blank"
          );
        } else {
          openLead(leadId);
        }
        break;
      }
      case "add-note":
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
    if (!actionFollowUp || !rescheduleAt) return;
    const leadId = actionFollowUp.lead?.id || actionFollowUp.leadId;
    updateFollowUp.mutate(
      {
        leadId,
        followUpId: actionFollowUp.id,
        data: {
          status: "PENDING",
          scheduledAt: new Date(rescheduleAt).toISOString(),
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

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createLeadId || !createScheduledAt) return;
    createFollowUp.mutate(
      {
        id: createLeadId,
        data: {
          type: createType,
          scheduledAt: new Date(createScheduledAt).toISOString(),
          notes: createNotes || undefined,
          priority: createPriority,
        },
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setCreateLeadId("");
          setCreateLeadSearch("");
          setCreateType("CALL");
          setCreatePriority("MEDIUM");
          setCreateScheduledAt("");
          setCreateNotes("");
        },
        onError: (err: unknown) => {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to create follow-up";
          alert(message);
        },
      }
    );
  };

  const highlightChips: {
    key: NonNullable<HighlightKey>;
    label: string;
    count: number;
    icon: React.ReactNode;
    activeClass: string;
  }[] = [
    {
      key: "overdue",
      label: "Overdue",
      count: highlights.overdue ?? 0,
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      activeClass: "bg-red-50 border-red-300 text-red-800 ring-red-400",
    },
    {
      key: "hot",
      label: "Hot",
      count: highlights.hot ?? 0,
      icon: <Flame className="w-3.5 h-3.5" />,
      activeClass: "bg-orange-50 border-orange-300 text-orange-800 ring-orange-400",
    },
    {
      key: "highRisk",
      label: "High-risk",
      count: highlights.highRisk ?? 0,
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      activeClass: "bg-rose-50 border-rose-300 text-rose-800 ring-rose-400",
    },
    {
      key: "today",
      label: "Today",
      count: highlights.today ?? 0,
      icon: <Clock className="w-3.5 h-3.5" />,
      activeClass: "bg-amber-50 border-amber-300 text-amber-800 ring-amber-400",
    },
  ];

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "today", label: "Today's", icon: <Clock className="w-3.5 h-3.5" /> },
    { key: "overdue", label: "Overdue", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { key: "upcoming", label: "Upcoming", icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { key: "completed", label: "Completed", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { key: "my", label: "My", icon: <User className="w-3.5 h-3.5" /> },
    { key: "team", label: "Team", icon: <Users className="w-3.5 h-3.5" /> },
  ];

  const mutating =
    updateFollowUp.isPending || createFollowUp.isPending || triggerAiCall.isPending;

  return (
    <div className="space-y-6">
      <ReadOnlyBanner itemKey="leads.followups" label="Follow-ups" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Follow-ups</h2>
          <p className="text-sm text-text-secondary">
            Daily action center for overdue, today, and upcoming counsellor tasks.
          </p>
        </div>
        <PermissionGate itemKey="leads.followups" mode="write">
          <Button
            type="button"
            className="bg-[#2563EB] text-white gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Create Follow-up
          </Button>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap gap-2">
        {highlightChips.map((chip) => {
          const active = highlight === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => handleHighlightClick(chip.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? `${chip.activeClass} ring-2`
                  : "bg-background border-border text-text-secondary hover:bg-bg-secondary"
              }`}
            >
              {chip.icon}
              {chip.label}
              <span className="tabular-nums font-bold">{chip.count}</span>
            </button>
          );
        })}
      </div>

      {recommended.length > 0 && activeTab !== "completed" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-bg-secondary/40 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>
              Recommended order prioritizes overdue, hot scores, then high priority
              ({recommended.length} ranked).
            </span>
          </div>
          <Button
            type="button"
            variant={useRecommendedOrder ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setUseRecommendedOrder((v) => !v)}
          >
            {useRecommendedOrder ? "Recommended on" : "Chronological"}
          </Button>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as TabKey);
          if (v === "completed") setHighlight(null);
        }}
      >
        <TabsList className="flex h-auto flex-wrap gap-1 w-full justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
              {tab.icon}
              {tab.label}
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                {tabCounts[tab.key]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="mt-4">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Counsellor</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead className="w-12 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                            Loading follow-ups...
                          </TableCell>
                        </TableRow>
                      ) : isError ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-red-600">
                            <AlertCircle className="w-5 h-5 inline mr-2" />
                            Failed to load follow-ups.
                            <Button variant="link" onClick={() => refetch()}>
                              Retry
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : activeList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-text-secondary">
                            No {tab.label.toLowerCase()} follow-ups
                            {highlight ? ` matching ${highlight} filter` : ""}.
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeList.map((item) => {
                          const scheduled = new Date(item.scheduledAt);
                          const leadId = item.lead?.id || item.leadId;
                          const recommendedIndex = recommended.findIndex((r) => r.id === item.id);
                          return (
                            <TableRow
                              key={item.id}
                              className="cursor-pointer hover:bg-bg-secondary/30"
                              onClick={() => openLead(leadId)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1.5">
                                    {item.lead?.name || "—"}
                                    {isHot(item) && (
                                      <Flame className="w-3.5 h-3.5 text-orange-500" aria-label="Hot lead" />
                                    )}
                                    {useRecommendedOrder &&
                                      recommendedIndex >= 0 &&
                                      recommendedIndex < 5 &&
                                      activeTab !== "completed" && (
                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                          #{recommendedIndex + 1}
                                        </Badge>
                                      )}
                                  </span>
                                  <span className="text-xs text-text-secondary">
                                    {item.lead?.phoneNumber || ""}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{item.counsellor?.name || "—"}</TableCell>
                              <TableCell>
                                {scheduled.toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell>
                                {scheduled.toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </TableCell>
                              <TableCell>{item.type}</TableCell>
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
                              <TableCell className="max-w-[160px] truncate text-sm text-text-secondary">
                                {item.notes || "—"}
                              </TableCell>
                              <TableCell className="max-w-[140px] truncate text-sm text-text-secondary">
                                {item.outcome || "—"}
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

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
              className="bg-[#2563EB] text-white"
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
              <Label htmlFor="fu-reschedule">New date & time</Label>
              <Input
                id="fu-reschedule"
                type="datetime-local"
                className="mt-1"
                value={rescheduleAt}
                onChange={(e) => setRescheduleAt(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#2563EB] text-white"
              disabled={!rescheduleAt || updateFollowUp.isPending}
              onClick={submitReschedule}
            >
              {updateFollowUp.isPending ? "Saving..." : "Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create follow-up dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Follow-up</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4 py-1">
            <div>
              <Label htmlFor="fu-lead-search">Lead</Label>
              <Input
                id="fu-lead-search"
                className="mt-1"
                placeholder="Search lead by name or phone"
                value={createLeadSearch}
                onChange={(e) => setCreateLeadSearch(e.target.value)}
              />
              <select
                className="w-full mt-2 h-9 px-3 rounded-md border text-sm bg-background"
                value={createLeadId}
                onChange={(e) => setCreateLeadId(e.target.value)}
                required
              >
                <option value="">Select lead…</option>
                {leadOptions.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} — {lead.phoneNumber}
                  </option>
                ))}
              </select>
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
              <Label htmlFor="fu-create-at">Scheduled date & time</Label>
              <Input
                id="fu-create-at"
                type="datetime-local"
                className="mt-1"
                value={createScheduledAt}
                onChange={(e) => setCreateScheduledAt(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="fu-create-notes">Notes</Label>
              <Input
                id="fu-create-notes"
                className="mt-1"
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2563EB] text-white"
                disabled={!createLeadId || !createScheduledAt || createFollowUp.isPending}
              >
                {createFollowUp.isPending ? "Scheduling..." : "Schedule Follow-up"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
