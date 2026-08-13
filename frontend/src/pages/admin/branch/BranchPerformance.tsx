import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, GraduationCap, Calendar, DollarSign, Activity, MapPin, Building2, Phone, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBranchStore } from "@/store/branch.store";
import { useBranches } from "@/hooks/useBranches";
import {
  LineChart,
  Line,
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
  Cell
} from "recharts";

const revenueData = [
  { name: "Jan", revenue: 45000 },
  { name: "Feb", revenue: 52000 },
  { name: "Mar", revenue: 38000 },
  { name: "Apr", revenue: 65000 },
  { name: "May", revenue: 59000 },
  { name: "Jun", revenue: 72000 },
];

const studentJoinData = [
  { name: "Jan", joined: 45 },
  { name: "Feb", joined: 60 },
  { name: "Mar", joined: 35 },
  { name: "Apr", joined: 75 },
  { name: "May", joined: 90 },
  { name: "Jun", joined: 110 },
];

const studentJoinWeeklyData = [
  { name: "Week 1", joined: 12 },
  { name: "Week 2", joined: 18 },
  { name: "Week 3", joined: 8 },
  { name: "Week 4", joined: 24 },
];

const courseSalesData = [
  { name: "MERN Stack", value: 45 },
  { name: "Data Science", value: 30 },
  { name: "Python", value: 25 },
];
const COLORS = ["#4f46e5", "#0ea5e9", "#8b5cf6"];

export const BranchPerformance: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [enrollmentView, setEnrollmentView] = useState<'monthly' | 'weekly'>('monthly');

  // Get real branches
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const apiBranch = branchesResponse?.data?.find((b) => b.id === id);

  // Also get mock store to combine data if needed
  const { branches: mockBranches } = useBranchStore();
  const mockedBranch = mockBranches.find((b) => b.code === apiBranch?.code) || mockBranches.find(b => b.code === id); // fallback for purely mocked

  // Combine data
  const branchName = apiBranch?.name || mockedBranch?.name || "Unknown Branch";
  const branchCode = apiBranch?.code || mockedBranch?.code || "N/A";
  const address = apiBranch?.address || mockedBranch?.address || "Location Unavailable";
  const phone = apiBranch?.phone || mockedBranch?.phone || "N/A";
  const status = apiBranch?.status || mockedBranch?.status || "UNKNOWN";

  const studentCount = mockedBranch?.studentCount || Math.floor(Math.random() * 200) + 50;
  const facultyCount = Math.floor(studentCount / 15) + 1;
  const batchCount = mockedBranch?.batchCount || Math.floor(studentCount / 20) + 1;
  const revenueCollected = mockedBranch?.revenueCollected || studentCount * 12000;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/admin/dashboard")}
          className="h-10 w-10 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              {branchName} Performance
            </h2>
            <Badge variant={status === "ACTIVE" ? "success" : "secondary"}>
              {status}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs text-[#1769AA] bg-blue-50 border-blue-200">
              {branchCode}
            </Badge>
          </div>
          <p className="text-sm text-text-secondary flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {address}</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {phone}</span>
          </p>
        </div>
      </div>

      {/* Global Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Enrolled Students</p>
              <h3 className="text-2xl font-bold text-text-primary">{studentCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-pink-50 text-pink-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Assigned Faculty</p>
              <h3 className="text-2xl font-bold text-text-primary">{facultyCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Running Batches</p>
              <h3 className="text-2xl font-bold text-text-primary">{batchCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Revenue Generated</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{revenueCollected.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="col-span-1 shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              Monthly Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `₹${value / 1000}k`} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment by Gender Chart */}
        <Card className="col-span-1 shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Student Enrollments ({enrollmentView === 'monthly' ? 'Monthly' : 'Weekly'})
              </CardTitle>
              <div className="flex bg-slate-100 p-1 rounded-md">
                <button
                  onClick={() => setEnrollmentView('monthly')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${enrollmentView === 'monthly' ? 'bg-white shadow-sm font-semibold text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setEnrollmentView('weekly')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${enrollmentView === 'weekly' ? 'bg-white shadow-sm font-semibold text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Weekly
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentView === 'monthly' ? studentJoinData : studentJoinWeeklyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar name="Students Joined" dataKey="joined" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Course Sales Chart */}
        <Card className="col-span-1 shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-pink-500" />
              Course Sales in Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courseSalesData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {courseSalesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value} Sales`, 'Courses']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity/Logs Specific to Branch */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2 border-b border-border/50">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#1769AA]" />
            Recent Operational Activity in {branchName}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm flex justify-between items-center hover:bg-slate-100 transition-colors">
              <div>
                <span className="font-semibold text-slate-800">New Admission:</span>
                <span className="text-slate-600 ml-2">Rahul Verma joined MERN Stack Batch B3.</span>
              </div>
              <Badge variant="outline" className="text-xs bg-white text-slate-500">2 hours ago</Badge>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm flex justify-between items-center hover:bg-slate-100 transition-colors">
              <div>
                <span className="font-semibold text-slate-800">Faculty Assigned:</span>
                <span className="text-slate-600 ml-2">Priya Sharma assigned to Python Basics.</span>
              </div>
              <Badge variant="outline" className="text-xs bg-white text-slate-500">5 hours ago</Badge>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm flex justify-between items-center hover:bg-slate-100 transition-colors">
              <div>
                <span className="font-semibold text-slate-800">Fee Collected:</span>
                <span className="text-slate-600 ml-2">₹15,000 collected for Data Science batch.</span>
              </div>
              <Badge variant="outline" className="text-xs bg-white text-slate-500">1 day ago</Badge>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm flex justify-between items-center hover:bg-slate-100 transition-colors">
              <div>
                <span className="font-semibold text-slate-800">AI Caller Lead:</span>
                <span className="text-slate-600 ml-2">Warm lead generated by Sarvam AI.</span>
              </div>
              <Badge variant="outline" className="text-xs bg-white text-slate-500">1 day ago</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
