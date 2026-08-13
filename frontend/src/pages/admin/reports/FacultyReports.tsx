import React from "react";
import { 
  UserCheck, 
  Download, 
  Star, 
  Clock, 
  CheckCircle2, 
  BarChart3, 
  PieChart as PieChartIcon,
  Award,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useFacultyReport } from "../../../hooks/useReports";
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

export const FacultyReports: React.FC = () => {
  const { data, isLoading, isError, refetch } = useFacultyReport();

  const summary = data?.summary || {
    totalActiveFaculty: 0,
    avgStudentRating: 0,
    monthlyTeachingHours: 0,
    sessionCompliancePercentage: 0,
  };

  const facultyWorkloadData = data?.workload || [];
  const feedbackRatingData = data?.ratingDistribution || [];
  const facultyList = data?.faculty || [];

  const handleExport = () => {
    if (!facultyList.length) {
      alert("No faculty report data available to export.");
      return;
    }
    const exportData = facultyList.map((f) => ({
      "Faculty Code": f.facultyCode,
      "Faculty Name": f.name,
      "Specialization": f.specialization,
      "Assigned Cohorts": `${f.assignedBatchesCount} Batches`,
      "Teaching Hours": `${f.teachingHours} hrs/mo`,
      "Student Rating": f.avgRating,
      "Status": f.status,
    }));
    downloadCsv("Faculty_Performance_Report", exportData);
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center text-text-muted space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#1769AA]" />
        <p className="text-sm font-medium">Aggregating instructor workloads & feedback analytics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-800">Failed to load faculty reports</h3>
        <p className="text-xs text-red-600">Unable to retrieve real-time faculty metrics from backend service.</p>
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
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Faculty Analytics & Reports</h2>
          <p className="text-sm text-text-secondary">
            Evaluate instructor workload distribution, student feedback ratings, and session completion compliance.
          </p>
        </div>

        <Button 
          variant="outline"
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={handleExport}
        >
          <Download className="mr-2 h-4 w-4 text-[#1769AA]" />
          Export Faculty CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Active Faculty</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.totalActiveFaculty}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Avg Student Rating</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.avgStudentRating} / 5.0</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Monthly Teaching Hours</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.monthlyTeachingHours} hrs</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Session Compliance</p>
              <h3 className="text-2xl font-bold text-text-primary">{summary.sessionCompliancePercentage}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Bar Chart */}
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#1769AA]" />
              Faculty Monthly Workload (Hours)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Total teaching hours delivered by primary instructors this month.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="h-64 w-full">
              {facultyWorkloadData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={facultyWorkloadData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} />
                    <Bar dataKey="hours" fill="#1769AA" radius={[4, 4, 0, 0]} name="Teaching Hours" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No workload data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rating Share Pie Chart */}
        <Card className="border-border/50 bg-white shadow-sm">
          <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-amber-500" />
              Student Feedback Rating Split
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Aggregated post-class student feedback ratings.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4 flex flex-col md:flex-row items-center gap-6">
            <div className="h-56 w-full md:w-1/2">
              {feedbackRatingData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={feedbackRatingData}
                      dataKey="count"
                      nameKey="rating"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      paddingAngle={3}
                    >
                      {feedbackRatingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No feedback rating distribution.
                </div>
              )}
            </div>

            <div className="w-full md:w-1/2 space-y-2 text-xs">
              {feedbackRatingData.map((item) => (
                <div key={item.rating} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-800">{item.rating}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.count} Ratings</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Faculty Performance Summary Directory */}
      <Card className="border-border/50 bg-white shadow-sm">
        <CardHeader className="p-5 pb-2 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-[#1769AA]" />
            Faculty Performance Summary Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-900">Faculty Code & Name</TableHead>
                <TableHead className="font-semibold text-slate-900">Specialization</TableHead>
                <TableHead className="font-semibold text-slate-900">Assigned Cohorts</TableHead>
                <TableHead className="font-semibold text-slate-900">Teaching Hours</TableHead>
                <TableHead className="font-semibold text-slate-900">Student Rating</TableHead>
                <TableHead className="font-semibold text-slate-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facultyList.length > 0 ? (
                facultyList.map((faculty) => (
                  <TableRow key={faculty.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <span className="font-mono text-xs font-bold text-[#1769AA] block">
                          {faculty.facultyCode}
                        </span>
                        <span className="font-medium text-slate-900 text-xs">
                          {faculty.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{faculty.specialization}</TableCell>
                    <TableCell className="text-xs text-slate-700 font-semibold">{faculty.assignedBatchesCount} Batches</TableCell>
                    <TableCell className="text-xs text-slate-700">{faculty.teachingHours} hrs/mo</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        ⭐ {faculty.avgRating} / 5.0
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={faculty.status === "ACTIVE" ? "success" : "secondary"}>
                        {faculty.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-400 text-xs">
                    No faculty records found.
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
