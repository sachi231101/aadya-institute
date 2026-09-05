import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  GraduationCap,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Phone,
  PieChart as PieIcon,
  LineChart as LineIcon,
  TrendingUp,
  Briefcase,
  Loader2,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBranches, useBranch, useBranchStats } from "@/hooks/useBranches";
import { useStudentReport, useFinancialReport, useFacultyReport } from "@/hooks/useReports";
import { useAdminUsers } from "@/hooks/useUsers";
import { CourseChips } from "@/components/common/CourseChips";
import { coursesFromStudent } from "@/utils/admission-package.utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const PIE_COLORS = ["#1769AA", "#4f46e5", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"];
const COLLECTION_COLORS = ["#10b981", "#f59e0b"]; // Emerald (Paid), Amber (Pending)
const RISK_COLORS = ["#10b981", "#f59e0b", "#ef4444"]; // Normal, At Risk, Triggered

export const BranchPerformance: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pieTab, setPieTab] = useState<"courses" | "collection" | "risk">("courses");
  const [lineMetric, setLineMetric] = useState<"revenue" | "enrollment">("revenue");

  // Fetch branch details, stats, and reports from backend
  const { data: branchDetailResponse, isLoading: isBranchLoading } = useBranch(id);
  const { data: statsResponse, isLoading: isStatsLoading } = useBranchStats(id);
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const { data: usersResponse } = useAdminUsers({ limit: 100 });

  const { data: financialReport, isLoading: isFinancialLoading } = useFinancialReport(id);
  const { data: studentReport, isLoading: isStudentLoading } = useStudentReport(id);
  const { data: facultyReport } = useFacultyReport(id);

  const apiBranch = branchDetailResponse?.data || branchesResponse?.data?.find((b) => b.id === id);
  const centerManagers = usersResponse?.data?.filter((u) => u.roles.includes("CENTER_MANAGER")) || [];
  const realManager = centerManagers.find((m) => m.branchId === id);

  // Resolved branch details
  const branchName = apiBranch?.name || "Branch Overview";
  const branchCode = apiBranch?.code || "N/A";
  const address = apiBranch?.address || "Bengaluru, Karnataka";
  const phone = apiBranch?.phone || "+91 98765 43210";
  const status = apiBranch?.status || "ACTIVE";
  const managerName = realManager?.name || "Assigned Center Manager";
  const managerEmail = realManager?.email || "manager@aadya.in";

  const isLoading = isBranchLoading || isStatsLoading || isFinancialLoading || isStudentLoading;

  // Dynamic Metrics strictly from PostgreSQL
  const realStats = statsResponse?.data;
  const studentCount = realStats?.totalStudents ?? studentReport?.summary?.totalStudents ?? 0;
  const facultyCount = realStats?.totalFaculty ?? facultyReport?.summary?.totalActiveFaculty ?? 0;
  const batchCount = realStats?.totalBatches ?? 0;

  const dbCollected = financialReport?.summary?.totalCollected ?? 0;
  const dbPending = financialReport?.summary?.totalPending ?? 0;
  const dbProjected = financialReport?.summary?.projectedRevenue ?? (dbCollected + dbPending);

  const dbCollectionRate = dbProjected > 0
    ? Math.round((dbCollected / dbProjected) * 100)
    : (financialReport?.summary?.collectionRate ?? 0);

  const formatINR = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  // 1. Line Chart Data: Revenue and Enrollment Trend
  const revenueTrendData = financialReport?.monthlyTrend && financialReport.monthlyTrend.length > 0
    ? financialReport.monthlyTrend.map((item) => ({
        month: item.month,
        revenue: item.collected,
        pending: item.pending,
      }))
    : [];

  const studentJoinData = studentReport?.enrollmentTrend || [];

  // 2. Pie Chart Data 1: Course Share
  const rawCourseShare = studentReport?.courseShare || [];
  const courseSharePieData = rawCourseShare.filter((c) => c.value > 0).map((c, idx) => ({
    ...c,
    color: c.color || PIE_COLORS[idx % PIE_COLORS.length],
  }));

  // Pie Chart Data 2: Collection Status
  const collectionPieData = [
    { name: "Paid Fees", value: dbCollected, color: COLLECTION_COLORS[0] },
    { name: "Pending Fees", value: dbPending, color: COLLECTION_COLORS[1] },
  ];

  // Pie Chart Data 3: Risk Health Status
  const branchStudents = studentReport?.students ?? [];
  const normalCount = branchStudents.filter((s) => s.riskFlag === "Normal").length;
  const atRiskCount = branchStudents.filter((s) => s.riskFlag === "At Risk").length;
  const triggeredCount = branchStudents.filter((s) => s.riskFlag === "Triggered").length;

  const riskPieData = [
    { name: "Good Standing", value: normalCount, color: RISK_COLORS[0] },
    { name: "At Risk (Attendance <75%)", value: atRiskCount, color: RISK_COLORS[1] },
    { name: "Discontinuation Triggered", value: triggeredCount, color: RISK_COLORS[2] },
  ].filter((item) => item.value > 0);

  // Custom Recharts Tooltip for Pie
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const isFee = pieTab === "collection";
      const total = pieTab === "courses"
        ? courseSharePieData.reduce((s, x) => s + x.value, 0)
        : (pieTab === "collection"
            ? collectionPieData.reduce((s, x) => s + x.value, 0)
            : riskPieData.reduce((s, x) => s + x.value, 0));

      const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : "0.0";

      return (
        <div className="bg-popover text-popover-foreground px-3.5 py-2.5 rounded-xl shadow-xl text-xs border border-border space-y-1 z-50">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: data.payload.color || data.color }} />
            <span className="font-bold text-foreground">{data.name}</span>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground font-mono">
            <span>{isFee ? "Amount:" : "Count:"}</span>
            <span className="font-bold text-foreground">{isFee ? formatINR(data.value) : `${data.value} Students`}</span>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <span>Proportion:</span>
            <span className="font-bold text-emerald-500">{percent}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in">
      {/* 1. HEADER WITH BACK NAVIGATION & BRANCH PROFILE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground border-border mt-1 cursor-pointer"
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
              <span className="text-xs text-muted-foreground font-medium">Branch Comprehensive Analytics</span>
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

        {/* MANAGER PROFILE CHIP */}
        <div className="flex items-center gap-3 bg-muted/40 border border-border px-4 py-2.5 rounded-xl self-start md:self-auto">
          <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm shadow-xs">
            {managerName.charAt(0)}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Center Manager</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{managerName}</p>
            <p className="text-[11px] text-muted-foreground">{managerEmail}</p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 bg-muted/30 rounded-xl border border-border">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-xs font-medium">Fetching real-time branch analytics from PostgreSQL...</span>
        </div>
      )}

      {/* 2. EXECUTIVE METRIC KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Enrolled Students</p>
                <h3 className="text-2xl font-black text-foreground mt-1.5">{studentCount}</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium flex items-center gap-1">
              <span className="text-emerald-500 font-bold flex items-center"><TrendingUp className="h-3.5 w-3.5 mr-0.5" /> Active</span> across all courses
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-pink-500" />
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned Faculty</p>
                <h3 className="text-2xl font-black text-foreground mt-1.5">{facultyCount}</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/40">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              Teaching regular & weekend sessions
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Running Batches</p>
                <h3 className="text-2xl font-black text-foreground mt-1.5">{batchCount}</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-amber-500" /> Active cohort timetables
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{formatINR(dbCollected)}</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Collection Rate:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{dbCollectionRate}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. GRAPHICAL SECTION: LINE GRAPH & PIE GRAPH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: LINE GRAPH (MONTHLY REVENUE / ENROLLMENT TRAJECTORY) */}
        <Card className="lg:col-span-7 border border-border shadow-xs bg-card flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <LineIcon className="h-5 w-5 text-primary" />
                  Monthly Performance Trajectory (Line Graph)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualizing month-over-month trends for {branchName}.
                </p>
              </div>

              {/* METRIC TOGGLE */}
              <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border text-xs font-bold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setLineMetric("revenue")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    lineMetric === "revenue"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Revenue Inflow (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setLineMetric("enrollment")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    lineMetric === "enrollment"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Student Growth
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 flex-1 flex flex-col justify-between">
            <div className="h-[310px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {lineMetric === "revenue" ? (
                  <AreaChart data={revenueTrendData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/60" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      className="text-muted-foreground"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatINR(Number(val)), "Revenue"]}
                      contentStyle={{
                        backgroundColor: "var(--card, #131D31)",
                        borderColor: "var(--border, #1E293B)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "var(--foreground, #F8FAFC)",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Fee Collected"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                      dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={studentJoinData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/60" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => [`${val} Students`, "Enrolled"]}
                      contentStyle={{
                        backgroundColor: "var(--card, #131D31)",
                        borderColor: "var(--border, #1E293B)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "var(--foreground, #F8FAFC)",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="students"
                      name="Students Joined"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Data source: PostgreSQL Live Aggregate Logs</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> Real-time Database Aggregate
              </span>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: PIE GRAPH (FORMAL SLICES WITH INTERACTIVE TABS) */}
        <Card className="lg:col-span-5 border border-border shadow-xs bg-card">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-primary" />
                  Branch Distribution (Pie Graph)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Formal proportional slices.</p>
              </div>

              {/* PIE TABS */}
              <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border text-xs font-bold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPieTab("courses")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    pieTab === "courses"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Courses
                </button>
                <button
                  type="button"
                  onClick={() => setPieTab("collection")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    pieTab === "collection"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Fee Status
                </button>
                <button
                  type="button"
                  onClick={() => setPieTab("risk")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    pieTab === "risk"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Attendance
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="h-[250px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  {pieTab === "courses" && (
                    <Pie
                      data={courseSharePieData.length > 0 ? courseSharePieData : [{ name: "No Courses", value: 1, color: "#94a3b8" }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="transparent"
                    >
                      {courseSharePieData.map((entry, index) => (
                        <Cell key={`cell-c-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  )}

                  {pieTab === "collection" && (
                    <Pie
                      data={collectionPieData.some(d => d.value > 0) ? collectionPieData.filter(d => d.value > 0) : [{ name: "No Dues", value: 1, color: "#94a3b8" }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={collectionPieData.every(d => d.value > 0) ? 4 : 0}
                      dataKey="value"
                      stroke="transparent"
                    >
                      {collectionPieData.map((entry, index) => (
                        <Cell key={`cell-fee-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  )}

                  {pieTab === "risk" && (
                    <Pie
                      data={riskPieData.length > 0 ? riskPieData : [{ name: "No Records", value: 1, color: "#94a3b8" }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="transparent"
                    >
                      {riskPieData.map((entry, index) => (
                        <Cell key={`cell-risk-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  )}
                </PieChart>
              </ResponsiveContainer>

              {/* CENTER DONUT TEXT */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                {pieTab === "courses" && (
                  <>
                    <span className="text-xl font-black text-foreground">{courseSharePieData.length}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Programs</span>
                  </>
                )}
                {pieTab === "collection" && (
                  <>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{dbCollectionRate}%</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Collected</span>
                  </>
                )}
                {pieTab === "risk" && (
                  <>
                    <span className="text-xl font-black text-foreground">{studentCount}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Students</span>
                  </>
                )}
              </div>
            </div>

            {/* SLICE LEGEND LIST */}
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              {pieTab === "courses" && (
                courseSharePieData.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="font-medium text-foreground truncate max-w-[170px]">{c.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{c.value} Students</span>
                  </div>
                ))
              )}

              {pieTab === "collection" && (
                collectionPieData.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                      <span className="font-medium text-foreground">{f.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{formatINR(f.value)}</span>
                  </div>
                ))
              )}

              {pieTab === "risk" && (
                riskPieData.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      <span className="font-medium text-foreground">{r.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{r.value} Students</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. ENROLLED STUDENTS & OPERATIONAL LOGS */}
      <Card className="border border-border shadow-xs bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Active Enrolled Students ({branchName})
            </CardTitle>
            <Badge variant="outline" className="text-xs bg-muted/40 text-muted-foreground border-border font-bold">{branchStudents.length} Active Records</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {branchStudents.length > 0 ? (
              branchStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-4 rounded-xl bg-muted/30 border border-border text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{student.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px] bg-card text-muted-foreground border-border">
                          {student.studentCode}
                        </Badge>
                      </div>
                      <CourseChips
                        courses={coursesFromStudent(student)}
                        fallback={student.courseName}
                        maxVisible={3}
                        className="mt-0.5"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <Badge className={student.riskFlag === "Normal" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs" : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs"}>
                      {student.riskFlag === "Normal" ? "Good Standing" : student.riskFlag}
                    </Badge>
                    <span className="text-xs font-bold text-foreground">{student.attendancePercentage}% Attendance</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No recent operational student activity recorded for this branch.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
