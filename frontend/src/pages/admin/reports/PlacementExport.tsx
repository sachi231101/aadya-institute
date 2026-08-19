import React, { useState } from "react";
import {
  Download, ExternalLink, FileSpreadsheet, Users, GraduationCap,
  CheckCircle2, Search
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useBranchStore } from "@/store/branch.store";

const PLACEMENT_PORTAL_URL = "https://placement.aadyainstitution.com/";

export const PlacementExport: React.FC = () => {
  const { selectedBranchId } = useBranchStore();
  const [search, setSearch] = useState("");

  // Fetch completed students
  const { data: studentsResponse, isLoading } = useQuery({
    queryKey: ["students", "completed", selectedBranchId, search],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "100" };
      if (selectedBranchId !== "ALL") params.branchId = selectedBranchId;
      if (search) params.search = search;
      const response = await api.get("/students", { params });
      return response.data;
    },
  });

  const students = studentsResponse?.data || [];

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "Course", "Branch", "Attendance %", "Avg Score", "Status"];
    const rows = students.map((s: any) => [
      s.user?.name || s.name || "",
      s.user?.email || s.email || "",
      s.user?.phone || s.phone || "",
      s.course?.name || s.courseName || "",
      s.branch?.name || "",
      s.attendancePercentage || "N/A",
      s.averageScore || "N/A",
      s.status || "ACTIVE",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell: string) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aadya_placement_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    // For Excel, we use CSV with .xlsx-friendly formatting
    const headers = ["Name", "Email", "Phone", "Course", "Branch", "Attendance %", "Avg Score", "Status"];
    const rows = students.map((s: any) => [
      s.user?.name || s.name || "",
      s.user?.email || s.email || "",
      s.user?.phone || s.phone || "",
      s.course?.name || s.courseName || "",
      s.branch?.name || "",
      s.attendancePercentage || "N/A",
      s.averageScore || "N/A",
      s.status || "ACTIVE",
    ]);

    // Create tab-separated values (opens in Excel nicely)
    const content = [headers, ...rows]
      .map((row) => row.join("\t"))
      .join("\n");

    const blob = new Blob([content], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aadya_placement_export_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[#F39A16]" />
            Placement Export — Phase 3
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Export student data for the Aadya Placement Portal
          </p>
        </div>
        <Button
          asChild
          className="bg-[#F39A16] hover:bg-[#e08a0e] text-white font-semibold gap-2 shadow-sm"
        >
          <a href={PLACEMENT_PORTAL_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} />
            Open Placement Portal
          </a>
        </Button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex items-start gap-3">
        <FileSpreadsheet className="h-5 w-5 text-[#F39A16] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Phase 3: Placement Bridge</p>
          <p className="text-sm text-amber-800 mt-0.5">
            Export completed student data as CSV or Excel. Then manually import into the
            <a href={PLACEMENT_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#F39A16] hover:underline ml-1">
              Placement Portal ↗
            </a>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-[#1769AA]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{students.length}</p>
              <p className="text-xs text-text-secondary font-medium">Total Students</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {students.filter((s: any) => s.status === "COMPLETED").length}
              </p>
              <p className="text-xs text-text-secondary font-medium">Course Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-[#F39A16]" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {students.filter((s: any) => s.status === "ACTIVE").length}
              </p>
              <p className="text-xs text-text-secondary font-medium">Active Students</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Export Buttons */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[250px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="gap-2 font-semibold border-green-300 text-green-700 hover:bg-green-50"
                disabled={students.length === 0}
              >
                <Download size={16} /> Export CSV
              </Button>
              <Button
                onClick={exportToExcel}
                variant="outline"
                className="gap-2 font-semibold border-blue-300 text-blue-700 hover:bg-blue-50"
                disabled={students.length === 0}
              >
                <FileSpreadsheet size={16} /> Export Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Student Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Course</TableHead>
                <TableHead className="font-semibold">Attendance</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-text-secondary">Loading...</TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <GraduationCap className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-text-secondary font-medium">No students found</p>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student: any) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-[#1769AA]/10 flex items-center justify-center text-[#1769AA] font-bold text-xs">
                          {(student.user?.name || student.name || "S").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{student.user?.name || student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{student.user?.email || student.email || "—"}</TableCell>
                    <TableCell className="text-sm font-mono">{student.user?.phone || student.phone || "—"}</TableCell>
                    <TableCell className="text-sm">{student.course?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{student.attendancePercentage ? `${student.attendancePercentage}%` : "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${
                        student.status === "COMPLETED" ? "bg-green-50 text-green-700 border-green-200" :
                        student.status === "ACTIVE" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>
                        {student.status || "ACTIVE"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
