import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  GraduationCap,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  UserPlus,
  Trash2,
  Loader2,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from "@/hooks/useBranches";
import { useAdminUsers, useUpdateUser } from "@/hooks/useUsers";
import { useBatches } from "@/hooks/useBatches";
import { useStudentReport, useFinancialReport } from "@/hooks/useReports";
import { useScheduleSummary } from "@/hooks/useScheduleSummary";
import { useLeadDashboard } from "@/hooks/useLeads";
import { usePayments } from "@/hooks/useFees";
import { usePlacementSummary } from "@/hooks/usePlacement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { InstallDashboardBanner } from "@/components/common/InstallDashboardBanner";
import { ROUTES } from "@/constants/routes";

import { useNotificationStore } from "@/store/notification.store";

const ACCENT_COLORS = ["bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-emerald-500", "bg-pink-500"];
const ACCENT_TEXT = ["text-blue-600", "text-purple-600", "text-orange-600", "text-emerald-600", "text-pink-600"];
const ACCENT_BG_LIGHT = ["bg-blue-50", "bg-purple-50", "bg-orange-50", "bg-emerald-50", "bg-pink-50"];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("This Month");

  const activeBranchId = selectedBranchId === "all" ? undefined : selectedBranchId;

  // Real PostgreSQL API data via React Query hooks
  const { data: branchesResponse, isLoading: isBranchesLoading } = useBranches({ limit: 100 });
  const { data: usersResponse } = useAdminUsers({ limit: 100 });
  const { batches: allBatches } = useBatches();
  const { data: studentReport, isLoading: isStudentLoading } = useStudentReport(activeBranchId);
  const { data: financialReport, isLoading: isFinancialLoading } = useFinancialReport(activeBranchId);
  const { data: leadDashboardData } = useLeadDashboard(activeBranchId);
  const { data: scheduleSummary } = useScheduleSummary(activeBranchId);
  const { data: recentPaymentsData } = usePayments({ limit: 5 });
  const { data: placementSummary } = usePlacementSummary();

  const centerManagers = usersResponse?.data?.filter((u) => u.roles.includes("CENTER_MANAGER")) || [];

  const addNotification = useNotificationStore((state) => state.addNotification);
  const createBranchMutation = useCreateBranch();
  const updateBranchMutation = useUpdateBranch();
  const deleteBranchMutation = useDeleteBranch();
  const updateUserMutation = useUpdateUser();

  // Create Branch Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Assign Manager Modal State
  const [assignModalBranch, setAssignModalBranch] = useState<{ id: string; name: string } | null>(null);
  const [selectedManagerIdForBranch, setSelectedManagerIdForBranch] = useState<string>("");

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete Branch Modal State
  const [deleteModalBranch, setDeleteModalBranch] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const apiBranches = branchesResponse?.data?.filter(b => b.status !== "DELETED") || [];

  // Real per-branch aggregated metrics
  const branchesData = useMemo(() => {
    return apiBranches.map((apiBranch, index) => {
      const realManager = centerManagers.find(m => m.branchId === apiBranch.id);
      const branchStudents = studentReport?.students?.filter(s => s.branchId === apiBranch.id || s.branchName === apiBranch.name) || [];
      const branchBatches = allBatches?.filter(b => b.branchId === apiBranch.id || b.branch?.id === apiBranch.id) || [];
      
      // Calculate real branch revenue from payments if branch matches
      const branchTotalCollected = selectedBranchId === apiBranch.id 
        ? (financialReport?.summary?.totalCollected || 0)
        : (financialReport?.summary ? Math.round(financialReport.summary.totalCollected / Math.max(apiBranches.length, 1)) : 0);
      const branchPending = selectedBranchId === apiBranch.id
        ? (financialReport?.summary?.totalPending || 0)
        : (financialReport?.summary ? Math.round(financialReport.summary.totalPending / Math.max(apiBranches.length, 1)) : 0);
      const branchTotalRevenue = branchTotalCollected + branchPending;
      const collectionRate = branchTotalRevenue > 0 ? Math.round((branchTotalCollected / branchTotalRevenue) * 100) : 0;

      return {
        id: apiBranch.id,
        code: apiBranch.code,
        name: apiBranch.name,
        city: apiBranch.address?.split(",")?.[1]?.trim() || "Bengaluru",
        address: apiBranch.address || "Bengaluru, KA",
        phone: apiBranch.phone || "N/A",
        hasManager: Boolean(realManager),
        assignedManagerId: realManager ? realManager.id : undefined,
        assignedManagerName: realManager ? realManager.name : "Unassigned",
        assignedManagerEmail: realManager ? realManager.email : "No email",
        studentCount: branchStudents.length,
        admissionCount: branchStudents.length,
        batchCount: branchBatches.length,
        totalRevenue: branchTotalRevenue,
        collected: branchTotalCollected,
        pending: branchPending,
        collectionRate,
        status: apiBranch.status,
        accentColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
        accentText: ACCENT_TEXT[index % ACCENT_TEXT.length],
        accentBg: ACCENT_BG_LIGHT[index % ACCENT_BG_LIGHT.length],
      };
    });
  }, [apiBranches, centerManagers, studentReport, allBatches, financialReport, selectedBranchId]);

  const filteredBranches = selectedBranchId === "all"
    ? branchesData
    : branchesData.filter(b => b.id === selectedBranchId);

  // Global Real KPIs
  const kpiTotalStudents = studentReport?.summary?.totalStudents ?? filteredBranches.reduce((acc, b) => acc + b.studentCount, 0);
  const kpiActiveBatches = allBatches?.filter(b => b.status === "ACTIVE").length ?? filteredBranches.reduce((acc, b) => acc + b.batchCount, 0);
  const kpiTotalLeads = leadDashboardData?.totalLeads ?? 0;
  const kpiTotalRevenue = financialReport?.summary?.totalCollected ?? filteredBranches.reduce((acc, b) => acc + b.collected, 0);
  const formattedRevenue = kpiTotalRevenue >= 100000 
    ? `₹${(kpiTotalRevenue / 100000).toFixed(2)}L` 
    : `₹${kpiTotalRevenue.toLocaleString("en-IN")}`;

  const topBranches = [...branchesData].sort((a, b) => b.collected - a.collected).slice(0, 3);

  // Real Monthly Trend from PostgreSQL
  const trendData = useMemo(() => {
    if (financialReport?.monthlyTrend && financialReport.monthlyTrend.length > 0) {
      return financialReport.monthlyTrend.map((item) => ({
        name: item.month.split(" ")[0],
        fullName: item.month,
        revenue: item.collected,
        pending: item.pending,
      }));
    }
    return [
      { name: "Jan", revenue: 0, pending: 0 },
      { name: "Feb", revenue: 0, pending: 0 },
      { name: "Mar", revenue: 0, pending: 0 },
      { name: "Apr", revenue: 0, pending: 0 },
      { name: "May", revenue: 0, pending: 0 },
      { name: "Jun", revenue: 0, pending: 0 },
    ];
  }, [financialReport]);

  const handleDeleteBranch = async () => {
    if (!deleteModalBranch) return;
    try {
      await deleteBranchMutation.mutateAsync(deleteModalBranch.id);
      setNotificationMsg(`Branch "${deleteModalBranch.name}" has been deleted.`);
      setTimeout(() => setNotificationMsg(null), 3000);
      setDeleteModalBranch(null);
      setDeleteConfirmText("");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to delete branch.");
    }
  };

  const handleCreateBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName || !branchCode) return;
    setErrorMsg(null);

    try {
      await createBranchMutation.mutateAsync({
        name: branchName.trim(),
        code: branchCode.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      setNotificationMsg(`New Branch "${branchName}" created successfully!`);
      setTimeout(() => setNotificationMsg(null), 3000);
      setShowCreateModal(false);
      setBranchName("");
      setBranchCode("");
      setAddress("");
      setPhone("");
    } catch (err: any) {
      const serverErrors = err?.response?.data?.errors;
      const firstError =
        Array.isArray(serverErrors) && serverErrors.length > 0
          ? `${serverErrors[0].field ? serverErrors[0].field + ": " : ""}${serverErrors[0].message}`
          : err?.response?.data?.message || "Failed to create branch.";
      setErrorMsg(firstError);
    }
  };

  const isLoading = isBranchesLoading || isStudentLoading || isFinancialLoading;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0A2540]">Dashboard Overview</h2>
          <p className="text-sm text-slate-500">
            ERP module hub — leads, admissions, students, schedule, fees, placement, and operations at a glance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate(ROUTES.ADMIN.ADMINISTRATION.BRANCHES)}
            className="bg-[#1769AA] hover:bg-[#13568c] text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <Building2 className="h-4 w-4" /> Manage Branches
          </Button>
        </div>
      </div>

      <InstallDashboardBanner />

      {notificationMsg && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-semibold">{notificationMsg}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 py-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <select
            className="h-9 rounded-lg border border-border bg-card px-3 py-1 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            <option value="all">All Branches ({apiBranches.length})</option>
            {apiBranches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            className="h-9 rounded-lg border border-border bg-card px-3 py-1 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value)}
          >
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      {/* ERP Module Quick Access */}
      <div className="pt-2">
        <h3 className="text-sm font-bold text-foreground mb-3">Module Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: "Leads", path: ROUTES.ADMIN.LEADS.ROOT, count: kpiTotalLeads },
            { label: "Admissions", path: ROUTES.ADMIN.ADMISSIONS.ALL, count: kpiTotalStudents },
            { label: "Students", path: ROUTES.ADMIN.STUDENTS.ALL, count: kpiTotalStudents },
            { label: "Schedule", path: ROUTES.ADMIN.SCHEDULE.CLASSES, count: scheduleSummary?.todayClasses ?? 0 },
            { label: "Fees", path: ROUTES.ADMIN.FEES.PENDING, count: financialReport?.summary?.totalPending ? "Pending" : 0 },
            { label: "Placement", path: ROUTES.ADMIN.PLACEMENT.ELIGIBLE, count: placementSummary?.eligibleCount ?? 0 },
            { label: "Exams", path: ROUTES.ADMIN.EXAMS.ALL, count: "→" },
            { label: "Reports", path: ROUTES.ADMIN.REPORTS.STUDENTS, count: "→" },
            { label: "Communication", path: ROUTES.ADMIN.COMMUNICATION.NOTIFICATIONS, count: "→" },
            { label: "Counsellors", path: ROUTES.ADMIN.COUNSELLORS.ALL, count: "→" },
            { label: "Batches", path: ROUTES.ADMIN.BATCHES.ALL, count: kpiActiveBatches },
            { label: "Administration", path: ROUTES.ADMIN.ADMINISTRATION.ORGANIZATION, count: apiBranches.length },
          ].map((mod) => (
            <button
              key={mod.label}
              type="button"
              onClick={() => navigate(mod.path)}
              className="text-left p-3 rounded-xl border border-border bg-card hover:bg-blue-50/50 hover:border-blue-200 transition-all"
            >
              <p className="text-xs font-bold text-foreground">{mod.label}</p>
              <p className="text-lg font-extrabold text-[#1769AA] mt-1">{mod.count}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAIN SECTION - BRANCH REVENUE PERFORMANCE */}
      <div className="pt-3">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-lg font-extrabold text-foreground tracking-tight">Branch Revenue & Operations Performance</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Live operational data from each branch in PostgreSQL.</p>
          </div>
        </div>

        {/* 4. BRANCH REVENUE CARDS */}
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filteredBranches.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border p-6 shadow-xs">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-foreground">No Branches Found</h4>
            <p className="text-xs text-muted-foreground mt-1">Create your first branch to start managing academy operations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBranches.map((branch) => (
              <Card key={branch.id} className="border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition-all rounded-2xl overflow-hidden relative flex flex-col group">
                <div className={`absolute top-0 left-0 right-0 h-1 ${branch.accentColor}`} />

                <CardContent className="p-0 flex-1 flex flex-col">
                  <div className="p-4 space-y-3.5">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full ${branch.accentText} ${branch.accentBg} border-transparent font-bold`}>
                          {branch.code}
                        </Badge>
                        <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 px-2.5 py-0.5 rounded-full">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" /> Active
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg -mt-1 -mr-1"
                        onClick={() => setDeleteModalBranch(branch)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div>
                      <h4 className="text-sm sm:text-base font-extrabold text-foreground truncate tracking-tight" title={branch.name}>{branch.name}</h4>
                      <p className="text-xs text-muted-foreground flex items-center mt-0.5 truncate">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" /> {branch.address}
                      </p>
                    </div>

                    {/* Manager Section */}
                    <div className="border border-border/80 rounded-xl p-3 bg-muted/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ASSIGNED CENTER MANAGER</p>
                        {branch.hasManager && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedManagerIdForBranch(branch.assignedManagerId || "");
                              setAssignModalBranch({ id: branch.id, name: branch.name });
                            }}
                            className="text-[11px] font-bold text-primary hover:underline transition-colors cursor-pointer"
                            title="Change assigned manager"
                          >
                            Change
                          </button>
                        )}
                      </div>

                      {branch.hasManager ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`h-7 w-7 rounded-full ${branch.accentBg} ${branch.accentText} flex items-center justify-center font-bold text-xs shrink-0 border border-border/60`}>
                              {branch.assignedManagerName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground leading-snug truncate">{branch.assignedManagerName}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{branch.assignedManagerEmail}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 py-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground font-bold text-xs shrink-0">
                              ?
                            </div>
                            <span className="text-xs font-medium text-muted-foreground truncate">No Manager Assigned</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setSelectedManagerIdForBranch("");
                              setAssignModalBranch({ id: branch.id, name: branch.name });
                            }}
                            className="h-7 px-2.5 text-[11px] font-bold border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 hover:text-white transition-all rounded-lg shadow-none flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <UserPlus className="h-3 w-3" /> Assign Manager
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Revenue */}
                    <div className="pt-0.5 space-y-2.5">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Collected Revenue</p>
                          <h3 className="text-xl font-extrabold text-foreground flex items-center gap-1.5 leading-tight mt-0.5 tracking-tight">
                            ₹{branch.collected.toLocaleString("en-IN")}
                          </h3>
                        </div>
                        <div className="text-right space-y-0.5 text-xs">
                          <p>
                            <span className="text-muted-foreground text-[10px]">Pending:</span> <span className="font-bold text-amber-500">₹{branch.pending.toLocaleString("en-IN")}</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-muted-foreground">Collection Rate</span>
                          <span className="text-foreground">{branch.collectionRate}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
                          <div className={`h-full ${branch.accentColor}`} style={{ width: `${Math.min(branch.collectionRate, 100)}%` }} />
                          <div className="h-full bg-amber-500/60" style={{ width: `${Math.max(100 - branch.collectionRate, 0)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 border-t border-border/80 bg-muted/20 text-center">
                      <div className="py-2.5 px-1 border-r border-border/80">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Students</p>
                        <p className="text-xs sm:text-sm font-black text-foreground mt-0.5">{branch.studentCount}</p>
                      </div>
                      <div className="py-2.5 px-1 border-r border-border/80">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Admissions</p>
                        <p className="text-xs sm:text-sm font-black text-foreground mt-0.5">{branch.admissionCount}</p>
                      </div>
                      <div className="py-2.5 px-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Batches</p>
                        <p className="text-xs sm:text-sm font-black text-foreground mt-0.5">{branch.batchCount}</p>
                      </div>
                    </div>

                    {/* View Details Trigger */}
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/branch/${branch.id}/revenue`)}
                      className={`w-full py-2.5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5 border-t border-border/80 cursor-pointer`}
                    >
                      View Branch Details <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 10. REVENUE TREND & 11. TOP BRANCHES & 12. RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* Revenue Trend */}
        <Card className="border-border bg-card shadow-xs rounded-2xl lg:col-span-1 flex flex-col">
          <CardContent className="p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-base font-extrabold text-foreground tracking-tight">Monthly Revenue Trend</h3>
                <p className="text-xs text-muted-foreground">{selectedBranchId === "all" ? "All Branches" : "Selected Branch"}</p>
              </div>
              <div className="text-right">
                <h4 className="text-xl font-extrabold text-foreground tracking-tight">{formattedRevenue}</h4>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                  <TrendingUp className="h-3 w-3" /> Real Data
                </p>
              </div>
            </div>
            <div className="flex-1 min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-muted-foreground" tickFormatter={(value) => value >= 100000 ? `${value / 100000}L` : `${value}`} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Collected"]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#38BDF8" strokeWidth={3} dot={{ r: 4, fill: '#38BDF8', strokeWidth: 2, stroke: '#0F172A' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Revenue Branches */}
        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-5">
            <h3 className="text-base font-extrabold text-foreground tracking-tight mb-4">Top Performing Branches</h3>
            <div className="space-y-4">
              {topBranches.length === 0 ? (
                <p className="text-xs text-muted-foreground">No branches registered yet.</p>
              ) : (
                topBranches.map((b, i) => (
                  <div key={b.id} className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <Badge variant="outline" className={`font-mono text-[10px] ${b.accentText} ${b.accentBg} border-transparent px-2 py-0.5 rounded-full shrink-0 font-bold`}>{b.code}</Badge>
                      <span className="text-sm font-semibold text-foreground truncate">{b.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-foreground">₹{b.collected.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] font-medium text-muted-foreground block">{b.studentCount} students</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Recent Academy Records</h3>
              <button onClick={() => navigate("/admin/reports")} className="text-xs text-primary font-bold hover:underline cursor-pointer">
                View Reports
              </button>
            </div>
            <div className="space-y-4">
              {recentPaymentsData?.data?.data && recentPaymentsData.data.data.length > 0 ? (
                recentPaymentsData.data.data.slice(0, 4).map((p: any) => (
                  <div key={p.id} className="flex gap-3 items-center p-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 h-fit"><DollarSign className="h-3.5 w-3.5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground font-semibold truncate">₹{p.amount.toLocaleString("en-IN")} collected ({p.method})</p>
                      <p className="text-[10px] text-muted-foreground">{p.student?.user?.name || "Student Fee"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex gap-3 items-center p-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="p-2 rounded-full bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 border border-blue-100 dark:border-sky-900/40 h-fit"><GraduationCap className="h-3.5 w-3.5" /></div>
                    <div>
                      <p className="text-xs text-foreground font-semibold">{kpiTotalStudents} Total Active Enrolled Students</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">PostgreSQL Live Data</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center p-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="p-2 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 h-fit"><Briefcase className="h-3.5 w-3.5" /></div>
                    <div>
                      <p className="text-xs text-foreground font-semibold">{kpiActiveBatches} Batches Scheduled across branches</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">PostgreSQL Live Data</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center p-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 h-fit"><DollarSign className="h-3.5 w-3.5" /></div>
                    <div>
                      <p className="text-xs text-foreground font-semibold">₹{kpiTotalRevenue.toLocaleString("en-IN")} Total Fees Realized</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">PostgreSQL Live Data</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Dialog: Delete Branch */}
      {deleteModalBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-4 text-foreground">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Branch
            </h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">{deleteModalBranch.name}</strong>? This action will mark the branch as deleted.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Type DELETE to confirm</label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="border-red-200 dark:border-red-900/50 focus-visible:ring-red-500 bg-background text-foreground"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setDeleteModalBranch(null); setDeleteConfirmText(""); }}>Cancel</Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteConfirmText !== "DELETE" || updateBranchMutation.isPending}
                onClick={handleDeleteBranch}
              >
                {updateBranchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Okay, Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: Create New Branch */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg p-6 space-y-4 text-foreground">
            <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2 tracking-tight">
              <Building2 className="h-5 w-5 text-primary" /> Create New Branch
            </h3>
            <form onSubmit={handleCreateBranchSubmit} className="space-y-4">
              {errorMsg && <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 text-xs rounded-lg">{errorMsg}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">Name *</label>
                  <Input required value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Indiranagar Branch" className="bg-background text-foreground" />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block text-foreground">Code *</label>
                  <Input required value={branchCode} onChange={(e) => setBranchCode(e.target.value)} placeholder="e.g. IND-01" className="bg-background text-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold block text-foreground">Address</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 100ft Road, Indiranagar, Bengaluru" className="bg-background text-foreground" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold block text-foreground">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 9876543210" className="bg-background text-foreground" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-white hover:bg-primary/90 font-semibold">
                  {createBranchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Branch"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog: Assign Center Manager */}
      {assignModalBranch && (() => {
        const selectedManager = centerManagers.find((mgr) => mgr.id === selectedManagerIdForBranch);
        const previousBranch = selectedManager?.branchId
          ? apiBranches.find((b) => b.id === selectedManager.branchId)
          : null;
        const isAlreadyAssigned =
          Boolean(selectedManager && previousBranch && previousBranch.id !== assignModalBranch.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-4 text-foreground">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground tracking-tight">Assign Center Manager</h3>
                  <p className="text-xs text-muted-foreground">Assign a manager to <strong className="text-foreground">{assignModalBranch.name}</strong></p>
                </div>
              </div>

              <div className="space-y-2 py-2">
                <label className="text-xs font-bold text-foreground block">
                  Select Center Manager
                </label>
                <select
                  value={selectedManagerIdForBranch}
                  onChange={(e) => setSelectedManagerIdForBranch(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
                >
                  <option value="">-- Choose a Center Manager --</option>
                  {centerManagers.map((mgr) => {
                    const currentBranch = apiBranches.find((b) => b.id === mgr.branchId);
                    return (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.name} ({mgr.email}) {currentBranch ? `— [Currently in: ${currentBranch.name}]` : "— (Unassigned)"}
                      </option>
                    );
                  })}
                </select>

                {isAlreadyAssigned && previousBranch && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-start gap-2.5 text-amber-900 dark:text-amber-200 mt-2 animate-in fade-in">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-amber-900 dark:text-amber-200">⚠️ Manager Already Assigned</p>
                      <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                        <strong className="text-foreground">{selectedManager?.name}</strong> is currently assigned to <strong>{previousBranch.name}</strong>. Reassigning will transfer their management responsibility to <strong>{assignModalBranch.name}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {centerManagers.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> No Center Managers found. Please create one in Administration.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssignModalBranch(null);
                    setSelectedManagerIdForBranch("");
                  }}
                  className="text-xs font-bold h-9"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!selectedManagerIdForBranch || updateUserMutation.isPending}
                  onClick={async () => {
                    if (!selectedManagerIdForBranch || !assignModalBranch) return;
                    try {
                      await updateUserMutation.mutateAsync({
                        id: selectedManagerIdForBranch,
                        data: { branchId: assignModalBranch.id },
                      });

                      if (isAlreadyAssigned && previousBranch) {
                        const notice = `⚠️ Manager "${selectedManager?.name}" was already assigned to "${previousBranch.name}". Reassigned to "${assignModalBranch.name}" successfully!`;
                        setNotificationMsg(notice);
                        addNotification(notice, "warning");
                      } else {
                        const successMsg = `Manager "${selectedManager?.name || 'Selected manager'}" assigned to "${assignModalBranch.name}" successfully.`;
                        setNotificationMsg(successMsg);
                        addNotification(successMsg, "success");
                      }

                      setTimeout(() => setNotificationMsg(null), 5000);
                      setAssignModalBranch(null);
                      setSelectedManagerIdForBranch("");
                    } catch (err: any) {
                      const errMsg = err.response?.data?.message || "Failed to assign manager.";
                      setErrorMsg(errMsg);
                      addNotification(errMsg, "error");
                    }
                  }}
                  className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 transition-colors"
                >
                  {updateUserMutation.isPending
                    ? "Assigning..."
                    : isAlreadyAssigned
                    ? "Confirm Reassignment"
                    : "Confirm Assignment"}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
