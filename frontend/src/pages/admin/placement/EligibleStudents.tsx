import React, { useState } from "react";
import { GraduationCap, Search, Loader2, AlertCircle, Download } from "lucide-react";
import { useEligibleStudents } from "@/hooks/usePlacement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CourseChips } from "@/components/common/CourseChips";
import { coursesFromStudent, formatPackageCourseLabel } from "@/utils/admission-package.utils";

function exportEligibleToCSV(
  students: Array<{
    id: string;
    studentName?: string;
    name?: string;
    courseName?: string;
    courses?: Array<{ id: string; name: string; code?: string }>;
    batchName?: string;
    email?: string;
    phone?: string;
    attendancePercentage?: number;
    status?: string;
  }>
) {
  const headers = ["Name", "Email", "Phone", "Course", "Batch", "Attendance %", "Status"];
  const rows = students.map((s) => [
    s.studentName || s.name || "",
    s.email || "",
    s.phone || "",
    formatPackageCourseLabel(coursesFromStudent(s), s.courseName || ""),
    s.batchName || "",
    s.attendancePercentage != null ? String(s.attendancePercentage) : "N/A",
    s.status || "ELIGIBLE",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aadya_eligible_students_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const EligibleStudents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading, isError, refetch } = useEligibleStudents({
    search: searchTerm || undefined,
    limit: 100,
  });
  const students = data?.data?.data || data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Eligible Students</h2>
          <p className="text-sm text-text-secondary">Students eligible for placement drives.</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
          disabled={!Array.isArray(students) || students.length === 0}
          onClick={() => exportEligibleToCSV(students)}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-red-600">
                    <AlertCircle className="w-5 h-5 inline mr-2" />
                    Failed to load.
                    <Button variant="link" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : !Array.isArray(students) || students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-text-secondary">
                    <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No eligible students.
                  </TableCell>
                </TableRow>
              ) : (
                students.map(
                  (s: {
                    id: string;
                    studentName?: string;
                    name?: string;
                    courseName?: string;
                    courses?: Array<{ id: string; name: string; code?: string }>;
                    batchName?: string;
                    status?: string;
                  }) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.studentName || s.name}</TableCell>
                      <TableCell>
                        <CourseChips
                          courses={coursesFromStudent(s)}
                          fallback={s.courseName || "—"}
                          maxVisible={3}
                        />
                      </TableCell>
                      <TableCell>{s.batchName || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.status || "ELIGIBLE"}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
