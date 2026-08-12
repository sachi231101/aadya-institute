import React from "react";
import { 
  TrendingUp, 
  DollarSign, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Download,
  CreditCard,
  Building,
  Smartphone,
  Wallet
} from "lucide-react";
import { useFeeStore } from "../../../store/fee.store";
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

const monthlyData = [
  { month: "Sep 2025", revenue: 185000 },
  { month: "Oct 2025", revenue: 220000 },
  { month: "Nov 2025", revenue: 290000 },
  { month: "Dec 2025", revenue: 340000 },
  { month: "Jan 2026", revenue: 410000 },
  { month: "Feb 2026", revenue: 380000 },
];

const courseRevenueData = [
  { name: "Full Stack MERN", value: 420000, color: "#1769AA" },
  { name: "Backend Systems", value: 280000, color: "#10b981" },
  { name: "Data Science & AI", value: 240000, color: "#f59e0b" },
  { name: "UI/UX Design", value: 140000, color: "#8b5cf6" },
];

export const FeeReports: React.FC = () => {
  const { payments } = useFeeStore();

  const totalCollected = payments.reduce((acc, p) => (p.status === "SUCCESS" ? acc + p.amount : acc), 0) + 1000000;
  const targetRevenue = 1500000;
  const targetAchievedPercent = Math.min(100, Math.round((totalCollected / targetRevenue) * 100));

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
          onClick={() => alert("Downloading Fee Summary Report PDF...")}
        >
          <Download className="mr-2 h-4 w-4 text-[#1769AA]" />
          Export Financial Report
        </Button>
      </div>

      {/* Target Progress Bar */}
      <Card className="border-border/50 bg-white shadow-sm p-6 space-y-3">
        <div className="flex justify-between items-center text-sm font-semibold">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#1769AA]" />
            <span className="text-slate-900">Q1 Revenue Target vs Collection</span>
          </div>
          <span className="text-[#1769AA] font-bold text-base">
            ₹{totalCollected.toLocaleString("en-IN")} / ₹{targetRevenue.toLocaleString("en-IN")} ({targetAchievedPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div 
            className="bg-[#1769AA] h-full rounded-full transition-all duration-500"
            style={{ width: `${targetAchievedPercent}%` }}
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
            <CardDescription className="text-xs text-slate-500">
              Total fee collections over the past 6 calendar months (in ₹).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                    contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }}
                  />
                  <Bar dataKey="revenue" fill="#1769AA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Course-Wise Revenue Distribution Pie Chart */}
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-emerald-600" />
              Course-Wise Revenue Distribution
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Proportion of total fee revenue generated per academy course track.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4 flex flex-col md:flex-row items-center gap-6">
            <div className="h-64 w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courseRevenueData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {courseRevenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Collection"]}
                    contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full md:w-1/2 space-y-3 text-xs">
              {courseRevenueData.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-800">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">₹{item.value.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Distribution */}
      <Card className="border-border/50 bg-white shadow-sm">
        <CardHeader className="p-5 pb-2 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Payment Channel Split
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Breakdown of student payments by payment gateway and mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-3">
              <Smartphone className="h-8 w-8 text-emerald-600" />
              <div>
                <span className="text-xs text-slate-500 font-medium">UPI / GPay / PhonePe</span>
                <h4 className="text-lg font-bold text-slate-900">₹5,60,000</h4>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-center gap-3">
              <Building className="h-8 w-8 text-[#1769AA]" />
              <div>
                <span className="text-xs text-slate-500 font-medium">NetBanking</span>
                <h4 className="text-lg font-bold text-slate-900">₹2,80,000</h4>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100 flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <div>
                <span className="text-xs text-slate-500 font-medium">Credit/Debit Cards</span>
                <h4 className="text-lg font-bold text-slate-900">₹1,40,000</h4>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 flex items-center gap-3">
              <Wallet className="h-8 w-8 text-amber-600" />
              <div>
                <span className="text-xs text-slate-500 font-medium">Cash / Desk Collection</span>
                <h4 className="text-lg font-bold text-slate-900">₹1,00,000</h4>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
