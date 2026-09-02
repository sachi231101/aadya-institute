import React, { useMemo } from "react";
import {
  Calendar,
  UserCircle,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Video,
  Clock,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "../../store/auth.store";
import { useSessionStore } from "../../store/session.store";
import { useStudentDashboard } from "../../hooks/useStudentDashboard";
import { useStudentAcademicAccess } from "../../hooks/useStudentAcademicAccess";
import { InstallDashboardBanner } from "@/components/common/InstallDashboardBanner";

const formatSessionDate = (iso: string) => {
  const today = new Date();
  const d = new Date(iso);
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) return "Today";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

export const StudentDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const academic = useStudentAcademicAccess();
  const { activeLiveClass } = useSessionStore();
  const { data: dashRes, isLoading } = useStudentDashboard();

  const dashboard = dashRes?.data;
  const studentName = academic.studentName || dashboard?.profile?.name || user?.name || "Student";
  const courseName = academic.primaryCourse?.name || dashboard?.course?.name || "Enrolled Program";
  const batchName = academic.primaryBatch?.name || dashboard?.course?.batchName || "Assigned Batch";
  const instructor = dashboard?.instructor;
  const attendanceSummary = dashboard?.attendanceSummary;
  const displayAttendance = Math.round(attendanceSummary?.attendancePercentage ?? 0);
  const hasAttendanceData = Boolean(attendanceSummary && attendanceSummary.totalClasses > 0);
  const pendingAssignments = dashboard?.counts?.pendingAssignments ?? 0;

  const rawTodaySessions = dashboard?.todaySessions ?? [];
  const rawUpcomingSessions = dashboard?.upcomingSessions ?? [];
  const rawActiveLiveSessions = dashboard?.activeLiveSessions ?? [];

  const todaySessions = useMemo(() => {
    return rawTodaySessions.filter((s: any) => academic.isAuthorizedForSession(s));
  }, [rawTodaySessions, academic]);

  const upcomingSessions = useMemo(() => {
    return rawUpcomingSessions.filter((s: any) => academic.isAuthorizedForSession(s));
  }, [rawUpcomingSessions, academic]);

  const activeLiveSessions = useMemo(() => {
    return rawActiveLiveSessions.filter((s: any) => academic.isAuthorizedForSession(s));
  }, [rawActiveLiveSessions, academic]);

  const currentLive = useMemo(() => {
    if (activeLiveClass?.status === "LIVE" && academic.isAuthorizedForCourse(activeLiveClass.courseName)) {
      return {
        courseName: activeLiveClass.courseName || courseName,
        facultyName: activeLiveClass.facultyName || instructor?.name || "Faculty",
        batchName: activeLiveClass.batchName || batchName || "Your Batch",
        time: activeLiveClass.time || "",
        meetUrl: activeLiveClass.meetUrl,
      };
    }
    const live = activeLiveSessions[0];
    if (!live) return null;
    return {
      courseName: live.courseName || live.title || courseName,
      facultyName: live.facultyName || instructor?.name || "Faculty",
      batchName: batchName || "Your Batch",
      time: "",
      meetUrl: live.meetingUrl,
    };
  }, [activeLiveClass, activeLiveSessions, academic, batchName, courseName, instructor?.name]);

  const isClassLive = Boolean(currentLive);
  const scheduleItems = [...todaySessions, ...upcomingSessions].slice(0, 6);

  const handleJoinGoogleMeet = () => {
    if (!currentLive) return;
    academic.verifyAndJoinMeeting(
      {
        courseName: currentLive.courseName,
        meetingUrl: currentLive.meetUrl,
        status: "LIVE",
      },
      (errMsg) => alert(errMsg)
    );
  };

  const studentBatchCode = batchName || (user?.branchId ? `BRANCH-${user.branchId.slice(-4).toUpperCase()}` : "AADYA INSTITUTE");

  if (isLoading && !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      {isClassLive && currentLive && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-900 p-6 md:p-7 text-white shadow-xl shadow-rose-950/20 border-2 border-rose-400/40 animate-in slide-in-from-top-3 duration-300">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge className="bg-white text-rose-700 hover:bg-white font-black text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-2 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  LIVE NOW
                </Badge>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-xs">
                  {currentLive.courseName}
                </h2>
                <p className="text-rose-100 text-xs sm:text-sm font-medium mt-1">
                  Faculty: <strong className="text-white font-bold">{currentLive.facultyName}</strong>
                  {currentLive.batchName ? (
                    <> • Batch: <strong className="text-white font-bold">{currentLive.batchName}</strong></>
                  ) : null}
                </p>
              </div>

              {currentLive.time ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-100/90 pt-1">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span>Class Slot: {currentLive.time}</span>
                </div>
              ) : null}
            </div>

            {currentLive.meetUrl ? (
              <Button
                type="button"
                onClick={handleJoinGoogleMeet}
                className="bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 font-black text-sm h-12 px-7 rounded-2xl shadow-xl shadow-black/20 gap-2.5 transform hover:scale-105 transition-all cursor-pointer whitespace-nowrap"
              >
                <Video className="w-5 h-5 text-rose-600" />
                Join Google Meet
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-[#1769AA] to-[#2088d8] rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {studentName.split(" ")[0]}!</h1>
            <p className="text-blue-100 opacity-90 max-w-xl">
              Track your attendance, manage fees, and view your upcoming class schedule all in one place.
            </p>
          </div>
          <Badge variant="outline" className="bg-white/20 hover:bg-white/30 text-white border-white/30 px-3 py-1">
            {studentBatchCode}
          </Badge>
        </div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-10 right-20 w-32 h-32 bg-[#F39A16]/20 rounded-full blur-2xl" />
      </div>

      <InstallDashboardBanner />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-[#10b981]" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between text-text-primary">
                  <span>Overall Attendance</span>
                  <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 mt-2">
                  <div className="text-4xl font-bold text-text-primary">
                    {hasAttendanceData ? `${displayAttendance}%` : "—"}
                  </div>
                  <div className="text-sm text-text-secondary mb-1">
                    {hasAttendanceData
                      ? `${attendanceSummary?.presentCount ?? 0}/${attendanceSummary?.totalClasses ?? 0} classes`
                      : "No records yet"}
                  </div>
                </div>
                <div className="mt-4 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#10b981] h-2.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${hasAttendanceData ? displayAttendance : 0}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-3 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Maintain above 75% for certification.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-[#1769AA]" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between text-text-primary">
                  <span>Current Course</span>
                  <BookOpen className="h-4 w-4 text-[#1769AA]" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold text-text-primary mt-2">{courseName}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-50 text-[#1769AA] border border-blue-100">Active</Badge>
                  {batchName ? (
                    <Badge variant="outline" className="text-xs">{batchName}</Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-[#F39A16]" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between text-text-primary">
                  <span>Pending Assignments</span>
                  <ClipboardList className="h-4 w-4 text-[#F39A16]" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-text-primary mt-2">{pendingAssignments}</div>
                <p className="text-xs text-text-secondary mt-3">Assignments awaiting submission</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#F39A16]" />
                Fees & Payments
              </CardTitle>
              <CardDescription>Track your fee payments and download receipts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg border border-border/60 bg-bg-secondary/50">
                <div>
                  <h4 className="font-semibold text-text-primary">Payment Status</h4>
                  <p className="text-sm text-text-secondary mt-1">
                    Fee details will appear here once linked to your admission record.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-4 space-y-6">
          <Card className="border-border/50 shadow-sm max-h-[400px] flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-500" /> Class Schedule
                </span>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                  {dashboard?.counts?.todayClasses ?? todaySessions.length} today
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">
              {scheduleItems.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-6">
                  No class sessions scheduled.
                </p>
              ) : (
                <div className="space-y-3">
                  {scheduleItems.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 rounded-lg border border-border/60 bg-slate-50/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {session.courseName || session.title || "Class Session"}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {session.facultyName || "Faculty TBD"}
                          </p>
                        </div>
                        {session.sessionStatus === "LIVE" ? (
                          <Badge className="bg-rose-100 text-rose-700 text-[10px] shrink-0">LIVE</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatSessionDate(session.scheduledDate)} • {session.startTime} – {session.endTime}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCircle className="h-5 w-5 text-emerald-600" /> Assigned Instructor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {instructor ? (
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold border border-emerald-200 shadow-sm">
                    {(instructor.name || "F").charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary">{instructor.name || "Faculty Instructor"}</h4>
                    <p className="text-xs text-text-secondary mt-0.5">{instructor.email || "Academic Lead"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No instructor assigned yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};


