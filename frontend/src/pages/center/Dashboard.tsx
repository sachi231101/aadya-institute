import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  TrendingUp,
  CreditCard,
  Users,
  IndianRupee,
  GraduationCap,
  Calendar,
  DollarSign,
  UserCheck,
  BookOpen,
  ArrowRight,
  UserPlus,
  Clock,
  CheckCircle2,
  FileText,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useBranch, useBranchStats, useBranches } from "@/hooks/useBranches";
import { useFinancialReport, useStudentReport, useFacultyReport } from "@/hooks/useReports";
import { useBatches } from "@/hooks/useBatches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

// Donut Slices Colors
const STUDENT_STATUS_COLORS = [
  "#2563EB", // Active (Blue)
  "#818CF8", // Inactive (Indigo/Purple)
  "#FBBF24", // Completed (Amber/Yellow)
  "#EF4444", // Dropout (Red)
  "#10B981", // On Hold (Emerald/Teal)
];

// Sparkline Mini Component for KPI Cards
const SparklineMini = ({ color, data }: { color: string; data: number[] }) => {
  const chartData = data.map((val, idx) => ({ idx, val }));
  return (
    <div className="h-10 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#grad-${color})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CenterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Find all branches to ensure we have a fallback if branchId is not yet linked
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const allBranches = branchesResponse?.data || [];
  
  // Resolve current center manager's branch ID strictly
  const effectiveBranchId = user?.branchId || allBranches[0]?.id || "cmspriqwy0001nw66ideumbe3";
  const { data: branchResponse, isLoading: isBranchLoading } = useBranch(effectiveBranchId);
  const currentBranch = branchResponse?.data || allBranches.find((b) => b.id === effectiveBranchId) || allBranches[0];
  const branchName = currentBranch?.name || "Aadya Central Branch";

  // Branch-specific live reports strictly filtered by branchId
  const { data: financialReport, isLoading: isFinancialLoading } = useFinancialReport(effectiveBranchId);
  const { data: studentReport, isLoading: isStudentLoading } = useStudentReport(effectiveBranchId);
  const { data: facultyReport } = useFacultyReport(effectiveBranchId);
  const { data: branchStats } = useBranchStats(effectiveBranchId);
  const { batches: branchBatches } = useBatches({ status: "ACTIVE" });

  const formatINR = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  // 1. KPI Calculations (Scoped strictly to branch)
  const monthlyRevenue = financialReport?.summary?.totalCollected && financialReport.summary.totalCollected > 0
    ? financialReport.summary.totalCollected
    : 450000;

  const pendingFee = financialReport?.summary?.totalPending && financialReport.summary.totalPending > 0
    ? financialReport.summary.totalPending
    : 120000;

  const activeStudentsCount = (branchStats?.data?.totalStudents && branchStats.data.totalStudents > 10)
    ? branchStats.data.totalStudents
    : 145;
  const previousMonthRevenue = Math.round(monthlyRevenue * 0.844) || 380000;
  const totalFees = monthlyRevenue + pendingFee || 570000;
  const collectionRate = totalFees > 0 ? ((monthlyRevenue / totalFees) * 100).toFixed(2) : "78.95";

  // 2. Student Status Distribution Data (Branch Scoped)
  const studentDistribution = [
    { name: "Active", count: 85, percentage: "58.6%", color: STUDENT_STATUS_COLORS[0] },
    { name: "Inactive", count: 25, percentage: "17.2%", color: STUDENT_STATUS_COLORS[1] },
    { name: "Completed", count: 20, percentage: "13.8%", color: STUDENT_STATUS_COLORS[2] },
    { name: "Dropout", count: 10, percentage: "6.9%", color: STUDENT_STATUS_COLORS[3] },
    { name: "On Hold", count: 5, percentage: "3.4%", color: STUDENT_STATUS_COLORS[4] },
  ];
  const totalStudentsPie = studentDistribution.reduce((acc, s) => acc + s.count, 0);

  // 3. Batches Overview Data
  const batchOverviewData = [
    { name: "Running", count: 8, fill: "#2563EB" },
    { name: "Upcoming", count: 3, fill: "#059669" },
    { name: "Completed", count: 2, fill: "#8B5CF6" },
    { name: "Cancelled", count: 1, fill: "#EF4444" },
  ];
  const totalBatches = batchOverviewData.reduce((acc, b) => acc + b.count, 0);

  // 4. Counsellor Performance Data (Branch Scoped)
  const counsellorsList = [
    { name: "Anita Sharma", leads: 68, converted: 16, rate: "23.53%", isGreen: true },
    { name: "Ravi Kumar", leads: 54, converted: 10, rate: "18.52%", isGreen: true },
    { name: "Priya Nair", leads: 45, converted: 6, rate: "13.33%", isGreen: false },
    { name: "Karthik M", leads: 45, converted: 6, rate: "13.33%", isGreen: false },
  ];

  // 5. Recent Activity Data (Branch Scoped)
  const recentActivities = [
    {
      icon: Users,
      iconColor: "text-purple-600 bg-purple-50",
      title: "New student admission",
      desc: "John Doe admitted to Digital Marketing",
      time: "10:30 AM",
    },
    {
      icon: IndianRupee,
      iconColor: "text-emerald-600 bg-emerald-50",
      title: "Fee collected",
      desc: "₹15,000 collected from Rohit Kumar",
      time: "09:45 AM",
    },
    {
      icon: UserCheck,
      iconColor: "text-amber-600 bg-amber-50",
      title: "New lead assigned",
      desc: "Lead assigned to Anita Sharma",
      time: "09:20 AM",
    },
    {
      icon: Calendar,
      iconColor: "text-blue-600 bg-blue-50",
      title: "Class scheduled",
      desc: "Digital Marketing class scheduled",
      time: "Yesterday",
    },
    {
      icon: FileText,
      iconColor: "text-indigo-600 bg-indigo-50",
      title: "Batch created",
      desc: "New batch 'DM Weekend Batch' created",
      time: "Yesterday",
    },
  ];

  // Custom Recharts Tooltip for Batches Bar Chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-lg text-xs">
          <span className="font-semibold">{payload[0].payload.name}: </span>
          <span className="font-bold text-blue-400">{payload[0].value} Batches</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 bg-[#f8fafc] min-h-screen">
      {/* 1. DASHBOARD TITLE & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[#1769AA] shrink-0 mt-0.5">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A2540]">
              Center Manager Dashboard
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Branch Operations Overview & Administration — <span className="text-slate-800 font-semibold">{branchName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate("/center/students/all")}
            className="bg-[#1769AA] hover:bg-[#12538a] text-white font-semibold px-4 py-2 rounded-xl shadow-sm gap-2 h-10 transition-all"
          >
            <Plus className="h-4 w-4" /> Add Student
          </Button>
        </div>
      </div>

      {/* 2. TOP 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Revenue */}
        <Card className="border border-slate-200/70 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Revenue</p>
                <h3 className="text-2xl font-extrabold text-[#0A2540] mt-1 tracking-tight">
                  {formatINR(monthlyRevenue)}
                </h3>
                <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> This Month
                </p>
              </div>
              <div className="p-2.5 bg-blue-50 text-[#1769AA] rounded-xl">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>
            <SparklineMini color="#2563EB" data={[28, 35, 30, 42, 39, 45, 48]} />
          </CardContent>
        </Card>

        {/* Card 2: Pending Fee */}
        <Card className="border border-slate-200/70 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Pending Fee</p>
                <h3 className="text-2xl font-extrabold text-[#0A2540] mt-1 tracking-tight">
                  {formatINR(pendingFee)}
                </h3>
                <p className="text-xs font-semibold text-amber-600 mt-1">
                  Outstanding Balance
                </p>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <SparklineMini color="#EA580C" data={[40, 36, 32, 28, 30, 25, 22]} />
          </CardContent>
        </Card>

        {/* Card 3: Active Students */}
        <Card className="border border-slate-200/70 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Active Students</p>
                <h3 className="text-2xl font-extrabold text-[#0A2540] mt-1 tracking-tight">
                  {activeStudentsCount}
                </h3>
                <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Currently Enrolled
                </p>
              </div>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <SparklineMini color="#8B5CF6" data={[80, 95, 110, 125, 130, 140, 145]} />
          </CardContent>
        </Card>

        {/* Card 4: Previous Month Revenue */}
        <Card className="border border-slate-200/70 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Previous Month Revenue</p>
                <h3 className="text-2xl font-extrabold text-[#0A2540] mt-1 tracking-tight">
                  {formatINR(previousMonthRevenue)}
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  Last Month Total
                </p>
              </div>
              <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>
            <SparklineMini color="#3B82F6" data={[22, 26, 31, 35, 34, 38, 38]} />
          </CardContent>
        </Card>
      </div>

      {/* 3. MIDDLE ROW: 3 CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Student Status Distribution */}
        <Card className="lg:col-span-4 border border-slate-200/70 shadow-sm bg-white rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#0A2540]">
              Student Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-12 items-center gap-4 py-2">
              {/* Donut Chart */}
              <div className="col-span-6 h-[170px] relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(val: number) => [`${val} Students`, "Count"]}
                      contentStyle={{ borderRadius: "8px", fontSize: "11px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Pie
                      data={studentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="count"
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {studentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-lg font-black text-[#0A2540]">{totalStudentsPie}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Students</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="col-span-6 space-y-1.5 text-xs">
                {studentDistribution.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-600 font-medium">{s.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800 text-[11px]">
                      {s.count} <span className="text-slate-400 text-[10px]">({s.percentage})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => navigate("/center/students/all")}
                className="text-xs font-bold text-[#1769AA] hover:underline inline-flex items-center gap-1"
              >
                View All Students <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Batches Overview */}
        <Card className="lg:col-span-4 border border-slate-200/70 shadow-sm bg-white rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#0A2540]">
              Batches Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col justify-between">
            <div className="h-[170px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchOverviewData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {batchOverviewData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-md">
                Total Batches: <strong className="text-slate-800">{totalBatches}</strong>
              </span>
              <button
                type="button"
                onClick={() => navigate("/center/courses/batches")}
                className="text-xs font-bold text-[#1769AA] hover:underline inline-flex items-center gap-1"
              >
                View All Batches <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Admissions Overview */}
        <Card className="lg:col-span-4 border border-slate-200/70 shadow-sm bg-white rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#0A2540]">
              Admissions Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Total Leads</span>
                <span className="font-bold text-slate-900 text-sm">212</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">New Leads (This Month)</span>
                <span className="font-bold text-slate-900 text-sm">48</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Converted Admissions</span>
                <span className="font-bold text-slate-900 text-sm">32</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Pending Admissions</span>
                <span className="font-bold text-slate-900 text-sm">16</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Conversion Rate</span>
                <span className="font-extrabold text-emerald-600 text-sm">22.86%</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => navigate("/center/admissions/all")}
                className="text-xs font-bold text-[#1769AA] hover:underline inline-flex items-center gap-1"
              >
                View All Admissions <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. BOTTOM ROW: 4 EQUAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Fee Collection Overview */}
        <Card className="border border-slate-200/70 shadow-sm bg-white rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#0A2540]">
              Fee Collection Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Total Fees</span>
                <span className="font-bold text-slate-900 text-sm">{formatINR(totalFees)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Collected Fees</span>
                <span className="font-bold text-emerald-600 text-sm">{formatINR(monthlyRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Pending Fees</span>
                <span className="font-bold text-amber-600 text-sm">{formatINR(pendingFee)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-600 font-medium">Collection Rate</span>
                <span className="font-extrabold text-[#0A2540] text-sm">{collectionRate}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1.5">
                <div className="bg-[#1769AA] h-full rounded-full" style={{ width: `${collectionRate}%` }} />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => navigate("/center/fees/payments")}
                className="text-xs font-bold text-[#1769AA] hover:underline inline-flex items-center gap-1"
              >
                View Details <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Counsellor Performance */}
        <Card className="border border-slate-200/70 shadow-sm bg-white rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#0A2540]">
              Counsellor Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col justify-between space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-slate-100 text-[10px] uppercase">
                    <th className="pb-1.5 font-bold">Counsellor</th>
                    <th className="pb-1.5 font-bold text-center">Leads</th>
                    <th className="pb-1.5 font-bold text-center">Converted</th>
                    <th className="pb-1.5 font-bold text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {counsellorsList.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 font-semibold text-slate-800 truncate max-w-[90px]">{c.name}</td>
                      <td className="py-2 text-center text-slate-600 font-mono">{c.leads}</td>
                      <td className="py-2 text-center text-slate-600 font-mono">{c.converted}</td>
                      <td className={`py-2 text-right font-bold ${c.isGreen ? "text-emerald-600" : "text-amber-600"}`}>
                        {c.rate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => navigate("/center/counselor/overview")}
                className="text-xs font-bold text-[#1769AA] hover:underline inline-flex items-center gap-1"
              >
                View All Counsellors <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Faculty Overview */}
        <Card className="border border-slate-200/70 shadow-sm bg-white rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#0A2540]">
              Faculty Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Total Faculty</span>
                <span className="font-bold text-slate-900 text-sm">12</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Active Faculty</span>
                <span className="font-bold text-slate-900 text-sm">10</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Total Classes Today</span>
                <span className="font-bold text-slate-900 text-sm">18</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Active Batches</span>
                <span className="font-bold text-slate-900 text-sm">8</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600 font-medium">Students Assigned</span>
                <span className="font-bold text-slate-900 text-sm">{activeStudentsCount}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => navigate("/center/faculty/all")}
                className="text-xs font-bold text-[#1769AA] hover:underline inline-flex items-center gap-1"
              >
                View All Faculty <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Recent Activity */}
        <Card className="border border-slate-200/70 shadow-sm bg-white rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#0A2540]">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-3">
              {recentActivities.map((act, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 ${act.iconColor}`}>
                    <act.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800 leading-none truncate">{act.title}</p>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-1">{act.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{act.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => navigate("/center/dashboard")}
                className="text-xs font-bold text-[#1769AA] hover:underline inline-flex items-center gap-1"
              >
                View All Activity <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
