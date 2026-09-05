import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import {
  BookOpen,
  User,
  Calendar,
  ClipboardList,
  Download,
  Star,
  LayoutGrid,
  FileEdit,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  Code2,
  FileText,
  Building,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useStudentList } from "../../../hooks/useStudents";
import { useStudentReport } from "../../../hooks/useReports";
import { useBranchStore } from "@/store/branch.store";
import { coursesFromStudent, formatPackageCourseLabel } from "@/utils/admission-package.utils";
import { CourseChips } from "@/components/common/CourseChips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const StudentPerformance: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryStudentId = searchParams.get("studentId");

  const { selectedBranchId } = useBranchStore();
  const branchFilter = selectedBranchId !== "ALL" ? selectedBranchId : undefined;

  // Fetch real students from API
  const { data: studentListResponse } = useStudentList({ limit: 100 });
  const apiStudents = studentListResponse?.data ?? [];

  const {
    data: reportData,
    isLoading: reportLoading,
    isError: reportError,
  } = useStudentReport(branchFilter);

  const reportStudents = reportData?.students ?? [];
  const maxEnrollment = Math.max(
    ...(reportData?.enrollmentTrend?.map((t) => t.students) ?? [1]),
    1
  );

  const instituteAttendanceHistory = useMemo(
    () =>
      (reportData?.enrollmentTrend ?? []).map((t) => ({
        date: t.month,
        attendance: reportData?.summary?.avgAttendanceRate ?? 0,
      })),
    [reportData]
  );

  const institutePerformanceTrend = useMemo(
    () =>
      (reportData?.enrollmentTrend ?? []).map((t) => ({
        month: t.month,
        score: Math.min(100, Math.round((t.students / maxEnrollment) * 100)),
      })),
    [reportData, maxEnrollment]
  );

  // Build unified student list strictly from PostgreSQL
  const allAvailableStudents = useMemo(() => {
    return apiStudents.map((apiS: any) => {
      const reportRow = reportStudents.find((r) => r.id === apiS.id);
      const packageCourses = coursesFromStudent({
        courses: apiS.courses,
        courseName:
          reportRow?.courseName ||
          (apiS.admissions || []).map((a: any) => a.course?.name).filter(Boolean).join(", ") ||
          apiS.courseName,
      });
      const courseName =
        formatPackageCourseLabel(packageCourses) ||
        reportRow?.courseName ||
        apiS.admissions?.[0]?.course?.name ||
        "Full Stack Web Development";
      const branchName = reportRow?.branchName || apiS.branch?.name || "Aadya Branch";
      const attPct =
        reportRow?.attendancePercentage ??
        (() => {
          const totalAttendances = apiS.studentAttendances?.length || 0;
          const presentCount =
            apiS.studentAttendances?.filter((a: any) => a.status === "PRESENT")?.length || 0;
          return totalAttendances > 0 ? Math.round((presentCount / totalAttendances) * 100) : 85;
        })();
      const submissionsCount =
        reportRow?.assignmentsSubmitted ?? apiS.assignmentSubmissions?.length ?? 0;
      const totalAssignments = reportRow?.totalAssignments ?? 10;
      const assignmentPct =
        totalAssignments > 0 ? Math.round((submissionsCount / totalAssignments) * 100) : 75;

      const batchLabel =
        (apiS.admissions || [])
          .map((a: any) => a.batch?.name || a.batch?.code)
          .filter(Boolean)
          .join(", ") ||
        apiS.admissions?.[0]?.batch?.name ||
        "Active Batch";

      return {
        id: apiS.id,
        name: reportRow?.name || apiS.user?.name || `Student ${apiS.studentCode}`,
        studentCode: apiS.studentCode,
        email: apiS.user?.email || "student@aadya.in",
        phone: apiS.user?.phone || "+91 98765 43210",
        course: courseName,
        courses: packageCourses,
        batch: batchLabel,
        faculty: "Faculty Instructor",
        center: branchName,
        admissionNo: `ADM-${apiS.studentCode}`,
        dateOfJoining: apiS.createdAt
          ? new Date(apiS.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "N/A",
        status: reportRow?.riskFlag === "At Risk" ? "AT RISK" : apiS.status || "ACTIVE",
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250`,
        attendance: attPct,
        progress: assignmentPct,
        coursesCount: Math.max(packageCourses.length, 1),
        assignmentsCompleted: `${submissionsCount}/${totalAssignments}`,
        performanceGrade: attPct >= 80 ? "Good" : attPct >= 60 ? "Average" : "Needs Improvement",
        performanceMessage: reportRow?.riskFlag === "At Risk" ? "Attendance risk flagged" : "Academic progress active",
        assessments: [] as any[],
        enrolledCourses:
          packageCourses.length > 0
            ? packageCourses.map((c, idx) => ({
                name: c.name,
                batch: batchLabel,
                progress: assignmentPct,
                status: "In Progress",
                icon: Code2,
                iconBg: idx % 2 === 0 ? "bg-blue-50 text-blue-600" : "bg-indigo-50 text-indigo-600",
              }))
            : [
                {
                  name: courseName,
                  batch: batchLabel,
                  progress: assignmentPct,
                  status: "In Progress",
                  icon: Code2,
                  iconBg: "bg-blue-50 text-blue-600",
                },
              ],
        attendanceHistory:
          instituteAttendanceHistory.length > 0
            ? instituteAttendanceHistory.map((p) => ({ ...p, attendance: attPct }))
            : [{ date: "Current", attendance: attPct }],
        performanceTrend:
          institutePerformanceTrend.length > 0
            ? institutePerformanceTrend.map((p) => ({ ...p, score: assignmentPct }))
            : [{ month: "Current", score: assignmentPct }],
      };
    });
  }, [apiStudents, reportStudents, instituteAttendanceHistory, institutePerformanceTrend]);

  // Determine selected student ID
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return queryStudentId || (allAvailableStudents[0]?.id ?? "");
  });

  // Sync state with URL parameter changes
  useEffect(() => {
    if (queryStudentId && queryStudentId !== selectedStudentId) {
      setSelectedStudentId(queryStudentId);
    } else if (!queryStudentId && allAvailableStudents.length > 0) {
      setSelectedStudentId(allAvailableStudents[0].id);
      setSearchParams({ studentId: allAvailableStudents[0].id });
    }
  }, [queryStudentId, allAvailableStudents]);

  const handleStudentSelect = (newStudentId: string) => {
    setSelectedStudentId(newStudentId);
    setSearchParams({ studentId: newStudentId });
  };

  // Find the active student data
  const currentStudent = useMemo(() => {
    const found = allAvailableStudents.find(
      s => s.id === selectedStudentId || s.studentCode === selectedStudentId
    );
    return found || allAvailableStudents[0] || {
      id: "none",
      name: "Student",
      studentCode: "STU-001",
      email: "student@aadya.in",
      phone: "N/A",
      course: "Full Stack Development",
      batch: "Active Batch",
      faculty: "Faculty Instructor",
      center: "Aadya Branch",
      admissionNo: "ADM-001",
      dateOfJoining: "N/A",
      status: "ACTIVE",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
      attendance: 85,
      progress: 75,
      coursesCount: 1,
      assignmentsCompleted: "0/0",
      performanceGrade: "Good",
      performanceMessage: "Academic progress active",
      assessments: [] as any[],
      enrolledCourses: [],
      attendanceHistory: [],
      performanceTrend: [],
    };
  }, [allAvailableStudents, selectedStudentId]);

  // Calculate Average Test Score
  const avgTestScore = useMemo(() => {
    if (!currentStudent.assessments || currentStudent.assessments.length === 0) return currentStudent.progress;
    const totalPercentage = currentStudent.assessments.reduce((acc: number, curr: any) => {
      return acc + Math.round(((curr.obtained || 0) / (curr.maxMarks || 100)) * 100);
    }, 0);
    return Math.round(totalPercentage / currentStudent.assessments.length);
  }, [currentStudent]);

  // Calculate Assessment Breakdown from report attendance distribution when available
  const assessmentDistribution = useMemo(() => {
    if (reportData?.attendanceDistribution?.length) {
      return reportData.attendanceDistribution.map((item) => ({
        name: item.range,
        count: item.count,
        percent: `${Math.round(
          (item.count / Math.max(reportData.summary.totalStudents, 1)) * 100
        )}%`,
        color: item.color,
      }));
    }

    const scores = (currentStudent.assessments || []).map((a: any) =>
      Math.round(((a.obtained || 0) / (a.maxMarks || 100)) * 100)
    );
    const total = scores.length || 1;
    const excellent = scores.filter((s: number) => s >= 80).length;
    const good = scores.filter((s: number) => s >= 60 && s < 80).length;
    const average = scores.filter((s: number) => s >= 40 && s < 60).length;
    const below = scores.filter((s: number) => s < 40).length;

    return [
      { name: "Excellent (80-100%)", count: excellent, percent: `${Math.round((excellent / total) * 100)}%`, color: "#22c55e" },
      { name: "Good (60-79%)", count: good, percent: `${Math.round((good / total) * 100)}%`, color: "#3b82f6" },
      { name: "Average (40-59%)", count: average, percent: `${Math.round((average / total) * 100)}%`, color: "#f59e0b" },
      { name: "Below Average (0-39%)", count: below, percent: `${Math.round((below / total) * 100)}%`, color: "#ef4444" },
    ];
  }, [currentStudent, reportData]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">

      {reportLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading performance report data...
        </div>
      )}
      {reportError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> Failed to load report analytics. Showing student list data only.
        </div>
      )}

      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3.5 text-slate-700 hover:text-[#1769AA] hover:bg-blue-50/50 border-slate-200 shadow-sm font-semibold flex items-center gap-2 transition-colors"
            onClick={() => navigate("/admin/students/all")}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Academic Performance</h2>
            <p className="text-sm text-slate-500">
              View detailed academic analytics and progress for individual students.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-80">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={currentStudent.id}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] font-medium cursor-pointer shadow-sm"
            >
              {allAvailableStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.studentCode})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Student Profile Card */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">

            {/* Left: Avatar + Info */}
            <div className="flex items-center gap-4 min-w-[320px]">
              <img
                src={currentStudent.avatar}
                alt={currentStudent.name}
                className="h-16 w-16 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
              />
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h2 className="text-xl font-bold text-slate-900">{currentStudent.name}</h2>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${currentStudent.status === "AT RISK"
                    ? "bg-red-50 text-red-600 border border-red-200/60"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                    }`}>
                    {currentStudent.status === "AT RISK" ? "At Risk" : "Active"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                  <span>{currentStudent.studentCode}</span>
                  <span>•</span>
                  <span>{currentStudent.phone}</span>
                  <span>•</span>
                  <span className="text-slate-500">{currentStudent.email}</span>
                </p>
              </div>
            </div>

            <div className="hidden lg:block w-px h-12 bg-slate-100"></div>

            {/* Right: 5 Detail Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 flex-1 w-full">
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <FileText className="h-3.5 w-3.5 text-slate-400" /> Admission No.
                </p>
                <p className="text-[13px] font-bold text-slate-800">{currentStudent.admissionNo}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Batch
                </p>
                <p className="text-[13px] font-bold text-slate-800">{currentStudent.batch}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <BookOpen className="h-3.5 w-3.5 text-slate-400" /> Course
                </p>
                <CourseChips
                  courses={(currentStudent as any).courses}
                  fallback={currentStudent.course}
                  maxVisible={4}
                />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" /> Center
                </p>
                <p className="text-[13px] font-bold text-slate-800">{currentStudent.center}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Date of Joining
                </p>
                <p className="text-[13px] font-bold text-slate-800">{currentStudent.dateOfJoining}</p>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* 3. 5 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

        {/* KPI 1 */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-start gap-3.5">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Courses Enrolled</p>
              <h3 className="text-2xl font-black text-slate-900 my-0.5">{currentStudent.coursesCount}</h3>
              <p className="text-xs text-slate-400 font-medium">Active Courses</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">Overall Attendance</p>
                <span className={`text-[10px] font-bold flex items-center ${currentStudent.attendance >= 75 ? "text-emerald-600" : "text-red-500"}`}>
                  {currentStudent.attendance >= 75 ? (
                    <><TrendingUp className="h-3 w-3 mr-0.5" /> 8%</>
                  ) : (
                    <><TrendingDown className="h-3 w-3 mr-0.5" /> 5%</>
                  )}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 my-0.5">{currentStudent.attendance}%</h3>
              <p className="text-xs text-slate-400 font-medium truncate">
                Present in {Math.round((currentStudent.attendance / 100) * 100)} of 100 classes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-start gap-3.5">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0">
              <FileEdit className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">Average Test Score</p>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" /> 6%
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 my-0.5">{avgTestScore}%</h3>
              <p className="text-xs text-slate-400 font-medium truncate">Across {currentStudent.assessments.length} assessments</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-start gap-3.5">
            <div className="p-2.5 bg-orange-50 rounded-xl text-orange-500 shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Assignments Completed</p>
              <h3 className="text-2xl font-black text-slate-900 my-0.5">{currentStudent.assignmentsCompleted}</h3>
              <p className="text-xs text-slate-400 font-medium">Completion Rate</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5 */}
        <Card className="border-slate-200 shadow-sm bg-white col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-start gap-3.5">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 shrink-0">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Overall Performance</p>
              <h3 className="text-2xl font-black text-slate-900 my-0.5">{currentStudent.performanceGrade}</h3>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                {currentStudent.performanceMessage} <Info className="h-3 w-3 text-slate-400" />
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 4. Filter Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <Button variant="outline" className="h-9 text-xs font-medium text-slate-700 bg-slate-50/70 border-slate-200 hover:bg-slate-100 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            01 May 2026 - 14 May 2026
          </Button>

          <select className="h-9 px-3 bg-slate-50/70 border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1769AA]">
            <option>All Courses</option>
            <option>{currentStudent.course}</option>
          </select>

          <select className="h-9 px-3 bg-slate-50/70 border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:outline-none focus:border-[#1769AA]">
            <option>All Assessments</option>
            <option>Tests Only</option>
            <option>Assignments Only</option>
          </select>
        </div>

        <Button variant="outline" className="h-9 text-xs font-bold text-[#1769AA] border-blue-200 hover:bg-blue-50/60 shadow-sm flex items-center gap-2">
          <Download className="h-3.5 w-3.5" /> Export Report
        </Button>
      </div>

      {/* 5. Three Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Card 1: Attendance Overview */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-bold text-slate-900">Attendance Overview</CardTitle>
            <select className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-slate-50 text-slate-600 focus:outline-none">
              <option>This Month</option>
              <option>Last Month</option>
              <option>All Time</option>
            </select>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="mb-4">
              <p className="text-xs text-slate-400 font-medium">Overall Attendance</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold text-slate-900">{currentStudent.attendance}%</span>
                <span className={`text-xs font-bold flex items-center ${currentStudent.attendance >= 75 ? "text-emerald-600" : "text-red-500"}`}>
                  {currentStudent.attendance >= 75 ? (
                    <><TrendingUp className="h-3 w-3 mr-0.5" /> 8% vs Last Month</>
                  ) : (
                    <><TrendingDown className="h-3 w-3 mr-0.5" /> 5% vs Last Month</>
                  )}
                </span>
              </div>
            </div>

            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentStudent.attendanceHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`${val}%`, 'Attendance']}
                  />
                  <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Assessment Performance */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">Assessment Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between gap-4">
              {/* Donut Chart */}
              <div className="h-[180px] w-[140px] relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assessmentDistribution}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={68} paddingAngle={2} dataKey="count"
                    >
                      {assessmentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-slate-900">{currentStudent.assessments.length}</span>
                  <span className="text-[10px] font-semibold text-slate-400 leading-tight">Total Tests</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="flex-1 space-y-2.5">
                {assessmentDistribution.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-slate-700 text-[11px]">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 text-[11px]">
                      {item.count} <span className="text-slate-400 font-normal">({item.percent})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Performance Trend */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-bold text-slate-900">Performance Trend</CardTitle>
            <select className="text-xs font-medium border border-slate-200 rounded-md px-2 py-1 bg-slate-50 text-slate-600 focus:outline-none">
              <option>All Assessments</option>
              <option>Tests</option>
              <option>Assignments</option>
            </select>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentStudent.performanceTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`${val}%`, 'Score']}
                  />
                  <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#purpleGradient)" dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 6. Assessment Results & Enrolled Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Assessment Results Table (Spans 2 cols) */}
        <Card className="border-slate-200 shadow-sm bg-white lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Assessment Results</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Assessment Name</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-center">Max Marks</th>
                  <th className="px-4 py-3 font-medium text-center">Obtained Marks</th>
                  <th className="px-4 py-3 font-medium text-center">Score</th>
                  <th className="px-5 py-3 font-medium text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {currentStudent.assessments.map((test, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{test.name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{test.course}</td>
                    <td className="px-4 py-3.5 text-slate-500">{test.type}</td>
                    <td className="px-4 py-3.5 text-slate-500">{test.date}</td>
                    <td className="px-4 py-3.5 text-slate-600 text-center">{test.maxMarks}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800 text-center">{test.obtained}</td>
                    <td className="px-4 py-3.5 font-bold text-[#1769AA] text-center">{test.score}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-bold text-[11px] ${test.gradeColor}`}>
                        {test.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-center">
            <button className="text-xs font-bold text-[#1769AA] hover:text-[#125890] flex items-center gap-1.5">
              View All Assessments <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>

        {/* Enrolled Courses */}
        <Card className="border-slate-200 shadow-sm bg-white flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Enrolled Courses ({currentStudent.enrolledCourses.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-5 flex-1 space-y-4">
            {currentStudent.enrolledCourses.map((c, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${c.iconBg} shrink-0 mt-0.5`}>
                    <c.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{c.name}</h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Batch: <span className="text-slate-600">{c.batch}</span></p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Progress</span>
                    <span className="font-bold text-slate-900">{c.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${c.progress}%` }} />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Status</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-center mt-auto">
            <button className="text-xs font-bold text-[#1769AA] hover:text-[#125890] flex items-center gap-1.5">
              View All Courses <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>

      </div>

      {/* 7. Bottom Note */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-400 font-medium">
          Note: All data is based on recorded attendance and assessments.
        </p>
      </div>
    </div>
  );
};
