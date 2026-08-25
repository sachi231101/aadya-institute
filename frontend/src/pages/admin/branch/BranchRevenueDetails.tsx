import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  CreditCard,
  PieChart as PieIcon,
  BarChart3,
  MapPin,
  Phone,
  GraduationCap,
  Briefcase,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Receipt,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBranches, useBranch, useBranchStats } from "@/hooks/useBranches";
import { useStudentReport, useFinancialReport } from "@/hooks/useReports";
import { useAdminUsers } from "@/hooks/useUsers";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLLECTION_COLORS = ["#10b981", "#f59e0b"]; // Emerald (Paid), Amber (Pending)
const METHOD_COLORS = ["#10b981", "#1769AA", "#8b5cf6", "#f59e0b", "#ec4899", "#6366f1"];
const COURSE_COLORS = ["#1769AA", "#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"];

export const BranchRevenueDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"collection" | "methods" | "courses">("collection");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("This Fiscal Year");

  // Fetch branch details, stats, and reports strictly from backend using branchId
  const { data: branchDetailResponse, isLoading: isBranchLoading } = useBranch(id);
  const { data: statsResponse, isLoading: isStatsLoading } = useBranchStats(id);
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const { data: usersResponse } = useAdminUsers({ limit: 100 });

  const { data: financialReport, isLoading: isFinancialLoading } = useFinancialReport(id);
  const { data: studentReport, isLoading: isStudentLoading } = useStudentReport(id);

  const apiBranch = branchDetailResponse?.data || branchesResponse?.data?.find((b) => b.id === id);
  const centerManagers = usersResponse?.data?.filter((u) => u.roles.includes("CENTER_MANAGER")) || [];
  const realManager = centerManagers.find((m) => m.branchId === id);

  // Resolved branch details
  const branchName = apiBranch?.name || "Branch Revenue";
  const branchCode = apiBranch?.code || "BR-01";
  const address = apiBranch?.address || "Bengaluru, Karnataka";
  const phone = apiBranch?.phone || "+91 98765 43210";
  const status = apiBranch?.status || "ACTIVE";
  const managerName = realManager?.name || "Assigned Manager";

  const isLoading = isBranchLoading || isStatsLoading || isFinancialLoading || isStudentLoading;

  // Real Metrics from PostgreSQL Database
  const dbCollected = financialReport?.summary?.totalCollected ?? 0;
  const dbPending = financialReport?.summary?.totalPending ?? 0;
  const dbProjected = financialReport?.summary?.projectedRevenue ?? (dbCollected + dbPending);

  const dbCollectionRate = dbProjected > 0
    ? Math.round((dbCollected / dbProjected) * 100)
    : (financialReport?.summary?.collectionRate ?? 0);

  const realStats = statsResponse?.data;
  const studentCount = realStats?.totalStudents ?? studentReport?.summary?.totalStudents ?? 0;
  const batchCount = realStats?.totalBatches ?? 0;

  // Format currency helper
  const formatINR = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  // 1. Pie Chart Data: Paid vs Pending (Pure Real DB Values)
  const collectionPieData = [
    { name: "Paid / Collected Fees", value: dbCollected, color: COLLECTION_COLORS[0] },
    { name: "Pending / Overdue Fees", value: dbPending, color: COLLECTION_COLORS[1] },
  ];

  // 2. Pie Chart Data: Payment Method Share from Backend
  const rawMethods = financialReport?.paymentMethodShare || [];
  const paymentMethodsPieData = rawMethods.filter((m) => m.value > 0);

  // 3. Pie Chart Data: Course Share from Backend
  const rawCourseShare = studentReport?.courseShare || [];
  const courseSharePieData = rawCourseShare.filter((c) => c.value > 0).map((c, idx) => ({
    ...c,
    color: c.color || COURSE_COLORS[idx % COURSE_COLORS.length],
  }));

  // Monthly trend strictly from backend PostgreSQL data
  const monthlyTrendData = financialReport?.monthlyTrend || [];

  // Recent real payment receipts from PostgreSQL
  const recentPayments = financialReport?.recentPayments || [];
  const branchStudents = studentReport?.students || [];

  // Custom Recharts Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = activeTab === "collection"
        ? (collectionPieData.reduce((s, x) => s + x.value, 0))
        : (activeTab === "methods"
            ? paymentMethodsPieData.reduce((s, x) => s + x.value, 0)
            : courseSharePieData.reduce((s, x) => s + x.value, 0));

      const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : "0.0";

      return (
        <div className="bg-popover text-popover-foreground px-3.5 py-2.5 rounded-xl shadow-xl text-xs border border-border space-y-1.5 z-50">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: data.payload.color || data.color }} />
            <span className="font-bold text-foreground">{data.name}</span>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground font-mono">
            <span>Amount:</span>
            <span className="font-bold text-foreground">{formatINR(data.value)}</span>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <span>Share:</span>
            <span className="font-bold text-emerald-500">{percent}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method?.toUpperCase()) {
      case "UPI":
        return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40";
      case "NET_BANKING":
        return "bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 border-blue-200 dark:border-sky-900/40";
      case "CARD":
        return "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/40";
      default:
        return "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40";
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in">
      {/* 1. TOP NAVIGATION & HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/dashboard")}
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground border-border mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="outline" className="font-mono text-xs text-primary bg-primary/10 border-primary/20 font-bold">
                {branchCode}
              </Badge>
              <Badge className={status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground"}>
                {status}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">Branch Financial Analysis</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{branchName}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {address}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {phone}
              </span>
            </div>
          </div>
        </div>

        {/* MANAGER CHIP & TIME FILTER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 bg-muted/40 border border-border px-3.5 py-2 rounded-xl">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs shadow-xs">
              {managerName.charAt(0)}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Center Manager</p>
              <p className="text-xs font-bold text-foreground mt-0.5">{managerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="h-10 rounded-xl border border-border bg-muted/30 px-3 py-1 text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background"
            >
              <option>This Month</option>
              <option>Last 3 Months</option>
              <option>This Fiscal Year</option>
              <option>All Time</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 bg-muted/30 rounded-xl border border-border">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-xs font-medium">Fetching real-time branch revenue from PostgreSQL...</span>
        </div>
      )}

      {/* 2. EXECUTIVE METRIC KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projected Revenue */}
        <Card className="border border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Projected Revenue</p>
                <h3 className="text-2xl font-black text-foreground mt-1.5">{formatINR(dbProjected)}</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 border border-blue-100 dark:border-sky-900/40">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 font-medium">
              <span className="text-emerald-500 font-bold flex items-center"><TrendingUp className="h-3.5 w-3.5 mr-0.5" /> Direct DB</span> Aggregate total
            </p>
          </CardContent>
        </Card>

        {/* Paid / Collected Fees */}
        <Card className="border border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Paid / Collected Fees</p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{formatINR(dbCollected)}</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Collection Efficiency:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{dbCollectionRate}%</span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, dbCollectionRate)}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Pending / Overdue Fees */}
        <Card className="border border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending / Overdue Fees</p>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">{formatINR(dbPending)}</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {dbPending > 0 ? "Active payment dues in pipeline" : "All branch dues cleared"}
            </p>
          </CardContent>
        </Card>

        {/* Students & Batches Count */}
        <Card className="border border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Enrolled Cohort</p>
                <h3 className="text-2xl font-black text-foreground mt-1.5">{studentCount} Students</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-primary" /> {batchCount} Active Running Batches
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. MAIN SECTION: FORMAL GRAPHICAL REPRESENTATION WITH FORMAL PIE CHART SLICES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: PIE CHART WITH SLICES & INTERACTIVE TABS */}
        <Card className="lg:col-span-7 border border-border shadow-xs bg-card">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-primary" />
                  Branch Revenue Graphical Representation
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Proportional slice distribution with real-time financial data.
                </p>
              </div>

              {/* TABS SELECTOR */}
              <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border text-xs font-bold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("collection")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === "collection"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Collection Slices
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("methods")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === "methods"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Payment Modes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("courses")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === "courses"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Course Share
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* PIE CHART CANVAS */}
              <div className="md:col-span-6 h-[290px] flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomPieTooltip />} />
                    {activeTab === "collection" && (
                      <Pie
                        data={collectionPieData.some(d => d.value > 0) ? collectionPieData.filter(d => d.value > 0) : [{ name: "No Data", value: 1, color: "#94a3b8" }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={115}
                        paddingAngle={collectionPieData.every(d => d.value > 0) ? 5 : 0}
                        dataKey="value"
                        stroke="transparent"
                      >
                        {collectionPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    )}

                    {activeTab === "methods" && (
                      <Pie
                        data={paymentMethodsPieData.length > 0 ? paymentMethodsPieData : [{ name: "No Transactions", value: 1, color: "#94a3b8" }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={115}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="transparent"
                      >
                        {paymentMethodsPieData.map((entry, index) => (
                          <Cell key={`cell-method-${index}`} fill={entry.color || METHOD_COLORS[index % METHOD_COLORS.length]} />
                        ))}
                      </Pie>
                    )}

                    {activeTab === "courses" && (
                      <Pie
                        data={courseSharePieData.length > 0 ? courseSharePieData : [{ name: "No Enrolled Courses", value: 1, color: "#94a3b8" }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={115}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="transparent"
                      >
                        {courseSharePieData.map((entry, index) => (
                          <Cell key={`cell-course-${index}`} fill={entry.color || COURSE_COLORS[index % COURSE_COLORS.length]} />
                        ))}
                      </Pie>
                    )}
                  </PieChart>
                </ResponsiveContainer>

                {/* CENTER DONUT TEXT */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  {activeTab === "collection" && (
                    <>
                      <span className="text-2xl font-black text-foreground">{dbCollectionRate}%</span>
                      <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Collected</span>
                    </>
                  )}
                  {activeTab === "methods" && (
                    <>
                      <CreditCard className="h-6 w-6 text-primary mb-1" />
                      <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">{paymentMethodsPieData.length} Methods</span>
                    </>
                  )}
                  {activeTab === "courses" && (
                    <>
                      <Layers className="h-6 w-6 text-purple-500 mb-1" />
                      <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Courses</span>
                    </>
                  )}
                </div>
              </div>

              {/* SLICE BREAKDOWN CARDS */}
              <div className="md:col-span-6 space-y-3">
                {activeTab === "collection" && (
                  <>
                    <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between transition-all hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-3.5 w-3.5 rounded-full bg-emerald-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-foreground">Paid Fees</p>
                          <p className="text-[11px] text-muted-foreground">Collected in full</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatINR(dbCollected)}</p>
                        <p className="text-[10px] font-bold text-muted-foreground">{dbCollectionRate}% share</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between transition-all hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-3.5 w-3.5 rounded-full bg-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-foreground">Pending Fees</p>
                          <p className="text-[11px] text-muted-foreground">Uncollected dues</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-amber-600 dark:text-amber-400">{formatINR(dbPending)}</p>
                        <p className="text-[10px] font-bold text-muted-foreground">{dbProjected > 0 ? 100 - dbCollectionRate : 0}% share</p>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "methods" && (
                  <div className="space-y-2.5">
                    {paymentMethodsPieData.length > 0 ? (
                      paymentMethodsPieData.map((m, idx) => {
                        const total = dbCollected > 0 ? dbCollected : 1;
                        const percent = Math.round((m.value / total) * 100);
                        return (
                          <div key={idx} className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: m.color || METHOD_COLORS[idx % METHOD_COLORS.length] }} />
                              <span className="text-xs font-bold text-foreground">{m.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-foreground">{formatINR(m.value)}</span>
                              <span className="text-[11px] text-muted-foreground ml-2 font-mono">({percent}%)</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-muted-foreground text-xs bg-muted/20 rounded-xl border border-dashed border-border">
                        No payment mode distributions recorded yet.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "courses" && (
                  <div className="space-y-2.5">
                    {courseSharePieData.length > 0 ? (
                      courseSharePieData.map((c, idx) => {
                        const total = courseSharePieData.reduce((sum, item) => sum + item.value, 0) || 1;
                        const percent = Math.round((c.value / total) * 100);
                        return (
                          <div key={idx} className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color || COURSE_COLORS[idx % COURSE_COLORS.length] }} />
                              <span className="text-xs font-bold text-foreground truncate max-w-[160px]">{c.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-foreground">{c.value} Students</span>
                              <span className="text-[11px] text-muted-foreground ml-2 font-mono">({percent}%)</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-muted-foreground text-xs bg-muted/20 rounded-xl border border-dashed border-border">
                        No student course enrollments found for this branch.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: MONTHLY INFLOW BAR / TREND CHART */}
        <Card className="lg:col-span-5 border border-border shadow-xs bg-card flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Monthly Revenue Inflow
              </CardTitle>
              <Badge variant="outline" className="text-[10px] text-muted-foreground bg-muted/30 border-border font-bold">Last 6 Months</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 flex-1 flex flex-col justify-between">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/60" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    formatter={(val: any) => [formatINR(Number(val)), ""]}
                    contentStyle={{
                      backgroundColor: "var(--card, #131D31)",
                      borderColor: "var(--border, #1E293B)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "var(--foreground, #F8FAFC)",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="collected" name="Collected Fees" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending Dues" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Average Monthly Inflow:</span>
              <span className="font-bold text-foreground">{formatINR(Math.round(dbCollected / (monthlyTrendData.length || 6)))}/mo</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. RECENT REAL PAYMENT TRANSACTIONS (FROM POSTGRESQL) */}
      <Card className="border border-border shadow-xs bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Recent Payment Receipts & Transactions ({branchName})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/branch/${id}/performance`)}
              className="text-xs h-8.5 rounded-xl border-border text-foreground hover:bg-muted/50 cursor-pointer"
            >
              View Full Academy Performance <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 text-foreground font-bold border-b border-border text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 pl-6">RECEIPT #</th>
                  <th className="py-3.5 px-4">STUDENT & ADMISSION</th>
                  <th className="py-3.5 px-4">COURSE</th>
                  <th className="py-3.5 px-4">DATE</th>
                  <th className="py-3.5 px-4">PAYMENT MODE</th>
                  <th className="py-3.5 px-4 text-right">AMOUNT PAID</th>
                  <th className="py-3.5 px-4 pr-6 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPayments.length > 0 ? (
                  recentPayments.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3.5 px-4 pl-6 font-mono font-bold text-primary">
                        {tx.receiptNo}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground">{tx.studentName}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{tx.admissionNo}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {tx.courseName}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className={`text-[10.5px] font-bold ${getMethodBadgeClass(tx.method)}`}>
                          {tx.method.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatINR(tx.amount)}
                      </td>
                      <td className="py-3.5 px-4 pr-6 text-center">
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-xs">
                      No recent payment receipts recorded yet for this branch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
