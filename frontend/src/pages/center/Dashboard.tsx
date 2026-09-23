import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Lock,
  CreditCard,
  Users,
  IndianRupee,
  UserCheck,
  FileText,
  UserPlus,
  GraduationCap,
  Layers,
  BarChart2,
  Info,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/usePermissions";
import { DashboardBaselineView } from "@/components/dashboard/DashboardBaselineView";
import { useBranch, useBranchStats } from "@/hooks/useBranches";
import { useBatches } from "@/hooks/useBatches";
import { useScheduleSummary } from "@/hooks/useScheduleSummary";
import {
  useStudentReport,
  useFinancialReport,
  useAdmissionsReport,
} from "@/hooks/useReports";
import {
  useLeadDashboard,
  useCounsellorPerformance,
  useFollowUpDashboard,
} from "@/hooks/useLeads";
import { usePendingFees } from "@/hooks/useFees";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PageContainer,
  PageHeader,
  PageSection,
  MetricGrid,
  METRIC_GRID_COLUMNS,
} from "@/components/layout";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-purple-100 text-purple-700",
];

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "—";

const formatRelativeAdmissionTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round(
    (startToday.getTime() - startThatDay.getTime()) / (1000 * 60 * 60 * 24)
  );
  const time = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const CenterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { hasAnyModuleAccess, canReadItem, canEditItem } = usePermissions();
  const branchId = user?.branchId ?? undefined;

  const { data: branchResponse } = useBranch(branchId);
  const { data: branchStatsResponse, isLoading: isBranchStatsLoading } = useBranchStats(branchId);
  const { data: scheduleSummary, isLoading: isScheduleLoading } = useScheduleSummary(branchId);
  const { data: studentReport, isLoading: isStudentReportLoading } = useStudentReport(branchId);
  const { data: financialReport, isLoading: isFinancialLoading } = useFinancialReport(branchId);
  const { data: leadDashboard, isLoading: isLeadLoading } = useLeadDashboard(branchId);
  const { data: counsellorPerfRes, isLoading: isCounsellorLoading } =
    useCounsellorPerformance(branchId);
  const { data: followUpDashRes, isLoading: isFollowUpLoading } = useFollowUpDashboard({
    branchId,
    limit: 1,
  });
  const { data: admissionsReport, isLoading: isAdmissionsReportLoading } = useAdmissionsReport({
    branchId,
  });
  const { data: pendingFeesRes, isLoading: isPendingFeesLoading } = usePendingFees({
    limit: 1,
    status: "PENDING",
  });
  const { batches, loading: batchesLoading } = useBatches({ status: "ACTIVE" });

  const branchName = branchResponse?.data?.name || "Your Branch";
  const branchStats = branchStatsResponse?.data;
  const leadSummary = leadDashboard?.data ?? leadDashboard;
  const followUpSummary =
    followUpDashRes?.data?.summary ?? followUpDashRes?.summary ?? null;

  const branchBatches = useMemo(
    () => batches.filter((b) => b.branchId === branchId || b.branch?.id === branchId),
    [batches, branchId]
  );
  const activeBatchCount = branchStats?.totalBatches ?? branchBatches.length;
  const activeStudents =
    branchStats?.totalStudents ?? studentReport?.summary?.totalStudents ?? 0;
  const totalLeads = leadSummary?.totalLeads ?? 0;
  const todayClasses = scheduleSummary?.todayClasses ?? 0;
  const totalCollected = financialReport?.summary?.totalCollected ?? 0;
  const totalPending = financialReport?.summary?.totalPending ?? 0;

  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const isKpiLoading =
    isBranchStatsLoading ||
    isScheduleLoading ||
    isStudentReportLoading ||
    isFinancialLoading ||
    isLeadLoading ||
    batchesLoading;

  const kpiValue = (value: string | number) => (isKpiLoading ? "—" : value);

  const admissionsChartData = useMemo(() => {
    const trend = admissionsReport?.monthlyTrend ?? [];
    return trend.slice(-6).map((row) => ({
      month: row.month,
      admissions: row.admissions,
    }));
  }, [admissionsReport?.monthlyTrend]);

  const feeDonutData = useMemo(() => {
    const collected = totalCollected;
    const outstanding = financialReport?.outstandingStudents ?? [];
    const overdue = outstanding
      .filter((s) => (s.overdueDays ?? 0) > 0)
      .reduce((sum, s) => sum + (s.pending ?? 0), 0);
    const pendingOnly = Math.max(0, totalPending - overdue);
    const total = collected + pendingOnly + overdue;
    if (total === 0) {
      return [
        { name: "Collected", value: 0, percentage: 0, color: "#10B981" },
        { name: "Pending", value: 0, percentage: 0, color: "#2563EB" },
        { name: "Overdue", value: 0, percentage: 0, color: "#F59E0B" },
      ];
    }
    return [
      {
        name: "Collected",
        value: collected,
        percentage: Math.round((collected / total) * 100),
        color: "#10B981",
      },
      {
        name: "Pending",
        value: pendingOnly,
        percentage: Math.round((pendingOnly / total) * 100),
        color: "#2563EB",
      },
      {
        name: "Overdue",
        value: overdue,
        percentage: Math.round((overdue / total) * 100),
        color: "#F59E0B",
      },
    ];
  }, [totalCollected, totalPending, financialReport?.outstandingStudents]);

  const counsellorRows = useMemo(() => {
    const raw = Array.isArray(counsellorPerfRes?.data?.counsellors)
      ? counsellorPerfRes.data.counsellors
      : Array.isArray(counsellorPerfRes?.data)
        ? counsellorPerfRes.data
        : [];
    return raw.slice(0, 5).map(
      (
        c: {
          counsellorId?: string;
          id?: string;
          name?: string;
          totalLeads?: number;
          converted?: number;
          conversionRate?: string | number;
        },
        idx: number
      ) => {
        const name = c.name || "Counsellor";
        const leads = c.totalLeads ?? 0;
        const admissions = c.converted ?? 0;
        const rate =
          typeof c.conversionRate === "number"
            ? `${c.conversionRate.toFixed(1)}%`
            : c.conversionRate ||
              (leads > 0 ? `${((admissions / leads) * 100).toFixed(1)}%` : "0%");
        return {
          id: c.counsellorId || c.id || `c-${idx}`,
          name,
          initials: getInitials(name),
          avatarBg: AVATAR_COLORS[idx % AVATAR_COLORS.length],
          leads,
          admissions,
          conversion: rate,
        };
      }
    );
  }, [counsellorPerfRes]);

  const recentAdmissions = useMemo(() => {
    const rows = admissionsReport?.recentAdmissions ?? [];
    return rows.slice(0, 5).map((adm, idx) => ({
      id: adm.id,
      studentName: adm.studentName || "Student",
      initials: getInitials(adm.studentName || "ST"),
      avatarBg: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      course: adm.courseName || adm.courses?.[0]?.name || "—",
      time: formatRelativeAdmissionTime(adm.admissionDate || adm.createdAt),
      status: adm.status || "ACTIVE",
    }));
  }, [admissionsReport?.recentAdmissions]);

  const pendingFeeCount = pendingFeesRes?.meta?.total ?? 0;

  const followUpCount = (() => {
    const fromDashboard =
      (followUpSummary?.overdue ?? 0) +
      (followUpSummary?.today ?? 0) +
      (followUpSummary?.upcoming ?? 0);
    if (fromDashboard > 0) return fromDashboard;
    return leadSummary?.overdueFollowUps || leadSummary?.followUp || 0;
  })();

  const documentsToVerify =
    admissionsReport?.needsAttention?.missingDocuments?.length ?? 0;
  const admissionsInProgress =
    admissionsReport?.needsAttention?.provisional?.length ??
    admissionsReport?.summary?.provisionalAdmissions ??
    0;

  const pendingTasks = useMemo(
    () =>
      [
        {
          id: "task-1",
          label: "Follow up for leads",
          count: followUpCount,
          icon: Users,
          iconColor: "text-rose-600",
          iconBg: "bg-rose-50",
          url: "/center/leads/follow-ups",
          itemKey: "leads.followups",
        },
        {
          id: "task-2",
          label: "Pending fee reminders",
          count: pendingFeeCount,
          icon: CreditCard,
          iconColor: "text-amber-600",
          iconBg: "bg-amber-50",
          url: "/center/fees/students?tab=pending",
          itemKey: "fees.students",
        },
        {
          id: "task-3",
          label: "Documents to verify",
          count: documentsToVerify,
          icon: FileText,
          iconColor: "text-purple-600",
          iconBg: "bg-purple-50",
          url: "/center/admissions/applications",
          itemKey: "admissions.applications",
        },
        {
          id: "task-4",
          label: "Admissions in progress",
          count: admissionsInProgress,
          icon: UserCheck,
          iconColor: "text-emerald-600",
          iconBg: "bg-emerald-50",
          url: "/center/admissions",
          itemKey: "admissions.all",
        },
      ] as const,
    [followUpCount, pendingFeeCount, documentsToVerify, admissionsInProgress]
  );

  const isWidgetLoading =
    isCounsellorLoading ||
    isFollowUpLoading ||
    isAdmissionsReportLoading ||
    isPendingFeesLoading ||
    isFinancialLoading;

  return (
    <PageContainer density="compact" className="animate-in fade-in duration-300">
      <PageHeader
        title="Dashboard Overview"
        description={`${branchName} — key insights and performance for your branch.`}
      />

      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Your Branch
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <h2 className="text-sm font-semibold text-foreground">{branchName}</h2>
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold rounded-md">
                Active Branch
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 border border-border text-xs md:max-w-md">
          <Lock className="h-4 w-4 text-primary shrink-0" />
          <span className="text-[11px] text-muted-foreground">
            Viewing data for your assigned branch only.
          </span>
        </div>
      </div>

      {!hasAnyModuleAccess ? (
        <DashboardBaselineView role="CENTER_MANAGER" userName={user?.name} />
      ) : (
        <>
      <MetricGrid columns={METRIC_GRID_COLUMNS[4]} density="compact">
        {canReadItem("students.all") && (
        <Card size="compact" className="border border-border bg-card rounded-xl shadow-xs">
          <CardContent size="compact">
            <p className="text-xs font-medium text-muted-foreground">Active Students</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{kpiValue(activeStudents.toLocaleString("en-IN"))}</p>
          </CardContent>
        </Card>
        )}
        {canReadItem("schedule.classes") && (
        <Card size="compact" className="border border-border bg-card rounded-xl shadow-xs">
          <CardContent size="compact">
            <p className="text-xs font-medium text-muted-foreground">Today's Classes</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{kpiValue(todayClasses)}</p>
          </CardContent>
        </Card>
        )}
        {canReadItem("fees.reports") && (
        <Card size="compact" className="border border-border bg-card rounded-xl shadow-xs">
          <CardContent size="compact">
            <p className="text-xs font-medium text-muted-foreground">This Month Revenue</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{kpiValue(formatCurrency(totalCollected))}</p>
          </CardContent>
        </Card>
        )}
        {canReadItem("fees.students") && (
        <Card size="compact" className="border border-border bg-card rounded-xl shadow-xs">
          <CardContent size="compact">
            <p className="text-xs font-medium text-muted-foreground">Pending Fees</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{kpiValue(formatCurrency(totalPending))}</p>
          </CardContent>
        </Card>
        )}
        {!canReadItem("students.all") && canReadItem("leads.all") && (
        <Card size="compact" className="border border-border bg-card rounded-xl shadow-xs">
          <CardContent size="compact">
            <p className="text-xs font-medium text-muted-foreground">Total Leads</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{kpiValue(totalLeads.toLocaleString("en-IN"))}</p>
          </CardContent>
        </Card>
        )}
        {!canReadItem("schedule.classes") && canReadItem("batches.all") && (
        <Card size="compact" className="border border-border bg-card rounded-xl shadow-xs">
          <CardContent size="compact">
            <p className="text-xs font-medium text-muted-foreground">Active Batches</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{kpiValue(activeBatchCount)}</p>
          </CardContent>
        </Card>
        )}
      </MetricGrid>

      <PageSection title="Branch Analytics" density="compact">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {canReadItem("admissions.all") && (
        <div className="lg:col-span-6 xl:col-span-5 bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Admissions Trend
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Last 6 months for {branchName}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-[#1D4ED8]">
                  <span className="h-2 w-2 rounded-full bg-[#1D4ED8]" /> Admissions
                </span>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-64 w-full mt-4">
              {isAdmissionsReportLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Loading admissions…
                </div>
              ) : admissionsChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No admissions trend data yet.
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={admissionsChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "none",
                      borderRadius: "12px",
                      color: "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                    itemStyle={{ color: "#FFFFFF" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="admissions"
                    name="Admissions"
                    stroke="#1D4ED8"
                    strokeWidth={2.5}
                    dot={{ fill: "#1D4ED8", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
        )}

        {canReadItem("fees.reports") && (
        <div className="lg:col-span-6 xl:col-span-3.5 bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Fee Collection Summary
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Total collection for {branchName}
              </p>
            </div>

            {/* Donut Chart with Center Total */}
            <div className="relative h-44 w-full mt-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feeDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {feeDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => `₹${Number(val).toLocaleString("en-IN")}`}
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "none",
                      borderRadius: "12px",
                      color: "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Absolute Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-black text-slate-900">
                  {isKpiLoading ? "—" : formatCurrency(totalCollected + totalPending)}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">
                  Total Collection
                </span>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div className="space-y-2 mt-2">
              {feeDonutData.map((slice) => (
                <div key={slice.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                    <span className="font-bold text-slate-700">{slice.name}</span>
                  </div>
                  <span className="font-black text-slate-900">
                    {isKpiLoading ? "—" : `${formatCurrency(slice.value)} (${slice.percentage}%)`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/center/fees/reports")}
            className="w-full mt-4 h-9 text-xs font-bold text-[#1D4ED8] bg-blue-50/60 border-blue-200 hover:bg-blue-100/70 rounded-xl cursor-pointer"
          >
            View Fee Details
          </Button>
        </div>
        )}

        {canReadItem("counsellor.performance") && (
        <div className="lg:col-span-12 xl:col-span-3.5 bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Counsellor Performance
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {branchName} team
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Live
              </span>
            </div>

            {/* Counsellor List */}
            <div className="divide-y divide-slate-100 mt-2">
              {isCounsellorLoading ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
              ) : counsellorRows.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No counsellor performance data yet.
                </p>
              ) : (
                counsellorRows.map((c, idx) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold text-slate-400 w-3">{idx + 1}</span>
                    <div
                      className={`h-8 w-8 rounded-xl ${c.avatarBg} font-black text-xs flex items-center justify-center shrink-0`}
                    >
                      {c.initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 truncate">{c.name}</h4>
                      <p className="text-[10px] text-slate-500 truncate font-medium">
                        {c.leads} Leads → {c.admissions} Admissions
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-emerald-600 block">
                      {c.conversion}
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold">
                      Conversion
                    </span>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/center/counselor/all")}
            className="w-full mt-4 h-9 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 rounded-xl cursor-pointer"
          >
            View All Counsellors
          </Button>
        </div>
        )}
      </div>
      </PageSection>

      <PageSection title="Quick Actions & Activity" density="compact">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ─── QUICK ACTIONS (3.5 cols) ─── */}
        <div className="lg:col-span-12 xl:col-span-4 bg-card border border-border rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-foreground tracking-tight pb-3 border-b border-border">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {canEditItem("leads.all") && (
            <button
              onClick={() => navigate("/center/leads/add")}
              className="p-3.5 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-blue-100 group-hover:bg-blue-200 text-[#1D4ED8] flex items-center justify-center transition-colors">
                <UserPlus className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Add Lead</span>
            </button>
            )}

            {canEditItem("admissions.all") && (
            <button
              onClick={() => navigate("/center/admissions/all")}
              className="p-3.5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">New Admission</span>
            </button>
            )}

            {canEditItem("students.all") && (
            <button
              onClick={() => navigate("/center/students/add")}
              className="p-3.5 rounded-2xl bg-purple-50/70 hover:bg-purple-100/70 border border-purple-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-purple-100 group-hover:bg-purple-200 text-purple-700 flex items-center justify-center transition-colors">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Add Student</span>
            </button>
            )}

            {canEditItem("batches.all") && (
            <button
              onClick={() => navigate("/center/batches")}
              className="p-3.5 rounded-2xl bg-amber-50/70 hover:bg-amber-100/70 border border-amber-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-amber-100 group-hover:bg-amber-200 text-amber-700 flex items-center justify-center transition-colors">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Create Batch</span>
            </button>
            )}

            {canEditItem("fees.receipts") && (
            <button
              onClick={() => navigate("/center/fees/payments")}
              className="p-3.5 rounded-2xl bg-teal-50/70 hover:bg-teal-100/70 border border-teal-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-teal-100 group-hover:bg-teal-200 text-teal-700 flex items-center justify-center transition-colors">
                <IndianRupee className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Collect Fees</span>
            </button>
            )}

            {canReadItem("reports.students") && (
            <button
              onClick={() => navigate("/center/reports/students")}
              className="p-3.5 rounded-2xl bg-rose-50/70 hover:bg-rose-100/70 border border-rose-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-rose-100 group-hover:bg-rose-200 text-rose-700 flex items-center justify-center transition-colors">
                <BarChart2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">View Reports</span>
            </button>
            )}
          </div>
        </div>

        {canReadItem("admissions.all") && (
        <div className="lg:col-span-6 xl:col-span-4.5 bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Recent Admissions
              </h3>
              <button
                onClick={() => navigate("/center/admissions")}
                className="text-[11px] font-bold text-[#1D4ED8] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {isAdmissionsReportLoading ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
              ) : recentAdmissions.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No recent admissions.
                </p>
              ) : (
                recentAdmissions.map((adm) => (
                <div key={adm.id} className="py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl ${adm.avatarBg} font-black text-xs flex items-center justify-center shrink-0`}
                    >
                      {adm.initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 truncate">
                        {adm.studentName}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate font-medium">
                        {adm.course}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      {adm.time}
                    </span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase">
                      {adm.status}
                    </span>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        </div>
        )}

        {pendingTasks.some((task) => canReadItem(task.itemKey)) && (
        <div className="lg:col-span-6 xl:col-span-3.5 bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Pending Tasks
              </h3>
              <button
                onClick={() => navigate("/center/leads/follow-ups")}
                className="text-[11px] font-bold text-[#1D4ED8] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {pendingTasks.filter((task) => canReadItem(task.itemKey)).map((task) => {
                const Icon = task.icon;
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(task.url)}
                    className="p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 flex items-center justify-between transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-8 w-8 rounded-xl ${task.iconBg} ${task.iconColor} flex items-center justify-center shrink-0`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        {task.label}
                      </span>
                    </div>

                    <span className="h-6 px-2 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center">
                      {isWidgetLoading ? "—" : task.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </div>
      </PageSection>
        </>
      )}

      {/* ─── 6. FOOTER RESTRICTION NOTICE ─────────────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-2.5 text-xs text-muted-foreground">
        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Info className="h-3.5 w-3.5" />
        </div>
        <span>
          You are logged in as <strong className="text-foreground font-semibold">Center Manager</strong>. All data shown is for <strong className="text-primary font-semibold">{branchName}</strong> only.
        </span>
      </div>
    </PageContainer>
  );
};
