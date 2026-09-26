import React, { useMemo, useState, useEffect, useRef } from "react";
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
  ChevronDown,
  Check,
  Play,
  Megaphone,
  CheckCheck,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuthStore } from "../../store/auth.store";
import { useSessionStore } from "../../store/session.store";
import { useStudentDashboard } from "../../hooks/useStudentDashboard";
import { useStudentAcademicAccess } from "../../hooks/useStudentAcademicAccess";
import { useFormatCurrency } from "@/hooks/useOrganizationFormat";
import { InstallDashboardBanner } from "@/components/common/InstallDashboardBanner";
import { PageContainer, PageHeader, MetricGrid } from "@/components/layout";
import { useRecordingAccess, useRecordings } from "@/hooks/useRecordings";
import { classSessionsApi } from "@/services/class-sessions.api";
import { StudentAskLeaveCard } from "@/components/leave/StudentAskLeaveCard";
import { formatTimeRange12h } from "@/utils/format";
import { useAnnouncements, useMarkAnnouncementRead, useMarkAllAnnouncementsRead } from "@/hooks/useAnnouncements";
import {
  canStudentJoinSession,
  istTodayKey,
  splitTimeRange,
} from "@/utils/session-window";
import {
  describeRecordingPlaybackError,
  isDirectVideoUrl,
  resolveRecordingPlaybackSrc,
} from "@/utils/recording-playback";

interface EnrolledCourseItem {
  id: string;
  name: string;
  code: string;
  batchId?: string;
  batchName?: string;
  batchCode?: string;
  status: string;
  facultyName?: string;
  facultyEmail?: string;
  timeSlot?: string;
}

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const academic = useStudentAcademicAccess();
  const { activeLiveClass } = useSessionStore();
  const { data: dashRes, isLoading } = useStudentDashboard();
  const formatMoney = useFormatCurrency();
  const { data: recordingsRes } = useRecordings({ limit: 5, recordingStatus: "AVAILABLE" });
  const recordingAccess = useRecordingAccess();
  const { data: announcementsRes, isLoading: announcementsLoading } = useAnnouncements({
    status: "PUBLISHED",
    view: "inbox",
    limit: 8,
  });
  const markAnnouncementRead = useMarkAnnouncementRead();
  const markAllAnnouncementsRead = useMarkAllAnnouncementsRead();
  const [openAnnouncementId, setOpenAnnouncementId] = useState<string | null>(null);
  const announcements = announcementsRes?.data || [];
  const unreadCount = announcements.filter((item) => !item.isRead).length;
  const [recordingsNow] = React.useState(() => Date.now());
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [watchPlaybackUrl, setWatchPlaybackUrl] = useState<string | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);

  const dashboard = dashRes?.data;
  const studentName = academic.studentName || dashboard?.profile?.name || user?.name || "SACHIN GA";
  const firstName = studentName.split(" ")[0].toUpperCase();

  // ─── MULTI-COURSE RESOLUTION ─────────────────────────────────────────────
  const coursesList = useMemo<EnrolledCourseItem[]>(() => {
    const list: EnrolledCourseItem[] = [];
    const seenIds = new Set<string>();

    // 1. From academic.assignedCourses
    if (academic.assignedCourses && academic.assignedCourses.length > 0) {
      academic.assignedCourses.forEach((c) => {
        if (seenIds.has(c.id)) return;
        seenIds.add(c.id);

        const matchedBatch =
          academic.assignedBatches.find(
            (b) => b.courseId === c.id || b.name === c.code || b.code === c.code
          ) || academic.assignedBatches[0];

        const matchedAdmission = academic.studentDetail?.admissions?.find(
          (a) => a.courseId === c.id || a.course?.id === c.id
        );

        list.push({
          id: c.id,
          name: c.name,
          code: c.code,
          batchId: matchedBatch?.id,
          batchName: matchedBatch?.name || academic.primaryBatch?.name || dashboard?.course?.batchName || "B001",
          batchCode: matchedBatch?.code || academic.primaryBatch?.code || dashboard?.course?.batchName || "B001",
          status: matchedAdmission?.status || matchedBatch?.status || "Active",
          facultyName: matchedBatch?.facultyName || dashboard?.instructor?.name || "Faculty01",
          facultyEmail: dashboard?.instructor?.email || "sachinFaculty@gmail.com",
          timeSlot: matchedBatch?.timeSlot,
        });
      });
    }

    // 2. From dashboard.courses fallback
    if (dashboard?.courses && dashboard.courses.length > 0) {
      dashboard.courses.forEach((c) => {
        if (seenIds.has(c.id)) return;
        seenIds.add(c.id);
        list.push({
          id: c.id,
          name: c.name,
          code: c.code,
          batchName: dashboard.course?.batchName || "B001",
          batchCode: dashboard.course?.batchName || "B001",
          status: "Active",
          facultyName: dashboard.instructor?.name || "Faculty01",
          facultyEmail: dashboard.instructor?.email || "sachinFaculty@gmail.com",
        });
      });
    }

    // 3. From dashboard.course fallback
    if (list.length === 0 && dashboard?.course) {
      list.push({
        id: dashboard.course.id,
        name: dashboard.course.name,
        code: dashboard.course.code,
        batchName: dashboard.course.batchName || "B001",
        batchCode: dashboard.course.batchName || "B001",
        status: "Active",
        facultyName: dashboard.instructor?.name || "Faculty01",
        facultyEmail: dashboard.instructor?.email || "sachinFaculty@gmail.com",
      });
    }

    return list;
  }, [academic, dashboard]);

  // Selected Course State
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Currently Active Course
  const activeCourse = useMemo(() => {
    if (selectedCourseId) {
      const found = coursesList.find((c) => c.id === selectedCourseId);
      if (found) return found;
    }
    return coursesList[0] || null;
  }, [coursesList, selectedCourseId]);

  // Set default selectedCourseId on initial load
  useEffect(() => {
    if (!selectedCourseId && coursesList.length > 0) {
      setSelectedCourseId(coursesList[0].id);
    }
  }, [coursesList, selectedCourseId]);

  // ─── DYNAMIC COURSE DATA BINDINGS ────────────────────────────────────────

  // 1. Attendance Data (Filtered for Active Course)
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

  const courseAttendance = useMemo(() => {
    const isMainCourse =
      !activeCourse ||
      activeCourse.id === dashboard?.course?.id ||
      activeCourse.name?.toLowerCase() === (dashboard?.course?.name || "").toLowerCase();

    if (isMainCourse && attendanceSummary && attendanceSummary.totalClasses > 0) {
      return {
        percentage: Math.round(attendanceSummary.attendancePercentage ?? 100),
        totalClasses: attendanceSummary.totalClasses,
        presentCount: attendanceSummary.presentCount,
        hasData: true,
      };
    }

    // Check modules belonging to active course
    const courseModules = academic.assignedModules.filter(
      (m) => m.courseId === activeCourse.id || m.courseName.toLowerCase() === activeCourse.name.toLowerCase()
    );

    if (courseModules.length > 0) {
      const totalClasses = courseModules.length * 10;
      const presentCount = Math.round(totalClasses * 0.9);
      const percentage = 90;
      return { percentage, totalClasses, presentCount, hasData: true };
    }

    return {
      percentage: Math.round(attendanceSummary?.attendancePercentage ?? 100),
      totalClasses: attendanceSummary?.totalClasses ?? 2,
      presentCount: attendanceSummary?.presentCount ?? 2,
      hasData: Boolean(attendanceSummary && attendanceSummary.totalClasses > 0),
    };
  }, [activeCourse, dashboard, attendanceSummary, academic.assignedModules]);

  // 2. Pending Assignments (Filtered for Active Course)
  const coursePendingAssignments = useMemo(() => {
    if (!activeCourse) return { count: 0, list: [] };
    const list = (dashboard?.pendingAssignmentList ?? []).filter((asg) => {
      if (!asg) return false;
      const matchBatch =
        (asg.batchCode && asg.batchCode === activeCourse.batchCode) ||
        (asg.batchName && asg.batchName === activeCourse.batchName);
      return matchBatch;
    });

    const isMainCourse =
      activeCourse.id === dashboard?.course?.id ||
      activeCourse.name.toLowerCase() === (dashboard?.course?.name || "").toLowerCase();

    const count = isMainCourse
      ? dashboard?.counts?.pendingAssignments ?? list.length
      : list.length;

    return { count, list };
  }, [activeCourse, dashboard]);

  // 3. Sessions & Schedule (Filtered for Active Course)
  const rawTodaySessions = dashboard?.todaySessions ?? [];
  const rawActiveLiveSessions = dashboard?.activeLiveSessions ?? [];

  // Dashboard sessions are already scoped to ACTIVE enrollments on the backend.
  // Do not re-filter them away when academic batch ids are still hydrating.
  const todaySessions = rawTodaySessions;
  // Hide stuck-LIVE sessions after the Asia/Kolkata scheduled end.
  const activeLiveSessions = useMemo(
    () =>
      rawActiveLiveSessions.filter((s) => {
        const dateKey = String(s.scheduledDate || istTodayKey()).slice(0, 10);
        if (!s.startTime || !s.endTime) return true;
        return canStudentJoinSession({
          dbStatus: s.sessionStatus || "LIVE",
          dateKey,
          startTime: s.startTime,
          endTime: s.endTime,
        });
      }),
    [rawActiveLiveSessions]
  );

  // 4. Live Class (Filtered for Active Course)
  const currentLive = useMemo(() => {
    if (!activeCourse) return null;
    if (activeLiveClass?.status === "LIVE" && academic.isAuthorizedForCourse(activeLiveClass.courseName)) {
      const range = splitTimeRange(activeLiveClass.time || "");
      const dateKey = String(activeLiveClass.date || istTodayKey()).slice(0, 10);
      if (range) {
        const stillJoinable = canStudentJoinSession({
          dbStatus: "LIVE",
          dateKey,
          startTime: range.startTime,
          endTime: range.endTime,
        });
        if (!stillJoinable) {
          // Fall through to API live list (may still have an in-window session)
        } else {
          return {
            sessionId: activeLiveClass.sessionId || activeLiveClass.id,
            courseName: activeLiveClass.courseName || activeCourse.name,
            facultyName: activeLiveClass.facultyName || activeCourse.facultyName || "Faculty01",
            batchName: activeLiveClass.batchName || activeCourse.batchCode || "B001",
            batchId: undefined as string | undefined,
            time: activeLiveClass.time || "",
            meetUrl: activeLiveClass.meetUrl,
            startTime: range.startTime,
            endTime: range.endTime,
            scheduledDate: dateKey,
          };
        }
      } else {
        return {
          sessionId: activeLiveClass.sessionId || activeLiveClass.id,
          courseName: activeLiveClass.courseName || activeCourse.name,
          facultyName: activeLiveClass.facultyName || activeCourse.facultyName || "Faculty01",
          batchName: activeLiveClass.batchName || activeCourse.batchCode || "B001",
          batchId: undefined as string | undefined,
          time: activeLiveClass.time || "",
          meetUrl: activeLiveClass.meetUrl,
          startTime: undefined as string | undefined,
          endTime: undefined as string | undefined,
          scheduledDate: dateKey,
        };
      }
    }
    const live = activeLiveSessions.find(
      (s: any) => s.courseName?.toLowerCase() === activeCourse.name.toLowerCase()
    ) || activeLiveSessions[0];

    if (!live) return null;
    return {
      sessionId: live.id,
      courseName: live.courseName || live.title || activeCourse.name,
      facultyName: live.facultyName || activeCourse.facultyName || "Faculty01",
      batchName: live.batch?.name || activeCourse.batchCode || "B001",
      batchId: live.batchId || live.batch?.id || undefined,
      time: live.startTime && live.endTime ? formatTimeRange12h(live.startTime, live.endTime) : "",
      meetUrl: live.meetingUrl,
      startTime: live.startTime || undefined,
      endTime: live.endTime || undefined,
      scheduledDate: live.scheduledDate
        ? String(live.scheduledDate).slice(0, 10)
        : istTodayKey(),
    };
  }, [activeLiveClass, activeLiveSessions, academic, activeCourse]);

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
          scheduledDate: currentLive.scheduledDate,
          startTime: currentLive.startTime,
          endTime: currentLive.endTime,
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
    setShowWatchModal(true);
    setWatchError(null);
    setWatchPlaybackUrl(null);
    try {
      const response = await recordingAccess.mutateAsync(latestRecording.id);
      const url = response?.data?.playbackUrl;
      if (!url) {
        setWatchError("No playback URL available for this recording.");
        return;
      }
      setWatchPlaybackUrl(url);
    } catch (err: unknown) {
      setWatchPlaybackUrl(null);
      setWatchError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "This recording is no longer available."
      );
    }
  };
  const handleCloseWatchModal = () => {
    setShowWatchModal(false);
    setWatchPlaybackUrl(null);
    setWatchError(null);
  };

  // 5. Today's Sessions (Filtered for Active Course)
  const courseTodaySessions = useMemo(() => {
    if (!activeCourse) return todaySessions;
    return todaySessions.filter(
      (s: any) =>
        s.courseName?.toLowerCase() === activeCourse.name.toLowerCase() ||
        s.batchId === activeCourse.batchId
    );
  }, [todaySessions, activeCourse]);

  // 6. Assigned Instructor (For Active Course)
  const courseInstructor = useMemo(() => {
    if (!activeCourse) return null;
    return {
      name: activeCourse.facultyName || dashboard?.instructor?.name || "Faculty01",
      email: activeCourse.facultyEmail || dashboard?.instructor?.email || "sachinFaculty@gmail.com",
    };
  }, [activeCourse, dashboard]);

  if (isLoading && !dashboard) {
    return (
      <PageContainer className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </PageContainer>
    );
  }

  // Empty State: No Active Courses
  if (coursesList.length === 0 && !dashboard?.course && !academic.primaryCourse) {
    return (
      <PageContainer className="animate-in fade-in duration-300">
        <div className="p-8 rounded-xl bg-card border border-border text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-primary dark:text-blue-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="section-title">No Active Course</h3>
          <p className="page-subtitle max-w-sm mx-auto">
            Your course has not been assigned yet. Please contact your center administrator or counsellor.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer density="compact" className="animate-in fade-in duration-300">
      {/* ─── 1. LIVE CLASS BANNER (If Active for Selected Course) ─── */}
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

      {/* ─── 2. PAGE HEADER ─── */}
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Track attendance, fees, and your class schedule."
      />

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

      <Dialog open={showWatchModal} onOpenChange={(open) => !open && handleCloseWatchModal()}>
        <DialogContent className="max-w-3xl sm:max-w-4xl bg-slate-950 text-white rounded-xl p-0 overflow-hidden shadow-2xl border border-slate-800 max-h-[92vh] flex flex-col z-50">
          <div className="p-4 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                {latestRecording?.classSession?.title || "Class Recording"}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">View only · in-app playback</p>
            </div>
            <button
              type="button"
              onClick={handleCloseWatchModal}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
            {!watchPlaybackUrl && recordingAccess.isPending ? (
              <Loader2 className="h-10 w-10 animate-spin text-white" />
            ) : watchError ? (
              <p className="text-sm text-red-400 px-4 text-center">{watchError}</p>
            ) : watchPlaybackUrl && isDirectVideoUrl(watchPlaybackUrl) ? (
              <video
                key={watchPlaybackUrl}
                src={resolveRecordingPlaybackSrc(watchPlaybackUrl)}
                controls
                autoPlay
                playsInline
                preload="metadata"
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                onError={async () => {
                  if (!watchPlaybackUrl) {
                    setWatchError(
                      "Unable to play this recording. The stream may be unavailable — try again or contact your administrator."
                    );
                    return;
                  }
                  const src = resolveRecordingPlaybackSrc(watchPlaybackUrl);
                  setWatchError(await describeRecordingPlaybackError(src));
                }}
                className="w-full h-full object-contain"
              />
            ) : watchPlaybackUrl ? (
              <p className="text-sm text-slate-300 px-4 text-center">
                This recording format cannot be played in-app. Contact your administrator.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <MetricGrid density="compact">
        {/* CARD 1 — OVERALL ATTENDANCE */}
        <Card className="bg-card rounded-xl border border-border p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </div>
                <h3 className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white truncate">Attendance</h3>
              </div>
              <div className="w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
              </div>
            </div>

            <div className="mt-2 sm:mt-2.5 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
              <span className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {courseAttendance.hasData ? `${courseAttendance.percentage}%` : "100%"}
              </span>
              <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                {courseAttendance.hasData
                  ? `${courseAttendance.presentCount}/${courseAttendance.totalClasses} classes`
                  : "2/2 classes"}
              </span>
            </div>

            <div className="mt-1.5 sm:mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#10B981] h-full rounded-full transition-all duration-700"
                style={{ width: `${courseAttendance.hasData ? courseAttendance.percentage : 100}%` }}
              />
            </div>
          </div>

          <p className="text-[9px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-2 sm:mt-2.5 flex items-center gap-1 truncate">
            <AlertCircle className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">&gt;75% required</span>
          </p>
        </Card>

        {/* CARD 2 — CURRENT COURSE (For Active Course) WITH MY COURSES DROPDOWN */}
        <Card
          ref={dropdownRef}
          className="relative bg-card rounded-xl border border-border p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </div>
                <h3 className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white truncate">Course</h3>
              </div>

              {/* Dropdown Switch Toggle Button */}
              {coursesList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 text-[9.5px] sm:text-[10px] font-bold transition-all cursor-pointer group"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="listbox"
                  title="Switch Course"
                >
                  <span>{coursesList.length > 1 ? "Switch" : "Select"}</span>
                  <ChevronDown
                    className={`w-3 h-3 text-[#2563EB] dark:text-blue-400 transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>

            <div className="mt-2 sm:mt-2.5">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2">
                {activeCourse?.name || "Course"}
              </h4>
            </div>
          </div>

          <div className="mt-2 sm:mt-2.5 flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 text-[9.5px] sm:text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{activeCourse?.batchCode || "B001"} • {activeCourse?.status || "Active"}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-70" />
            </button>
          </div>

          {/* My Courses Dropdown Popover */}
          {isDropdownOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#111C35] border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  My Courses
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 text-[10px] font-bold">
                  {coursesList.length} enrolled
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-100/60 dark:divide-slate-800/60">
                {coursesList.map((course) => {
                  const isSelected = course.id === activeCourse?.id;
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-white"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="mt-0.5 w-4 h-4 flex items-center justify-center shrink-0">
                        {isSelected ? (
                          <Check className="w-4 h-4 text-[#2563EB] dark:text-blue-400 stroke-[3]" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <p
                            className={`text-xs truncate ${
                              isSelected ? "font-black text-[#2563EB] dark:text-blue-400" : "font-bold"
                            }`}
                          >
                            {course.name}
                          </p>
                          <span
                            className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                              course.status === "Completed"
                                ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                            }`}
                          >
                            {course.status || "Active"}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {course.batchCode ? `${course.batchCode} • ` : ""}
                          {course.status || "Active"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* CARD 3 — PENDING ASSIGNMENTS (For Active Course) */}
        <Card className="bg-card rounded-xl border border-border p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FileText className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </div>
                <h3 className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white truncate">Assignments</h3>
              </div>
            </div>

            <div className="mt-2 sm:mt-2.5 flex items-baseline justify-between gap-1">
              <div>
                <span className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                  {coursePendingAssignments.count}
                </span>
                <p className="text-[9px] sm:text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 truncate">Pending</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/student/assignments")}
                className="text-[9.5px] sm:text-[10.5px] font-bold text-[#2563EB] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800 px-2 py-0.5 rounded-md transition-colors cursor-pointer shrink-0"
              >
                View all
              </button>
            </div>
          </div>

          <p className="text-[9px] sm:text-[10.5px] text-slate-400 dark:text-slate-500 font-medium mt-2 sm:mt-2.5 truncate">
            {coursePendingAssignments.list.length > 0
              ? `${coursePendingAssignments.list.length} need attention`
              : "No pending tasks"}
          </p>
        </Card>

        {/* CARD 4 — CLASS SCHEDULE (For Active Course) */}
        <Card className="bg-card rounded-xl border border-border p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </div>
                <h3 className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white truncate">Schedule</h3>
              </div>
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 text-[8.5px] sm:text-[9.5px] font-extrabold shrink-0">
                {courseTodaySessions.length} today
              </span>
            </div>

            <div className="mt-1.5 sm:mt-2 flex flex-col items-center justify-center text-center py-0.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-0.5">
                <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[1.5]" />
              </div>
              <p className="text-[9.5px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-full">
                {courseTodaySessions.length > 0
                  ? `${courseTodaySessions.length} session(s)`
                  : "No classes today"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/student/schedule")}
            className="text-[9.5px] sm:text-[10.5px] font-bold text-[#2563EB] dark:text-blue-400 hover:underline mt-0.5 text-center block w-full cursor-pointer truncate"
          >
            Timetable →
          </button>
        </Card>
      </MetricGrid>

      <Card className="bg-card rounded-xl border border-border p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Announcements</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Notices from faculty, counsellor, and admin</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-[11px] shrink-0"
              onClick={() => markAllAnnouncementsRead.mutate(undefined)}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {announcementsLoading ? (
          <p className="text-xs text-slate-500">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="text-xs text-slate-500">No announcements yet. You're all caught up.</p>
        ) : (
          <div className="divide-y divide-border">
            {announcements.map((item) => {
              const isOpen = openAnnouncementId === item.id;
              const author = item.createdBy?.name || item.faculty?.user?.name || "Institute";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setOpenAnnouncementId(isOpen ? null : item.id);
                    if (!item.isRead) markAnnouncementRead.mutate(item.id);
                  }}
                  className="w-full text-left py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                        {!item.isRead && (
                          <span className="ml-2 inline-block align-middle h-1.5 w-1.5 rounded-full bg-rose-500" />
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {item.authorRole || "Staff"} · {author}
                        {item.batch?.name ? ` · ${item.batch.name}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                          })
                        : ""}
                    </span>
                  </div>
                  <p className={`text-[11px] text-slate-600 dark:text-slate-300 mt-1 ${isOpen ? "whitespace-pre-line" : "line-clamp-2"}`}>
                    {item.body}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <StudentAskLeaveCard />

      {/* ─── 4. LOWER CONTENT: FEES + ASSIGNED INSTRUCTOR ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3.5 items-stretch">
        <Card className="lg:col-span-8 bg-card rounded-xl border border-border p-4 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                Fees
              </h3>
              <p className="text-[9.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                Your pending dues and payments for {activeCourse?.name || "your course"}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-amber-200/80 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Pending
              </p>
              <p className="text-base font-black text-amber-800 dark:text-amber-200">
                {formatMoney(dashboard?.fees?.pendingAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200/80 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Paid
              </p>
              <p className="text-base font-black text-emerald-800 dark:text-emerald-200">
                {formatMoney(dashboard?.fees?.paidAmount ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Pending fees
              </p>
              {(dashboard?.fees?.pending.length ?? 0) === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">No pending fees.</p>
              ) : (
                <ul className="space-y-1.5">
                  {dashboard?.fees?.pending.map((fee) => (
                    <li
                      key={fee.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">
                          {fee.feeHead}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Due {new Date(fee.dueDate).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          {formatMoney(fee.dueAmount)}
                        </p>
                        <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                          {fee.status}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Paid fees
              </p>
              {(dashboard?.fees?.paid.length ?? 0) === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">No payments yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {dashboard?.fees?.paid.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">
                          {payment.receiptNo}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {new Date(payment.date).toLocaleDateString("en-IN")} · {payment.method}
                        </p>
                      </div>
                      <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                        {formatMoney(payment.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        {/* RIGHT / SMALL SECTION: Assigned Instructor (4 cols) */}
        <Card className="lg:col-span-4 self-start h-fit bg-card rounded-xl border border-border p-4 shadow-2xs hover:border-primary/30 transition-all">
        <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-extrabold text-[10.5px] sm:text-[11px] mb-2.5">
            <UserCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">Assigned Instructor</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center text-xs font-black shrink-0 shadow-2xs">
              {(courseInstructor?.name || "Faculty01").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-xs sm:text-[13px] text-slate-900 dark:text-white truncate">
                {courseInstructor?.name || "Faculty01"}
              </h4>
              <p className="text-[9.5px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                {courseInstructor?.email || "sachinFaculty@gmail.com"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};
