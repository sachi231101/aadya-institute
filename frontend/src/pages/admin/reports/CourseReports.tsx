import React from "react";
import { 
  BookOpen, 
  Download, 
  Layers, 
  GraduationCap, 
  CheckCircle2, 
  BarChart3, 
  PieChart as PieChartIcon,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useCourseReport } from "../../../hooks/useReports";
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

export const CourseReports: React.FC = () => {
  const { data, isLoading, isError, refetch } = useCourseReport();

  const summary = data?.summary || {
    totalCourses: 0,
    activeBatches: 0,
    avgBatchOccupancy: 0,
    totalModules: 0,
  };

  const courseEnrollmentComparison = data?.enrollmentComparison || [];
  const moduleStatusData = data?.structureOverview || [];
  const courseList = data?.courses || [];

  const handleExport = () => {
    if (!courseList.length) {
      alert("No course report data available to export.");
      return;
    }
    const exportData = courseList.map((c) => ({
      "Course Code": c.code,
      "Course Title": c.name,
      "Category": c.category,
      "Duration": `${c.durationMonths} Months`,
      "Modules Count": c.modulesCount,
      "Enrolled Students": c.enrolledStudents,
      "Batches Count": c.batchesCount,
      "Status": c.status,
    }));
    downloadCsv("Course_Curriculum_Report", exportData);
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center text-text-muted space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#1769AA]" />
        <p className="text-sm font-medium">Aggregating course popularity & curriculum occupancy metrics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-800">Failed to load course reports</h3>
        <p className="text-xs text-red-600">Unable to retrieve real-time course analytics metrics from backend.</p>
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
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Course & Curriculum Reports</h2>
          <p className="text-sm text-text-secondary">
            Evaluate course popularity, batch occupancy rates, and syllabus module completion progress.
          </p>
        </div>

        <Button 
          variant="outline"
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={handleExport}
        >
          <Download className="mr-2 h-4 w-4 text-[#1769AA]" />
          Export Course CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Active Courses</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.totalCourses}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Active Cohort Batches</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.activeBatches}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Avg Batch Occupancy</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.avgBatchOccupancy}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Modules</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.totalModules}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Enrollment Comparison Bar Chart */}
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#1769AA]" />
              Course Enrollment vs Seat Capacity
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Enrolled student headcount vs maximum batch seat capacity.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="h-64 w-full">
              {courseEnrollmentComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseEnrollmentComparison}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="course" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} />
                    <Bar dataKey="students" fill="#1769AA" radius={[4, 4, 0, 0]} name="Enrolled Students" />
                    <Bar dataKey="capacity" fill="#CBD5E1" radius={[4, 4, 0, 0]} name="Max Capacity" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No course enrollment data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Module Structure Overview Pie Chart */}
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-emerald-600" />
              Structure Overview
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Curriculum modules and batch distribution across academy.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4 flex flex-col md:flex-row items-center gap-6">
            <div className="h-56 w-full md:w-1/2">
              {moduleStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={moduleStatusData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      paddingAngle={3}
                    >
                      {moduleStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No structure overview available.
                </div>
              )}
            </div>

            <div className="w-full md:w-1/2 space-y-2 text-xs">
              {moduleStatusData.map((item) => (
                <div key={item.status} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-800">{item.status}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Performance Directory Table */}
      <Card className="border-border/50 bg-white shadow-sm">
        <CardHeader className="p-5 pb-2 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#1769AA]" />
            Course Performance Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-900">Course Code & Title</TableHead>
                <TableHead className="font-semibold text-slate-900">Category</TableHead>
                <TableHead className="font-semibold text-slate-900">Duration</TableHead>
                <TableHead className="font-semibold text-slate-900">Modules</TableHead>
                <TableHead className="font-semibold text-slate-900">Enrolled Students</TableHead>
                <TableHead className="font-semibold text-slate-900">Batches Count</TableHead>
                <TableHead className="font-semibold text-slate-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courseList.length > 0 ? (
                courseList.map((course) => (
                  <TableRow key={course.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <span className="font-mono text-xs font-bold text-[#1769AA] block">
                          {course.code}
                        </span>
                        <span className="font-medium text-slate-900 text-xs">
                          {course.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{course.category || "Technology"}</TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {course.durationMonths} Months
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">{course.modulesCount} Modules</TableCell>
                    <TableCell className="text-xs font-bold text-slate-900">{course.enrolledStudents}</TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">{course.batchesCount}</TableCell>
                    <TableCell>
                      <Badge variant={course.status === "ACTIVE" ? "success" : "secondary"}>
                        {course.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-400 text-xs">
                    No course records found.
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
