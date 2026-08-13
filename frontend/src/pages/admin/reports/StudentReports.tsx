import React, { useState } from "react";
import { 
  Users, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart3, 
  PieChart as PieChartIcon,
  TrendingUp,
  Search,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useStudentReport } from "../../../hooks/useReports";
import { downloadCsv } from "../../../utils/csvExporter";
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

export const StudentReports: React.FC = () => {
  const { data, isLoading, isError, refetch } = useStudentReport();
  const [searchTerm, setSearchTerm] = useState("");

  const summary = data?.summary || {
    totalStudents: 0,
    avgAttendanceRate: 0,
    assignmentCompletionRate: 0,
    discontinuationRiskCount: 0,
  };

  const enrollmentTrend = data?.enrollmentTrend || [];
  const attendanceDistribution = data?.attendanceDistribution || [];
  const courseShare = data?.courseShare || [];
  const studentList = data?.students || [];

  const filteredStudents = studentList.filter((s) => {
    return (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.courseName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleExport = () => {
    if (!studentList.length) {
      alert("No student report data available to export.");
      return;
    }
    const exportData = studentList.map((s) => ({
      "Roll Code": s.studentCode,
      "Student Name": s.name,
      "Branch": s.branchName,
      "Course": s.courseName,
      "Attendance %": `${s.attendancePercentage}%`,
      "Assignments": `${s.assignmentsSubmitted}/${s.totalAssignments}`,
      "Risk Level": s.riskFlag,
    }));
    downloadCsv("Student_Analytics_Report", exportData);
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center text-text-muted space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#1769AA]" />
        <p className="text-sm font-medium">Aggregating student performance & attendance analytics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-800">Failed to load student reports</h3>
        <p className="text-xs text-red-600">Unable to retrieve real-time student analytics metrics from database.</p>
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
              <h3 className="text-2xl font-bold text-text-primary">{summary.totalStudents}</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">{summary.avgAttendanceRate}%</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">{summary.assignmentCompletionRate}%</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">{summary.discontinuationRiskCount} Students</h3>
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
              {enrollmentTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={enrollmentTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} />
                    <Area type="monotone" dataKey="students" stroke="#1769AA" fill="#1769AA" fillOpacity={0.15} strokeWidth={2} name="Total Students" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No enrollment data available.
                </div>
              )}
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
              {attendanceDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Headcount">
                      {attendanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No attendance distribution available.
                </div>
              )}
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
              {courseShare.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={courseShare}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      paddingAngle={3}
                    >
                      {courseShare.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No course share data.
                </div>
              )}
            </div>
            <div className="w-full space-y-2 text-xs pt-2 border-t border-slate-100">
              {courseShare.map((item) => (
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

        {/* Student Risk & Performance Directory Table */}
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
                  filteredStudents.slice(0, 10).map((student) => (
                    <TableRow key={student.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs font-bold text-[#1769AA] block">
                            {student.studentCode}
                          </span>
                          <span className="font-medium text-slate-900 text-xs">
                            {student.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{student.courseName}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-700">
                        {student.attendancePercentage}%
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {student.assignmentsSubmitted}/{student.totalAssignments} Submitted
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            student.riskFlag === "Triggered"
                              ? "destructive"
                              : student.riskFlag === "At Risk"
                              ? "secondary"
                              : "success"
                          }
                        >
                          {student.riskFlag}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-400 text-xs">
                      No student performance records found.
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
