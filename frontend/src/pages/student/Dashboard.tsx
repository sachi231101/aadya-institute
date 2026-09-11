import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Video,
  Clock,
  FileText,
  Loader2,
  BarChart3,
  UserCircle,
  ChevronRight,
  Play,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "../../store/auth.store";
import { useSessionStore } from "../../store/session.store";
import { useStudentDashboard } from "../../hooks/useStudentDashboard";
import { useStudentAcademicAccess } from "../../hooks/useStudentAcademicAccess";
import { InstallDashboardBanner } from "@/components/common/InstallDashboardBanner";
import { useRecordingAccess, useRecordings } from "@/hooks/useRecordings";
import { classSessionsApi } from "@/services/class-sessions.api";

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const academic = useStudentAcademicAccess();
  const { activeLiveClass } = useSessionStore();
  const { data: dashRes, isLoading } = useStudentDashboard();
  const { data: recordingsRes } = useRecordings({ limit: 5, recordingStatus: "AVAILABLE" });
  const recordingAccess = useRecordingAccess();
  const [recordingsNow] = React.useState(() => Date.now());

  const dashboard = dashRes?.data;
  const studentName = academic.studentName || dashboard?.profile?.name || user?.name || "SACHIN GA";
  const firstName = studentName.split(" ")[0].toUpperCase();
  const courseName = academic.primaryCourse?.name || dashboard?.course?.name || "JAVA Full stack";
  const subjectsLabel =
    dashboard?.course?.subjects && dashboard.course.subjects !== "N/A"
      ? dashboard.course.subjects
      : null;
  const programLabel = subjectsLabel || courseName;
  const batchName = academic.primaryBatch?.name || dashboard?.course?.batchName || "B001";
  const instructor = dashboard?.instructor;
  const attendanceSummary = dashboard?.attendanceSummary;
  const displayAttendance = Math.round(attendanceSummary?.attendancePercentage ?? 100);
  const hasAttendanceData = Boolean(attendanceSummary && attendanceSummary.totalClasses > 0);
  const pendingAssignments = dashboard?.counts?.pendingAssignments ?? 0;
  const pendingAssignmentList = dashboard?.pendingAssignmentList ?? [];
  const latestRecording = useMemo(
    () =>
      (recordingsRes?.data ?? []).find(
        (recording: { expiresAt: string; recordingStatus?: string }) =>
          recording.recordingStatus === "AVAILABLE" &&
          new Date(recording.expiresAt).getTime() > recordingsNow
      ),
    [recordingsRes, recordingsNow]
  );

  const rawTodaySessions = dashboard?.todaySessions ?? [];
  const rawActiveLiveSessions = dashboard?.activeLiveSessions ?? [];

  // Dashboard sessions are already scoped to ACTIVE enrollments on the backend.
  // Do not re-filter them away when academic batch ids are still hydrating.
  const todaySessions = rawTodaySessions;
  const activeLiveSessions = rawActiveLiveSessions;

  const currentLive = useMemo(() => {
    if (activeLiveClass?.status === "LIVE" && academic.isAuthorizedForCourse(activeLiveClass.courseName)) {
      return {
        sessionId: activeLiveClass.sessionId || activeLiveClass.id,
        courseName: activeLiveClass.courseName || courseName,
        facultyName: activeLiveClass.facultyName || instructor?.name || "Faculty01",
        batchName: activeLiveClass.batchName || batchName || "B001",
        batchId: undefined as string | undefined,
        time: activeLiveClass.time || "",
        meetUrl: activeLiveClass.meetUrl,
      };
    }
    const live = activeLiveSessions[0];
    if (!live) return null;
    return {
      sessionId: live.id,
      courseName: live.courseName || live.title || courseName,
      facultyName: live.facultyName || instructor?.name || "Faculty01",
      batchName: live.batch?.name || batchName || "B001",
      batchId: live.batchId || live.batch?.id || undefined,
      time: "",
      meetUrl: live.meetingUrl,
    };
  }, [activeLiveClass, activeLiveSessions, academic, batchName, courseName, instructor?.name]);

  const isClassLive = Boolean(currentLive);
  const [isJoiningMeeting, setIsJoiningMeeting] = React.useState(false);

  const handleJoinGoogleMeet = async () => {
    if (!currentLive?.sessionId) return;
    setIsJoiningMeeting(true);
    try {
      // Enrollment-scoped Meet URL — never trust cached list/store meetingUrl alone
      const meeting = await classSessionsApi.getMeeting(currentLive.sessionId);
      const meetingUrl = meeting.data.meetingUrl?.trim();
      if (!meetingUrl || !meetingUrl.includes("meet.google.com")) {
        alert("No valid meeting link found for this class.");
        return;
      }
      academic.verifyAndJoinMeeting(
        {
          courseName: currentLive.courseName,
          batchId: currentLive.batchId,
          meetingUrl,
          status: "LIVE",
        },
        (errMsg) => alert(errMsg)
      );
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err as Error)?.message ||
          "Unable to join this class. You may not be enrolled."
      );
    } finally {
      setIsJoiningMeeting(false);
    }
  };

  const handleWatchLatestRecording = async () => {
    if (!latestRecording) return;
    try {
      const response = await recordingAccess.mutateAsync(latestRecording.id);
      if (response?.data?.playbackUrl) {
        window.open(response.data.playbackUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "This recording is no longer available."
      );
    }
  };

  if (isLoading && !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-6 animate-in fade-in duration-300">
      {/* ─── LIVE CLASS BANNER (If Active) ─── */}
      {isClassLive && currentLive && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-900 p-4 sm:p-5 text-white shadow-lg shadow-rose-950/20 border-2 border-rose-400/40 animate-in slide-in-from-top-3 duration-300">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-white text-rose-700 hover:bg-white font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  🔴 LIVE NOW
                </Badge>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
                  {currentLive.courseName}
                </h2>
                <p className="text-rose-100 text-xs font-medium mt-0.5">
                  Faculty: <strong className="text-white font-bold">{currentLive.facultyName}</strong>
                  {currentLive.batchName ? (
                    <> • Batch: <strong className="text-white font-bold">{currentLive.batchName}</strong></>
                  ) : null}
                </p>
              </div>

              {currentLive.time ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-100/90 pt-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Class Slot: {currentLive.time}</span>
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={handleJoinGoogleMeet}
              disabled={isJoiningMeeting}
              className="bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 font-black text-xs sm:text-sm h-10 px-5 rounded-xl shadow-lg shadow-black/20 gap-2 transform hover:scale-105 transition-all cursor-pointer whitespace-nowrap"
            >
              {isJoiningMeeting ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
              ) : (
                <Video className="w-4 h-4 text-rose-600" />
              )}
              {isJoiningMeeting ? "Joining…" : "Join Google Meet"}
            </Button>
          </div>
        </div>
      )}

      {/* ─── 3. HERO SECTION ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#EBF3FF] via-[#EEF6FF] to-[#E2EFFF] dark:from-[#131F37] dark:via-[#162746] dark:to-[#0F1B30] border border-[#BFDBFE]/80 dark:border-slate-800 p-4 sm:p-5 md:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Soft background glow spots */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-blue-300/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-indigo-300/20 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-0.5 max-w-2xl">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
            WELCOME BACK,
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A] dark:text-white">
            {firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl">
            Track your attendance, manage fees, and view your upcoming class schedule all in one place.
          </p>
        </div>

        {/* Right side education motto */}
        <div className="relative z-10 hidden sm:flex flex-col items-end text-right select-none opacity-85 shrink-0">
          <span className="font-serif italic text-base sm:text-lg font-bold text-[#2563EB] dark:text-[#60A5FA] leading-none">
            Keep Learning
          </span>
          <span className="font-serif italic text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
            Keep Growing
          </span>
        </div>
      </div>

      <InstallDashboardBanner />

      {latestRecording && (
        <Card className="bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
              <Video className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                {latestRecording.classSession?.title || "Latest class recording"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Available for up to 7 days · View only
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleWatchLatestRecording}
            disabled={recordingAccess.isPending}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold"
          >
            {recordingAccess.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1 fill-current" />}
            Watch Recording
          </Button>
        </Card>
      )}

      {/* ─── 4. DASHBOARD CARDS — SIDE BY SIDE ON MOBILE (2 cols) ─── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        {/* CARD 1 — OVERALL ATTENDANCE */}
        <Card className="bg-white dark:bg-[#131D31] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4.5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </div>
                <h3 className="text-[11px] sm:text-[13px] font-extrabold text-slate-900 dark:text-white truncate">Attendance</h3>
              </div>
              <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[2.5]" />
              </div>
            </div>

            <div className="mt-2.5 sm:mt-3 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2.5">
              <span className="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {hasAttendanceData ? `${displayAttendance}%` : "100%"}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                {hasAttendanceData
                  ? `${attendanceSummary?.presentCount ?? 2}/${attendanceSummary?.totalClasses ?? 2} classes`
                  : "2/2 classes"}
              </span>
            </div>

            <div className="mt-2 sm:mt-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#10B981] h-full rounded-full transition-all duration-700"
                style={{ width: `${hasAttendanceData ? displayAttendance : 100}%` }}
              />
            </div>
          </div>

          <p className="text-[9px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2.5 sm:mt-3 flex items-center gap-1 truncate">
            <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">&gt;75% required</span>
          </p>
        </Card>

        {/* CARD 2 — CURRENT COURSE */}
        <Card className="bg-white dark:bg-[#131D31] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4.5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              </div>
              <h3 className="text-[11px] sm:text-[13px] font-extrabold text-slate-900 dark:text-white truncate">Course</h3>
            </div>

            <div className="mt-2.5 sm:mt-3">
              <h4 className="text-xs sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2">
                {programLabel || "JAVA Full stack"}
              </h4>
            </div>
          </div>

          <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md sm:rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 text-[10px] sm:text-[11px] font-bold">
              Active
            </span>
          </div>
        </Card>

        {/* CARD 3 — PENDING ASSIGNMENTS */}
        <Card className="bg-white dark:bg-[#131D31] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4.5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FileText className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </div>
                <h3 className="text-[11px] sm:text-[13px] font-extrabold text-slate-900 dark:text-white truncate">Assignments</h3>
              </div>
            </div>

            <div className="mt-2.5 sm:mt-3 flex items-baseline justify-between gap-1">
              <div>
                <span className="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {pendingAssignments}
                </span>
                <p className="text-[9px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 truncate">Pending</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/student/assignments")}
                className="text-[10px] sm:text-[11px] font-bold text-[#2563EB] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800 px-2 py-0.5 rounded-md sm:rounded-lg transition-colors cursor-pointer shrink-0"
              >
                View all
              </button>
            </div>
          </div>

          <p className="text-[9px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2.5 sm:mt-3 truncate">
            {pendingAssignmentList.length > 0
              ? `${pendingAssignmentList.length} need attention`
              : "No pending tasks"}
          </p>
        </Card>

        {/* CARD 4 — CLASS SCHEDULE */}
        <Card className="bg-white dark:bg-[#131D31] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4.5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </div>
                <h3 className="text-[11px] sm:text-[13px] font-extrabold text-slate-900 dark:text-white truncate">Schedule</h3>
              </div>
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 text-[9px] sm:text-[10px] font-extrabold shrink-0">
                {todaySessions.length} today
              </span>
            </div>

            <div className="mt-2 sm:mt-2.5 flex flex-col items-center justify-center text-center py-0.5 sm:py-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-0.5 sm:mb-1">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.5]" />
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-full">
                {todaySessions.length > 0
                  ? `${todaySessions.length} session(s)`
                  : "No classes today"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/student/schedule")}
            className="text-[10px] sm:text-[11px] font-bold text-[#2563EB] dark:text-blue-400 hover:underline mt-1 text-center block w-full cursor-pointer truncate"
          >
            Timetable →
          </button>
        </Card>
      </div>

      {/* ─── 5. LOWER CONTENT: FEES & PAYMENTS + ASSIGNED INSTRUCTOR ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-4 items-stretch">
        {/* LEFT / LARGE SECTION: Fees & Payments (8 cols) */}
        <Card
          onClick={() => navigate("/student/profile")}
          className="lg:col-span-8 bg-white dark:bg-[#131D31] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
              <CreditCard className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                Fees &amp; Payments
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                Track your fee payments and download receipts
              </p>
            </div>
          </div>

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 flex items-center justify-center shrink-0">
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </Card>

        {/* RIGHT / SMALL SECTION: Assigned Instructor (4 cols) */}
        <Card className="lg:col-span-4 bg-white dark:bg-[#131D31] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-extrabold text-[11px] sm:text-xs mb-2">
            <UserCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Assigned Instructor</span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow-2xs">
              {(instructor?.name || "Faculty01").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {instructor?.name || "Faculty01"}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                {instructor?.email || "sachinFaculty@gmail.com"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
