import React from "react";
import { 
  TrendingUp, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Download,
  Loader2
} from "lucide-react";
import { useFeeReports } from "../../../hooks/useFees";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const FeeReports: React.FC = () => {
  const { data: reportsData, isLoading } = useFeeReports();

  const reports = reportsData?.data || {
    totalCollected: 0,
    targetRevenue: 1500000,
    targetAchievedPercent: 0,
    monthlyRevenue: [
      { month: "Sep 2025", revenue: 185000 },
      { month: "Oct 2025", revenue: 220000 },
      { month: "Nov 2025", revenue: 290000 },
      { month: "Dec 2025", revenue: 340000 },
      { month: "Jan 2026", revenue: 410000 },
      { month: "Feb 2026", revenue: 380000 },
    ],
    courseRevenue: [
      { name: "Full Stack MERN", value: 420000, color: "#1769AA" },
      { name: "Backend Systems", value: 280000, color: "#10b981" },
      { name: "Data Science & AI", value: 240000, color: "#f59e0b" },
      { name: "UI/UX Design", value: 140000, color: "#8b5cf6" },
    ],
    paymentModeDistribution: [],
    dueStatusSummary: [],
  };

  const handleExportReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `Total Revenue Collected,₹${reports.totalCollected}\n`
      + `Target Revenue,₹${reports.targetRevenue}\n`
      + `Target Achieved,${reports.targetAchievedPercent}%\n\n`
      + "Month,Revenue\n"
      + reports.monthlyRevenue.map(m => `${m.month},${m.revenue}`).join("\n") + "\n\n"
      + "Course,Revenue\n"
      + reports.courseRevenue.map(c => `${c.name},${c.value}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fee_Financial_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Fee Financial Reports</h2>
          <p className="text-sm text-text-secondary">
            Revenue trends, course-wise collection analytics, payment mode distribution, and financial targets.
          </p>
        </div>

        <Button 
          variant="outline"
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={handleExportReport}
        >
          <Download className="mr-2 h-4 w-4 text-[#1769AA]" />
          Export Financial Report (CSV)
        </Button>
      </div>

      {isLoading ? (
        <Card className="border-border/50 bg-white p-12 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <Loader2 className="w-6 h-6 animate-spin text-[#1769AA]" />
            Loading financial reports & analytics...
          </div>
        </Card>
      ) : (
        <>
          {/* Target Progress Bar */}
          <Card className="border-border/50 bg-white shadow-sm p-6 space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#1769AA]" />
                <span className="text-slate-900">Q1 Revenue Target vs Collection</span>
              </div>
              <span className="text-[#1769AA] font-bold text-base">
                ₹{reports.totalCollected.toLocaleString("en-IN")} / ₹{reports.targetRevenue.toLocaleString("en-IN")} ({reports.targetAchievedPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-[#1769AA] h-full rounded-full transition-all duration-500"
                style={{ width: `${reports.targetAchievedPercent}%` }}
              />
            </div>
          </Card>

          {/* Financial Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Trend Bar Chart */}
            <Card className="border-border/50 bg-white shadow-sm">
              <CardHeader className="p-5 pb-2 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#1769AA]" />
                  Monthly Revenue Collection Trend
                </CardTitle>
                <CardDescription className="text-xs">Month-on-month fee collection history</CardDescription>
              </CardHeader>

              <CardContent className="p-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted-foreground" />
                    <YAxis 
                      tick={{ fontSize: 12, fill: "currentColor" }}
                      className="text-muted-foreground"
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} 
                    />
                    <Tooltip 
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                      cursor={{ fill: "rgba(255, 255, 255, 0.05)", radius: 6 }}
                      contentStyle={{
                        backgroundColor: "var(--card, #131D31)",
                        borderColor: "var(--border, #1E293B)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "var(--foreground, #F8FAFC)",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                      }}
                    />
                    <Bar dataKey="revenue" fill="#1769AA" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Course-Wise Revenue Distribution */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="p-5 pb-2 border-b border-border">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Course Revenue Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Revenue generated per course program</CardDescription>
              </CardHeader>

              <CardContent className="p-5 h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reports.courseRevenue}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {reports.courseRevenue.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                      contentStyle={{
                        backgroundColor: "var(--card, #131D31)",
                        borderColor: "var(--border, #1E293B)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "var(--foreground, #F8FAFC)",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2 pl-4 max-w-[180px]">
                  {reports.courseRevenue.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="truncate text-slate-700 font-medium">{c.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
