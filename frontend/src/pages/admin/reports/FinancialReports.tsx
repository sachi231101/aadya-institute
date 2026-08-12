import React from "react";
import { 
  DollarSign, 
  Download, 
  TrendingUp, 
  CreditCard, 
  CheckCircle2, 
  BarChart3, 
  PieChart as PieChartIcon,
  AlertCircle
} from "lucide-react";
import { useFeeStore } from "../../../store/fee.store";
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

const monthlyFinancialData = [
  { month: "Sep 2025", collected: 185000, pending: 45000 },
  { month: "Oct 2025", collected: 220000, pending: 38000 },
  { month: "Nov 2025", collected: 290000, pending: 52000 },
  { month: "Dec 2025", collected: 340000, pending: 40000 },
  { month: "Jan 2026", collected: 410000, pending: 65000 },
  { month: "Feb 2026", collected: 380000, pending: 75000 },
];

const paymentMethodData = [
  { name: "UPI / QR", value: 560000, color: "#10b981" },
  { name: "NetBanking", value: 280000, color: "#1769AA" },
  { name: "Credit/Debit Card", value: 140000, color: "#8b5cf6" },
  { name: "Cash / Front Desk", value: 100000, color: "#f59e0b" },
];

export const FinancialReports: React.FC = () => {
  const { payments, pendingFees } = useFeeStore();

  const totalCollected = payments.reduce((acc, p) => (p.status === "SUCCESS" ? acc + p.amount : acc), 0) + 1000000;
  const totalPending = pendingFees.reduce((acc, pf) => acc + pf.dueAmount, 0) + 75000;

  const collectionRate = Math.round((totalCollected / (totalCollected + totalPending)) * 100);

  const handleExport = () => {
    alert("Exporting Comprehensive Financial & Revenue Report to CSV...");
  };

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
              <h3 className="text-2xl font-bold text-text-primary">₹{totalCollected.toLocaleString("en-IN")}</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">₹{totalPending.toLocaleString("en-IN")}</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">{collectionRate}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Projected Q1 Revenue</p>
              <h3 className="text-2xl font-bold text-text-primary">₹15,00,000</h3>
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
              {monthlyFinancialData.map((row) => {
                const rate = Math.round((row.collected / (row.collected + row.pending)) * 100);
                return (
                  <TableRow key={row.month} className="hover:bg-slate-50">
                    <TableCell className="font-semibold text-slate-900 text-xs">{row.month}</TableCell>
                    <TableCell className="text-xs font-bold text-emerald-700">₹{row.collected.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-xs font-bold text-red-600">₹{row.pending.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">{rate}%</TableCell>
                    <TableCell>
                      <Badge variant="success">Healthy</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
