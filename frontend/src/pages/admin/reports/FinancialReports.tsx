import React from "react";
import { 
  DollarSign, 
  Download, 
  TrendingUp, 
  CreditCard, 
  CheckCircle2, 
  BarChart3, 
  PieChart as PieChartIcon,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useFinancialReport } from "../../../hooks/useReports";
import { downloadCsv } from "../../../utils/csvExporter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export const FinancialReports: React.FC = () => {
  const { data, isLoading, isError, refetch } = useFinancialReport();

  const summary = data?.summary || {
    totalCollected: 0,
    totalPending: 0,
    collectionRate: 0,
    projectedRevenue: 0,
  };

  const monthlyFinancialData = data?.monthlyTrend || [];
  const paymentMethodData = data?.paymentMethodShare || [];
  const monthlyBreakdown = data?.monthlyBreakdown || [];

  const handleExport = () => {
    if (!monthlyBreakdown.length) {
      alert("No financial report data available to export.");
      return;
    }
    const exportData = monthlyBreakdown.map((row) => {
      const rate = Math.round((row.collected / (row.collected + row.pending || 1)) * 100);
      return {
        "Period / Month": row.month,
        "Gross Collected (₹)": row.collected,
        "Pending Dues (₹)": row.pending,
        "Collection Rate": `${rate}%`,
        "Financial Status": "Healthy",
      };
    });
    downloadCsv("Financial_Revenue_Report", exportData);
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center text-muted-foreground space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm font-medium">Calculating revenue, outstanding balances, and financial health from PostgreSQL...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-destructive/10 border border-destructive/20 rounded-2xl text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Failed to load financial reports</h3>
        <p className="text-xs text-muted-foreground">Unable to retrieve real-time fee collection analytics from backend.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
          Retry Loading
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Financial Health & Revenue Reports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Comprehensive revenue analytics, monthly collection trends, outstanding fee dues, and payment channel distribution.
          </p>
        </div>

        <Button 
          variant="outline"
          className="border-border text-foreground hover:bg-muted/50 shadow-xs cursor-pointer"
          onClick={handleExport}
        >
          <Download className="mr-2 h-4 w-4 text-primary" />
          Export Financial CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border bg-card shadow-xs overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Net Revenue Collected</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹{summary.totalCollected.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Outstanding Fee Dues</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">₹{summary.totalPending.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 border border-blue-100 dark:border-sky-900/40">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Collection Efficiency</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{summary.collectionRate}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Projected Revenue</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">₹{summary.projectedRevenue.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Pending Bar Chart */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 border-b border-border">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Monthly Collection vs Pending Dues
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Monthly revenue collected vs outstanding fee balances (in ₹).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="h-64 w-full">
              {monthlyFinancialData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyFinancialData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/60" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted-foreground" tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip 
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Amount"]}
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
                    <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} name="Collected Revenue" />
                    <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending Dues" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  No monthly trend data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Channel Pie Chart */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 border-b border-border">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Payment Gateway & Channel Share
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Distribution of fee collections across UPI, NetBanking, Cards, and Cash.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4 flex flex-col md:flex-row items-center gap-6">
            <div className="h-56 w-full md:w-1/2">
              {paymentMethodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      paddingAngle={3}
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Amount"]}
                      contentStyle={{
                        backgroundColor: "var(--card, #131D31)",
                        borderColor: "var(--border, #1E293B)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "var(--foreground, #F8FAFC)",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  No payment method data available.
                </div>
              )}
            </div>

            <div className="w-full md:w-1/2 space-y-2 text-xs">
              {paymentMethodData.map((item) => (
                <div key={item.name} className="flex justify-between items-center p-2 rounded-lg bg-muted/20 border border-border">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-foreground">{item.name}</span>
                  </div>
                  <span className="font-bold text-foreground font-mono">₹{item.value.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Monthly Summary Table */}
      <Card className="border border-border bg-card shadow-xs overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-border">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Monthly Financial Summary Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50 border-b border-border">
              <TableRow className="border-border">
                <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider pl-6">Period / Month</TableHead>
                <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">Gross Collected (₹)</TableHead>
                <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">Pending Dues (₹)</TableHead>
                <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">Collection Rate</TableHead>
                <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider pr-6 text-center">Financial Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {monthlyBreakdown.length > 0 ? (
                monthlyBreakdown.map((row) => {
                  const total = row.collected + row.pending;
                  const rate = total > 0 ? Math.round((row.collected / total) * 100) : 100;
                  return (
                    <TableRow key={row.month} className="hover:bg-muted/40 transition-colors border-border">
                      <TableCell className="font-semibold text-foreground text-xs pl-6">{row.month}</TableCell>
                      <TableCell className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">₹{row.collected.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">₹{row.pending.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs font-bold text-foreground">{rate}%</TableCell>
                      <TableCell className="pr-6 text-center">
                        <Badge className={rate >= 70 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold"}>
                          {rate >= 70 ? "Healthy" : "Attention"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs">
                    No financial breakdown records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
