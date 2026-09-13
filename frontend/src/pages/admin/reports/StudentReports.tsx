import React, { useState, useMemo, useRef } from "react";
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
  AlertCircle,
  X,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  ClipboardCheck,
} from "lucide-react";
import { useStudentReport } from "../../../hooks/useReports";
import { useStudent, useStudentPerformance } from "@/hooks/useStudents";
import { useBranches } from "@/hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { downloadCsv } from "../../../utils/csvExporter";
import { coursesFromStudent, formatPackageCourseLabel } from "@/utils/admission-package.utils";
import { CourseChips } from "@/components/common/CourseChips";
import { Card, CardContent } from "@/components/ui/card";
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

const PAGE_SIZE = 10;

const formatReportDate = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const StudentReports: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = useMemo(() => branchesResponse?.data || [], [branchesResponse?.data]);
  const isAdmin = user?.roles?.includes("ADMIN") || user?.role === "ADMIN";
  const branchFilter =
    isAdmin && selectedBranchId !== "ALL" ? selectedBranchId : undefined;
  const { data, isLoading, isError, refetch } = useStudentReport(branchFilter);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    setCurrentPage(1);
    setSelectedStudentId(null);
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setTimeout(() => {
      analyticsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const enrollmentTrend = data?.enrollmentTrend || [];
  const attendanceDistribution = data?.attendanceDistribution || [];
  const courseShare = data?.courseShare || [];
  const studentList = useMemo(() => data?.students || [], [data?.students]);
  const summary = data?.summary || {
    totalStudents: 0,
    avgAttendanceRate: 0,
    assignmentCompletionRate: 0,
    discontinuationRiskCount: 0,
  };

  // Filter students across Name, Roll No (studentCode), and Student ID (id)
  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return studentList;
    return studentList.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const rollNo = (s.studentCode || "").toLowerCase();
      const studentId = (s.id || "").toLowerCase();
      return name.includes(q) || rollNo.includes(q) || studentId.includes(q);
    });
  }, [studentList, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedStudents = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, safeCurrentPage]);

  const startRecord = filteredStudents.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(safeCurrentPage * PAGE_SIZE, filteredStudents.length);

  // Pagination items builder with ellipses (e.g. 1 2 3 4 5 ... 100)
  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, "...", totalPages];
  }, [safeCurrentPage, totalPages]);

  // Selected student queries
  const {
    data: studentDetailRes,
    isLoading: isStudentDetailLoading,
    isError: isStudentDetailError,
    refetch: refetchStudentDetail,
  } = useStudent(selectedStudentId || undefined);
  const {
    data: studentPerfRes,
    isLoading: isStudentPerformanceLoading,
    isError: isStudentPerformanceError,
    refetch: refetchStudentPerformance,
  } = useStudentPerformance(selectedStudentId || undefined);
  const isSelectedAnalyticsLoading =
    !!selectedStudentId && (isStudentDetailLoading || isStudentPerformanceLoading);
  const isSelectedAnalyticsError =
    !!selectedStudentId && (isStudentDetailError || isStudentPerformanceError);

  const selectedStudentSummary = useMemo(() => {
    return studentList.find((s) => s.id === selectedStudentId) || null;
  }, [studentList, selectedStudentId]);

  const studentDetail = studentDetailRes?.data;
  const studentPerf = studentPerfRes?.data;

  const handleExport = () => {
    if (!filteredStudents.length) {
      alert("No student report data available to export.");
      return;
    }
    const exportData = filteredStudents.map((s, idx) => {
      const courses = coursesFromStudent(s);
      const packageLabel =
        s.coursePackage || formatPackageCourseLabel(courses, s.courseName || "—");
      return {
        "#": idx + 1,
        "Roll Code": s.studentCode,
        "Student Name": s.name,
        "Branch": s.branchName,
        "Enquiry Date": formatReportDate(s.enquiryDate),
        "Gender": s.gender || "—",
        "DOB": formatReportDate(s.dateOfBirth),
        "Course Package": packageLabel,
        "Counsellor": s.counsellorName || "—",
        "Attendance %": `${s.attendancePercentage}%`,
        "Assignments": `${s.assignmentsSubmitted}/${s.totalAssignments}`,
        "Risk Level": s.riskFlag,
      };
    });
    downloadCsv("Student_Analytics_Report", exportData);
  };

  // Compute student-specific metrics & charts data
  const studentAnalytics = useMemo(() => {
    if (!selectedStudentSummary) return null;

    const name = selectedStudentSummary.name || "Student";
    const studentCode = selectedStudentSummary.studentCode || "";
    const courses = coursesFromStudent(selectedStudentSummary);
    const courseLabel =
      selectedStudentSummary.coursePackage ||
      formatPackageCourseLabel(courses, selectedStudentSummary.courseName || "—");
    const batchName = studentDetail?.batchEnrollments?.[0]?.batch?.name || "—";
    const branchName = selectedStudentSummary.branchName || "—";
    const enquiryDate = formatReportDate(selectedStudentSummary.enquiryDate);
    const gender = selectedStudentSummary.gender || "—";
    const dateOfBirth = formatReportDate(selectedStudentSummary.dateOfBirth);
    const counsellorName = selectedStudentSummary.counsellorName || "—";

    // 1. Attendance Trend (Weekly)
    const weeklyAttendance: Array<{ week: string; percentage: number }> = [];
    if (studentDetail?.attendanceRecords && studentDetail.attendanceRecords.length > 0) {
      const records = [...studentDetail.attendanceRecords].sort(
        (a, b) => new Date(a.markedAt).getTime() - new Date(b.markedAt).getTime()
      );
      // Group by chunks of records into weeks
      const chunkSize = Math.max(1, Math.ceil(records.length / 6));
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const presentCount = chunk.filter((r) => r.status === "PRESENT").length;
        const weekNum = Math.floor(i / chunkSize) + 1;
        weeklyAttendance.push({
          week: `Week ${weekNum}`,
          percentage: Math.round((presentCount / chunk.length) * 100),
        });
      }
    }

    // 2. Assignment Performance (Donut Chart)
    let completedCount = 0;
    let pendingCount = 0;
    let notSubmittedCount = 0;

    if (studentDetail?.assignments && studentDetail.assignments.length > 0) {
      completedCount = studentDetail.assignments.filter(
        (a) => a.status === "SUBMITTED" || a.status === "GRADED"
      ).length;
      pendingCount = studentDetail.assignments.filter((a) => a.status === "PENDING").length;
      notSubmittedCount = studentDetail.assignments.filter(
        (a) => a.status === "LATE" || (!a.submittedAt && a.status !== "PENDING")
      ).length;
    }

    const assignmentTotal = completedCount + pendingCount + notSubmittedCount;
    const completionPercent = assignmentTotal > 0
      ? Math.round((completedCount / assignmentTotal) * 100)
      : 0;

    const assignmentDonutData = assignmentTotal > 0 ? [
      { name: "Completed", value: completedCount, color: "#10B981", percent: Math.round((completedCount / assignmentTotal) * 100) },
      { name: "Pending", value: pendingCount, color: "#F59E0B", percent: Math.round((pendingCount / assignmentTotal) * 100) },
      { name: "Not Submitted", value: notSubmittedCount, color: "#EF4444", percent: Math.round((notSubmittedCount / assignmentTotal) * 100) },
    ] : [];

    const uncompletedCount = pendingCount + notSubmittedCount;

    // 3. Academic Performance Trend (Test scores progression)
    const testScoresData: Array<{ test: string; score: number }> = [];
    if (studentPerf?.testScores && studentPerf.testScores.length > 0) {
      testScoresData.push(
        ...studentPerf.testScores.map((t) => {
          const maxScore = t.maxScore > 0 ? t.maxScore : 100;
          return {
            test: t.testName,
            score: Math.round((t.score / maxScore) * 100),
          };
        })
      );
    }

    // 4. Risk Analysis Factors
    const attVal = selectedStudentSummary.attendancePercentage;
    const attRisk: "High Risk" | "Medium Risk" | "Low Risk" = attVal < 50 ? "High Risk" : attVal < 75 ? "Medium Risk" : "Low Risk";

    const assignVal = selectedStudentSummary.totalAssignments > 0
      ? Math.round((selectedStudentSummary.assignmentsSubmitted / selectedStudentSummary.totalAssignments) * 100)
      : null;
    const assignRisk: "High Risk" | "Medium Risk" | "Low Risk" | null = assignVal === null
      ? null
      : assignVal < 40
        ? "High Risk"
        : assignVal < 70
          ? "Medium Risk"
          : "Low Risk";

    const avgTest = testScoresData.length > 0
      ? Math.round(
          testScoresData.reduce((acc, curr) => acc + curr.score, 0) / testScoresData.length
        )
      : null;
    const testRisk: "High Risk" | "Medium Risk" | "Low Risk" | null = avgTest === null
      ? null
      : avgTest < 50
        ? "High Risk"
        : avgTest < 70
          ? "Medium Risk"
          : "Low Risk";

    const riskFactors: Array<{
      name: string;
      value: number;
      risk: "High Risk" | "Medium Risk" | "Low Risk";
    }> = [];
    if (studentDetail?.attendanceRecords?.length) {
      riskFactors.push({ name: "Attendance", value: attVal, risk: attRisk });
    }
    if (assignVal !== null && assignRisk !== null) {
      riskFactors.push({ name: "Assignment Completion", value: assignVal, risk: assignRisk });
    }
    if (avgTest !== null && testRisk !== null) {
      riskFactors.push({ name: "Test / Assessment Performance", value: avgTest, risk: testRisk });
    }

    const isHighRisk =
      selectedStudentSummary.riskFlag === "Triggered" ||
      selectedStudentSummary.riskFlag === "At Risk" ||
      riskFactors.some((factor) => factor.risk === "High Risk");

    return {
      name,
      studentCode,
      courseLabel,
      batchName,
      branchName,
      enquiryDate,
      gender,
      dateOfBirth,
      counsellorName,
      weeklyAttendance,
      assignmentDonutData,
      completionPercent,
      uncompletedCount,
      testScoresData,
      riskFactors,
      isHighRisk,
    };
  }, [selectedStudentSummary, studentDetail, studentPerf]);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center text-text-muted space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#2563EB]" />
        <p className="text-sm font-medium">Loading student performance analytics...</p>
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
    <div className="space-y-4 pb-10">
      {/* ─── 1. PAGE HEADER WITH SEARCH BAR ───────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 shrink-0">
            Student Analytics & Reports
          </h2>

          <div className="relative w-full sm:max-w-md min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search student by name, roll no, or student ID..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-white border-slate-200 shadow-sm rounded-lg focus-visible:ring-1 focus-visible:ring-[#2563EB]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 self-start md:self-auto">
          {isAdmin && (
            <select
              value={selectedBranchId}
              onChange={(event) => handleBranchChange(event.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:border-[#2563EB]"
              aria-label="Filter student reports by branch"
            >
              <option value="ALL">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm shrink-0 h-9 text-xs sm:text-sm"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4 text-[#2563EB]" />
            Export Student CSV
          </Button>
        </div>
      </div>

      {/* ─── 2. SUMMARY KPIS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Students",
            value: summary.totalStudents,
            icon: Users,
            color: "text-[#2563EB]",
            bg: "bg-blue-50",
          },
          {
            label: "Average Attendance",
            value: `${summary.avgAttendanceRate}%`,
            icon: CalendarDays,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Assignment Completion",
            value: `${summary.assignmentCompletionRate}%`,
            icon: ClipboardCheck,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Discontinuation Risk",
            value: summary.discontinuationRiskCount,
            icon: AlertTriangle,
            color: "text-rose-600",
            bg: "bg-rose-50",
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-2">{kpi.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── 3. STUDENT DIRECTORY TABLE & PAGINATION ────────────────────── */}
      <Card className="border-border/60 bg-white shadow-sm w-full overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12 font-semibold text-slate-700 text-xs">#</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Roll No & Student</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Branch</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Enquiry Date</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Gender</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">DOB</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Course Package</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Counsellor</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Attendance</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Assignments</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Risk Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.length > 0 ? (
                  paginatedStudents.map((student, index) => {
                    const isSelected = selectedStudentId === student.id;
                    const itemIndex = (safeCurrentPage - 1) * PAGE_SIZE + index + 1;
                    return (
                      <TableRow
                        key={student.id}
                        onClick={() => handleSelectStudent(student.id)}
                        className={`cursor-pointer transition-colors border-b border-slate-100 ${isSelected
                          ? "bg-blue-50/80 border-l-4 border-l-[#2563EB] font-medium"
                          : "hover:bg-slate-50/90"
                          }`}
                      >
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {itemIndex}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${isSelected ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-700"
                              }`}>
                              {(student.name || "S").substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-mono text-[11px] font-bold text-[#2563EB] block">
                                {student.studentCode}
                              </span>
                              <span className="font-semibold text-slate-900 text-xs block">
                                {student.name}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600">
                          {student.branchName || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {formatReportDate(student.enquiryDate)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {student.gender || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {formatReportDate(student.dateOfBirth)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-[260px]">
                          <CourseChips
                            courses={coursesFromStudent(student)}
                            fallback={student.coursePackage || student.courseName}
                            maxVisible={2}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {student.counsellorName || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-emerald-700">
                          {student.attendancePercentage}%
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          <span className="font-semibold">{student.assignmentsSubmitted}</span>
                          <span className="text-slate-400">/{student.totalAssignments} Submitted</span>
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
                            className="text-[11px] px-2 py-0.5"
                          >
                            {student.riskFlag}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-slate-400 text-xs">
                      {searchTerm
                        ? `No student records found matching "${searchTerm}".`
                        : "No student performance records found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination & Count Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{startRecord}–{endRecord}</span> of{" "}
              <span className="font-bold text-slate-800">{filteredStudents.length}</span> students
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="h-8 w-8 p-0 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {paginationItems.map((item, idx) => {
                  if (item === "...") {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 font-semibold select-none">
                        ...
                      </span>
                    );
                  }
                  const pageNum = Number(item);
                  const isActive = pageNum === safeCurrentPage;
                  return (
                    <Button
                      key={`page-${pageNum}`}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 min-w-[32px] px-2 text-xs font-semibold ${isActive
                        ? "bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm border-[#2563EB]"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="h-8 w-8 p-0 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. SELECTED STUDENT PROFILE & 4-COLUMN COMPACT ANALYTICS ────── */}
      {studentAnalytics ? (
        <div ref={analyticsRef} className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Selected Student Compact Header */}
          <div className="px-4 py-3 bg-white border border-slate-200/90 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1E40AF] to-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-blue-100 shrink-0">
                {(studentAnalytics.name || "S").substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">{studentAnalytics.name}</h3>
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-100">
                    {studentAnalytics.studentCode}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-700">Course Package:</span> {studentAnalytics.courseLabel}
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">Counsellor:</span> {studentAnalytics.counsellorName}
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">Gender:</span> {studentAnalytics.gender}
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">DOB:</span> {studentAnalytics.dateOfBirth}
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">Enquiry:</span> {studentAnalytics.enquiryDate}
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">Batch:</span> {studentAnalytics.batchName}
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">{studentAnalytics.branchName}</span>
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStudentId(null)}
              className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs h-7 px-2.5 self-end sm:self-auto border border-slate-200/60"
            >
              <X className="h-3.5 w-3.5 mr-1 text-slate-400" />
              Clear Selection
            </Button>
          </div>

          {/* 4-Column Side-By-Side Compact Analytics Grid */}
          {isSelectedAnalyticsLoading ? (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
                Loading selected student analytics...
              </CardContent>
            </Card>
          ) : isSelectedAnalyticsError ? (
            <Card className="border-red-200 bg-red-50 shadow-sm">
              <CardContent className="py-10 text-center space-y-3">
                <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
                <p className="text-sm font-semibold text-red-800">
                  Failed to load selected student analytics.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void refetchStudentDetail();
                    void refetchStudentPerformance();
                  }}
                >
                  Retry Analytics
                </Button>
              </CardContent>
            </Card>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* 1. ATTENDANCE TREND */}
            <Card className="border-border/70 bg-white shadow-sm flex flex-col justify-between p-4 rounded-xl">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-[#2563EB]" />
                      Attendance Trend
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate max-w-[170px]">
                      Weekly rate for {studentAnalytics.name}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    {selectedStudentSummary?.attendancePercentage}%
                  </span>
                </div>

                <div className="h-28 w-full mt-2">
                  {studentAnalytics.weeklyAttendance.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={studentAnalytics.weeklyAttendance} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="compactAttGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94A3B8" }} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderRadius: "6px",
                          border: "none",
                          color: "#FFFFFF",
                          fontSize: "11px",
                          padding: "4px 8px",
                        }}
                        formatter={(value) => [`${value}%`, "Attendance"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="percentage"
                        stroke="#2563EB"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#compactAttGradient)"
                      />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[10px] text-slate-400 text-center px-3">
                      No attendance records yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between items-center">
                <span>Recorded attendance</span>
                <span className="font-semibold text-slate-700">Weekly %</span>
              </div>
            </Card>

            {/* 2. ASSIGNMENT PERFORMANCE */}
            <Card className="border-border/70 bg-white shadow-sm flex flex-col justify-between p-4 rounded-xl">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <PieChartIcon className="h-3.5 w-3.5 text-purple-600" />
                      Assignment Performance
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate max-w-[170px]">
                      Submission for {studentAnalytics.name}
                    </p>
                  </div>
                </div>

                <div className="relative h-24 w-full flex items-center justify-center my-1">
                  {studentAnalytics.assignmentDonutData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                      <Pie
                        data={studentAnalytics.assignmentDonutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={26}
                        outerRadius={38}
                        paddingAngle={2}
                      >
                        {studentAnalytics.assignmentDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderRadius: "6px",
                          border: "none",
                          color: "#FFFFFF",
                          fontSize: "11px",
                          padding: "4px 8px",
                        }}
                      />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-black text-slate-900 leading-none">
                          {studentAnalytics.completionPercent}%
                        </span>
                        <span className="text-[8px] text-slate-400 font-medium leading-none mt-0.5">Done</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-slate-400 text-center px-3">
                      No assignment records yet.
                    </div>
                  )}
                </div>

                {/* Compact 3-col status summary */}
                {studentAnalytics.assignmentDonutData.length > 0 && (
                  <div className="grid grid-cols-3 gap-1 text-center text-[10px] pt-1.5 border-t border-slate-100">
                    {studentAnalytics.assignmentDonutData.map((item) => (
                      <div key={item.name} className="p-1 rounded bg-slate-50">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[9px] text-slate-500 truncate">{item.name.substring(0, 4)}</span>
                        </div>
                        <span className="font-bold text-slate-800 text-[10px] block">
                          {item.value} <span className="text-slate-400 text-[8px]">({item.percent}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {studentAnalytics.assignmentDonutData.length > 0 && (
                studentAnalytics.uncompletedCount > 0 ? (
                  <div className="mt-2 p-1.5 bg-amber-50/90 border border-amber-200/70 rounded flex items-center gap-1.5 text-amber-900 text-[10px] font-medium">
                    <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                    <span className="truncate">{studentAnalytics.uncompletedCount} pending / unsubmitted</span>
                  </div>
                ) : (
                  <div className="mt-2 p-1.5 bg-emerald-50/90 border border-emerald-200/70 rounded flex items-center gap-1.5 text-emerald-900 text-[10px] font-medium">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="truncate">All submitted</span>
                  </div>
                )
              )}
            </Card>

            {/* 3. ACADEMIC PERFORMANCE */}
            <Card className="border-border/70 bg-white shadow-sm flex flex-col justify-between p-4 rounded-xl">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
                      Academic Performance
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate max-w-[170px]">
                      Test scores for {studentAnalytics.name}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    Scores
                  </span>
                </div>

                <div className="h-28 w-full mt-2">
                  {studentAnalytics.testScoresData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={studentAnalytics.testScoresData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="test" tick={{ fontSize: 9, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderRadius: "6px",
                          border: "none",
                          color: "#FFFFFF",
                          fontSize: "11px",
                          padding: "4px 8px",
                        }}
                        formatter={(value) => [`${value}%`, "Score"]}
                      />
                      <Bar dataKey="score" fill="#3B82F6" radius={[3, 3, 0, 0]} name="Score" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[10px] text-slate-400 text-center px-3">
                      No test or assessment records yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between items-center">
                <span>Recorded assessments</span>
                <span className="font-semibold text-slate-700">Score %</span>
              </div>
            </Card>

            {/* 4. RISK ANALYSIS */}
            <Card className="border-border/70 bg-white shadow-sm flex flex-col justify-between p-4 rounded-xl">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                      Risk Analysis
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate max-w-[170px]">
                      Risk factors for {studentAnalytics.name}
                    </p>
                  </div>
                  <Badge
                    variant={
                      studentAnalytics.isHighRisk
                        ? "destructive"
                        : selectedStudentSummary?.riskFlag === "At Risk"
                          ? "secondary"
                          : "success"
                    }
                    className="text-[10px] px-1.5 py-0.5"
                  >
                    {studentAnalytics.isHighRisk ? "High Risk" : selectedStudentSummary?.riskFlag || "Normal"}
                  </Badge>
                </div>

                {studentAnalytics.riskFactors.length > 0 ? (
                  <div className="space-y-2 my-1">
                    {studentAnalytics.riskFactors.map((factor) => {
                    const barColor =
                      factor.risk === "High Risk"
                        ? "bg-rose-500"
                        : factor.risk === "Medium Risk"
                          ? "bg-amber-500"
                          : "bg-emerald-500";

                    return (
                      <div key={factor.name} className="space-y-0.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-medium text-slate-700 truncate max-w-[110px]">{factor.name}</span>
                          <span className="font-bold text-slate-900">{factor.value}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, factor.value))}%` }}
                          />
                        </div>
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center text-[10px] text-slate-400 text-center px-3">
                    No recorded attendance, assignment, or assessment factors yet.
                  </div>
                )}
              </div>

              {studentAnalytics.riskFactors.length > 0 && (
                studentAnalytics.isHighRisk ? (
                  <div className="mt-2 p-1.5 bg-rose-50/90 border border-rose-200 rounded flex items-center gap-1.5 text-rose-900 text-[10px] font-semibold">
                    <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                    <span className="truncate">High risk • Follow-up advised</span>
                  </div>
                ) : (
                  <div className="mt-2 p-1.5 bg-emerald-50/90 border border-emerald-200 rounded flex items-center gap-1.5 text-emerald-900 text-[10px] font-medium">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="truncate">Performance within normal limits</span>
                  </div>
                )
              )}
            </Card>
          </div>
          )}
        </div>
      ) : (
        /* Default State when no student is selected: Display overall institute overview charts */
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Enrollment Trend Area Chart */}
            <Card className="border-border/70 bg-white shadow-sm p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-4 w-4 text-[#2563EB]" />
                  <h4 className="text-xs font-bold text-slate-900">Student Enrollment Trend</h4>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Cumulative student intake trajectory
                </p>
                <div className="h-36 w-full">
                  {enrollmentTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={enrollmentTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0F172A",
                            borderRadius: "6px",
                            border: "none",
                            color: "#FFFFFF",
                            fontSize: "11px",
                          }}
                        />
                        <Area type="monotone" dataKey="students" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} strokeWidth={2} name="Total Students" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No enrollment data available.
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Attendance Distribution Bar Chart */}
            <Card className="border-border/70 bg-white shadow-sm p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900">Attendance Distribution</h4>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Students grouped by attendance rate
                </p>
                <div className="h-36 w-full">
                  {attendanceDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceDistribution} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0F172A",
                            borderRadius: "6px",
                            border: "none",
                            color: "#FFFFFF",
                            fontSize: "11px",
                          }}
                        />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]} name="Headcount">
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
              </div>
            </Card>

            {/* Course Share Pie Chart */}
            <Card className="border-border/70 bg-white shadow-sm p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <PieChartIcon className="h-4 w-4 text-purple-600" />
                  <h4 className="text-xs font-bold text-slate-900">Course Enrollment Share</h4>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Distribution of students across courses
                </p>
                <div className="h-28 w-full">
                  {courseShare.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={courseShare}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={46}
                          innerRadius={24}
                          paddingAngle={2}
                        >
                          {courseShare.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0F172A",
                            borderRadius: "6px",
                            border: "none",
                            color: "#FFFFFF",
                            fontSize: "11px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No course share data.
                    </div>
                  )}
                </div>
                <div className="w-full space-y-1 text-[11px] pt-1.5 border-t border-slate-100">
                  {courseShare.slice(0, 3).map((item) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-slate-700 truncate max-w-[130px]">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
