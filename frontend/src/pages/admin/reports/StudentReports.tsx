import React, { useState } from "react";
import { 
  Users, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart3, 
  PieChart as PieChartIcon,
  TrendingUp,
  Search
} from "lucide-react";
import { useStudentStore } from "../../../store/student.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AreaChart,
  Area,
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

const enrollmentTrend = [
  { month: "Sep 2025", students: 110 },
  { month: "Oct 2025", students: 135 },
  { month: "Nov 2025", students: 160 },
  { month: "Dec 2025", students: 195 },
  { month: "Jan 2026", students: 230 },
  { month: "Feb 2026", students: 264 },
];

const attendanceDistData = [
  { range: "90-100% Attendance", count: 145, color: "#10b981" },
  { range: "75-89% Attendance", count: 85, color: "#1769AA" },
  { range: "50-74% Attendance", count: 24, color: "#f59e0b" },
  { range: "Below 50% (Risk)", count: 10, color: "#ef4444" },
];

const courseShareData = [
  { name: "Full Stack MERN", value: 112, color: "#1769AA" },
  { name: "Backend Engineering", value: 68, color: "#10b981" },
  { name: "Data Science & AI", value: 54, color: "#f59e0b" },
  { name: "UI/UX Design", value: 30, color: "#8b5cf6" },
];

export const StudentReports: React.FC = () => {
  const { students } = useStudentStore();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = students.filter((s) => {
    const studentName = s.user?.name || (s as any).name || "";
    return (
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalStudents = students.length || 264;

  const handleExport = () => {
    alert("Exporting Student Analytics & Performance Report to CSV...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Student Analytics & Reports</h2>
          <p className="text-sm text-text-secondary">
            Monitor student enrollment growth, attendance performance, and discontinuation risk metrics.
          </p>
        </div>

        <Button 
          variant="outline"
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={handleExport}
        >
          <Download className="mr-2 h-4 w-4 text-[#1769AA]" />
          Export Student CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Enrolled Students</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalStudents}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Avg Attendance Rate</p>
              <h3 className="text-2xl font-bold text-text-primary">88.4%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Assignment Completion</p>
              <h3 className="text-2xl font-bold text-text-primary">91.2%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Discontinuation Risk</p>
              <h3 className="text-2xl font-bold text-text-primary">10 Students</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend Area Chart */}
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#1769AA]" />
              Student Enrollment Growth Trend
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Cumulative student intake trajectory over the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="students" stroke="#1769AA" fill="#1769AA" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Distribution Bar Chart */}
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              Attendance Distribution Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Number of students grouped by attendance percentage thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceDistData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {attendanceDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Share Pie Chart & Performance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/50 bg-white shadow-sm lg:col-span-1">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-purple-600" />
              Course Enrollment Share
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-4 flex flex-col items-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courseShareData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={3}
                  >
                    {courseShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 text-xs pt-2 border-t border-slate-100">
              {courseShareData.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-800">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value} Students</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Student Risk & Performance Table */}
        <Card className="border-border/50 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="p-5 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Student Performance & Risk Directory
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Individual attendance, assignment scores, and discontinuation alert flags.
              </CardDescription>
            </div>
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-900">Roll No & Student</TableHead>
                  <TableHead className="font-semibold text-slate-900">Course</TableHead>
                  <TableHead className="font-semibold text-slate-900">Attendance</TableHead>
                  <TableHead className="font-semibold text-slate-900">Assignments</TableHead>
                  <TableHead className="font-semibold text-slate-900">Risk Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.slice(0, 5).map((student) => (
                    <TableRow key={student.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs font-bold text-[#1769AA] block">
                            {student.studentCode}
                          </span>
                          <span className="font-medium text-slate-900 text-xs">
                            {student.user?.name || (student as any).name || student.studentCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">Full Stack MERN Architecture</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-700">92%</TableCell>
                      <TableCell className="text-xs text-slate-700">8/8 Submitted</TableCell>
                      <TableCell>
                        <Badge variant="success">Normal</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-400 text-xs">
                      No student records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
