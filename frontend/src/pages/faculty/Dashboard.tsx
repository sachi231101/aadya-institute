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
  FileText,
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
import { InstallDashboardBanner } from "@/components/common/InstallDashboardBanner";
import { StartClassModal, type ClassSessionModalData } from "@/components/faculty/StartClassModal";
import type { FacultyDashboardSession } from "@/types/faculty.types";

type SessionCard = FacultyDashboardSession & {
  isToday: boolean;
  dateLabel: string;
  timeRange: string;
};

const formatSessionDate = (iso: string, isToday: boolean) => {
  if (isToday) return "Today";
  return new Date(iso).toLocaleDateString("en-IN", {
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

  const [activeTab, setActiveTab] = useState<"TODAY" | "ALL" | "UPCOMING" | "COMPLETED">("TODAY");
  const [searchQuery, setSearchQuery] = useState("");

  const dashboard = dashRes?.data;
  const facultyName = dashboard?.profile?.name || user?.name || "Faculty";
  const branchName = dashboard?.profile?.branch?.name || "Aadya Branch";

  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const myAssignedClasses: SessionCard[] = useMemo(() => {
    if (!dashboard) return [];
    const today = (dashboard.todaySessions || []).map((s) => {
      let status = (s.sessionStatus || "UPCOMING").toUpperCase();
      if (
        activeLiveClass?.status === "LIVE" &&
        activeLiveClass.sessionId === s.id
      ) {
        status = "LIVE";
      }
      return {
        ...s,
        sessionStatus: status,
        isToday: true,
        dateLabel: formatSessionDate(s.scheduledDate, true),
        timeRange: `${s.startTime} – ${s.endTime}`,
      };
    });
    const upcoming = (dashboard.upcomingSessions || []).map((s) => ({
      ...s,
      sessionStatus: (s.sessionStatus || "UPCOMING").toUpperCase(),
      isToday: false,
      dateLabel: formatSessionDate(s.scheduledDate, false),
      timeRange: `${s.startTime} – ${s.endTime}`,
    }));
    return [...today, ...upcoming];
  }, [dashboard, activeLiveClass]);

  const counts = dashboard?.counts;
  const todayClasses = myAssignedClasses.filter((c) => c.isToday);
  const liveCount = counts?.liveClasses ?? myAssignedClasses.filter((c) => c.sessionStatus === "LIVE").length;
  const upcomingCount = counts?.upcomingClasses ?? myAssignedClasses.filter((c) => c.sessionStatus === "UPCOMING").length;
  const completedCount = counts?.completedThisWeek ?? 0;

  const displayedClasses = useMemo(() => {
    return myAssignedClasses.filter((c) => {
      if (activeTab === "TODAY" && !c.isToday && c.sessionStatus !== "LIVE") return false;
      if (activeTab === "UPCOMING" && c.sessionStatus !== "UPCOMING" && c.sessionStatus !== "LIVE") return false;
      if (activeTab === "COMPLETED" && c.sessionStatus !== "COMPLETED") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (c.courseName || "").toLowerCase().includes(q) ||
          (c.subjectName || "").toLowerCase().includes(q) ||
          (c.batchName || "").toLowerCase().includes(q) ||
          (c.batchCode || "").toLowerCase().includes(q) ||
          (c.roomNo || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [myAssignedClasses, activeTab, searchQuery]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-28">
        <Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" />
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
        <Button onClick={() => refetch()} className="bg-[#1769AA] text-white">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1680px] mx-auto space-y-7 animate-in fade-in duration-300">
      <InstallDashboardBanner />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-[#1769AA] to-indigo-900 p-6 sm:p-8 text-white shadow-xl shadow-blue-950/15">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge className="bg-white/20 text-white border-white/30 text-xs px-3 py-1 font-bold">
                Faculty Teaching Desk
              </Badge>
              <Badge className="bg-emerald-400 text-slate-950 font-black text-xs px-3 py-1 border-0">
                {branchName} • {dashboard.profile.designation || "Instructor"}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              Welcome back, {facultyName}!
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed opacity-90">
              Your live schedule from assigned batches. Mark attendance, launch Meet, and manage assignments from here.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {todayClasses[0] && (
              <Button
                onClick={() => handleOpenClass(todayClasses[0])}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm h-11 px-5 rounded-2xl shadow-lg gap-2"
              >
                <Clock className="w-4 h-4" />
                <span>
                  Next: {todayClasses[0].courseName || todayClasses[0].title} ({todayClasses[0].startTime})
                </span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate("/faculty/assignments")}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-bold text-xs h-11 px-4 rounded-2xl"
            >
              <FileText className="w-4 h-4 mr-2" /> All Assignments
            </Button>
          </div>
        </div>
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            title: "All Assignments",
            desc: "View and manage your assignments",
            path: "/faculty/assignments",
            icon: FileText,
          },
          {
            title: "Create Assignment",
            desc: "Assign work to your batches",
            path: "/faculty/assignments/create",
            icon: BookOpen,
          },
          {
            title: "Submissions Queue",
            desc: "See student submissions",
            path: "/faculty/assignments/submissions",
            icon: Users,
          },
          {
            title: "Grading Queue",
            desc: `${counts?.pendingSubmissions ?? 0} waiting to grade`,
            path: "/faculty/assignments/reviews",
            icon: CheckCircle2,
          },
        ].map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className="text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-[#1769AA]/40 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Classes</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{counts?.todayClasses ?? todayClasses.length}</div>
              <p className="text-[11px] text-slate-500 font-medium">Scheduled for today</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1769AA]">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Upcoming</span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-700">{upcomingCount}</div>
              <p className="text-[11px] text-slate-500 font-medium">Next 7 days</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`rounded-2xl shadow-2xs ${
            liveCount > 0 ? "bg-rose-50/60 border-2 border-rose-400 animate-pulse" : "bg-white border-slate-200/80"
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Live Classes</span>
              <div className={`text-2xl sm:text-3xl font-black ${liveCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
                {liveCount > 0 ? `${liveCount} LIVE` : "0"}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {liveCount > 0 ? "Session in progress" : "No live session"}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                liveCount > 0 ? "bg-rose-600 text-white" : "bg-rose-50 border border-rose-100 text-rose-600"
              }`}
            >
              <Radio className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed (Week)</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">{completedCount}</div>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                {counts?.avgRating != null && (
                  <>
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {counts.avgRating} avg ·{" "}
                  </>
                )}
                {counts?.pendingSubmissions ?? 0} to grade
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
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
                <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100">
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                    activeTab === tab ? "bg-white text-[#1769AA] shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab === "TODAY"
                    ? `Today (${todayClasses.length})`
                    : tab === "ALL"
                    ? `All (${myAssignedClasses.length})`
                    : tab.charAt(0) + tab.slice(1).toLowerCase()}
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
                  : "You have no classes under this filter. Ask admin to assign batches and schedule sessions."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {displayedClasses.map((cls) => {
                const isLive = cls.sessionStatus === "LIVE";
                return (
                  <div
                    key={cls.id}
                    className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-5 relative overflow-hidden group ${
                      isLive
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
                            className="bg-blue-50 text-[#1769AA] border-blue-200 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg"
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
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight group-hover:text-[#1769AA]">
                          {cls.courseName || cls.title || "Class Session"}
                        </h3>
                        <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                          {cls.subjectName || "Session"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-white/80 p-2.5 rounded-xl border border-slate-200/60">
                          <Clock className="w-4 h-4 text-[#1769AA] shrink-0" />
                          <span className="font-bold">{cls.timeRange}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-white/80 p-2.5 rounded-xl border border-slate-200/60">
                          <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong className="font-black">{cls.assignedStudents}</strong> Students
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/60">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{cls.dateLabel}</span>
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

                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-end">
                      <Button
                        type="button"
                        onClick={() => handleOpenClass(cls)}
                        className={`font-black text-xs h-10 px-5 rounded-xl gap-2 ${
                          isLive
                            ? "bg-rose-600 hover:bg-rose-700 text-white"
                            : "bg-[#1769AA] hover:bg-[#125890] text-white"
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

      {dashboard.myBatches?.length > 0 && (
        <Card className="rounded-2xl border-slate-200">
          <CardHeader className="pb-2 pt-4 px-5">
            <h3 className="text-sm font-bold">My Batches</h3>
          </CardHeader>
          <CardContent className="px-5 pb-4 flex flex-wrap gap-2">
            {dashboard.myBatches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => navigate("/faculty/batches")}
                className="text-xs font-medium px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#1769AA]"
              >
                <span className="font-bold">{b.name}</span>
                <span className="text-slate-500"> · {b.courseName} · {b.studentCount} students</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1769AA]" />
              Need Full Timetable Grid?
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Switch week, view room assignments, and manage all assigned classes in the dedicated academic timetable.
            </p>
          </div>
          <Button
            onClick={() => navigate("/faculty/timetable")}
            className="rounded-xl bg-[#1769AA] hover:bg-[#125890] text-white font-bold text-xs shrink-0"
          >
            Open My Schedule <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>

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
