import React from "react";
import { 
  UserCheck, 
  Download, 
  Star, 
  Clock, 
  CheckCircle2, 
  BarChart3, 
  PieChart as PieChartIcon,
  Award
} from "lucide-react";
import { useFacultyStore } from "../../../store/faculty.store";
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

const facultyWorkloadData = [
  { name: "Dr. Rajesh Verma", hours: 48, batches: 3 },
  { name: "Prof. Ananya Roy", hours: 36, batches: 2 },
  { name: "Dr. Suresh Kumar", hours: 42, batches: 2 },
  { name: "Priya Sharma", hours: 28, batches: 1 },
];

const feedbackRatingData = [
  { rating: "5 Stars (Excellent)", count: 68, color: "#10b981" },
  { rating: "4 Stars (Good)", count: 24, color: "#1769AA" },
  { rating: "3 Stars (Average)", count: 6, color: "#f59e0b" },
  { rating: "Below 3 Stars", count: 2, color: "#ef4444" },
];

export const FacultyReports: React.FC = () => {
  const { facultyList } = useFacultyStore();

  const totalFaculty = facultyList.length || 12;

  const handleExport = () => {
    alert("Exporting Faculty Analytics & Performance Report to CSV...");
  };

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
              <h3 className="text-2xl font-bold text-text-primary">{totalFaculty}</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">4.8 / 5.0</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">154 hrs</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">97.5%</h3>
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facultyWorkloadData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", borderRadius: "8px" }} />
                  <Bar dataKey="hours" fill="#1769AA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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

      {/* Faculty Performance Table */}
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
                    <TableCell className="text-xs text-slate-700 font-semibold">2 Batches</TableCell>
                    <TableCell className="text-xs text-slate-700">48 hrs/mo</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        ⭐ 4.8 / 5.0
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">Active</Badge>
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
