import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FilterToolbar, PageContainer, PageHeader } from "@/components/layout";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useStudent, useStudentList, useStudentPerformance } from "@/hooks/useStudents";
import { useStudentReport } from "@/hooks/useReports";
import { useBranchScopeForLists } from "@/hooks/useBranchScopeForLists";
import { coursesFromStudent, formatPackageCourseLabel } from "@/utils/admission-package.utils";
import { CourseChips } from "@/components/common/CourseChips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Student, StudentAssignmentItem, StudentAttendanceRecord } from "@/types/student.types";

const notRecorded = "—";

const tableShell =
  "min-w-0 overflow-x-auto " +
  "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
  "[&_thead]:bg-muted/50 " +
  "[&_th]:h-9 [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:font-semibold " +
  "[&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground " +
  "[&_th]:border [&_th]:border-border [&_th]:whitespace-nowrap " +
  "[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_td]:border [&_td]:border-border " +
  "[&_tbody_tr]:hover:bg-muted/30 [&_tbody_tr]:transition-colors";

function performanceBadgeClass(label: string) {
  switch (label) {
    case "Good":
    case "Active":
      return "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20";
    case "Average":
    case "On Leave":
      return "bg-amber-500/10 text-amber-800 border border-amber-500/20";
    case "Needs Improvement":
    case "At Risk":
    case "Discontinued":
      return "bg-red-500/10 text-red-700 border border-red-500/20";
    case "Completed":
      return "bg-blue-500/10 text-blue-700 border border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function scorePercent(obtained: number, maxScore: number) {
  if (maxScore <= 0) return 0;
  return Math.round((obtained / maxScore) * 100);
}

function gradeFromPercent(percent: number) {
  if (percent >= 90) return { label: "A+", className: "bg-emerald-50 text-emerald-700" };
  if (percent >= 80) return { label: "A", className: "bg-emerald-50 text-emerald-700" };
  if (percent >= 70) return { label: "B", className: "bg-blue-50 text-blue-700" };
  if (percent >= 60) return { label: "C", className: "bg-amber-50 text-amber-700" };
  return { label: "D", className: "bg-red-50 text-red-700" };
}

function formatDate(value?: string | null) {
  if (!value) return notRecorded;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return notRecorded;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function monthLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[180px] flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function Delta({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return null;
  const change = current - previous;
  if (change === 0) {
    return <span className="text-[10px] font-medium text-muted-foreground">No change</span>;
  }
  const up = change > 0;
  return (
    <span
      className={`text-[10px] font-semibold flex items-center ${
        up ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
      {Math.abs(change)}% vs previous
    </span>
  );
}

export const StudentPerformance: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryStudentId = searchParams.get("studentId");
  const [studentSearch, setStudentSearch] = useState("");

  const {
    branches,
    allowAllBranches,
    showBranchSelector,
    selectedBranchId,
    branchIdForQuery,
    setSelectedBranchId,
  } = useBranchScopeForLists();

  const { data: studentListResponse, isLoading: studentsLoading, isError: studentsError } = useStudentList({
    limit: 200,
    branchId: branchIdForQuery,
  });
  const { data: reportData } = useStudentReport(branchIdForQuery);
  const apiStudents = studentListResponse?.data ?? [];
  const reportStudents = reportData?.students ?? [];
  const totalFromApi = studentListResponse?.meta?.total ?? apiStudents.length;

  const listStudents = useMemo(() => {
    return apiStudents.map((student: Student) => {
      const reportRow = reportStudents.find((row) => row.id === student.id);
      const courses = coursesFromStudent({
        courses: student.courses,
        courseName: reportRow?.courseName || student.courseName,
      });
      const attendance = student.attendance;
      const hasAttendance = (attendance?.totalClasses ?? 0) > 0;
      const attendancePercent = hasAttendance
        ? attendance?.overallPercentage ?? reportRow?.attendancePercentage ?? 0
        : reportRow && reportRow.attendancePercentage > 0
          ? reportRow.attendancePercentage
          : null;
      const atRisk =
        reportRow?.riskFlag === "At Risk" ||
        reportRow?.riskFlag === "Triggered" ||
        Boolean(attendance?.isDiscontinuationRisk);

      return {
        id: student.id,
        name: student.user?.name || reportRow?.name || student.studentCode,
        studentCode: student.studentCode,
        courses,
        course: formatPackageCourseLabel(courses) || student.courseName || "Not assigned",
        batch: student.batchName || "Not assigned",
        center: student.branch?.name || reportRow?.branchName || notRecorded,
        attendancePercent,
        performanceLabel: atRisk
          ? "At Risk"
          : attendancePercent === null
            ? "No records"
            : attendancePercent >= 80
              ? "Good"
              : attendancePercent >= 60
                ? "Average"
                : "Needs Improvement",
      };
    });
  }, [apiStudents, reportStudents]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return listStudents;
    return listStudents.filter((student) =>
      [student.name, student.studentCode, student.course, student.batch, student.center]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [listStudents, studentSearch]);

  const {
    data: studentDetailRes,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useStudent(queryStudentId || undefined);
  const {
    data: performanceRes,
    isLoading: performanceLoading,
    isError: performanceError,
    refetch: refetchPerformance,
  } = useStudentPerformance(queryStudentId || undefined);

  const student = studentDetailRes?.data;
  const performance = performanceRes?.data;

  const analytics = useMemo(() => {
    const records = [...(student?.attendanceRecords ?? [])].sort(
      (a, b) => new Date(a.classSession.scheduledDate).getTime() - new Date(b.classSession.scheduledDate).getTime()
    );
    const attendanceByMonth = new Map<string, StudentAttendanceRecord[]>();
    for (const record of records) {
      const key = monthLabel(record.classSession.scheduledDate);
      const bucket = attendanceByMonth.get(key) ?? [];
      bucket.push(record);
      attendanceByMonth.set(key, bucket);
    }
    const attendanceHistory = Array.from(attendanceByMonth.entries()).map(([date, monthRecords]) => {
      const present = monthRecords.filter((record) => record.status === "PRESENT").length;
      return {
        date,
        attendance: monthRecords.length > 0 ? Math.round((present / monthRecords.length) * 100) : 0,
      };
    });

    const graded = (student?.assignments ?? []).filter(
      (item): item is StudentAssignmentItem & { marks: number } => item.marks !== null
    );
    const assessments = graded
      .slice()
      .sort((a, b) => new Date(a.submittedAt || a.dueDate || 0).getTime() - new Date(b.submittedAt || b.dueDate || 0).getTime())
      .map((item) => {
        const percent = scorePercent(item.marks, item.maxMarks ?? 100);
        const grade = gradeFromPercent(percent);
        return {
          id: item.id,
          name: item.title,
          date: formatDate(item.submittedAt || item.dueDate),
          maxMarks: item.maxMarks ?? 100,
          obtained: item.marks,
          percent,
          grade: grade.label,
          gradeClassName: grade.className,
          status: item.status,
        };
      });

    const performanceTrend = assessments.map((item) => ({
      month: item.name.length > 16 ? `${item.name.slice(0, 16)}…` : item.name,
      score: item.percent,
    }));

    const buckets = [
      { name: "Excellent (80-100%)", min: 80, max: 100, color: "#22c55e" },
      { name: "Good (60-79%)", min: 60, max: 79, color: "#3b82f6" },
      { name: "Average (40-59%)", min: 40, max: 59, color: "#f59e0b" },
      { name: "Below Average (0-39%)", min: 0, max: 39, color: "#ef4444" },
    ];
    const assessmentDistribution = buckets
      .map((bucket) => {
        const count = assessments.filter((item) => item.percent >= bucket.min && item.percent <= bucket.max).length;
        return {
          name: bucket.name,
          count,
          percent: assessments.length > 0 ? `${Math.round((count / assessments.length) * 100)}%` : "0%",
          color: bucket.color,
        };
      })
      .filter((bucket) => bucket.count > 0);

    const submittedCount = (student?.assignments ?? []).filter(
      (item) => item.status === "SUBMITTED" || item.status === "GRADED" || item.status === "LATE"
    ).length;

    return {
      attendanceHistory,
      assessments,
      performanceTrend,
      assessmentDistribution,
      submittedCount,
      totalAssignments: student?.assignments?.length ?? 0,
      previousAttendance: attendanceHistory.length > 1 ? attendanceHistory[attendanceHistory.length - 2].attendance : null,
      previousScore: performanceTrend.length > 1 ? performanceTrend[performanceTrend.length - 2].score : null,
    };
  }, [student]);

  const openStudentPerformance = (studentId: string) => {
    setSearchParams({ studentId });
  };

  const backToStudentList = () => {
    setStudentSearch("");
    setSearchParams({});
  };

  if (!queryStudentId) {
    return (
      <PageContainer>
        <PageHeader title="Academic Performance" />

        <FilterToolbar className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Search name, code, course, or batch"
              className="w-full h-9 pl-9 pr-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
            />
          </div>
          {showBranchSelector && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-9 text-sm border border-border rounded-lg px-3 text-foreground bg-background focus:outline-none focus:border-primary"
            >
              {allowAllBranches && <option value="ALL">All branches</option>}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
        </FilterToolbar>

        {studentsError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" /> Unable to load students.
          </div>
        )}

        {!studentsLoading && !studentsError && (
          <p className="text-xs text-muted-foreground">
            Showing {filteredStudents.length}
            {totalFromApi > filteredStudents.length ? ` of ${totalFromApi}` : ""} student
            {filteredStudents.length === 1 ? "" : "s"}
          </p>
        )}

        <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
          <div className={tableShell}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => openStudentPerformance(row.id)}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <p className="font-semibold text-foreground">{row.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{row.studentCode}</p>
                      </TableCell>
                      <TableCell>
                        <CourseChips courses={row.courses} fallback="Not assigned" maxVisible={2} />
                      </TableCell>
                      <TableCell className="text-foreground">{row.batch}</TableCell>
                      <TableCell className="tabular-nums font-medium text-foreground">
                        {row.attendancePercent === null ? notRecorded : `${row.attendancePercent}%`}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${performanceBadgeClass(
                            row.performanceLabel
                          )}`}
                        >
                          {row.performanceLabel}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </PageContainer>
    );
  }

  if (detailLoading || performanceLoading) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading…
        </div>
      </PageContainer>
    );
  }

  if (detailError || performanceError || !student || !performance) {
    return (
      <PageContainer>
        <PageHeader
          title="Academic Performance"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-9" onClick={backToStudentList}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  void refetchDetail();
                  void refetchPerformance();
                }}
              >
                Retry
              </Button>
            </div>
          }
        />
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> Failed to load student performance.
        </div>
      </PageContainer>
    );
  }

  const courses = coursesFromStudent({ courses: student.courses, courseName: student.courseName });
  const admission = student.admissions?.[0] as { admissionNo?: string; admissionDate?: string } | undefined;
  const facultyName =
    student.facultyName ||
    student.batchEnrollments
      ?.map((enrollment) => enrollment.batch.faculty?.user?.name)
      .filter(Boolean)
      .join(", ") ||
    notRecorded;
  const attendancePercent = performance.totalClasses > 0 ? performance.overallAttendancePercent : null;
  const averageScore =
    analytics.assessments.length > 0
      ? Math.round(
          analytics.assessments.reduce((sum, item) => sum + item.percent, 0) /
            analytics.assessments.length
        )
      : null;
  const atRisk = performance.discontinuationAlert || student.status === "DISCONTINUED";
  const statusLabel =
    student.status === "DISCONTINUED"
      ? "Discontinued"
      : student.status === "COMPLETED"
        ? "Completed"
        : student.status === "ON_LEAVE"
          ? "On Leave"
          : atRisk
            ? "At Risk"
            : "Active";
  const studentName = student.user?.name || student.studentCode;

  const metricCards = [
    {
      label: "Courses",
      value: String(performance.enrolledCourses.length),
      hint: facultyName !== notRecorded ? `Faculty: ${facultyName}` : null,
      delta: null as React.ReactNode,
    },
    {
      label: "Attendance",
      value: attendancePercent === null ? notRecorded : `${attendancePercent}%`,
      hint:
        performance.totalClasses > 0
          ? `${performance.presentCount}/${performance.totalClasses} present`
          : "No classes recorded",
      delta:
        attendancePercent !== null ? (
          <Delta current={attendancePercent} previous={analytics.previousAttendance} />
        ) : null,
    },
    {
      label: "Avg. score",
      value: averageScore === null ? notRecorded : `${averageScore}%`,
      hint:
        analytics.assessments.length > 0
          ? `${analytics.assessments.length} graded`
          : "No graded assessments",
      delta:
        averageScore !== null ? (
          <Delta current={averageScore} previous={analytics.previousScore} />
        ) : null,
    },
    {
      label: "Assignments",
      value: `${analytics.submittedCount}/${analytics.totalAssignments}`,
      hint: analytics.totalAssignments > 0 ? "Submitted or graded" : "None assigned",
      delta: null as React.ReactNode,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={studentName}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs">{student.studentCode}</span>
            <span
              className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${performanceBadgeClass(
                statusLabel
              )}`}
            >
              {statusLabel}
            </span>
            {student.user?.phone ? <span>· {student.user.phone}</span> : null}
          </span>
        }
        actions={
          <Button variant="outline" size="sm" className="h-9" onClick={backToStudentList}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />

      <Card className="border border-border shadow-xs bg-card rounded-xl">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Admission No.</p>
              <p className="mt-0.5 font-medium text-foreground">
                {admission?.admissionNo || notRecorded}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Batch</p>
              <p className="mt-0.5 font-medium text-foreground">
                {student.batchName || "Not assigned"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Course</p>
              <div className="mt-0.5">
                <CourseChips courses={courses} fallback="Not assigned" maxVisible={3} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Center</p>
              <p className="mt-0.5 font-medium text-foreground">
                {student.branch?.name || notRecorded}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {metricCards.map((card) => (
          <Card key={card.label} className="border border-border shadow-sm bg-card">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                {card.delta}
              </div>
              <p className="mt-0.5 text-xl font-semibold text-foreground tabular-nums">{card.value}</p>
              {card.hint ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{card.hint}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-border shadow-xs bg-card rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Attendance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {analytics.attendanceHistory.length === 0 ? (
              <EmptyChart message="No attendance marked yet." />
            ) : (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analytics.attendanceHistory}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <RechartsTooltip formatter={(value) => [`${value}%`, "Attendance"]} />
                    <Line
                      type="monotone"
                      dataKey="attendance"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Assessments</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {analytics.assessmentDistribution.length === 0 ? (
              <EmptyChart message="No graded assessments yet." />
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="h-[180px] w-[140px] relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.assessmentDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={68}
                        paddingAngle={2}
                        dataKey="count"
                      >
                        {analytics.assessmentDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-semibold text-foreground">
                      {analytics.assessments.length}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">Graded</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {analytics.assessmentDistribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-foreground truncate">{item.name}</span>
                      </div>
                      <span className="font-semibold text-foreground shrink-0 tabular-nums">
                        {item.count}{" "}
                        <span className="text-muted-foreground font-normal">({item.percent})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Score trend</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {analytics.performanceTrend.length === 0 ? (
              <EmptyChart message="Scores appear after assessments are graded." />
            ) : (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analytics.performanceTrend}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <RechartsTooltip formatter={(value) => [`${value}%`, "Score"]} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#scoreGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Assessment results</p>
          </div>
          {analytics.assessments.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No graded assessment results for this student.
            </div>
          ) : (
            <div className={tableShell}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Max</TableHead>
                    <TableHead className="text-center">Obtained</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.assessments.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-semibold text-foreground">{test.name}</TableCell>
                      <TableCell className="text-muted-foreground">{test.date}</TableCell>
                      <TableCell className="text-center tabular-nums">{test.maxMarks}</TableCell>
                      <TableCell className="text-center tabular-nums font-medium">
                        {test.obtained}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-semibold text-primary">
                        {test.percent}%
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${test.gradeClassName}`}
                        >
                          {test.grade}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Enrolled courses</p>
          </div>
          {performance.enrolledCourses.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No active course enrollment.
            </div>
          ) : (
            <div className={tableShell}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-center">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.enrolledCourses.map((course) => (
                    <TableRow key={`${course.courseId}-${course.batchCode}`}>
                      <TableCell>
                        <p className="font-semibold text-foreground">{course.courseName}</p>
                        <p className="text-xs text-muted-foreground">
                          {course.completedModules}/{course.totalModules} modules
                        </p>
                      </TableCell>
                      <TableCell className="text-foreground">{course.batchName}</TableCell>
                      <TableCell className="text-center">
                        <span className="tabular-nums font-semibold text-foreground">
                          {course.completionPercentage}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};
