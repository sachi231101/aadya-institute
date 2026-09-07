import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  Award,
  BookOpen,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  Star,
  Calendar,
  TrendingUp,
  MonitorPlay,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Users
} from "lucide-react";
import { useFacultyMember, useFacultyCourses, useFacultyDailyAttendance } from "../../../hooks/useFaculty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import type { FacultyDailyAttendanceHistoryResponse, FacultyDailyAttendanceStatus } from "@/types/faculty.types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";

const statusBadgeClass = (status: FacultyDailyAttendanceStatus) => {
  switch (status) {
    case "PRESENT":
      return "bg-emerald-600 text-white font-bold";
    case "ABSENT":
      return "bg-rose-600 text-white font-bold";
    case "LEAVE":
      return "bg-amber-500 text-white font-bold";
    case "WEEKLY_OFF":
      return "bg-slate-500 text-white font-bold";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const buildAttendanceTrend = (
  records: Array<{ date: string; status: FacultyDailyAttendanceStatus }>
) => {
  const months: { key: string; name: string; present: number; counted: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      name: d.toLocaleString("en-US", { month: "short" }),
      present: 0,
      counted: 0,
    });
  }

  for (const r of records) {
    const key = r.date.slice(0, 7);
    const bucket = months.find((m) => m.key === key);
    if (!bucket) continue;
    if (r.status === "WEEKLY_OFF") continue;
    if (r.status === "PRESENT" || r.status === "ABSENT" || r.status === "LEAVE") {
      bucket.counted += 1;
      if (r.status === "PRESENT") bucket.present += 1;
    }
  }

  return months.map((m) => ({
    name: m.name,
    val: m.counted > 0 ? Math.round((m.present / m.counted) * 100) : 0,
  }));
};

const getWorkloadState = (hrs: number) => {
  if (hrs > 30) return { label: "High", color: "bg-rose-500", text: "text-rose-500", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
  if (hrs > 20) return { label: "Moderate", color: "bg-amber-500", text: "text-amber-500", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
  return { label: "Optimal", color: "bg-emerald-500", text: "text-emerald-500", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
};

export const FacultyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    "overview" | "batches" | "performance" | "schedule" | "feedback" | "attendance"
  >("overview");

  // Fetch from backend
  const { data: facultyResponse, isLoading, isError } = useFacultyMember(id);
  const { data: coursesResponse } = useFacultyCourses({ facultyId: id, limit: 50 });
  const { data: dailyAttendanceResponse } = useFacultyDailyAttendance(
    { facultyId: id },
    !!id
  );

  const backendFaculty = facultyResponse?.data;
  const facultyAssignments = coursesResponse?.data ?? [];
  const dailyHistory = dailyAttendanceResponse?.data as FacultyDailyAttendanceHistoryResponse | undefined;
  const facultyDailyAttendance =
    dailyHistory?.mode === "history" ? dailyHistory.records : [];
  const attendanceRate =
    dailyHistory?.mode === "history" ? dailyHistory.attendancePct : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-28">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground font-medium text-xs">Loading faculty profile...</span>
      </div>
    );
  }

  if (isError || !backendFaculty) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4 opacity-70" />
        <h2 className="text-xl font-bold text-foreground">Faculty Member Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6 text-sm">
          Could not locate faculty member with ID: <span className="font-mono text-foreground font-bold">{id}</span>
        </p>
        <Button className="bg-primary hover:bg-primary/90 text-white font-bold text-xs" onClick={() => navigate("/admin/faculty/all")}>
          Return to Faculty Directory
        </Button>
      </div>
    );
  }

  const assignedStudentsCount = facultyAssignments.reduce((sum, a: any) => sum + (a._count?.enrollments ?? a.enrollments?.length ?? 0), 0);

  // Unified real faculty data object
  const faculty = {
    id: backendFaculty.id,
    name: backendFaculty.user?.name || "Faculty Member",
    email: backendFaculty.user?.email || "N/A",
    phone: backendFaculty.user?.phone || "N/A",
    specialization: backendFaculty.specialization || "Technical Instructor",
    designation: backendFaculty.designation || backendFaculty.designationMaster?.name || "—",
    qualification: backendFaculty.qualification || backendFaculty.qualificationMaster?.name || "—",
    employeeCode: backendFaculty.employeeCode || "EMP-001",
    branch: backendFaculty.branch?.name || "Aadya Branch",
    status: backendFaculty.status || "Active",
    avatar: `https://i.pravatar.cc/150?u=${id}`,
    joinDate: backendFaculty.createdAt
      ? new Date(backendFaculty.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "N/A",
    experience: "Certified Faculty",
    rating: 4.8,
    batchesCount: facultyAssignments.length,
    studentsCount: assignedStudentsCount,
    workloadHrs: facultyAssignments.length * 6,
    attendance: attendanceRate,
    feedback: [],
    batches: facultyAssignments.map((a: any) => ({
      id: a.code || a.id,
      name: a.course?.name || a.name || "Assigned Batch",
      students: a._count?.enrollments || 0,
      status: a.status || "Active",
      progress: 50,
      time: "Scheduled",
    })),
    studentPerf: { excellent: 0, good: 0, needsImp: 0, atRisk: 0 },
    schedule: {} as Record<string, any[]>,
    alerts: [],
  };

  const workloadState = getWorkloadState(faculty.workloadHrs);
  const attendanceTrend = buildAttendanceTrend(facultyDailyAttendance);
  const hasTrendData = attendanceTrend.some((m) => m.val > 0);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12 animate-in fade-in duration-300">
      {/* ─── 1. TOP HEADER ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/faculty/all")}
            className="h-9 w-9 rounded-xl border-border bg-card text-foreground hover:bg-muted/40 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{faculty.name}</h1>
              <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                {faculty.employeeCode}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate itemKey="faculty.all" mode="write">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/faculty/${faculty.id}/edit`)}
            className="rounded-xl shadow-2xs text-xs font-semibold h-9 cursor-pointer"
          >
            Edit Profile
          </Button>
          </PermissionGate>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/faculty/courses?facultyId=${faculty.id}`)}
            className="rounded-xl shadow-2xs text-xs font-semibold h-9 cursor-pointer"
          >
            Course Allocations
          </Button>
          <Button
            size="sm"
            onClick={() => alert(`Opening message composer for ${faculty.name}`)}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold h-9 rounded-xl shadow-xs cursor-pointer"
          >
            Message Faculty
          </Button>
        </div>
      </div>

      {/* ─── 2. HERO PROFILE BANNER ───────────────────────────────────── */}
      <Card className="border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <img
                src={faculty.avatar}
                alt={faculty.name}
                className="w-16 h-16 rounded-xl border border-border object-cover shrink-0"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-foreground">{faculty.name}</h2>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      String(faculty.status).toUpperCase() === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {faculty.status}
                  </span>
                  {faculty.rating > 0 && (
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      ★ {faculty.rating} / 5.0
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-mono text-foreground">{faculty.employeeCode}</span>
                  {faculty.specialization && (
                    <>
                      <span>•</span>
                      <span className="text-primary font-semibold">{faculty.specialization}</span>
                    </>
                  )}
                  {faculty.designation && faculty.designation !== "—" && (
                    <>
                      <span>•</span>
                      <span>{faculty.designation}</span>
                    </>
                  )}
                  {faculty.branch && (
                    <>
                      <span>•</span>
                      <span>{faculty.branch}</span>
                    </>
                  )}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <a href={`mailto:${faculty.email}`} className="hover:text-primary transition-colors">
                    {faculty.email}
                  </a>
                  {faculty.phone && (
                    <>
                      <span>•</span>
                      <span>+91 {faculty.phone}</span>
                    </>
                  )}
                  {faculty.experience && faculty.experience !== "—" && (
                    <>
                      <span>•</span>
                      <span>{faculty.experience}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 bg-muted/30 p-3 rounded-lg border border-border/80 hidden lg:block">
              <p className="text-xs font-semibold text-foreground">Joined {faculty.joinDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. TOP KPI SNAPSHOT CARDS ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent className="p-3.5 text-center">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assigned Batches</p>
            <h4 className="text-xl font-bold text-foreground mt-0.5">{faculty.batchesCount}</h4>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent className="p-3.5 text-center">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Students Taught</p>
            <h4 className="text-xl font-bold text-foreground mt-0.5">{faculty.studentsCount}</h4>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent className="p-3.5 text-center">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Weekly Workload</p>
            <h4 className="text-xl font-bold text-primary mt-0.5">
              {faculty.workloadHrs}h <span className="text-xs font-normal text-muted-foreground">/wk</span>
            </h4>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent className="p-3.5 text-center">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Attendance Rate</p>
            <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{faculty.attendance}%</h4>
          </CardContent>
        </Card>
      </div>

      {/* ─── 4. TAB NAVIGATION & CONTENT ──────────────────────────────── */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/20 border border-border/80 rounded-xl overflow-x-auto">
          {[
            { id: "overview", label: "Overview" },
            { id: "batches", label: `Batches (${faculty.batches.length})` },
            { id: "performance", label: "Progress & Analytics" },
            { id: "schedule", label: "Schedule" },
            { id: "feedback", label: `Reviews (${faculty.feedback.length})` },
            { id: "attendance", label: `Attendance (${facultyDailyAttendance.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── TAB 1: OVERVIEW & CREDENTIALS ──────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border/80 py-3 px-5">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border/70">
                  <span className="text-muted-foreground font-medium">Employee ID</span>
                  <span className="font-mono font-semibold text-foreground">{faculty.employeeCode}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/70">
                  <span className="text-muted-foreground font-medium">Branch</span>
                  <span className="font-semibold text-foreground">{faculty.branch}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/70">
                  <span className="text-muted-foreground font-medium">Specialization</span>
                  <span className="font-semibold text-primary">{faculty.specialization}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/70">
                  <span className="text-muted-foreground font-medium">Experience</span>
                  <span className="font-semibold text-foreground">{faculty.experience}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground font-medium">Joined</span>
                  <span className="font-semibold text-foreground">{faculty.joinDate}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {/* Teaching Capacity Card */}
              <Card className="border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden">
                <CardHeader className="bg-muted/40 border-b border-border/80 py-3 px-5">
                  <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Workload Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Weekly Hours</span>
                    <span className={`font-semibold ${workloadState.text}`}>{faculty.workloadHrs} Hours ({workloadState.label})</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${workloadState.color} rounded-full`} style={{ width: `${workloadState.pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span>0h</span>
                    <span>Optimal (20h)</span>
                    <span>Max (35h)</span>
                  </div>
                </CardContent>
              </Card>

              {/* Alerts & Insights */}
              {faculty.alerts.length > 0 && (
                <div className="space-y-2">
                  {faculty.alerts.map((alert: any, i: number) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs font-medium ${
                        alert.type === "warning"
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                          : alert.type === "danger"
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {alert.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                      {alert.type === "danger" && <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />}
                      {alert.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
                      <span>{alert.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: ASSIGNED BATCHES & COURSES ─────────────────────── */}
        {activeTab === "batches" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faculty.batches.map((b: any) => (
                <Card key={b.id} className="border border-border shadow-xs bg-card rounded-2xl hover:border-primary/40 transition-all overflow-hidden">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {b.id}
                        </span>
                        <h4 className="text-sm font-black text-foreground mt-1.5">{b.name}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          b.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" /> {b.students} Students Enrolled
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Timing: {b.time}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/70">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-muted-foreground">Curriculum Progression</span>
                        <span className="font-bold text-primary">{b.progress}%</span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${b.progress}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 3: STUDENT PROGRESS & ANALYTICS ───────────────────── */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            {/* Grade Distribution */}
            <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MonitorPlay className="h-4 w-4 text-primary" /> Student Grade & Attendance Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Excellent (&gt;85%)</span>
                    <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{faculty.studentPerf.excellent}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Top scorers</p>
                  </div>
                  <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-center">
                    <span className="text-[10px] font-bold text-primary dark:text-sky-400 uppercase tracking-wider">Good (70-85%)</span>
                    <h4 className="text-3xl font-black text-primary dark:text-sky-400 mt-1">{faculty.studentPerf.good}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Regular on-track</p>
                  </div>
                  <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 text-center">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Needs Imp. (50-70%)</span>
                    <h4 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{faculty.studentPerf.needsImp}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Extra clinic needed</p>
                  </div>
                  <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 text-center">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">At Risk (&lt;50%)</span>
                    <h4 className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">{faculty.studentPerf.atRisk}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Discontinuation risk</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/40 rounded-xl border border-border text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Academic Support Strategy:</strong> Faculty conducts weekly remedial sessions on Saturdays for students requiring additional assistance.
                </div>
              </CardContent>
            </Card>

            {/* Attendance Trend Chart */}
            <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border py-3.5 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Monthly Faculty Attendance Trend (Last 6 Months)
                </CardTitle>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {faculty.attendance}% overall
                </span>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-48 w-full">
                  {hasTrendData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={attendanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/50" />
                        <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "var(--card)", borderRadius: "12px", border: "1px solid var(--border)", color: "var(--foreground)" }}
                          formatter={(val: any) => [`${val}%`, "Attendance"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="val"
                          stroke="#1769AA"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#1769AA", strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      No daily attendance history yet for trend chart.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── TAB 4: WEEKLY SCHEDULE ─────────────────────────────────── */}
        {activeTab === "schedule" && (
          <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/40 border-b border-border py-3.5 px-6">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Weekly Class Timetable
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => {
                  const slots = faculty.schedule[day] || [];
                  return (
                    <div key={day} className="bg-muted/30 p-3.5 rounded-xl border border-border space-y-2">
                      <span className="text-xs font-black text-primary tracking-wider block">{day}</span>
                      {slots.length > 0 ? (
                        slots.map((s: any, idx: number) => (
                          <div key={idx} className="p-2 rounded-lg bg-card border border-border text-xs shadow-2xs">
                            <p className="font-bold text-foreground">{s.batch}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-primary" /> {s.time}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-2">No classes</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── TAB 5: STUDENT FEEDBACK & REVIEWS ───────────────────────── */}
        {activeTab === "feedback" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faculty.feedback.map((item: any, i: number) => (
                <Card key={i} className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, starIdx) => (
                          <Star
                            key={starIdx}
                            className={`h-3.5 w-3.5 ${starIdx < item.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{item.date}</span>
                    </div>
                    <p className="text-xs text-foreground font-medium italic">"{item.text}"</p>
                    <p className="text-xs font-bold text-foreground">— {item.student}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 6: ATTENDANCE LOG ─────────────────────────────────── */}
        {activeTab === "attendance" && (
          <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {facultyDailyAttendance.length > 0 ? (
                <div className="divide-y divide-border">
                  {facultyDailyAttendance.map((record) => (
                    <div key={record.id} className="p-4 flex justify-between items-center text-xs hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-bold text-foreground">{formatDate(record.date)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {record.status === "PRESENT"
                            ? `In: ${record.inTime || "—"} — Out: ${record.outTime || "—"}`
                            : record.comments || record.status.replace("_", " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={statusBadgeClass(record.status)}>
                          {record.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No daily attendance records for {faculty.name} yet. Mark attendance from Faculty Attendance desk.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
