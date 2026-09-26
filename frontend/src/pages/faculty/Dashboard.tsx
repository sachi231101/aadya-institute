import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  BookOpen,
  ArrowRight,
  Search,
  Star,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader, PageSection, MetricGrid, FilterToolbar } from "@/components/layout";
import { useAuthStore } from "@/store/auth.store";
import { useSessionStore } from "@/store/session.store";
import { useFacultyDashboard } from "@/hooks/useFaculty";
import { useIstTodayKey } from "@/hooks/useIstTodayKey";
import { StartClassModal, type ClassSessionModalData } from "@/components/faculty/StartClassModal";
import { classSessionsApi } from "@/services/class-sessions.api";
import type { FacultyDashboardSession } from "@/types/faculty.types";
import { LeaveRequestReviewPanel } from "@/components/leave/LeaveRequestReviewPanel";
import {
  canHostClassSession,
  resolveDisplaySessionStatus,
} from "@/utils/session-window";
import { ROUTES } from "@/constants/routes";
import { formatTime12h, formatTimeRange12h } from "@/utils/format";

type SessionCard = FacultyDashboardSession & {
  isToday: boolean;
  dateLabel: string;
  timeRange: string;
};

const formatSessionDate = (iso: string, isToday: boolean) => {
  if (isToday) return "Today";
  const key = String(iso).slice(0, 10);
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return new Date(iso).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
  return dt.toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeLiveClass } = useSessionStore();
  const { data: dashRes, isLoading, isError, refetch } = useFacultyDashboard();

  const [activeTab, setActiveTab] = useState<"TODAY" | "ALL" | "UPCOMING" | "COMPLETED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [tabInitialized, setTabInitialized] = useState(false);
  const [hostClockTick, setHostClockTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setHostClockTick((t) => t + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const dashboard = dashRes?.data;
  const rawFacultyName = dashboard?.profile?.name || user?.name || "Faculty";
  const facultyName = rawFacultyName.charAt(0).toUpperCase() + rawFacultyName.slice(1);
  const branchName = dashboard?.profile?.branch?.name || "Aadya Branch";

  const todayIso = useIstTodayKey(30_000);

  const myAssignedClasses: SessionCard[] = useMemo(() => {
    if (!dashboard) return [];
    void hostClockTick;

    const toCard = (s: FacultyDashboardSession): SessionCard => {
      let status = (s.sessionStatus || "UPCOMING").toUpperCase();
      if (activeLiveClass?.status === "LIVE" && activeLiveClass.sessionId === s.id) {
        status = "LIVE";
      }
      const rawDate = s.scheduledDate as string | Date;
      const dateKey =
        typeof rawDate === "string"
          ? rawDate.slice(0, 10)
          : rawDate instanceof Date
            ? `${rawDate.getUTCFullYear()}-${String(rawDate.getUTCMonth() + 1).padStart(2, "0")}-${String(rawDate.getUTCDate()).padStart(2, "0")}`
            : todayIso;
      const isToday = dateKey === todayIso;
      status = resolveDisplaySessionStatus({
        dbStatus: status,
        dateKey,
        startTime: s.startTime,
        endTime: s.endTime,
      });
      return {
        ...s,
        scheduledDate: dateKey,
        sessionStatus: status,
        isToday,
        dateLabel: formatSessionDate(dateKey, isToday),
        timeRange: formatTimeRange12h(s.startTime, s.endTime),
      };
    };

    const byId = new Map<string, SessionCard>();
    const sources = [
      ...(dashboard.scheduledSessions || []),
      ...(dashboard.weekSessions || []),
      ...(dashboard.todaySessions || []),
      ...(dashboard.upcomingSessions || []),
    ];
    for (const s of sources) {
      byId.set(s.id, toCard(s));
    }

    return Array.from(byId.values()).sort((a, b) => {
      const dateCmp = String(a.scheduledDate).localeCompare(String(b.scheduledDate));
      if (dateCmp !== 0) return dateCmp;
      return String(a.startTime).localeCompare(String(b.startTime));
    });
  }, [dashboard, activeLiveClass, todayIso, hostClockTick]);

  // Once data loads: if today is empty but other scheduled classes exist, stay on ALL
  React.useEffect(() => {
    if (tabInitialized || !dashboard) return;
    const todayCount = (dashboard.todaySessions || []).length;
    const total =
      (dashboard.scheduledSessions || []).length ||
      (dashboard.weekSessions || []).length ||
      (dashboard.todaySessions || []).length + (dashboard.upcomingSessions || []).length;
    if (todayCount > 0) setActiveTab("TODAY");
    else if (total > 0) setActiveTab("ALL");
    setTabInitialized(true);
  }, [dashboard, tabInitialized]);

  const counts = dashboard?.counts;
  const todayClasses = myAssignedClasses.filter((c) => c.isToday);
  const liveCount = counts?.liveClasses ?? myAssignedClasses.filter((c) => c.sessionStatus === "LIVE").length;
  const upcomingCount =
    counts?.upcomingClasses ??
    myAssignedClasses.filter(
      (c) =>
        String(c.scheduledDate).slice(0, 10) >= todayIso &&
        c.sessionStatus !== "COMPLETED" &&
        c.sessionStatus !== "CANCELLED"
    ).length;
  const completedCount =
    counts?.completedThisWeek ??
    myAssignedClasses.filter((c) => c.sessionStatus === "COMPLETED").length;

  const displayedClasses = useMemo(() => {
    return myAssignedClasses.filter((c) => {
      const dateKey = String(c.scheduledDate).slice(0, 10);
      if (activeTab === "TODAY") {
        if (!c.isToday && c.sessionStatus !== "LIVE") return false;
      } else if (activeTab === "UPCOMING") {
        if (c.sessionStatus === "COMPLETED" || c.sessionStatus === "CANCELLED") return false;
        if (dateKey < todayIso) return false;
        // Include today + future scheduled (not only status === UPCOMING)
      } else if (activeTab === "COMPLETED") {
        if (c.sessionStatus !== "COMPLETED") return false;
      }
      // ALL: no date/status gate

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (c.courseName || "").toLowerCase().includes(q) ||
          (c.subjectName || "").toLowerCase().includes(q) ||
          (c.batchName || "").toLowerCase().includes(q) ||
          (c.batchCode || "").toLowerCase().includes(q) ||
          (c.roomNo || "").toLowerCase().includes(q) ||
          dateKey.includes(q) ||
          (c.dateLabel || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [myAssignedClasses, activeTab, searchQuery, todayIso]);

  const [selectedModalClass, setSelectedModalClass] = useState<ClassSessionModalData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenClass = (cls: SessionCard) => {
    const dateKey = cls.scheduledDate ? cls.scheduledDate.split("T")[0] : todayIso;
    setSelectedModalClass({
      id: cls.id,
      title: cls.title || cls.subjectName || "Class Session",
      courseName: cls.courseName || "Assigned Course",
      subjectName: cls.subjectName || "",
      batchId: cls.batchId || undefined,
      batchName: cls.batchName || cls.batchCode || "Batch",
      batchCode: cls.batchCode || "BATCH",
      date: dateKey,
      startTime: cls.startTime,
      endTime: cls.endTime,
      roomNo: cls.roomNo || "Room 101",
      mode: cls.mode || "OFFLINE",
      meetingUrl: cls.meetingUrl || undefined,
      status: cls.sessionStatus,
      enrolledStudentsCount: cls.assignedStudents,
    });
    setIsModalOpen(true);
  };

  const handleJoinGoogleMeet = async (cls: SessionCard, e: React.MouseEvent) => {
    e.stopPropagation();
    const dateKey = String(cls.scheduledDate || todayIso).slice(0, 10);
    if (
      !canHostClassSession({
        dateKey,
        startTime: cls.startTime,
        endTime: cls.endTime,
      })
    ) {
      alert("Meet join is only available during the scheduled class time window.");
      return;
    }
    try {
      let meetingUrl: string | undefined = cls.meetingUrl || undefined;
      if (!meetingUrl) {
        const current = await classSessionsApi.getMeeting(cls.id);
        meetingUrl = current.data.meetingUrl || undefined;
      }
      if (!meetingUrl) {
        const created = await classSessionsApi.createGoogleMeet(cls.id);
        meetingUrl = created.data.meetingUri;
      }
      if (!meetingUrl) {
        throw new Error("No Google Meet is available for this class.");
      }
      window.open(meetingUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Connect or reauthorize Google Workspace before joining this class."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading dashboard…</span>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="mx-auto h-10 w-10 text-rose-500 opacity-70" />
        <h2 className="text-lg font-semibold">Unable to load dashboard</h2>
        <p className="text-sm text-muted-foreground">Your faculty profile or schedule could not be loaded.</p>
        <Button onClick={() => refetch()}>Retry</Button>
        <div className="text-left pt-2">
          <LeaveRequestReviewPanel />
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back, ${facultyName}`}
        description={branchName}
        actions={
          todayClasses[0] ? (
            <Button
              onClick={() => handleOpenClass(todayClasses[0])}
              className="h-9 gap-2 px-3.5 text-xs sm:text-sm font-medium"
            >
              <Clock className="w-4 h-4" />
              <span className="truncate max-w-[14rem] sm:max-w-none">
                Next: {todayClasses[0].courseName || todayClasses[0].title} ({formatTime12h(todayClasses[0].startTime)})
              </span>
            </Button>
          ) : undefined
        }
      />

      <MetricGrid density="compact">
        <Card size="compact" className="border border-border/60 shadow-xs bg-card">
          <CardContent size="compact">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Today</p>
            <p className="text-xl font-semibold text-foreground mt-0.5 tabular-nums">
              {counts?.todayClasses ?? todayClasses.length}
            </p>
          </CardContent>
        </Card>

        <Card size="compact" className="border border-border/60 shadow-xs bg-card">
          <CardContent size="compact">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Upcoming</p>
            <p className="text-xl font-semibold text-foreground mt-0.5 tabular-nums">{upcomingCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Next 7 days</p>
          </CardContent>
        </Card>

        <Card
          size="compact"
          className={`border shadow-xs ${
            liveCount > 0
              ? "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/30"
              : "border-border/60 bg-card"
          }`}
        >
          <CardContent size="compact">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Live</p>
            <p
              className={`text-xl font-semibold mt-0.5 tabular-nums ${
                liveCount > 0 ? "text-rose-600" : "text-foreground"
              }`}
            >
              {liveCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {liveCount > 0 ? "In progress" : "None now"}
            </p>
          </CardContent>
        </Card>

        <Card size="compact" className="border border-border/60 shadow-xs bg-card">
          <CardContent size="compact">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
            <p className="text-xl font-semibold text-foreground mt-0.5 tabular-nums">{completedCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              This week
              {counts?.pendingSubmissions != null && counts.pendingSubmissions > 0
                ? ` · ${counts.pendingSubmissions} to grade`
                : ""}
            </p>
          </CardContent>
        </Card>
      </MetricGrid>

      <Card size="compact" className="border border-border/60 shadow-xs bg-card">
        <CardContent size="compact">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                My attendance
              </p>
              <p className="text-sm text-foreground mt-0.5">
                <span className="font-medium">
                  {dashboard.dailyAttendance?.today
                    ? dashboard.dailyAttendance.today.status.replace("_", " ")
                    : "Not marked"}
                </span>
                {(() => {
                  const today = dashboard.dailyAttendance?.today;
                  if (!today || today.status !== "PRESENT") return null;
                  const first = today.firstIn ?? today.inTime;
                  const last = today.lastOut ?? today.outTime;
                  if (!first && !last && !today.openSession) return null;
                  const sessions = today.sessionCount > 1 ? ` · ${today.sessionCount} sessions` : "";
                  const range = today.openSession
                    ? `from ${formatTime12h(first)}`
                    : `${formatTime12h(first)} – ${formatTime12h(last)}`;
                  return (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {range}
                      {sessions}
                    </span>
                  );
                })()}
                {dashboard.dailyAttendance?.today?.openSession ? (
                  <span className="text-blue-600 dark:text-blue-400 font-medium"> · Checked in</span>
                ) : null}
                <span className="text-muted-foreground">
                  {" "}
                  · Month{" "}
                  <span className="font-medium text-foreground">
                    {dashboard.dailyAttendance?.monthPct != null
                      ? `${dashboard.dailyAttendance.monthPct}%`
                      : "—"}
                  </span>
                </span>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0 gap-1"
              onClick={() => navigate(ROUTES.FACULTY.MY_ATTENDANCE)}
            >
              View history
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <LeaveRequestReviewPanel />

      <div
        className={`grid gap-3 ${
          dashboard.pendingGrading?.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {dashboard.pendingGrading?.length > 0 && (
          <Card size="compact" className="border border-amber-200/80 bg-amber-50/30 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/20">
            <CardHeader size="compact" className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <h3 className="text-sm font-semibold text-foreground">Pending grading</h3>
              </div>
              <Badge variant="outline" className="text-[11px] font-medium border-amber-200 text-amber-800 bg-amber-50/80">
                {dashboard.pendingGrading.length} {dashboard.pendingGrading.length === 1 ? "batch" : "batches"}
              </Badge>
            </CardHeader>
            <CardContent size="compact" className="px-4 pb-3 space-y-1.5">
              {dashboard.pendingGrading.slice(0, 3).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => navigate("/faculty/assignments/reviews")}
                  className="w-full flex items-center justify-between text-left text-xs p-2.5 rounded-lg bg-background/80 hover:bg-background border border-transparent hover:border-border transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-foreground block truncate">{a.title}</span>
                    {a.batchName ? (
                      <span className="text-muted-foreground text-[11px]">{a.batchName}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                      {a.pendingCount} {a.pendingCount === 1 ? "submission" : "submissions"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
        <Card size="compact" className="border border-border/60 shadow-xs bg-card">
          <CardHeader size="compact" className="pb-2 pt-3 px-4 flex flex-row items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Student feedback</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {counts?.avgRating != null ? (
                  <>
                    <span className="font-semibold text-amber-600">{counts.avgRating.toFixed(1)}</span>
                    /5 · {counts.totalRatings} {counts.totalRatings === 1 ? "review" : "reviews"}
                  </>
                ) : (
                  <>No reviews yet</>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 shrink-0"
              onClick={() => navigate("/faculty/feedback")}
            >
              View all
            </Button>
          </CardHeader>
          <CardContent size="compact" className="px-4 pb-3 space-y-1.5">
            {(dashboard.recentFeedback?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">No student feedback yet</p>
            ) : (
              dashboard.recentFeedback.slice(0, 3).map((f) => (
                <div key={f.id} className="text-xs py-2 px-2.5 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-1 font-medium text-amber-600">
                    <Star className="w-3 h-3 fill-current" /> {f.rating}/5
                    <span className="text-muted-foreground font-normal">· Anonymous</span>
                  </div>
                  {f.comment && <p className="text-muted-foreground mt-1 line-clamp-2">{f.comment}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <PageSection
        title="My classes"
        density="compact"
        actions={
          <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-lg self-start overflow-x-auto">
            {(["TODAY", "ALL", "UPCOMING", "COMPLETED"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap h-8 ${
                  activeTab === tab
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "TODAY"
                  ? `Today (${todayClasses.length})`
                  : tab === "ALL"
                    ? `All (${myAssignedClasses.length})`
                    : tab === "UPCOMING"
                      ? `Upcoming (${upcomingCount})`
                      : `Completed (${completedCount})`}
              </button>
            ))}
          </div>
        }
      >
        <FilterToolbar>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search courses, batches, or rooms…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-border/60 bg-background text-xs"
            />
          </div>
        </FilterToolbar>

        <div className="space-y-3">
          {displayedClasses.length === 0 ? (
            <div className="py-10 text-center space-y-2 rounded-xl border border-border/60 bg-card">
              <div className="w-11 h-11 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No classes found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? "No teaching slots matched your search."
                  : "No scheduled classes yet. Assignments from the timetable appear here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {displayedClasses.map((cls) => {
                const isLive = cls.sessionStatus === "LIVE";
                const dateKey = String(cls.scheduledDate || todayIso).slice(0, 10);
                const inHostWindow = canHostClassSession({
                  dateKey,
                  startTime: cls.startTime,
                  endTime: cls.endTime,
                });
                const showJoinMeet = inHostWindow && (isLive || cls.mode === "ONLINE");
                return (
                  <div
                    key={cls.id}
                    className={`rounded-xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden group border ${
                      isLive
                        ? "bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900"
                        : "bg-card border-border/60 hover:border-border"
                    }`}
                  >
                    {isLive && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-rose-500" />
                    )}

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono font-medium px-2 py-0.5 shrink-0"
                          >
                            {cls.batchCode || "BATCH"}
                          </Badge>
                          {cls.batchName ? (
                            <span className="text-xs text-muted-foreground truncate">{cls.batchName}</span>
                          ) : null}
                        </div>
                        {isLive ? (
                          <Badge className="bg-rose-600 text-white font-medium text-[11px] px-2 py-0.5">
                            LIVE
                          </Badge>
                        ) : cls.sessionStatus === "COMPLETED" ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium text-[11px] px-2 py-0.5"
                          >
                            Ended
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground font-medium text-[11px] px-2 py-0.5"
                          >
                            Upcoming
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
                          {cls.courseName || cls.title || "Class Session"}
                        </h3>
                        {cls.subjectName &&
                          cls.subjectName !== cls.courseName &&
                          cls.subjectName !== cls.title && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {cls.subjectName}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 text-foreground">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {cls.dateLabel}
                          <span className="text-muted-foreground">· {cls.timeRange}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          {cls.assignedStudents}{" "}
                          {cls.assignedStudents === 1 ? "student" : "students"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          {isLive || cls.mode === "ONLINE" ? (
                            <>
                              <Video className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                              <span className="text-rose-700 dark:text-rose-400">Online</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              {cls.roomNo || "Room TBD"}
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-border/50 flex flex-wrap items-center justify-end gap-2">
                      {showJoinMeet && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => handleJoinGoogleMeet(cls, e)}
                          className="font-medium text-xs h-8 px-3 gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
                        >
                          <Video className="w-3.5 h-3.5" /> Join Meet
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={() => handleOpenClass(cls)}
                        className={`font-medium text-xs h-8 px-3.5 gap-1.5 ${
                          isLive
                            ? "bg-rose-600 hover:bg-rose-700 text-white"
                            : ""
                        }`}
                      >
                        {isLive ? (
                          <>
                            <Video className="w-3.5 h-3.5" /> Manage Live Class
                          </>
                        ) : (
                          <>
                            Open Session <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageSection>

      <StartClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        session={selectedModalClass}
        onSessionStatusChange={(sessionId, newStatus) => {
          setSelectedModalClass((prev) =>
            prev && prev.id === sessionId ? { ...prev, status: newStatus } : prev
          );
          refetch();
        }}
      />
    </PageContainer>
  );
};
