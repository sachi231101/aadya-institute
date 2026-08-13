import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  Users, 
  GraduationCap, 
  UserCheck, 
  CreditCard, 
  Target, 
  BookOpen, 
  Settings, 
  ArrowRight,
  Plus,
  TrendingUp,
  IndianRupee,
  UserPlus
} from "lucide-react";
import { useStudentStore } from "@/store/student.store";
import { useFacultyList } from "@/hooks/useFaculty";
import { useCourseStore } from "@/store/course.store";
import { useAuthStore } from "@/store/auth.store";
import { useBranch } from "@/hooks/useBranches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from "recharts";

export const CenterDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const { user } = useAuthStore();
  const { data: branchResponse } = useBranch(user?.branchId || undefined);
  const branchName = branchResponse?.data?.name || "Bengaluru Main Campus";

  // --- Mock Data ---
  const students = [
    ...Array(145).fill({ status: "ACTIVE" }),
    ...Array(30).fill({ status: "COMPLETED" }),
    ...Array(15).fill({ status: "ON_LEAVE" }),
    ...Array(10).fill({ status: "DISCONTINUED" }),
  ] as any[];

  const facultyList = Array(18).fill({}) as any[];
  
  const batches = [
    ...Array(8).fill({ status: "ACTIVE" }),
    ...Array(5).fill({ status: "COMPLETED" }),
    ...Array(3).fill({ status: "UPCOMING" }),
  ] as any[];
  
  const courses = Array(6).fill({}) as any[];
  
  const monthlyRevenue = 450000;
  const pendingFee = 120000;
  const previousMonthRevenue = 380000;
  // -----------------

  const activeBatches = batches.filter((b) => b.status === "ACTIVE").length;

  const studentStatusCounts = students.reduce((acc, student) => {
    if (student.status) {
      acc[student.status] = (acc[student.status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const studentPieData = Object.entries(studentStatusCounts).map(([name, value]) => ({ name, value }));

  const batchStatusCounts = batches.reduce((acc, batch) => {
    if (batch.status) {
      acc[batch.status] = (acc[batch.status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const batchBarData = Object.entries(batchStatusCounts).map(([name, value]) => ({ name, value }));

  const COLORS = ['#1769AA', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Building2 className="h-6 w-6 text-[#1769AA]" />
            Center Manager Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Branch Operations Overview & Administration — {branchName}
            Branch Operations Overview & Administration — Bengaluru Branch
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate("/center/students/add")}
            className="bg-[#1769AA] hover:bg-[#F39A16] text-white gap-2 transition-colors"
          >
            <Plus size={16} /> Add Student
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Revenue</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">₹{monthlyRevenue.toLocaleString()}</h3>
              <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> This Month
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
              <IndianRupee className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Fee</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">₹{pendingFee.toLocaleString()}</h3>
              <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                Outstanding Balance
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Students</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{students.filter(s => s.status === 'ACTIVE').length}</h3>
              <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Currently Enrolled
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Previous Month Revenue</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">₹{previousMonthRevenue.toLocaleString()}</h3>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Last Month Total
              </p>
            </div>
            <div className="p-3 bg-slate-500/10 rounded-xl text-slate-600">
              <IndianRupee className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance Overview */}
      <h2 className="text-lg font-semibold text-text-primary mt-8">Branch Performance Overview</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Student Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={studentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label
                  >
                    {studentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Batches Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1769AA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
