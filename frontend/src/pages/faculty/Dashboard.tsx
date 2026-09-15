import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  BookOpen,
  CheckCircle2,
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
import { StartClassModal, type ClassSessionModalData } from "@/components/faculty/StartClassModal";
import { classSessionsApi } from "@/services/class-sessions.api";
import type { FacultyDashboardSession } from "@/types/faculty.types";

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

  const dashboard = dashRes?.data;
  const rawFacultyName = dashboard?.profile?.name || user?.name || "Faculty";
  const facultyName = rawFacultyName.charAt(0).toUpperCase() + rawFacultyName.slice(1);
  const branchName = dashboard?.profile?.branch?.name || "Aadya Branch";

  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const myAssignedClasses: SessionCard[] = useMemo(() => {
    if (!dashboard) return [];

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
      return {
        ...s,
        scheduledDate: dateKey,
        sessionStatus: status,
        isToday,
        dateLabel: formatSessionDate(dateKey, isToday),
        timeRange: `${s.startTime} – ${s.endTime}`,
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
  }, [dashboard, activeLiveClass, todayIso]);

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
    setSelectedModalClass({
      id: cls.id,
      title: cls.title || cls.subjectName || "Class Session",
      courseName: cls.courseName || "Assigned Course",
      subjectName: cls.subjectName || "",
      batchId: cls.batchId || undefined,
      batchName: cls.batchName || cls.batchCode || "Batch",
      batchCode: cls.batchCode || "BATCH",
      date: cls.scheduledDate ? cls.scheduledDate.split("T")[0] : todayIso,
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
      <div className="flex items-center justify-center py-28">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
        <span className="ml-3 text-sm text-slate-500 font-medium">Loading your teaching desk...</span>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500 opacity-70" />
        <h2 className="text-xl font-bold">Unable to load dashboard</h2>
        <p className="text-sm text-muted-foreground">Your faculty profile or schedule could not be loaded.</p>
        <Button onClick={() => refetch()} className="bg-[#2563EB] text-white">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <PageContainer className="animate-in fade-in duration-300">
      <PageHeader
        title={`Welcome back, ${facultyName}`}
        description={`Your live schedule from assigned batches at ${branchName}.`}
        actions={
          todayClasses[0] ? (
            <Button
              onClick={() => handleOpenClass(todayClasses[0])}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm h-9 px-4 rounded-xl gap-2"
            >
              <Clock className="w-4 h-4" />
              <span>
                Next: {todayClasses[0].courseName || todayClasses[0].title} ({todayClasses[0].startTime})
              </span>
            </Button>
          ) : undefined
        }
      />

      <MetricGrid density="compact">
        <Card size="compact" className="bg-card border-border shadow-2xs rounded-xl">
          <CardContent size="compact">
            <div className="text-2xl font-semibold text-foreground leading-tight">{counts?.todayClasses ?? todayClasses.length}</div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Today's Classes</p>
          </CardContent>
        </Card>

        <Card size="compact" className="bg-card border-border shadow-2xs rounded-xl">
          <CardContent size="compact">
            <div className="text-2xl font-semibold text-foreground leading-tight">{upcomingCount}</div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Upcoming (7 days)</p>
          </CardContent>
        </Card>

        <Card
          size="compact"
          className={`shadow-2xs rounded-xl border ${
            liveCount > 0
              ? "bg-rose-50/60 border-rose-300 ring-1 ring-rose-400/50"
              : "bg-card border-border"
          }`}
        >
          <CardContent size="compact">
            <div className={`text-2xl font-semibold leading-tight ${liveCount > 0 ? "text-rose-600" : "text-foreground"}`}>
              {liveCount > 0 ? `${liveCount} LIVE` : "0"}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {liveCount > 0
                ? `${liveCount === 1 ? "Session" : "Sessions"} in progress`
                : "No live session"}
            </p>
          </CardContent>
        </Card>

        <Card size="compact" className="bg-card border-border shadow-2xs rounded-xl">
          <CardContent size="compact">
            <div className="text-2xl font-semibold text-foreground leading-tight">{completedCount}</div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">
              Completed this week
              {counts?.pendingSubmissions != null && counts.pendingSubmissions > 0
                ? ` · ${counts.pendingSubmissions} to grade`
                : ""}
            </p>
          </CardContent>
        </Card>
      </MetricGrid>

      {(dashboard.pendingGrading?.length > 0 || dashboard.recentFeedback?.length > 0) && (
        <div
          className={`grid gap-4 ${
            dashboard.pendingGrading?.length > 0 && dashboard.recentFeedback?.length > 0
              ? "grid-cols-1 lg:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {dashboard.pendingGrading?.length > 0 && (
            <Card size="compact" className="rounded-xl border-amber-200 bg-amber-50/40 shadow-2xs">
              <CardHeader size="compact" className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <h3 className="text-sm font-semibold text-amber-900">Pending grading</h3>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[11px] font-semibold">
                  {dashboard.pendingGrading.length} {dashboard.pendingGrading.length === 1 ? "batch" : "batches"}
                </Badge>
              </CardHeader>
              <CardContent size="compact" className="px-4 pb-3 space-y-2">
                {dashboard.pendingGrading.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => navigate("/faculty/assignments/reviews")}
                    className="w-full flex items-center justify-between text-left text-xs font-medium p-3 rounded-lg bg-white border border-amber-200/80 hover:border-amber-400 hover:shadow-xs transition-all group"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-900 block truncate">{a.title}</span>
                      <span className="text-slate-500 text-[11px]">
                        {a.batchName ? `Batch: ${a.batchName}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 border-amber-200 text-[11px] font-semibold">
                        {a.pendingCount} {a.pendingCount === 1 ? "submission" : "submissions"}
                      </Badge>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
          {dashboard.recentFeedback?.length > 0 && (
            <Card size="compact" className="rounded-xl border-slate-200 shadow-2xs">
              <CardHeader size="compact" className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Recent feedback</h3>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => navigate("/faculty/feedback")}>
                  View all
                </Button>
              </CardHeader>
              <CardContent size="compact" className="px-4 pb-3 space-y-2">
                {dashboard.recentFeedback.slice(0, 3).map((f) => (
                  <div key={f.id} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1 font-semibold text-amber-600">
                      <Star className="w-3 h-3 fill-current" /> {f.rating}/5 · {f.studentName}
                    </div>
                    {f.comment && <p className="text-slate-600 mt-1 line-clamp-2">{f.comment}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <PageSection
        title="My Assigned Classes"
        description={`Schedule for ${facultyName} (${branchName}).`}
        density="compact"
        actions={
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl self-start overflow-x-auto">
            {(["TODAY", "ALL", "UPCOMING", "COMPLETED"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap h-9 ${
                  activeTab === tab ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
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
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search courses, batches, or rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 rounded-xl border-border bg-background text-xs font-medium"
            />
          </div>
        </FilterToolbar>

        <div className="space-y-4">
          {displayedClasses.length === 0 ? (
            <div className="py-12 text-center space-y-3 rounded-xl border border-border bg-card">
              <div className="w-14 h-14 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No classes found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? "No teaching slots matched your search."
                  : "No scheduled classes yet. When admin assigns you on Timetable, they appear here and under My Classes."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {displayedClasses.map((cls) => {
                const isLive = cls.sessionStatus === "LIVE";
                return (
                  <div
                    key={cls.id}
                    className={`rounded-xl p-5 flex flex-col justify-between gap-4 relative overflow-hidden group ${
                      isLive
                        ? "bg-rose-50/70 border border-rose-400 ring-1 ring-rose-400/40 shadow-sm"
                        : "bg-card hover:bg-muted/30 border border-border hover:border-primary/30 hover:shadow-xs"
                    }`}
                  >
                    {isLive && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-600 animate-pulse" />
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-[#2563EB] border-blue-200 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg"
                          >
                            {cls.batchCode || "BATCH"}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-600">{cls.batchName}</span>
                        </div>
                        {isLive ? (
                          <Badge className="bg-rose-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full animate-pulse">
                            LIVE NOW
                          </Badge>
                        ) : cls.sessionStatus === "COMPLETED" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                            Completed
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                            Upcoming
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight group-hover:text-primary transition-colors">
                          {cls.courseName || cls.title || "Class Session"}
                        </h3>
                        {cls.subjectName &&
                          cls.subjectName !== cls.courseName &&
                          cls.subjectName !== cls.title && (
                          <p className="text-xs font-medium text-slate-600 mt-0.5">
                            {cls.subjectName}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-white/90 p-2.5 rounded-xl border border-slate-200/70 sm:col-span-2">
                          <Calendar className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-semibold">
                            {cls.dateLabel}
                            <span className="text-slate-500 font-normal"> · {cls.timeRange}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-white/90 p-2.5 rounded-xl border border-slate-200/70">
                          <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong className="font-semibold text-slate-900">{cls.assignedStudents}</strong>{" "}
                            {cls.assignedStudents === 1 ? "Student" : "Students"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-white/90 p-2.5 rounded-xl border border-slate-200/70">
                          {isLive || cls.mode === "ONLINE" ? (
                            <>
                              <Video className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="font-semibold text-rose-700">Online / Meet</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{cls.roomNo || "Room TBD"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-500">
                        {isLive ? "Session in progress" : cls.sessionStatus === "COMPLETED" ? "Class completed" : "Scheduled"}
                      </span>
                      <div className="flex items-center gap-2 ml-auto">
                        {(isLive || cls.mode === "ONLINE") && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={(e) => handleJoinGoogleMeet(cls, e)}
                            className="font-semibold text-xs h-9 px-3.5 rounded-xl gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
                          >
                            <Video className="w-3.5 h-3.5" /> Join Meet
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={() => handleOpenClass(cls)}
                          className={`font-semibold text-xs h-9 px-4 rounded-xl gap-1.5 ${
                            isLive
                              ? "bg-rose-600 hover:bg-rose-700 text-white"
                              : "bg-primary hover:bg-primary/90 text-primary-foreground"
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
