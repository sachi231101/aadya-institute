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
      <div className="py-20 flex flex-col justify-center items-center text-text-muted space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#1769AA]" />
        <p className="text-sm font-medium">Calculating revenue, outstanding balances, and financial health...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-800">Failed to load financial reports</h3>
        <p className="text-xs text-red-600">Unable to retrieve real-time fee collection analytics from backend.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry Loading
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Financial Health & Revenue Reports</h2>
          <p className="text-sm text-text-secondary">
            Comprehensive revenue analytics, monthly collection trends, outstanding fee dues, and payment channel distribution.
          </p>
        </div>

        <Button 
          variant="outline"
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={handleExport}
        >
          <Download className="mr-2 h-4 w-4 text-[#1769AA]" />
          Export Financial CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Net Revenue Collected</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{summary.totalCollected.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Outstanding Fee Dues</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{summary.totalPending.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Collection Efficiency</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.collectionRate}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Projected Revenue</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{summary.projectedRevenue.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Pending Bar Chart */}
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#1769AA]" />
              Monthly Collection vs Pending Dues
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Monthly revenue collected vs outstanding fee balances (in ₹).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="h-64 w-full">
              {monthlyFinancialData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyFinancialData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip 
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Amount"]}
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} 
                    />
                    <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} name="Collected Revenue" />
                    <Bar dataKey="pending" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pending Dues" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No monthly trend data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Channel Pie Chart */}
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-purple-600" />
              Payment Gateway & Channel Share
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
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
                      contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No payment method data available.
                </div>
              )}
            </div>

            <div className="w-full md:w-1/2 space-y-2 text-xs">
              {paymentMethodData.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-800">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">₹{item.value.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Monthly Summary Table */}
      <Card className="border-border/50 bg-white shadow-sm">
        <CardHeader className="p-5 pb-2 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#1769AA]" />
            Monthly Financial Summary Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-900">Period / Month</TableHead>
                <TableHead className="font-semibold text-slate-900">Gross Collected (₹)</TableHead>
                <TableHead className="font-semibold text-slate-900">Pending Dues (₹)</TableHead>
                <TableHead className="font-semibold text-slate-900">Collection Rate</TableHead>
                <TableHead className="font-semibold text-slate-900">Financial Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyBreakdown.length > 0 ? (
                monthlyBreakdown.map((row) => {
                  const total = row.collected + row.pending;
                  const rate = total > 0 ? Math.round((row.collected / total) * 100) : 100;
                  return (
                    <TableRow key={row.month} className="hover:bg-slate-50">
                      <TableCell className="font-semibold text-slate-900 text-xs">{row.month}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-700">₹{row.collected.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs font-bold text-red-600">₹{row.pending.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800">{rate}%</TableCell>
                      <TableCell>
                        <Badge variant={rate >= 70 ? "success" : "secondary"}>
                          {rate >= 70 ? "Healthy" : "Attention"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-400 text-xs">
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
