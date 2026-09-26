import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Loader2,
  AlertCircle,
  Star,
  Calendar,
  TrendingUp,
  Users
} from "lucide-react";
import {
  useFacultyMember,
  useFacultyCourses,
  useFacultyDailyAttendance,
  useDeleteFaculty,
} from "../../../hooks/useFaculty";
import { feedbackApi, type Feedback } from "@/services/feedback.api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricGrid, PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { getApiErrorMessage } from "@/utils/api-error";
import { formatTimeRange12h } from "@/utils/format";
import type { FacultyDailyAttendanceHistoryResponse, FacultyDailyAttendanceStatus } from "@/types/faculty.types";
import { AttendanceDaySummary, AttendancePunchList } from "@/components/faculty/AttendancePunchList";
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
    counted: m.counted,
  }));
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SCHEDULE_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const minutesFromClock = (value?: string) => {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const hoursBetween = (start?: string, end?: string) => {
  const startMinutes = minutesFromClock(start);
  const endMinutes = minutesFromClock(end);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return 0;
  return (endMinutes - startMinutes) / 60;
};

const formatDayLabels = (dayIndexes: number[]) => {
  const sorted = [...new Set(dayIndexes)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  const labels = sorted.map((d) => DAY_NAMES[d] || "Day");
  const isConsecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (sorted.length >= 3 && isConsecutive) {
    return `${labels[0]}–${labels[labels.length - 1]}`;
  }
  return labels.join(", ");
};

/** Group schedule slots by time window for a clear summary (e.g. Mon–Sat · 9:00 AM–10:00 AM). */
const formatScheduleLines = (
  slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
): Array<{ days: string; time: string }> => {
  const byTime = new Map<string, number[]>();
  for (const slot of slots) {
    const key = formatTimeRange12h(slot.startTime, slot.endTime);
    const days = byTime.get(key) ?? [];
    days.push(slot.dayOfWeek);
    byTime.set(key, days);
  }
  return Array.from(byTime.entries()).map(([time, days]) => ({
    days: formatDayLabels(days),
    time,
  }));
};

const getWorkloadState = (hrs: number) => {
  if (hrs <= 0) return { label: "Not scheduled", color: "bg-slate-300", text: "text-muted-foreground", pct: 0 };
  if (hrs > 30) return { label: "High", color: "bg-rose-500", text: "text-rose-500", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
  if (hrs > 20) return { label: "Moderate", color: "bg-amber-500", text: "text-amber-500", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
  return { label: "Optimal", color: "bg-emerald-500", text: "text-emerald-500", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
};

export const FacultyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, roleScope, canEditItem } = usePermissions();
  const canDeleteFaculty =
    isAdmin || (roleScope === "CENTER_MANAGER" && canEditItem("faculty.all"));
  const deleteFaculty = useDeleteFaculty();

  const [activeTab, setActiveTab] = useState<
    "overview" | "batches" | "performance" | "schedule" | "feedback" | "attendance"
  >("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch from backend
  const { data: facultyResponse, isLoading, isError } = useFacultyMember(id);
  const { data: coursesResponse } = useFacultyCourses({ facultyId: id, limit: 50 });
  const { data: dailyAttendanceResponse, isLoading: isDailyAttendanceLoading } = useFacultyDailyAttendance(
    { facultyId: id },
    !!id
  );
  const {
    data: facultyReviewsRes,
    isLoading: isReviewsLoading,
    isError: isReviewsError,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ["faculty-reviews", id],
    queryFn: () => feedbackApi.getFeedbackByFaculty(id!),
    enabled: Boolean(id),
  });
  const facultyReviews: Feedback[] = Array.isArray(facultyReviewsRes?.data)
    ? facultyReviewsRes.data
    : [];

  const backendFaculty = facultyResponse?.data;
  const facultyAssignments = coursesResponse?.data ?? [];
  const dailyHistory = dailyAttendanceResponse?.data as FacultyDailyAttendanceHistoryResponse | undefined;
  const facultyDailyAttendance =
    dailyHistory?.mode === "history" ? dailyHistory.records : [];
  const attendanceRate =
    dailyHistory?.mode === "history" ? dailyHistory.attendancePct : 0;

  const closeDeleteDialog = () => {
    if (deleteFaculty.isPending) return;
    setDeleteDialogOpen(false);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!backendFaculty?.id) return;
    setDeleteError(null);
    try {
      await deleteFaculty.mutateAsync(backendFaculty.id);
      setDeleteDialogOpen(false);
      navigate("/admin/faculty/all");
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, "Failed to delete faculty."));
    }
  };

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

  const uniqueBatches = new Map<string, (typeof facultyAssignments)[number]>();
  for (const assignment of facultyAssignments) {
    const key = assignment.batchId || assignment.id;
    if (!uniqueBatches.has(key)) uniqueBatches.set(key, assignment);
  }
  const assignedBatches = Array.from(uniqueBatches.values());
  const assignedStudentsCount = assignedBatches.reduce(
    (sum, assignment) => sum + (assignment._count?.enrollments ?? 0),
    0
  );
  // Weekly hours / timetable: use every BatchCourse assignment (not deduped by batch)
  // so multi-course batches keep correct subject labels and faculty-scoped slots.
  const weeklyHours = Math.round(
    facultyAssignments.reduce((sum, assignment) => {
      return (
        sum +
        (assignment.schedules || []).reduce(
          (hours, slot) => hours + hoursBetween(slot.startTime, slot.endTime),
          0
        )
      );
    }, 0) * 10
  ) / 10;
  const sessionStats = assignedBatches.reduce(
    (stats, assignment) => {
      for (const session of assignment.classSessions || []) {
        stats.total += 1;
        if (session.sessionStatus === "COMPLETED") stats.completed += 1;
        if (session.sessionStatus === "UPCOMING" || session.sessionStatus === "LIVE") stats.upcoming += 1;
      }
      return stats;
    },
    { total: 0, completed: 0, upcoming: 0 }
  );
  const averageRating = facultyReviews.length
    ? Math.round((facultyReviews.reduce((sum, review) => sum + review.rating, 0) / facultyReviews.length) * 10) / 10
    : null;

  const schedule: Record<string, Array<{ batch: string; time: string }>> = {
    MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [],
  };
  const scheduleKeys = new Set<string>();
  for (const assignment of facultyAssignments) {
    for (const slot of assignment.schedules || []) {
      // Backend already faculty-scopes; keep a guard for explicit other-faculty slots.
      if (slot.facultyId && slot.facultyId !== assignment.facultyId) continue;
      const day = DAY_NAMES[slot.dayOfWeek]?.slice(0, 3).toUpperCase();
      if (!day || !schedule[day]) continue;
      const label = assignment.course?.name
        ? `${assignment.name} · ${assignment.course.name}`
        : assignment.name;
      const time = formatTimeRange12h(slot.startTime, slot.endTime);
      const key = `${day}|${label}|${time}`;
      if (scheduleKeys.has(key)) continue;
      scheduleKeys.add(key);
      schedule[day].push({ batch: label, time });
    }
  }
  for (const day of SCHEDULE_DAYS) {
    schedule[day].sort((a, b) => {
      const aMin = minutesFromClock(a.time.split("–")[0]) ?? 0;
      const bMin = minutesFromClock(b.time.split("–")[0]) ?? 0;
      return aMin - bMin;
    });
  }

  const faculty = {
    id: backendFaculty.id,
    name: backendFaculty.user?.name || "Faculty Member",
    email: backendFaculty.user?.email || null,
    phone: backendFaculty.user?.phone || null,
    specialization: backendFaculty.specialization || null,
    designation: backendFaculty.designation || backendFaculty.designationMaster?.name || null,
    qualification: backendFaculty.qualification || backendFaculty.qualificationMaster?.name || null,
    employeeCode: backendFaculty.employeeCode,
    branch: backendFaculty.branch?.name || null,
    status: backendFaculty.status,
    joinDate: backendFaculty.createdAt
      ? new Date(backendFaculty.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "—",
    rating: averageRating,
    batchesCount: assignedBatches.length,
    studentsCount: assignedStudentsCount,
    workloadHrs: weeklyHours,
    attendance: attendanceRate,
    batches: assignedBatches.map((assignment) => {
      // Merge schedule lines from all course assignments on this batch for this faculty
      const batchSlots = facultyAssignments
        .filter((a) => (a.batchId || a.id) === (assignment.batchId || assignment.id))
        .flatMap((a) => a.schedules || []);
      return {
        id: assignment.code || assignment.id,
        name: assignment.course?.name || assignment.name,
        batchName: assignment.name,
        students: assignment._count?.enrollments || 0,
        status: assignment.status,
        scheduleLines: formatScheduleLines(batchSlots),
      };
    }),
    schedule,
    sessionStats,
    curriculumProgress: (backendFaculty as { curriculumProgress?: {
      overallPct: number | null;
      topicsCompleted: number;
      topicsTotal: number;
      modulesCompleted: number;
      modulesTotal: number;
      byAssignment: Array<{
        batchId: string;
        batchName: string;
        batchCode: string;
        courseId: string;
        courseName: string;
        branchId: string;
        branchName: string;
        pct: number | null;
        topicsCompleted: number;
        topicsTotal: number;
        modulesCompleted: number;
        modulesTotal: number;
      }>;
    } }).curriculumProgress ?? {
      overallPct: null,
      topicsCompleted: 0,
      topicsTotal: 0,
      modulesCompleted: 0,
      modulesTotal: 0,
      byAssignment: [],
    },
  };

  const workloadState = getWorkloadState(faculty.workloadHrs);
  const attendanceTrend = buildAttendanceTrend(facultyDailyAttendance);
  const hasTrendData = attendanceTrend.some((m) => m.counted > 0);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const headerMeta = [
    faculty.employeeCode,
    faculty.specialization,
    faculty.designation,
    faculty.branch,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageContainer className="animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/admin/faculty/all")}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          className="flex-1 min-w-0"
          title={faculty.name}
          description={headerMeta || undefined}
          actions={
            <div className="flex items-center gap-2">
              <PermissionGate itemKey="faculty.all" mode="write">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/faculty/${faculty.id}/edit`)}
                >
                  Edit Profile
                </Button>
              </PermissionGate>
              {canDeleteFaculty && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          }
        />
      </div>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete faculty</DialogTitle>
            <DialogDescription>
              This permanently deletes the faculty record from the database. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Faculty</span>
              <span className="font-medium text-foreground">{faculty.name}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Employee code</span>
              <span className="font-mono text-foreground">{faculty.employeeCode}</span>
            </div>
          </div>
          {deleteError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteFaculty.isPending}
              onClick={closeDeleteDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteFaculty.isPending}
              onClick={() => void handleConfirmDelete()}
            >
              {deleteFaculty.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border border-border shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge
                variant={String(faculty.status).toUpperCase() === "ACTIVE" ? "success" : "warning"}
                className="mt-1 text-[10px] font-semibold"
              >
                {faculty.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-foreground mt-1 truncate">
                {faculty.email ? (
                  <a href={`mailto:${faculty.email}`} className="hover:text-primary transition-colors">
                    {faculty.email}
                  </a>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium text-foreground mt-1">{faculty.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Qualification</p>
              <p className="text-sm font-medium text-foreground mt-1">{faculty.qualification || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="text-sm font-medium text-foreground mt-1">{faculty.joinDate}</p>
            </div>
          </div>
          {faculty.rating !== null && (
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
              Rating · <span className="font-semibold text-foreground">{faculty.rating} / 5.0</span>
              {facultyReviews.length > 0 ? ` · ${facultyReviews.length} reviews` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      <MetricGrid columns="grid-cols-2 sm:grid-cols-4" density="compact">
        {[
          { label: "Assigned Batches", value: faculty.batchesCount },
          { label: "Students Taught", value: faculty.studentsCount },
          {
            label: "Weekly Workload",
            value: faculty.workloadHrs > 0 ? `${faculty.workloadHrs}h` : "—",
          },
          {
            label: "Attendance Rate",
            value: facultyDailyAttendance.length > 0 ? `${faculty.attendance}%` : "—",
          },
        ].map((kpi) => (
          <Card
            key={kpi.label}
            size="compact"
            className="border border-border bg-card shadow-none rounded-lg"
          >
            <CardContent size="compact">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </p>
              <h3 className="text-xl font-semibold text-foreground mt-0.5 tabular-nums">
                {kpi.value}
              </h3>
            </CardContent>
          </Card>
        ))}
      </MetricGrid>

      <div className="space-y-4">
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {[
            { id: "overview", label: "Overview" },
            { id: "batches", label: `Batches (${faculty.batches.length})` },
            { id: "performance", label: "Progress & Analytics" },
            { id: "schedule", label: "Schedule" },
            { id: "feedback", label: `Reviews (${facultyReviews.length})` },
            { id: "attendance", label: `Attendance (${facultyDailyAttendance.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-border shadow-xs rounded-xl overflow-hidden">
              <CardHeader className="border-b border-border py-3 px-5">
                <CardTitle className="text-xs font-semibold text-foreground">
                  Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Employee ID</span>
                  <span className="font-mono font-medium text-foreground">{faculty.employeeCode}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="font-medium text-foreground">{faculty.branch || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Specialization</span>
                  <span className="font-medium text-foreground">{faculty.specialization || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Qualification</span>
                  <span className="font-medium text-foreground">{faculty.qualification || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-medium text-foreground">{faculty.joinDate}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Work Location</span>
                  <span className="font-mono text-foreground text-[11px]">
                    {backendFaculty.workLatitude != null && backendFaculty.workLongitude != null
                      ? `${backendFaculty.workLatitude.toFixed(6)}, ${backendFaculty.workLongitude.toFixed(6)}`
                      : <span className="text-amber-600 font-normal">Not set</span>
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-xs rounded-xl overflow-hidden">
              <CardHeader className="border-b border-border py-3 px-5">
                <CardTitle className="text-xs font-semibold text-foreground">
                  Workload Capacity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Weekly Hours</span>
                  <span className={`font-medium ${workloadState.text}`}>
                    {faculty.workloadHrs > 0
                      ? `${faculty.workloadHrs} Hours (${workloadState.label})`
                      : workloadState.label}
                  </span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${workloadState.color} rounded-full`}
                    style={{ width: `${workloadState.pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0h</span>
                  <span>Optimal (20h)</span>
                  <span>Max (35h)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── TAB 2: ASSIGNED BATCHES & COURSES ─────────────────────── */}
        {activeTab === "batches" && (
          <div className="space-y-4">
            {faculty.batches.length === 0 ? (
              <Card className="border border-border shadow-xs bg-card rounded-xl">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No batches are assigned to this faculty member.
                </CardContent>
              </Card>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faculty.batches.map((b) => (
                <Card key={b.id} className="border border-border shadow-xs rounded-xl overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-mono text-muted-foreground">{b.id}</p>
                        <h4 className="text-sm font-semibold text-foreground mt-0.5">{b.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.batchName}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {b.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        {b.students} Students Enrolled
                      </div>
                      <div className="flex items-start gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {b.scheduleLines.length === 0 ? (
                          <span>No schedule set</span>
                        ) : (
                          <div className="space-y-1 min-w-0">
                            {b.scheduleLines.map((line) => (
                              <p key={`${line.days}-${line.time}`} className="text-foreground">
                                <span className="font-medium">{line.days}</span>
                                <span className="text-muted-foreground"> · {line.time}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: STUDENT PROGRESS & ANALYTICS ───────────────────── */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            {/* Curriculum progress — this faculty's own marks across assignments */}
            <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
              <CardHeader className="border-b border-border py-3 px-5">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Curriculum Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/15 text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Overall</span>
                    <h4 className="text-3xl font-bold text-primary mt-1 tabular-nums">
                      {faculty.curriculumProgress.overallPct === null
                        ? "—"
                        : `${faculty.curriculumProgress.overallPct}%`}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Across assignments</p>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-xl border border-border text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Topics</span>
                    <h4 className="text-3xl font-bold text-foreground mt-1 tabular-nums">
                      {faculty.curriculumProgress.topicsCompleted}
                      <span className="text-base text-muted-foreground font-semibold">
                        /{faculty.curriculumProgress.topicsTotal}
                      </span>
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-xl border border-border text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Modules</span>
                    <h4 className="text-3xl font-bold text-foreground mt-1 tabular-nums">
                      {faculty.curriculumProgress.modulesCompleted}
                      <span className="text-base text-muted-foreground font-semibold">
                        /{faculty.curriculumProgress.modulesTotal}
                      </span>
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-xl border border-border text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assignments</span>
                    <h4 className="text-3xl font-bold text-foreground mt-1 tabular-nums">
                      {faculty.curriculumProgress.byAssignment.length}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Batch × course</p>
                  </div>
                </div>

                {faculty.curriculumProgress.byAssignment.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No curriculum assignments yet. Assign this faculty to a batch course to track progress.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {faculty.curriculumProgress.byAssignment.map((row) => (
                      <div
                        key={`${row.batchId}-${row.courseId}`}
                        className="rounded-xl border border-border bg-muted/20 p-4 space-y-2"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{row.courseName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <span className="font-mono">{row.batchCode}</span>
                              {row.batchName !== row.batchCode ? ` · ${row.batchName}` : ""}
                              {" · "}
                              {row.branchName}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-primary tabular-nums shrink-0">
                            {row.pct === null ? "—" : `${row.pct}%`}
                          </span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${row.pct ?? 0}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {row.topicsCompleted}/{row.topicsTotal} topics · {row.modulesCompleted}/{row.modulesTotal} modules
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
              <CardHeader className="border-b border-border py-3 px-5">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Assigned Teaching Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-muted/40 p-4 rounded-xl border border-border text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Students</span>
                    <h4 className="text-3xl font-bold text-foreground mt-1">{faculty.studentsCount}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Enrolled in assigned batches</p>
                  </div>
                  <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</span>
                    <h4 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{faculty.sessionStats.completed}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Class sessions</p>
                  </div>
                  <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-center">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Upcoming</span>
                    <h4 className="text-3xl font-bold text-primary mt-1">{faculty.sessionStats.upcoming}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Scheduled sessions</p>
                  </div>
                  <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 text-center">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Reviews</span>
                    <h4 className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{faculty.rating ?? "—"}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {facultyReviews.length > 0 ? `${facultyReviews.length} student ratings` : "No ratings yet"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Trend Chart */}
            <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
              <CardHeader className="border-b border-border py-3 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Monthly Attendance Trend
                </CardTitle>
                <span className="text-xs font-medium text-muted-foreground">
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
                          stroke="#2563EB"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#2563EB", strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      No daily attendance records in the last 6 months.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── TAB 4: WEEKLY SCHEDULE ─────────────────────────────────── */}
        {activeTab === "schedule" && (
          <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
            <CardHeader className="border-b border-border py-3 px-5">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Weekly Class Timetable
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {SCHEDULE_DAYS.map((day) => {
                  const slots = faculty.schedule[day] || [];
                  return (
                    <div key={day} className="bg-muted/30 p-3.5 rounded-xl border border-border space-y-2">
                      <span className="text-xs font-bold text-primary tracking-wider block">{day}</span>
                      {slots.length > 0 ? (
                        slots.map((s, idx) => (
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
            {isReviewsLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-xs">
                <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                Loading student reviews...
              </div>
            ) : isReviewsError ? (
              <Card className="border border-border shadow-xs bg-card rounded-xl">
                <CardContent className="py-14 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-rose-500/70 mx-auto" />
                  <p className="text-sm font-medium text-foreground">Could not load student reviews</p>
                  <p className="text-xs text-muted-foreground">
                    Check your connection or permissions, then try again.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetchReviews()}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : facultyReviews.length === 0 ? (
              <Card className="border border-border shadow-xs bg-card rounded-xl">
                <CardContent className="py-14 text-center">
                  <Star className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">No student feedback yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reviews appear here after students submit class feedback.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {facultyReviews.map((item) => (
                  <Card key={item.id} className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
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
                        <span className="text-[11px] text-muted-foreground">
                          {item.submittedAt
                            ? new Date(item.submittedAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : ""}
                        </span>
                      </div>
                      <p className="text-xs text-foreground font-medium italic">
                        "{item.comment || "No written comment"}"
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground">
                          — {item.student?.user?.name || "Student"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.classSession?.title || item.classSession?.batch?.name || "Class session"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 6: ATTENDANCE LOG ─────────────────────────────────── */}
        {activeTab === "attendance" && (
          <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {isDailyAttendanceLoading ? (
                <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading attendance...
                </div>
              ) : facultyDailyAttendance.length > 0 ? (
                <div className="divide-y divide-border">
                  {facultyDailyAttendance.map((record) => {
                    const statusLabel = record.status.replace("_", " ");
                    const punches = record.punches ?? [];
                    const hasSummary = record.status === "PRESENT" || punches.length > 0;
                    const note =
                      record.comments?.trim() && record.comments.trim().toUpperCase() !== statusLabel
                        ? record.comments.trim()
                        : null;

                    return (
                      <div
                        key={record.id}
                        className="p-4 space-y-2 text-xs hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex justify-between items-center gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{formatDate(record.date)}</p>
                            {note ? (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{note}</p>
                            ) : null}
                          </div>
                          <Badge className={statusBadgeClass(record.status)}>
                            {statusLabel}
                          </Badge>
                        </div>
                        {hasSummary ? (
                          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-2">
                            <AttendanceDaySummary
                              summary={{
                                firstIn: record.firstIn ?? record.inTime,
                                lastOut: record.lastOut ?? record.outTime,
                                sessionCount: record.sessionCount ?? 0,
                                totalMinutes: record.totalMinutes ?? 0,
                                openSession: !!record.openSession,
                              }}
                              className="max-w-md"
                            />
                            {punches.length > 0 ? (
                              <AttendancePunchList
                                punches={punches}
                                openSession={record.openSession}
                                className="pt-2 border-t border-border/40"
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
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
    </PageContainer>
  );
};
