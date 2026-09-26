import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
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
  RotateCcw,
  ArrowUpDown,
} from "lucide-react";
import { useStudentReport } from "../../../hooks/useReports";
import { useStudent, useStudentPerformance } from "@/hooks/useStudents";
import { useBranches } from "@/hooks/useBranches";
import { useCourses } from "@/hooks/useCourses";
import { useBatches } from "@/hooks/useBatches";
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
import { FilterToolbar, METRIC_GRID_COLUMNS, MetricGrid, PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/constants/routes";
import type { StudentReportParams } from "@/services/reports.api";

const PAGE_SIZE = 10;
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:border-primary";

type SortKey = "attendancePercentage" | "consecutiveTheoryAbsences" | "riskFlag" | null;
type SortDir = "asc" | "desc";

const RISK_ORDER: Record<string, number> = {
  Triggered: 3,
  "At Risk": 2,
  Normal: 1,
};

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

const formatRate = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  return `${value}%`;
};

export const StudentReports: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = useMemo(() => branchesResponse?.data || [], [branchesResponse?.data]);
  const isAdmin = user?.roles?.includes("ADMIN") || user?.role === "ADMIN";
  const isFacultyOnly =
    (user?.roles?.includes("FACULTY") || user?.role === "FACULTY") &&
    !isAdmin &&
    !user?.roles?.includes("CENTER_MANAGER") &&
    !user?.roles?.includes("COUNSELLOR");

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [riskFlag, setRiskFlag] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    searchParams.get("studentId")
  );
  const analyticsRef = useRef<HTMLDivElement>(null);

  const branchFilter =
    isAdmin && selectedBranchId !== "ALL" ? selectedBranchId : undefined;

  const reportParams: StudentReportParams = useMemo(
    () => ({
      ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(courseId ? { courseId } : {}),
      ...(batchId ? { batchId } : {}),
      ...(status ? { status } : {}),
      ...(riskFlag
        ? { riskFlag: riskFlag as "Normal" | "At Risk" | "Triggered" }
        : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    }),
    [branchFilter, courseId, batchId, status, riskFlag, dateFrom, dateTo]
  );

  const { data, isLoading, isError, error, refetch } = useStudentReport(reportParams);
  const isForbidden =
    axios.isAxiosError(error) && error.response?.status === 403;
  const { courses } = useCourses({ status: "ACTIVE" });
  const { batches } = useBatches({
    ...(courseId ? { courseId } : {}),
    status: "ACTIVE",
  });

  useEffect(() => {
    const fromUrl = searchParams.get("studentId");
    if (!fromUrl) return;
    setSelectedStudentId((prev) => (prev === fromUrl ? prev : fromUrl));
    const t = setTimeout(() => {
      analyticsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(t);
  }, [searchParams]);

  const resetFilters = () => {
    if (isAdmin) setSelectedBranchId("ALL");
    setCourseId("");
    setBatchId("");
    setStatus("ACTIVE");
    setRiskFlag("");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
    setCurrentPage(1);
    setSelectedStudentId(null);
    setSortKey(null);
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setTimeout(() => {
      analyticsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const enrollmentTrend = data?.enrollmentTrend || [];
  const attendanceDistribution = data?.attendanceDistribution || [];
  const courseShare = data?.courseShare || [];
  const studentList = useMemo(() => data?.students || [], [data?.students]);
  const summary = data?.summary || {
    totalStudents: 0,
    avgAttendanceRate: null,
    assignmentCompletionRate: null,
    discontinuationRiskCount: 0,
  };

  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    let list = studentList;
    if (q) {
      list = list.filter((s) => {
        const name = (s.name || "").toLowerCase();
        const rollNo = (s.studentCode || "").toLowerCase();
        const studentId = (s.id || "").toLowerCase();
        const batch = (s.batchName || "").toLowerCase();
        return (
          name.includes(q) ||
          rollNo.includes(q) ||
          studentId.includes(q) ||
          batch.includes(q)
        );
      });
    }
    if (!sortKey) return list;
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "riskFlag") {
        cmp = (RISK_ORDER[a.riskFlag] || 0) - (RISK_ORDER[b.riskFlag] || 0);
      } else {
        cmp = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [studentList, searchTerm, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedStudents = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, safeCurrentPage]);

  const startRecord = filteredStudents.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(safeCurrentPage * PAGE_SIZE, filteredStudents.length);

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
      const coursesList = coursesFromStudent(s);
      const packageLabel =
        s.coursePackage || formatPackageCourseLabel(coursesList, s.courseName || "—");
      return {
        "#": idx + 1,
        "Roll Code": s.studentCode,
        "Student Name": s.name,
        Branch: s.branchName,
        Batch: s.batchName || "—",
        Status: s.status || "—",
        "Course Package": packageLabel,
        Counsellor: s.counsellorName || "—",
        "Attendance %": s.conductedCount > 0 ? `${s.attendancePercentage}%` : "—",
        Present: s.presentCount,
        Absent: s.absentCount,
        Leave: s.leaveCount,
        Assignments: `${s.assignmentsSubmitted}/${s.totalAssignments}`,
        "Consecutive Theory Absences": s.consecutiveTheoryAbsences,
        "Last Attended": formatReportDate(s.lastAttendedAt),
        "Risk Level": s.riskFlag,
        Gender: s.gender || "—",
        DOB: formatReportDate(s.dateOfBirth),
        "Enquiry Date": formatReportDate(s.enquiryDate),
      };
    });
    downloadCsv("Student_Analytics_Report", exportData);
  };

  const studentAnalytics = useMemo(() => {
    if (!selectedStudentSummary) return null;

    const name = selectedStudentSummary.name || "Student";
    const studentCode = selectedStudentSummary.studentCode || "";
    const coursesList = coursesFromStudent(selectedStudentSummary);
    const courseLabel =
      selectedStudentSummary.coursePackage ||
      formatPackageCourseLabel(coursesList, selectedStudentSummary.courseName || "—");
    const batchName =
      selectedStudentSummary.batchName ||
      studentDetail?.batchEnrollments?.[0]?.batch?.name ||
      "—";
    const branchName = selectedStudentSummary.branchName || "—";
    const enquiryDate = formatReportDate(selectedStudentSummary.enquiryDate);
    const gender = selectedStudentSummary.gender || "—";
    const dateOfBirth = formatReportDate(selectedStudentSummary.dateOfBirth);
    const counsellorName = selectedStudentSummary.counsellorName || "—";

    const weeklyAttendance: Array<{ week: string; percentage: number }> = [];
    if (studentDetail?.attendanceRecords && studentDetail.attendanceRecords.length > 0) {
      const records = [...studentDetail.attendanceRecords].sort(
        (a, b) => new Date(a.markedAt).getTime() - new Date(b.markedAt).getTime()
      );
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
    const completionPercent =
      assignmentTotal > 0 ? Math.round((completedCount / assignmentTotal) * 100) : 0;

    const assignmentDonutData =
      assignmentTotal > 0
        ? [
            {
              name: "Completed",
              value: completedCount,
              color: "#10B981",
              percent: Math.round((completedCount / assignmentTotal) * 100),
            },
            {
              name: "Pending",
              value: pendingCount,
              color: "#F59E0B",
              percent: Math.round((pendingCount / assignmentTotal) * 100),
            },
            {
              name: "Not Submitted",
              value: notSubmittedCount,
              color: "#EF4444",
              percent: Math.round((notSubmittedCount / assignmentTotal) * 100),
            },
          ]
        : [];

    const uncompletedCount = pendingCount + notSubmittedCount;

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

    const attVal = selectedStudentSummary.attendancePercentage;
    const consecutive = selectedStudentSummary.consecutiveTheoryAbsences ?? 0;
    const conducted = selectedStudentSummary.conductedCount ?? 0;
    const attRisk =
      consecutive >= 3
        ? "High Risk"
        : consecutive >= 2 || (conducted > 0 && attVal < 75)
          ? "Medium Risk"
          : "Low Risk";

    const assignVal =
      selectedStudentSummary.totalAssignments > 0
        ? Math.round(
            (selectedStudentSummary.assignmentsSubmitted /
              selectedStudentSummary.totalAssignments) *
              100
          )
        : null;
    const assignRisk: "High Risk" | "Medium Risk" | "Low Risk" | null =
      assignVal === null
        ? null
        : assignVal < 40
          ? "High Risk"
          : assignVal < 70
            ? "Medium Risk"
            : "Low Risk";

    const avgTest =
      testScoresData.length > 0
        ? Math.round(
            testScoresData.reduce((acc, curr) => acc + curr.score, 0) / testScoresData.length
          )
        : null;
    const testRisk: "High Risk" | "Medium Risk" | "Low Risk" | null =
      avgTest === null
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

    riskFactors.push({
      name: "Consecutive Theory Absences",
      value: Math.min(100, consecutive * 33),
      risk: attRisk,
    });
    if (conducted > 0) {
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
      consecutive >= 3 ||
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
      status: selectedStudentSummary.status,
      consecutive,
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
      <PageContainer>
        <div className="py-20 flex flex-col justify-center items-center text-text-muted space-y-3">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading student performance analytics...</p>
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <div
          className={`p-8 border rounded-xl text-center space-y-3 ${
            isForbidden
              ? "bg-amber-50 border-amber-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          {isForbidden ? (
            <ShieldAlert className="h-8 w-8 text-amber-600 mx-auto" />
          ) : (
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          )}
          <h3
            className={`text-lg font-bold ${
              isForbidden ? "text-amber-900" : "text-red-800"
            }`}
          >
            {isForbidden
              ? "You don't have permission"
              : "Failed to load student reports"}
          </h3>
          <p
            className={`text-xs ${
              isForbidden ? "text-amber-800" : "text-red-600"
            }`}
          >
            {isForbidden
              ? "You don't have permission to view student reports. Contact an administrator if you need access."
              : "Unable to retrieve real-time student analytics metrics from database."}
          </p>
          {!isForbidden && (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry Loading
            </Button>
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={
          isFacultyOnly ? "My Students' Performance" : "Student Analytics & Reports"
        }
        description="Filterable performance, attendance risk, and assignment completion across students."
        actions={
          <Button
            variant="outline"
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm shrink-0 h-9 text-xs sm:text-sm"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4 text-primary" />
            Export Student CSV
          </Button>
        }
      />

      <FilterToolbar className="flex-col items-stretch gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, roll no, batch, or student ID..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-white border-slate-200 shadow-sm rounded-lg focus-visible:ring-1 focus-visible:ring-primary"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isAdmin && (
            <select
              value={selectedBranchId}
              onChange={(event) => {
                setSelectedBranchId(event.target.value);
                setCurrentPage(1);
                setSelectedStudentId(null);
              }}
              className={SELECT_CLASS}
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
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 text-xs"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 text-xs"
          />
          <select
            className={SELECT_CLASS}
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              setBatchId("");
              setCurrentPage(1);
            }}
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={SELECT_CLASS}
            value={batchId}
            onChange={(e) => {
              setBatchId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            className={SELECT_CLASS}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="COMPLETED">Completed</option>
            <option value="DISCONTINUED">Discontinued</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ALL">All Statuses</option>
          </select>
          <select
            className={SELECT_CLASS}
            value={riskFlag}
            onChange={(e) => {
              setRiskFlag(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Risk Levels</option>
            <option value="Normal">Normal</option>
            <option value="At Risk">At Risk</option>
            <option value="Triggered">Triggered</option>
          </select>
          <Button variant="outline" className="h-9 text-xs" onClick={resetFilters}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </FilterToolbar>

      <MetricGrid columns={METRIC_GRID_COLUMNS[4]} density="compact">
        {[
          {
            label: "Total Students",
            value: summary.totalStudents,
            helper: "In current filter scope",
            icon: Users,
            color: "text-primary",
            bg: "bg-blue-50",
            onClick: undefined as (() => void) | undefined,
          },
          {
            label: "Average Attendance",
            value: formatRate(summary.avgAttendanceRate),
            helper:
              summary.avgAttendanceRate === null
                ? "No conducted classes yet"
                : "Based on conducted classes",
            icon: CalendarDays,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            onClick: undefined,
          },
          {
            label: "Assignment Completion",
            value: formatRate(summary.assignmentCompletionRate),
            helper:
              summary.assignmentCompletionRate === null
                ? "No assignments in scope"
                : "Submitted ÷ assigned",
            icon: ClipboardCheck,
            color: "text-purple-600",
            bg: "bg-purple-50",
            onClick: undefined,
          },
          {
            label: "Discontinuation Risk",
            value: summary.discontinuationRiskCount,
            helper: "2+ consecutive theory absences",
            icon: AlertTriangle,
            color: "text-rose-600",
            bg: "bg-rose-50",
            onClick: () => navigate(ROUTES.ADMIN.STUDENTS.DISCONTINUATION),
          },
        ].map((kpi) => (
          <Card
            key={kpi.label}
            size="compact"
            className={`border-slate-200 shadow-sm bg-white ${
              kpi.onClick ? "cursor-pointer hover:border-rose-200 hover:shadow-md transition-shadow" : ""
            }`}
            onClick={kpi.onClick}
          >
            <CardContent size="compact">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {kpi.label}
                </p>
                <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{kpi.value}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{kpi.helper}</p>
            </CardContent>
          </Card>
        ))}
      </MetricGrid>

      <Card className="border-border/60 bg-white shadow-sm w-full overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12 font-semibold text-slate-700 text-xs">#</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">
                    Roll No & Student
                  </TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Branch</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Batch</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Course</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-primary"
                      onClick={() => toggleSort("attendancePercentage")}
                    >
                      Attendance
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">P / A / L</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">Assignments</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-primary"
                      onClick={() => toggleSort("consecutiveTheoryAbsences")}
                    >
                      Consecutive
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-900 text-xs">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-primary"
                      onClick={() => toggleSort("riskFlag")}
                    >
                      Risk
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
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
                        className={`cursor-pointer transition-colors border-b border-slate-100 ${
                          isSelected
                            ? "bg-blue-50/80 border-l-4 border-l-[#2563EB] font-medium"
                            : "hover:bg-slate-50/90"
                        }`}
                      >
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {itemIndex}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                isSelected
                                  ? "bg-primary text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {(student.name || "S").substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-mono text-[11px] font-bold text-primary block">
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
                        <TableCell className="text-xs text-slate-600">
                          {student.batchName || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-[220px]">
                          <CourseChips
                            courses={coursesFromStudent(student)}
                            fallback={student.coursePackage || student.courseName}
                            maxVisible={2}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            {student.status || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-emerald-700">
                          {student.conductedCount > 0
                            ? `${student.attendancePercentage}%`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          <span className="text-emerald-700 font-semibold">
                            {student.presentCount}
                          </span>
                          {" / "}
                          <span className="text-rose-600 font-semibold">
                            {student.absentCount}
                          </span>
                          {" / "}
                          <span className="text-amber-600 font-semibold">
                            {student.leaveCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          <span className="font-semibold">{student.assignmentsSubmitted}</span>
                          <span className="text-slate-400">
                            /{student.totalAssignments}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-800">
                          {student.consecutiveTheoryAbsences}
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

          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-medium">
              Showing{" "}
              <span className="font-bold text-slate-800">
                {startRecord}–{endRecord}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-800">{filteredStudents.length}</span>{" "}
              students
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
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-2 text-slate-400 font-semibold select-none"
                      >
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
                      className={`h-8 min-w-[32px] px-2 text-xs font-semibold ${
                        isActive
                          ? "bg-primary hover:bg-blue-700 text-white shadow-sm border-primary"
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

      {/* Institute overview — always visible */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/70 bg-white shadow-sm p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold text-slate-900">Student Enrollment Trend</h4>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Cumulative student intake trajectory
            </p>
            <div className="h-36 w-full">
              {enrollmentTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={enrollmentTrend}
                    margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderRadius: "6px",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: "11px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="students"
                      stroke="#2563EB"
                      fill="#2563EB"
                      fillOpacity={0.15}
                      strokeWidth={2}
                      name="Total Students"
                    />
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
              {attendanceDistribution.some((d) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={attendanceDistribution}
                    margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="range"
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                      tickLine={false}
                      axisLine={false}
                    />
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
              {courseShare.slice(0, 5).map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-slate-700 truncate max-w-[130px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Selected student analytics — below overview */}
      {studentAnalytics && (
        <div ref={analyticsRef} className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="px-4 py-3 bg-white border border-slate-200/90 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1E40AF] to-primary text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-blue-100 shrink-0">
                {(studentAnalytics.name || "S").substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">{studentAnalytics.name}</h3>
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-primary border border-blue-100">
                    {studentAnalytics.studentCode}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {studentAnalytics.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-700">Course:</span>{" "}
                  {studentAnalytics.courseLabel}
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">Batch:</span>{" "}
                  {studentAnalytics.batchName}
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">Counsellor:</span>{" "}
                  {studentAnalytics.counsellorName}
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">Gender:</span>{" "}
                  {studentAnalytics.gender}
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">DOB:</span>{" "}
                  {studentAnalytics.dateOfBirth}
                  <span className="text-slate-300">|</span>
                  <span className="font-medium text-slate-700">Enquiry:</span>{" "}
                  {studentAnalytics.enquiryDate}
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

          {isSelectedAnalyticsLoading ? (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
              <Card className="border-border/70 bg-white shadow-sm flex flex-col justify-between p-4 rounded-xl">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        Attendance Trend
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate max-w-[170px]">
                        Weekly rate for {studentAnalytics.name}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      {(selectedStudentSummary?.conductedCount ?? 0) > 0
                        ? `${selectedStudentSummary?.attendancePercentage}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="h-28 w-full mt-2">
                    {studentAnalytics.weeklyAttendance.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={studentAnalytics.weeklyAttendance}
                          margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="compactAttGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="2 2"
                            vertical={false}
                            stroke="#F1F5F9"
                          />
                          <XAxis
                            dataKey="week"
                            tick={{ fontSize: 9, fill: "#94A3B8" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: "#94A3B8" }}
                            tickLine={false}
                            axisLine={false}
                            unit="%"
                          />
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
                  <span>Consecutive absences: {studentAnalytics.consecutive}</span>
                  <span className="font-semibold text-slate-700">Weekly %</span>
                </div>
              </Card>

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
                          <span className="text-xs font-bold text-slate-900 leading-none">
                            {studentAnalytics.completionPercent}%
                          </span>
                          <span className="text-[8px] text-slate-400 font-medium leading-none mt-0.5">
                            Done
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-slate-400 text-center px-3">
                        No assignment records yet.
                      </div>
                    )}
                  </div>
                  {studentAnalytics.assignmentDonutData.length > 0 && (
                    <div className="grid grid-cols-3 gap-1 text-center text-[10px] pt-1.5 border-t border-slate-100">
                      {studentAnalytics.assignmentDonutData.map((item) => (
                        <div key={item.name} className="p-1 rounded bg-slate-50">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-[9px] text-slate-500 truncate">
                              {item.name.substring(0, 4)}
                            </span>
                          </div>
                          <span className="font-bold text-slate-800 text-[10px] block">
                            {item.value}{" "}
                            <span className="text-slate-400 text-[8px]">({item.percent}%)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {studentAnalytics.assignmentDonutData.length > 0 &&
                  (studentAnalytics.uncompletedCount > 0 ? (
                    <div className="mt-2 p-1.5 bg-amber-50/90 border border-amber-200/70 rounded flex items-center gap-1.5 text-amber-900 text-[10px] font-medium">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span className="truncate">
                        {studentAnalytics.uncompletedCount} pending / unsubmitted
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 p-1.5 bg-emerald-50/90 border border-emerald-200/70 rounded flex items-center gap-1.5 text-emerald-900 text-[10px] font-medium">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span className="truncate">All submitted</span>
                    </div>
                  ))}
              </Card>

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
                        <BarChart
                          data={studentAnalytics.testScoresData}
                          margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="2 2"
                            vertical={false}
                            stroke="#F1F5F9"
                          />
                          <XAxis
                            dataKey="test"
                            tick={{ fontSize: 9, fill: "#94A3B8" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: "#94A3B8" }}
                            tickLine={false}
                            axisLine={false}
                          />
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
                          <Bar
                            dataKey="score"
                            fill="#3B82F6"
                            radius={[3, 3, 0, 0]}
                            name="Score"
                          />
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
                      {studentAnalytics.isHighRisk
                        ? "High Risk"
                        : selectedStudentSummary?.riskFlag || "Normal"}
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
                              <span className="font-medium text-slate-700 truncate max-w-[110px]">
                                {factor.name}
                              </span>
                              <span className="font-bold text-slate-900">
                                {factor.name.includes("Consecutive")
                                  ? studentAnalytics.consecutive
                                  : `${factor.value}%`}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, factor.value))}%`,
                                }}
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

                {studentAnalytics.riskFactors.length > 0 &&
                  (studentAnalytics.isHighRisk ? (
                    <div className="mt-2 p-1.5 bg-rose-50/90 border border-rose-200 rounded flex items-center gap-1.5 text-rose-900 text-[10px] font-semibold">
                      <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                      <span className="truncate">High risk • Follow-up advised</span>
                    </div>
                  ) : (
                    <div className="mt-2 p-1.5 bg-emerald-50/90 border border-emerald-200 rounded flex items-center gap-1.5 text-emerald-900 text-[10px] font-medium">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span className="truncate">Performance within normal limits</span>
                    </div>
                  ))}
              </Card>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};
