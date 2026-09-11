import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Radio,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Search,
  GraduationCap,
  Star,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const facultyName = dashboard?.profile?.name || user?.name || "Faculty";
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
      let meetingUrl = cls.meetingUrl;
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1680px] mx-auto space-y-7 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-[#2563EB] to-indigo-900 p-6 sm:p-8 text-white shadow-xl shadow-blue-950/15">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge className="bg-white/20 text-white border-white/30 text-xs px-3 py-1 font-bold">
                Faculty Teaching Desk
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              Welcome back, {facultyName}!
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed opacity-90">
              Your live schedule from assigned batches. Mark attendance, launch Meet, and manage assignments from here.
            </p>
          </div>

          {todayClasses[0] && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Button
                onClick={() => handleOpenClass(todayClasses[0])}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm h-11 px-5 rounded-2xl shadow-lg gap-2"
              >
                <Clock className="w-4 h-4" />
                <span>
                  Next: {todayClasses[0].courseName || todayClasses[0].title} ({todayClasses[0].startTime})
                </span>
              </Button>
            </div>
          )}
        </div>
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ─── Secondary Metric Cards (Compact) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Today's Classes</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{counts?.todayClasses ?? todayClasses.length}</div>
              <p className="text-[10.5px] text-slate-500 font-medium truncate">Scheduled for today</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
              <Calendar className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Upcoming</span>
              <div className="text-xl sm:text-2xl font-black text-indigo-700 leading-tight">{upcomingCount}</div>
              <p className="text-[10.5px] text-slate-500 font-medium truncate">Next 7 days</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <BookOpen className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`rounded-2xl shadow-2xs ${liveCount > 0 ? "bg-rose-50/60 border-2 border-rose-400 animate-pulse" : "bg-white border-slate-200/80"
            }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Live Classes</span>
              <div className={`text-xl sm:text-2xl font-black leading-tight ${liveCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
                {liveCount > 0 ? `${liveCount} LIVE` : "0"}
              </div>
              <p className="text-[10.5px] text-slate-500 font-medium truncate">
                {liveCount > 0 ? "Session in progress" : "No live session"}
              </p>
            </div>
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${liveCount > 0 ? "bg-rose-600 text-white" : "bg-rose-50 border border-rose-100 text-rose-600"
                }`}
            >
              <Radio className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Completed (Week)</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 leading-tight">{completedCount}</div>
              <p className="text-[10.5px] text-slate-500 font-medium flex items-center gap-1 truncate">
                {counts?.avgRating != null && (
                  <>
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                    <span>{counts.avgRating} avg ·</span>
                  </>
                )}
                <span>{counts?.pendingSubmissions ?? 0} to grade</span>
              </p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {(dashboard.pendingGrading?.length > 0 || dashboard.recentFeedback?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dashboard.pendingGrading?.length > 0 && (
            <Card className="rounded-2xl border-amber-200 bg-amber-50/40">
              <CardHeader className="pb-2 pt-4 px-5">
                <h3 className="text-sm font-bold text-amber-900">Pending grading</h3>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2">
                {dashboard.pendingGrading.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => navigate("/faculty/assignments/reviews")}
                    className="w-full text-left text-xs font-medium p-2.5 rounded-xl bg-white border border-amber-100 hover:border-amber-300"
                  >
                    <span className="font-bold text-slate-900">{a.title}</span>
                    <span className="text-slate-500"> · {a.batchName} · {a.pendingCount} submissions</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
          {dashboard.recentFeedback?.length > 0 && (
            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Recent feedback</h3>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/faculty/feedback")}>
                  View all
                </Button>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2">
                {dashboard.recentFeedback.slice(0, 3).map((f) => (
                  <div key={f.id} className="text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1 font-bold text-amber-600">
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

      <Card className="bg-white border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">My Assigned Classes</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                Schedule for <strong className="text-slate-800">{facultyName}</strong> ({branchName}).
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-start overflow-x-auto">
              {(["TODAY", "ALL", "UPCOMING", "COMPLETED"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === tab ? "bg-white text-[#2563EB] shadow-xs" : "text-slate-600 hover:text-slate-900"
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
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search courses, batches, or rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50/50 text-xs font-medium"
            />
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {displayedClasses.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-700">No classes found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
                    className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-5 relative overflow-hidden group ${isLive
                        ? "bg-rose-50/70 border-2 border-rose-400/90 shadow-lg"
                        : "bg-slate-50/50 hover:bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-md"
                      }`}
                  >
                    {isLive && (
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-rose-600 animate-pulse" />
                    )}

                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-[#2563EB] border-blue-200 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg"
                          >
                            {cls.batchCode || "BATCH"}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-500">{cls.batchName}</span>
                        </div>
                        {isLive ? (
                          <Badge className="bg-rose-600 text-white font-black text-xs px-3 py-1 rounded-full animate-pulse">
                            LIVE NOW
                          </Badge>
                        ) : cls.sessionStatus === "COMPLETED" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full">
                            Completed
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-0.5 rounded-full">
                            Upcoming
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight group-hover:text-[#2563EB]">
                          {cls.courseName || cls.title || "Class Session"}
                        </h3>
                        {cls.subjectName &&
                          cls.subjectName !== cls.courseName &&
                          cls.subjectName !== cls.title && (
                          <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                            {cls.subjectName}
                          </p>
                        )}
                        <p className="text-[11px] font-bold text-slate-500 mt-1">
                          {cls.batchCode || "Batch"}
                          {cls.batchName ? ` · ${cls.batchName}` : ""}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-white/80 p-2.5 rounded-xl border border-slate-200/60 sm:col-span-2">
                          <Calendar className="w-4 h-4 text-[#2563EB] shrink-0" />
                          <span className="font-bold">
                            {cls.dateLabel}
                            <span className="text-slate-500 font-semibold"> · {cls.timeRange}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-white/80 p-2.5 rounded-xl border border-slate-200/60">
                          <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong className="font-black">{cls.assignedStudents}</strong> Students
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/60">
                          {isLive || cls.mode === "ONLINE" ? (
                            <>
                              <Video className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="font-bold text-rose-700">Online / Meet</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{cls.roomNo || "TBD"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-end gap-2">
                      {(isLive || cls.mode === "ONLINE") && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => handleJoinGoogleMeet(cls, e)}
                          className="font-black text-xs h-10 px-4 rounded-xl gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                        >
                          <Video className="w-4 h-4" /> Join Google Meet
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={() => handleOpenClass(cls)}
                        className={`font-black text-xs h-10 px-5 rounded-xl gap-2 ${isLive
                            ? "bg-rose-600 hover:bg-rose-700 text-white"
                            : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                          }`}
                      >
                        {isLive ? (
                          <>
                            <Video className="w-4 h-4" /> Manage Live Class
                          </>
                        ) : (
                          <>
                            Open Session <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <StartClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        session={selectedModalClass}
        onSessionStatusChange={() => {
          refetch();
        }}
      />
    </div>
  );
};
