import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Lock,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Users,
  IndianRupee,
  Calendar,
  UserCheck,
  ArrowRight,
  FileText,
  UserPlus,
  GraduationCap,
  BookOpen,
  Layers,
  BarChart2,
  CheckCircle2,
  Clock,
  ChevronDown,
  Info,
  Sparkles,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useBranch, useBranchStats } from "@/hooks/useBranches";
import { useBatches } from "@/hooks/useBatches";
import { useScheduleSummary } from "@/hooks/useScheduleSummary";
import { useStudentReport, useFinancialReport } from "@/hooks/useReports";
import { useLeadDashboard } from "@/hooks/useLeads";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// ─────────────────────────────────────────────────────────────────────────────
// ADMISSIONS TREND CHART DATA (Malleshwaram Branch Only)
// ─────────────────────────────────────────────────────────────────────────────
const ADMISSIONS_CHART_DATA = [
  { day: "01 May", thisMonth: 8, lastMonth: 5 },
  { day: "05 May", thisMonth: 14, lastMonth: 7 },
  { day: "10 May", thisMonth: 19, lastMonth: 12 },
  { day: "15 May", thisMonth: 15, lastMonth: 10 },
  { day: "20 May", thisMonth: 23, lastMonth: 14 },
  { day: "25 May", thisMonth: 27, lastMonth: 18 },
  { day: "31 May", thisMonth: 32, lastMonth: 22 },
];

// ─────────────────────────────────────────────────────────────────────────────
// FEE DONUT SLICES (Malleshwaram Branch Only)
// ─────────────────────────────────────────────────────────────────────────────
const FEE_DONUT_DATA = [
  { name: "Collected", value: 1725000, percentage: 68, color: "#10B981" },
  { name: "Pending", value: 642000, percentage: 17, color: "#2563EB" },
  { name: "Overdue", value: 531000, percentage: 15, color: "#F59E0B" },
];

// ─────────────────────────────────────────────────────────────────────────────
// COUNSELLORS AT MALLESHWARAM BRANCH
// ─────────────────────────────────────────────────────────────────────────────
const BRANCH_COUNSELLORS = [
  {
    id: "c-1",
    name: "Priya Sharma",
    initials: "PS",
    avatarBg: "bg-blue-100 text-blue-700",
    leads: 58,
    admissions: 12,
    conversion: "20.7%",
  },
  {
    id: "c-2",
    name: "Rahul Kumar",
    initials: "RK",
    avatarBg: "bg-emerald-100 text-emerald-700",
    leads: 46,
    admissions: 9,
    conversion: "19.6%",
  },
  {
    id: "c-3",
    name: "Anjali Singh",
    initials: "AS",
    avatarBg: "bg-amber-100 text-amber-700",
    leads: 38,
    admissions: 6,
    conversion: "15.8%",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RECENT ADMISSIONS (Malleshwaram Branch Only)
// ─────────────────────────────────────────────────────────────────────────────
const RECENT_ADMISSIONS = [
  {
    id: "adm-1",
    studentName: "Rohit Sharma",
    initials: "RS",
    avatarBg: "bg-blue-100 text-blue-700",
    course: "Java Full Stack Development",
    time: "Today, 10:30 AM",
    status: "Completed",
  },
  {
    id: "adm-2",
    studentName: "Megha R",
    initials: "MR",
    avatarBg: "bg-rose-100 text-rose-700",
    course: "Digital Marketing",
    time: "Today, 09:45 AM",
    status: "Completed",
  },
  {
    id: "adm-3",
    studentName: "Karthik M",
    initials: "KM",
    avatarBg: "bg-emerald-100 text-emerald-700",
    course: "Python Programming",
    time: "Yesterday, 04:20 PM",
    status: "Completed",
  },
  {
    id: "adm-4",
    studentName: "Sneha P",
    initials: "SP",
    avatarBg: "bg-purple-100 text-purple-700",
    course: "UI/UX Design",
    time: "Yesterday, 02:15 PM",
    status: "Completed",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PENDING TASKS (Malleshwaram Branch Only)
// ─────────────────────────────────────────────────────────────────────────────
const PENDING_TASKS = [
  {
    id: "task-1",
    label: "Follow up for leads",
    count: 23,
    icon: Users,
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50",
    url: "/center/leads/follow-ups",
  },
  {
    id: "task-2",
    label: "Pending fee reminders",
    count: 17,
    icon: CreditCard,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    url: "/center/fees/pending",
  },
  {
    id: "task-3",
    label: "Documents to verify",
    count: 12,
    icon: FileText,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    url: "/center/admissions/applications",
  },
  {
    id: "task-4",
    label: "Admissions in progress",
    count: 6,
    icon: UserCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    url: "/center/admissions",
  },
];

export const CenterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const branchId = user?.branchId;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState("This Month");
  const [periodFilter, setPeriodFilter] = useState("Daily");

  const { data: branchResponse } = useBranch(branchId);
  const { data: branchStatsResponse, isLoading: isBranchStatsLoading } = useBranchStats(branchId);
  const { data: scheduleSummary, isLoading: isScheduleLoading } = useScheduleSummary(branchId);
  const { data: studentReport, isLoading: isStudentReportLoading } = useStudentReport(branchId);
  const { data: financialReport, isLoading: isFinancialLoading } = useFinancialReport(branchId);
  const { data: leadDashboard, isLoading: isLeadLoading } = useLeadDashboard(branchId);
  const { batches, loading: batchesLoading } = useBatches({ status: "ACTIVE" });

  const branchName = branchResponse?.data?.name || "Your Branch";
  const branchStats = branchStatsResponse?.data;
  const leadSummary = leadDashboard?.data ?? leadDashboard;

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
  const collectionRate = financialReport?.summary?.collectionRate ?? 0;
  const enrollmentTrend = studentReport?.enrollmentTrend ?? [];

  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const trendSub = (key: "students" | "collected" | "pending") => {
    if (enrollmentTrend.length < 2 && key === "students") return "Live from database";
    const trend = key === "students" ? enrollmentTrend : financialReport?.monthlyTrend;
    if (!trend || trend.length < 2) return "Live from database";
    const current = (trend[trend.length - 1] as Record<string, number>)?.[key] ?? 0;
    const previous = (trend[trend.length - 2] as Record<string, number>)?.[key] ?? 0;
    if (previous === 0) return current > 0 ? "New this month" : "Live from database";
    const pct = Math.round(((current - previous) / previous) * 100);
    return pct >= 0 ? `+${pct}% vs last month` : `${pct}% vs last month`;
  };

  const isKpiLoading =
    isBranchStatsLoading || isScheduleLoading || isStudentReportLoading || isFinancialLoading || isLeadLoading || batchesLoading;

  const kpiValue = (value: string | number) => (isKpiLoading ? "—" : value);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["branches"] }),
      queryClient.invalidateQueries({ queryKey: ["schedule-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
    ]);
    setIsRefreshing(false);
  };

  const feeDonutData = useMemo(() => {
    const collected = totalCollected;
    const pending = totalPending;
    const total = collected + pending;
    if (total === 0) {
      return [
        { name: "Collected", value: 0, percentage: 0, color: "#10B981" },
        { name: "Pending", value: 0, percentage: 0, color: "#2563EB" },
        { name: "Overdue", value: 0, percentage: 0, color: "#F59E0B" },
      ];
    }
    const overdue = Math.round(pending * 0.45);
    const pendingOnly = pending - overdue;
    return [
      { name: "Collected", value: collected, percentage: Math.round((collected / total) * 100), color: "#10B981" },
      { name: "Pending", value: pendingOnly, percentage: Math.round((pendingOnly / total) * 100), color: "#2563EB" },
      { name: "Overdue", value: overdue, percentage: Math.round((overdue / total) * 100), color: "#F59E0B" },
    ];
  }, [totalCollected, totalPending]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto animate-in fade-in duration-300">
      {/* ─── 1. BRANCH LOCK CONTEXT BANNER & CONTROLS ─────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Branch Lock Card */}
        <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0 shadow-2xs">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Your Branch
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {branchName}
                </h2>
                <Badge className="bg-blue-50 text-[#1D4ED8] border border-blue-200 text-[10px] font-bold rounded-md">
                  Active Branch
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs md:max-w-md">
            <div className="h-8 w-8 rounded-xl bg-blue-100 text-[#1D4ED8] flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 block text-[11px]">
                You are viewing data for your assigned branch only.
              </span>
              <span className="text-[10px] text-slate-500 block">
                All records, reports, students, faculty, admissions, fees, and operations are restricted to this branch.
              </span>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-end xl:self-center">
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-xs font-bold text-slate-800"
            >
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Quarter">This Quarter</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="h-10 w-10 bg-white border-slate-200/80 rounded-2xl hover:bg-slate-50 shadow-2xs cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 ${isRefreshing ? "animate-spin text-[#1D4ED8]" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ─── 2. DASHBOARD OVERVIEW HEADER ─────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Key insights and performance metrics for your branch.
        </p>
      </div>

      {/* ─── 3. SIX BRANCH-SPECIFIC SUMMARY KPI CARDS ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Leads */}
        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Total Leads</span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{kpiValue(totalLeads.toLocaleString("en-IN"))}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center text-[11px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{isKpiLoading ? "Loading..." : `${leadSummary?.interested ?? 0} interested`}</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Today's Classes */}
        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Today's Classes</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{kpiValue(todayClasses)}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center text-[11px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{isKpiLoading ? "Loading..." : `${scheduleSummary?.liveClasses ?? 0} live now`}</span>
            </div>
          </CardContent>
        </Card>

        {/* 3. Active Students */}
        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Active Students</span>
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{kpiValue(activeStudents.toLocaleString("en-IN"))}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center text-[11px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{isKpiLoading ? "Loading..." : trendSub("students")}</span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Active Batches */}
        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Active Batches</span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{kpiValue(activeBatchCount)}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center text-[11px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{isKpiLoading ? "Loading..." : `${scheduleSummary?.upcomingClasses ?? 0} upcoming classes`}</span>
            </div>
          </CardContent>
        </Card>

        {/* 5. This Month Revenue */}
        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">This Month Revenue</span>
              <div className="h-8 w-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{kpiValue(formatCurrency(totalCollected))}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center text-[11px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{isKpiLoading ? "Loading..." : `${collectionRate}% collected`}</span>
            </div>
          </CardContent>
        </Card>

        {/* 6. Pending Fees */}
        <Card className="border border-slate-200/80 bg-white rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Pending Fees</span>
              <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{kpiValue(formatCurrency(totalPending))}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center text-[11px] font-bold text-rose-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{isKpiLoading ? "Loading..." : trendSub("pending")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 4. DASHBOARD ANALYTICS (3 Columns) ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ─── COLUMN 1: ADMISSIONS TREND (5.5 cols) ─── */}
        <div className="lg:col-span-6 xl:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Admissions Trend
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Comparison against previous month
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-[#1D4ED8]">
                    <span className="h-2 w-2 rounded-full bg-[#1D4ED8]" /> This Month
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-slate-300" /> Last Month
                  </span>
                </div>

                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={ADMISSIONS_CHART_DATA}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
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
                    dataKey="thisMonth"
                    name="This Month"
                    stroke="#1D4ED8"
                    strokeWidth={2.5}
                    dot={{ fill: "#1D4ED8", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lastMonth"
                    name="Last Month"
                    stroke="#94A3B8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ fill: "#94A3B8", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ─── COLUMN 2: FEE COLLECTION SUMMARY (3.5 cols) ─── */}
        <div className="lg:col-span-6 xl:col-span-3.5 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Fee Collection Summary
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Total collection for Malleshwaram
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
            onClick={() => navigate("/center/fees")}
            className="w-full mt-4 h-9 text-xs font-bold text-[#1D4ED8] bg-blue-50/60 border-blue-200 hover:bg-blue-100/70 rounded-xl cursor-pointer"
          >
            View Fee Details
          </Button>
        </div>

        {/* ─── COLUMN 3: COUNSELLOR PERFORMANCE (3.5 cols) ─── */}
        <div className="lg:col-span-12 xl:col-span-3.5 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Counsellor Performance
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Malleshwaram team only
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                This Month
              </span>
            </div>

            {/* Counsellor List */}
            <div className="divide-y divide-slate-100 mt-2">
              {BRANCH_COUNSELLORS.map((c, idx) => (
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
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/center/counsellors")}
            className="w-full mt-4 h-9 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 rounded-xl cursor-pointer"
          >
            View All Counsellors
          </Button>
        </div>
      </div>

      {/* ─── 5. QUICK ACTIONS, RECENT ADMISSIONS & PENDING TASKS ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ─── QUICK ACTIONS (3.5 cols) ─── */}
        <div className="lg:col-span-12 xl:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
          <h3 className="text-sm font-black text-slate-900 tracking-tight pb-3 border-b border-slate-100">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* Add Lead */}
            <button
              onClick={() => navigate("/center/leads")}
              className="p-3.5 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-blue-100 group-hover:bg-blue-200 text-[#1D4ED8] flex items-center justify-center transition-colors">
                <UserPlus className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Add Lead</span>
            </button>

            {/* New Admission */}
            <button
              onClick={() => navigate("/center/admissions/new")}
              className="p-3.5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">New Admission</span>
            </button>

            {/* Add Student */}
            <button
              onClick={() => navigate("/center/students/add")}
              className="p-3.5 rounded-2xl bg-purple-50/70 hover:bg-purple-100/70 border border-purple-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-purple-100 group-hover:bg-purple-200 text-purple-700 flex items-center justify-center transition-colors">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Add Student</span>
            </button>

            {/* Create Batch */}
            <button
              onClick={() => navigate("/center/batches")}
              className="p-3.5 rounded-2xl bg-amber-50/70 hover:bg-amber-100/70 border border-amber-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-amber-100 group-hover:bg-amber-200 text-amber-700 flex items-center justify-center transition-colors">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Create Batch</span>
            </button>

            {/* Collect Fees */}
            <button
              onClick={() => navigate("/center/fees")}
              className="p-3.5 rounded-2xl bg-teal-50/70 hover:bg-teal-100/70 border border-teal-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-teal-100 group-hover:bg-teal-200 text-teal-700 flex items-center justify-center transition-colors">
                <IndianRupee className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Collect Fees</span>
            </button>

            {/* View Reports */}
            <button
              onClick={() => navigate("/center/reports")}
              className="p-3.5 rounded-2xl bg-rose-50/70 hover:bg-rose-100/70 border border-rose-100 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
            >
              <div className="h-9 w-9 rounded-xl bg-rose-100 group-hover:bg-rose-200 text-rose-700 flex items-center justify-center transition-colors">
                <BarChart2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">View Reports</span>
            </button>
          </div>
        </div>

        {/* ─── RECENT ADMISSIONS (4.5 cols) ─── */}
        <div className="lg:col-span-6 xl:col-span-4.5 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
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
              {RECENT_ADMISSIONS.map((adm) => (
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
                      ✓ {adm.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── PENDING TASKS (3.5 cols) ─── */}
        <div className="lg:col-span-6 xl:col-span-3.5 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
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
              {PENDING_TASKS.map((task) => {
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
                      {task.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. FOOTER RESTRICTION NOTICE ─────────────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/60 flex items-center gap-2.5 text-xs text-slate-600">
        <div className="h-5 w-5 rounded-full bg-blue-100 text-[#1D4ED8] flex items-center justify-center shrink-0">
          <Info className="h-3.5 w-3.5" />
        </div>
        <span>
          You are logged in as <strong className="text-slate-900 font-bold">Center Manager</strong>. All data shown is for <strong className="text-[#1D4ED8] font-bold">{branchName}</strong> only.
        </span>
      </div>
    </div>
  );
};
