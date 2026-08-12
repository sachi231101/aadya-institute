import React from "react";
import { 
  BookOpen, 
  Download, 
  Layers, 
  GraduationCap, 
  CheckCircle2, 
  BarChart3, 
  PieChart as PieChartIcon
} from "lucide-react";
import { useCourseStore } from "../../../store/course.store";
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

const courseEnrollmentComparison = [
  { course: "Full Stack MERN", students: 64, capacity: 70 },
  { course: "Backend Systems", students: 42, capacity: 50 },
  { course: "Data Science & AI", students: 38, capacity: 40 },
  { course: "UI/UX Design", students: 28, capacity: 35 },
];

const moduleStatusData = [
  { status: "Modules Completed", count: 18, color: "#10b981" },
  { status: "Modules In Progress", count: 8, color: "#1769AA" },
  { status: "Modules Upcoming", count: 4, color: "#f59e0b" },
];

export const CourseReports: React.FC = () => {
  const { courses, batches } = useCourseStore();

  const totalCourses = courses.length || 4;
  const activeBatches = batches.length || 4;

  const handleExport = () => {
    alert("Exporting Course & Curriculum Analytics Report to CSV...");
  };

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
              <h3 className="text-2xl font-bold text-text-primary">{totalCourses}</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">{activeBatches}</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">89.4%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Syllabus Completion</p>
              <h3 className="text-2xl font-bold text-text-primary">76.0%</h3>
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
            </div>
          </CardContent>
        </Card>

        {/* Module Completion Pie Chart */}
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-emerald-600" />
              Syllabus Module Status Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Curriculum module delivery status across all courses.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4 flex flex-col md:flex-row items-center gap-6">
            <div className="h-56 w-full md:w-1/2">
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
            </div>

            <div className="w-full md:w-1/2 space-y-2 text-xs">
              {moduleStatusData.map((item) => (
                <div key={item.status} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-800">{item.status}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.count} Modules</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Performance Metrics Table */}
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
                <TableHead className="font-semibold text-slate-900">Syllabus Progress</TableHead>
                <TableHead className="font-semibold text-slate-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length > 0 ? (
                courses.map((course) => (
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
                    <TableCell className="text-xs text-slate-600">{course.category}</TableCell>
                    <TableCell className="text-xs text-slate-700">{course.durationMonths} Months</TableCell>
                    <TableCell className="text-xs text-slate-700">{course.modulesCount || 6} Modules</TableCell>
                    <TableCell className="text-xs font-bold text-slate-900">{course.enrolledStudents || 45}</TableCell>
                    <TableCell>
                      <div className="w-28 space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                          <span>Progress</span>
                          <span>75%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#1769AA] h-full w-[75%] rounded-full" />
                        </div>
                      </div>
                    </TableCell>
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
