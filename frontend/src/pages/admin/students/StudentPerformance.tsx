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
import { METRIC_GRID_COLUMNS, MetricGrid, PageContainer, PageHeader } from "@/components/layout";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building,
  Calendar,
  ClipboardList,
  FileEdit,
  FileText,
  LayoutGrid,
  Loader2,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useStudent, useStudentList, useStudentPerformance } from "@/hooks/useStudents";
import { useStudentReport } from "@/hooks/useReports";
import { useBranchStore } from "@/store/branch.store";
import { coursesFromStudent, formatPackageCourseLabel } from "@/utils/admission-package.utils";
import { CourseChips } from "@/components/common/CourseChips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Student, StudentAssignmentItem, StudentAttendanceRecord } from "@/types/student.types";

const notRecorded = "—";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
    <div className="h-[180px] flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center">
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

function Delta({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return null;
  const change = current - previous;
  if (change === 0) return <span className="text-[10px] font-semibold text-slate-400">No change</span>;
  const up = change > 0;
  return (
    <span className={`text-[10px] font-bold flex items-center ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
      {Math.abs(change)}% vs previous
    </span>
  );
}

export const StudentPerformance: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryStudentId = searchParams.get("studentId");
  const [studentSearch, setStudentSearch] = useState("");

  const { selectedBranchId } = useBranchStore();
  const branchFilter = selectedBranchId !== "ALL" ? selectedBranchId : undefined;

  const { data: studentListResponse, isLoading: studentsLoading, isError: studentsError } = useStudentList({
    limit: 100,
    branchId: branchFilter,
  });
  const { data: reportData } = useStudentReport(branchFilter);
  const apiStudents = studentListResponse?.data ?? [];
  const reportStudents = reportData?.students ?? [];

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
        <PageHeader
          title="Academic Performance"
          description="Select a student to view their recorded attendance, assessments, and course progress."
        />

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder="Search by name, code, course, or batch"
            className="pl-9"
          />
        </div>

        {studentsError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" /> Unable to load students.
          </div>
        )}

        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-5">Student</th>
                  <th className="p-3.5">Course & Batch</th>
                  <th className="p-3.5">Attendance</th>
                  <th className="p-3.5">Performance</th>
                  <th className="p-3.5 text-right pr-5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
                      Loading students...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No students found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try a different name, code, or course.</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => openStudentPerformance(row.id)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-slate-200">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {initials(row.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-primary">{row.name}</p>
                            <p className="font-mono text-[11px] text-slate-500">{row.studentCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <CourseChips courses={row.courses} fallback="Not assigned" maxVisible={2} />
                        <p className="text-[11px] text-slate-500 mt-1">{row.batch}</p>
                      </td>
                      <td className="p-3.5">
                        <span className={`font-bold ${
                          row.attendancePercent === null
                            ? "text-slate-400"
                            : row.attendancePercent >= 75
                              ? "text-emerald-700"
                              : "text-amber-700"
                        }`}>
                          {row.attendancePercent === null ? notRecorded : `${row.attendancePercent}%`}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800">{row.performanceLabel}</span>
                      </td>
                      <td className="p-3.5 text-right pr-5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContainer>
    );
  }

  if (detailLoading || performanceLoading) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading academic performance...
        </div>
      </PageContainer>
    );
  }

  if (detailError || performanceError || !student || !performance) {
    return (
      <PageContainer>
        <PageHeader title="Academic Performance" description="This student's records could not be loaded." />
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> Failed to load live student performance.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={backToStudentList}>
            <ArrowLeft className="h-4 w-4" /> Back to students
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void refetchDetail();
              void refetchPerformance();
            }}
          >
            Retry
          </Button>
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
      ? Math.round(analytics.assessments.reduce((sum, item) => sum + item.percent, 0) / analytics.assessments.length)
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

  return (
    <PageContainer>
      <div className="flex items-start gap-3.5">
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-3.5 text-slate-700 hover:text-primary hover:bg-blue-50/50 border-slate-200 shadow-sm font-semibold flex items-center gap-2 shrink-0"
          onClick={backToStudentList}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <PageHeader
          className="flex-1 min-w-0"
          title="Academic Performance"
          description="Attendance, assessments, and course progress from this student's records."
        />
      </div>

      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
            <div className="flex items-center gap-4 min-w-[280px]">
              <Avatar className="h-16 w-16 border border-slate-200">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                  {initials(student.user?.name || student.studentCode)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h2 className="text-xl font-bold text-slate-900">{student.user?.name || student.studentCode}</h2>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    atRisk || student.status === "DISCONTINUED"
                      ? "bg-red-50 text-red-600 border border-red-200/60"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                  }`}>
                    {statusLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                  <span>{student.studentCode}</span>
                  <span>•</span>
                  <span>{student.user?.phone || notRecorded}</span>
                  <span>•</span>
                  <span>{student.user?.email || notRecorded}</span>
                </p>
              </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-slate-100" />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 flex-1 w-full">
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <FileText className="h-3.5 w-3.5" /> Admission No.
                </p>
                <p className="text-[13px] font-bold text-slate-800">{admission?.admissionNo || notRecorded}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5" /> Batch
                </p>
                <p className="text-[13px] font-bold text-slate-800">{student.batchName || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <BookOpen className="h-3.5 w-3.5" /> Course
                </p>
                <CourseChips courses={courses} fallback="Not assigned" maxVisible={4} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <Building className="h-3.5 w-3.5" /> Center
                </p>
                <p className="text-[13px] font-bold text-slate-800">{student.branch?.name || notRecorded}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <MetricGrid columns={METRIC_GRID_COLUMNS[4]} density="compact">
        <Card size="compact" className="border-slate-200 shadow-sm bg-white">
          <CardContent size="compact" className="flex items-start gap-3.5">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Courses Enrolled</p>
              <h3 className="text-2xl font-bold text-slate-900 my-0.5">{performance.enrolledCourses.length}</h3>
              <p className="text-xs text-slate-400 font-medium">Faculty: {facultyName}</p>
            </div>
          </CardContent>
        </Card>

        <Card size="compact" className="border-slate-200 shadow-sm bg-white">
          <CardContent size="compact" className="flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">Overall Attendance</p>
                {attendancePercent !== null && (
                  <Delta current={attendancePercent} previous={analytics.previousAttendance} />
                )}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 my-0.5">
                {attendancePercent === null ? notRecorded : `${attendancePercent}%`}
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate">
                {performance.totalClasses > 0
                  ? `Present in ${performance.presentCount} of ${performance.totalClasses} classes`
                  : "No classes recorded"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card size="compact" className="border-slate-200 shadow-sm bg-white">
          <CardContent size="compact" className="flex items-start gap-3.5">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0">
              <FileEdit className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">Average Test Score</p>
                {averageScore !== null && <Delta current={averageScore} previous={analytics.previousScore} />}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 my-0.5">
                {averageScore === null ? notRecorded : `${averageScore}%`}
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate">
                {analytics.assessments.length > 0
                  ? `Across ${analytics.assessments.length} graded assessments`
                  : "No graded assessments"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card size="compact" className="border-slate-200 shadow-sm bg-white">
          <CardContent size="compact" className="flex items-start gap-3.5">
            <div className="p-2.5 bg-orange-50 rounded-xl text-orange-500 shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Assignments Completed</p>
              <h3 className="text-2xl font-bold text-slate-900 my-0.5">
                {analytics.submittedCount}/{analytics.totalAssignments}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {analytics.totalAssignments > 0 ? "Submitted or graded" : "No assignments assigned"}
              </p>
            </div>
          </CardContent>
        </Card>
      </MetricGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="mb-4">
              <p className="text-xs text-slate-400 font-medium">Overall Attendance</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {attendancePercent === null ? notRecorded : `${attendancePercent}%`}
              </p>
            </div>
            {analytics.attendanceHistory.length === 0 ? (
              <EmptyChart message="No attendance has been marked for this student yet." />
            ) : (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.attendanceHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} />
                    <RechartsTooltip formatter={(value) => [`${value}%`, "Attendance"]} />
                    <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">Assessment Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {analytics.assessmentDistribution.length === 0 ? (
              <EmptyChart message="No graded assessments yet." />
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="h-[180px] w-[140px] relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics.assessmentDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={68} paddingAngle={2} dataKey="count">
                        {analytics.assessmentDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-slate-900">{analytics.assessments.length}</span>
                    <span className="text-[10px] font-semibold text-slate-400">Graded</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2.5">
                  {analytics.assessmentDistribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-slate-700 text-[11px] truncate">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-800 text-[11px] shrink-0">
                        {item.count} <span className="text-slate-400 font-normal">({item.percent})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">Performance Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {analytics.performanceTrend.length === 0 ? (
              <EmptyChart message="Scores will appear here after assessments are graded." />
            ) : (
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.performanceTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} />
                    <RechartsTooltip formatter={(value) => [`${value}%`, "Score"]} />
                    <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#scoreGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm bg-white lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Assessment Results</CardTitle>
          </CardHeader>
          {analytics.assessments.length === 0 ? (
            <CardContent className="p-8 text-center text-sm text-slate-500">
              No graded assessment results for this student.
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Assessment</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium text-center">Max</th>
                    <th className="px-4 py-3 font-medium text-center">Obtained</th>
                    <th className="px-4 py-3 font-medium text-center">Score</th>
                    <th className="px-5 py-3 font-medium text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.assessments.map((test) => (
                    <tr key={test.id}>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{test.name}</td>
                      <td className="px-4 py-3.5 text-slate-500">{test.date}</td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{test.maxMarks}</td>
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-800">{test.obtained}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-primary">{test.percent}%</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded font-bold text-[11px] ${test.gradeClassName}`}>
                          {test.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              Enrolled Courses ({performance.enrolledCourses.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {performance.enrolledCourses.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No active course enrollment.</p>
            ) : (
              performance.enrolledCourses.map((course) => (
                <div key={`${course.courseId}-${course.batchCode}`} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{course.courseName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Batch: {course.batchName} · {course.completedModules}/{course.totalModules} modules completed
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-bold text-slate-900">{course.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${course.completionPercentage}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-slate-400">
        Figures come from marked attendance, submitted assignments, and active batch enrollments.
      </p>
    </PageContainer>
  );
};
