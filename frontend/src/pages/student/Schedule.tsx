import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Building,
  CheckCircle2,
  CalendarDays,
  Star,
  Sparkles,
  Info,
  Check,
  Lock,
  Radio,
  Video,
  PlayCircle,
  Camera,
  Mic,
  Eye,
  AlertCircle,
  Sparkle,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth.store";
import { useFeedbackStore } from "@/store/feedback.store";
import type { ClassFeedbackItem } from "@/store/feedback.store";
import { classSessionsApi } from "@/services/class-sessions.api";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";
import { getSessionSubjectLabel } from "@/utils/batch.utils";

const toLocalDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseTimeParts = (time: string): { hour24: number; min: number; label: string } => {
  const ampm = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hour24 = parseInt(ampm[1], 10) % 12;
    if (ampm[3].toUpperCase() === "PM") hour24 += 12;
    const min = parseInt(ampm[2], 10);
    return { hour24, min, label: time };
  }
  const hhmm = time.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const hour24 = parseInt(hhmm[1], 10);
    const min = parseInt(hhmm[2], 10);
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return {
      hour24,
      min,
      label: `${hour12.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")} ${period}`,
    };
  }
  return { hour24: 0, min: 0, label: time };
};

const mapApiSessionToStudentSession = (raw: any): StudentClassSession => {
  const start = parseTimeParts(raw.startTime || "00:00");
  const end = parseTimeParts(raw.endTime || "00:00");
  const title = getSessionSubjectLabel({ title: raw.title, batch: raw.batch });
  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() || "")
    .join("");
  const modeRaw = (raw.mode || "OFFLINE").toUpperCase();
  const mode: StudentClassSession["mode"] =
    modeRaw === "ONLINE" ? "Online" : modeRaw === "HYBRID" ? "Hybrid" : "Campus";
  let forceStatus: StudentClassSession["forceStatus"];
  if (raw.sessionStatus === "LIVE" || raw.sessionStatus === "ONGOING") forceStatus = "LIVE NOW";
  else if (raw.sessionStatus === "COMPLETED") forceStatus = "COMPLETED";
  else forceStatus = "UPCOMING";

  const durationMins = Math.max(1, end.hour24 * 60 + end.min - (start.hour24 * 60 + start.min));

  return {
    id: raw.id,
    title,
    courseCode: raw.batch?.course?.code || raw.batch?.code || "CLASS",
    courseId: raw.batch?.courseId || raw.courseId || raw.batch?.course?.id,
    batchId: raw.batchId || raw.batch?.id,
    courseName: getSessionSubjectLabel({ title: raw.title, batch: raw.batch }) || raw.courseName || title,
    batchCode: raw.batch?.code,
    facultyName: raw.faculty?.user?.name || "Faculty",
    date: raw.scheduledDate
      ? toLocalDateString(new Date(raw.scheduledDate))
      : "",
    startTime: start.label,
    endTime: end.label,
    startHour24: start.hour24,
    startMin: start.min,
    endHour24: end.hour24,
    endMin: end.min,
    joinAvailableMinutesBefore: 15,
    duration: `${Math.floor(durationMins / 60)}h ${(durationMins % 60).toString().padStart(2, "0")}m`,
    roomNo: raw.roomNo || "TBD",
    block: "Campus",
    mode,
    forceStatus,
    avatarText: initials || "CL",
    avatarBg: "bg-blue-500/20 text-blue-500 border border-blue-500/30",
    avatarColor: "text-blue-500",
    meetingUrl: raw.meetingUrl,
  };
};

interface StudentClassSession {
  id: string;
  title: string;
  courseCode: string;
  courseId?: string;
  batchId?: string;
  courseName?: string;
  batchCode?: string;
  facultyName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "02:00 PM"
  endTime: string; // e.g. "04:00 PM"
  startHour24: number; // 14
  startMin: number; // 0
  endHour24: number; // 16
  endMin: number; // 0
  joinAvailableMinutesBefore: number; // e.g. 15 mins
  duration: string;
  roomNo: string;
  block: string;
  mode: "Campus" | "Online" | "Hybrid";
  forceStatus?: "UPCOMING" | "LIVE NOW" | "COMPLETED"; // Used for showcase demonstration
  avatarText: string;
  avatarBg: string;
  avatarColor: string;
  attendanceStatus?: "PRESENT" | "ABSENT" | "LATE";
  attendanceMarkedTime?: string;
  meetingUrl?: string;
  submittedRating?: number;
  submittedAtFormatted?: string;
}

interface DayData {
  dayName: string;
  dateNumber: string;
  monthName: string;
  fullDate: string; // YYYY-MM-DD
  isToday?: boolean;
  classCount: number;
}

const RATING_LABELS: Record<number, "Poor" | "Fair" | "Good" | "Very Good" | "Excellent"> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const buildWeekDays = (weekOffset = 0, sessions: StudentClassSession[] = []): DayData[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff + weekOffset * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const fullDate = toLocalDateString(d);
    const isToday = d.getTime() === today.getTime();
    const classCount = sessions.filter((s) => s.date === fullDate).length;
    return {
      dayName: DAY_NAMES[d.getDay()],
      dateNumber: String(d.getDate()).padStart(2, "0"),
      monthName: MONTH_NAMES[d.getMonth()],
      fullDate,
      isToday,
      classCount,
    };
  });
};

// Helper to format minutes from midnight to HH:MM AM/PM
const formatMinutesToTime = (totalMinutes: number): string => {
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = Math.floor(normalized % 60);
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(h12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
};

const formatDayHeader = (day: DayData): string => {
  const d = new Date(`${day.fullDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

export const StudentSchedule: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const academic = useStudentAcademicAccess();
  const { feedbacks, submitFeedback, getFeedbackForSession } = useFeedbackStore();

  const studentId = academic.studentId || user?.studentId || user?.id || "";
  const studentName = academic.studentName || user?.name || "Student";
  const [apiSessions, setApiSessions] = useState<StudentClassSession[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateString(new Date()));
  const [isLoading, setIsLoading] = useState(true);

  const effectiveSessions = apiSessions;

  const weekDays = useMemo(
    () => buildWeekDays(weekOffset, effectiveSessions),
    [weekOffset, effectiveSessions]
  );

  const selectedDay = useMemo(
    () => weekDays.find((d) => d.fullDate === selectedDate) ?? weekDays[0],
    [weekDays, selectedDate]
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      const days = buildWeekDays(weekOffset);
      const startDate = days[0]?.fullDate;
      const endDate = days[6]?.fullDate;
      try {
        const res = await classSessionsApi.getAll({ startDate, endDate, limit: 100 });
        const filtered = (res.data || []).filter((raw: any) => {
          return academic.isAuthorizedForSession({
            courseId: raw.batch?.courseId || raw.courseId,
            batchId: raw.batchId || raw.batch?.id,
            courseName: getSessionSubjectLabel({ title: raw.title, batch: raw.batch }) || raw.courseName,
            batch: raw.batch,
          });
        });
        const mapped = filtered.map(mapApiSessionToStudentSession);
        if (mounted) {
          setApiSessions(mapped);
        }
      } catch {
        if (mounted) setApiSessions([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [weekOffset, academic]);

  // Dynamic Live Time & Date Ticker (Updates every 1s)
  const [currentSystemTime, setCurrentSystemTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentSystemTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keep selected date in sync when navigating weeks
  useEffect(() => {
    const inWeek = weekDays.some((d) => d.fullDate === selectedDate);
    if (!inWeek && weekDays.length > 0) {
      const today = toLocalDateString(new Date());
      const todayInWeek = weekDays.find((d) => d.fullDate === today);
      setSelectedDate(todayInWeek?.fullDate ?? weekDays[0].fullDate);
    }
  }, [weekDays, selectedDate]);

  // Feedback Modal State (For the mandatory 3-question rating form)
  const [activeFeedbackModalSession, setActiveFeedbackModalSession] = useState<StudentClassSession | null>(null);
  const [teachingRating, setTeachingRating] = useState<number>(0);
  const [understandingRating, setUnderstandingRating] = useState<number>(0);
  const [overallExperienceRating, setOverallExperienceRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>("");

  // Hover states for rating stars
  const [hoverTeaching, setHoverTeaching] = useState<number | null>(null);
  const [hoverUnderstanding, setHoverUnderstanding] = useState<number | null>(null);
  const [hoverOverall, setHoverOverall] = useState<number | null>(null);

  // Success Notification
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [liveJoiningSession, setLiveJoiningSession] = useState<StudentClassSession | null>(null);
  const [viewingFeedbackSession, setViewingFeedbackSession] = useState<ClassFeedbackItem | null>(null);

  // Filter sessions for the active selected day — prefer live API data once loaded
  const daySessions = useMemo(() => {
    return effectiveSessions.filter((s) => s.date === selectedDay.fullDate);
  }, [selectedDay, effectiveSessions]);

  // Determine real-time lifecycle status of a session
  const getSessionLifecycle = (session: StudentClassSession) => {
    // 1. Check if feedback has already been submitted in the store
    const storedFeedback = getFeedbackForSession(session.id, studentId);
    if (storedFeedback) {
      return {
        stage: "FEEDBACK_SUBMITTED" as const,
        statusText: "COMPLETED",
        subText: "Feedback Submitted • Thank you for your feedback.",
        badgeColor: "emerald",
        feedback: storedFeedback,
        submittedAt: storedFeedback.submittedAt,
      };
    }

    // 2. Past/future days — derive stage from date and API status
    const todayStr = toLocalDateString(new Date());
    if (session.date !== todayStr) {
      if (session.date < todayStr || session.forceStatus === "COMPLETED") {
        if (session.submittedRating) {
          return {
            stage: "FEEDBACK_SUBMITTED" as const,
            statusText: "COMPLETED",
            subText: "Feedback Submitted • Thank you for helping us improve.",
            badgeColor: "emerald",
            submittedAt: session.submittedAtFormatted,
            rating: session.submittedRating,
          };
        }
        return {
          stage: "FEEDBACK_REQUIRED" as const,
          statusText: "CLASS COMPLETED",
          subText: "Class time has ended.",
          badgeColor: "purple",
        };
      }
      const startMinutes = session.startHour24 * 60 + session.startMin;
      const joinMinutes = startMinutes - (session.joinAvailableMinutesBefore || 15);
      const joinTimeStr = formatMinutesToTime(joinMinutes);
      return {
        stage: "UPCOMING" as const,
        statusText: "UPCOMING",
        subText: `Starts at ${session.startTime}`,
        joinTimeStr,
        minutesLeft: session.joinAvailableMinutesBefore || 15,
        badgeColor: "amber",
      };
    }

    // 3. Today — prefer API LIVE status, otherwise use real-time clock
    if (session.forceStatus === "LIVE NOW") {
      return {
        stage: "LIVE_NOW" as const,
        statusText: "LIVE NOW",
        subText: "Your class is currently live.",
        badgeColor: "emerald",
      };
    }

    // 4. Dynamic Real-Time Clock Calculation
    const now = currentSystemTime;
    const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const startMinutes = session.startHour24 * 60 + session.startMin;
    const endMinutes = session.endHour24 * 60 + session.endMin;
    const joinWindow = session.joinAvailableMinutesBefore || 15;
    const allowedJoinMinutes = startMinutes - joinWindow;
    const joinTimeStr = formatMinutesToTime(allowedJoinMinutes);

    if (nowMinutes < allowedJoinMinutes) {
      const minsLeft = Math.max(1, Math.ceil(allowedJoinMinutes - nowMinutes));
      return {
        stage: "UPCOMING" as const,
        statusText: "UPCOMING",
        subText: `Starts at ${session.startTime}`,
        joinTimeStr,
        minutesLeft: minsLeft,
        badgeColor: "amber",
      };
    } else if (nowMinutes >= allowedJoinMinutes && nowMinutes < endMinutes) {
      return {
        stage: "LIVE_NOW" as const,
        statusText: "LIVE NOW",
        subText: "Your class is currently live.",
        badgeColor: "emerald",
      };
    } else {
      // nowMinutes >= endMinutes -> Class is COMPLETED. Join is immediately disabled/hidden. Feedback is shown!
      return {
        stage: "FEEDBACK_REQUIRED" as const,
        statusText: "CLASS COMPLETED",
        subText: "Class time has ended.",
        badgeColor: "purple",
      };
    }
  };

  // Open Feedback Modal for a specific completed session
  const handleOpenFeedbackModal = (session: StudentClassSession) => {
    setActiveFeedbackModalSession(session);
    setTeachingRating(5);
    setUnderstandingRating(5);
    setOverallExperienceRating(5);
    setFeedbackComment("");
    setHoverTeaching(null);
    setHoverUnderstanding(null);
    setHoverOverall(null);
  };

  // Submit Feedback Handler
  const handleSubmitFeedback = () => {
    if (!activeFeedbackModalSession) return;
    if (teachingRating === 0 || understandingRating === 0 || overallExperienceRating === 0) return;

    const avgRating =
      Math.round(((teachingRating + understandingRating + overallExperienceRating) / 3) * 10) / 10;
    const ratingLabel = RATING_LABELS[Math.round(avgRating)] || "Excellent";

    submitFeedback({
      sessionId: activeFeedbackModalSession.id,
      courseName: activeFeedbackModalSession.title,
      batchCode: activeFeedbackModalSession.courseCode,
      facultyName: activeFeedbackModalSession.facultyName,
      classDate: activeFeedbackModalSession.date,
      classTime: `${activeFeedbackModalSession.startTime} – ${activeFeedbackModalSession.endTime}`,
      studentId,
      studentName,
      rating: avgRating,
      ratingLabel,
      teachingRating,
      understandingRating,
      overallExperienceRating,
      teachingQuality: "Excellent",
      comments: feedbackComment.trim() || "Great class session and clear explanations.",
    });

    setSuccessToast(`Feedback submitted for ${activeFeedbackModalSession.title}! Thank you for your feedback.`);
    setActiveFeedbackModalSession(null);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1440px] mx-auto animate-in fade-in duration-300 font-sans">
      {/* ─── 1. TOP HEADER CARD: MY CLASS SCHEDULE ─────────────────────────── */}
      <div className="bg-white dark:bg-[#111C35] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1D4ED8] dark:bg-blue-500/10 dark:text-sky-400 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                My Class Schedule
              </h1>
              <Badge className="bg-blue-50 text-[#1D4ED8] border-blue-200 dark:bg-blue-950/60 dark:text-sky-400 dark:border-sky-800/50 text-[10px] font-bold rounded-md gap-1 px-1.5 py-0.2">
                <Lock className="w-2.5 h-2.5" />
                <span>Assigned Access</span>
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Only classes assigned to you by your Counsellor are shown here.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center flex-wrap">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
        <div className="flex items-center gap-2.5 self-end md:self-center flex-wrap">
          <button
            type="button"
            onClick={() => setUseMockPreview((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
              useMockPreview
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-600 shadow-amber-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            {useMockPreview ? "★ Sample Mock Active (Toggle)" : "☆ Real Backend Data (Toggle)"}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
            <CalendarDays className="h-4 w-4 text-[#1D4ED8] dark:text-sky-400" />
            <div>
              <span className="block text-[11px] font-black text-slate-900 dark:text-white leading-tight">
                Academic Week
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                {currentSystemTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:opacity-75 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ─── 2. DYNAMIC WEEKLY DATE SELECTOR ──────────────────────────────── */}
      <div className="flex items-center gap-2 justify-between">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="Previous Week"
          className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111C35] hover:bg-slate-50 dark:hover:bg-[#162547] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 shadow-2xs cursor-pointer transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          {weekDays.map((day) => {
            const isSelected = selectedDay.fullDate === day.fullDate;
            return (
              <button
                key={day.fullDate}
                type="button"
                onClick={() => setSelectedDate(day.fullDate)}
                className={`flex-1 min-w-[62px] sm:min-w-[76px] py-2 sm:py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-between text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-br from-[#4F46E5] to-[#6366F1] text-white shadow-md shadow-indigo-500/20 scale-[1.01] border border-indigo-400/30"
                    : "bg-white dark:bg-[#111C35] border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-[#152342] shadow-2xs"
                }`}
              >
                <span className={`text-[9.5px] font-bold tracking-wider uppercase ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                  {day.dayName}
                </span>

                <span className={`text-sm sm:text-base font-black my-0.5 ${isSelected ? "text-white" : "text-slate-800 dark:text-slate-200"}`}>
                  {day.dateNumber} <span className="text-[10px] uppercase font-bold">{day.monthName}</span>
                </span>

                {day.isToday ? (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                      isSelected
                        ? "bg-black/25 text-white"
                        : "bg-blue-100 text-[#1D4ED8] dark:bg-blue-950/60 dark:text-sky-400"
                    }`}
                  >
                    TODAY
                  </span>
                ) : (
                  <span className="h-1 w-1 rounded-full my-0.5 bg-slate-300 dark:bg-slate-700" />
                )}

                <span className={`text-[9px] font-bold ${isSelected ? "text-indigo-100" : "text-slate-400 dark:text-slate-500"}`}>
                  {day.classCount === 0 ? "No Class" : `${day.classCount} ${day.classCount === 1 ? "Class" : "Classes"}`}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setWeekOffset((w) => w + 1)}
          aria-label="Next Week"
          className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111C35] hover:bg-slate-50 dark:hover:bg-[#162547] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 shadow-2xs cursor-pointer transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ─── 3. ACTIVE DAY HEADER & LOCAL TIME SUBTITLE ───────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {formatDayHeader(selectedDay)}
            </h2>
            <Badge className="bg-blue-50 text-[#1D4ED8] border-blue-200 dark:bg-blue-950/60 dark:text-sky-400 dark:border-sky-800/50 text-[11px] font-bold rounded-lg px-2 py-0.5">
              {daySessions.length} {daySessions.length === 1 ? "Class" : "Classes"} Scheduled
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Times synchronized with scheduled faculty sessions</span>
          </div>
        </div>

        {/* ─── 4. CLASS CARDS WITH AUTOMATIC LIFECYCLE ────────────────────────── */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-10 text-center bg-white dark:bg-[#111C35] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl text-slate-400 text-xs">
              Loading your schedule...
            </div>
          ) : daySessions.length === 0 ? (
            <div className="bg-white dark:bg-[#0E172A] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8 sm:p-10 text-center space-y-2.5 shadow-xs">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-1">
                <CalendarIcon className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                No classes scheduled for this day.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                You're all set! Enjoy your day and keep learning.
              </p>
            </div>
          ) : (
            daySessions.map((session) => {
              const lifecycle = getSessionLifecycle(session);

              // Left vertical border accent
              const borderLeftClass =
                lifecycle.stage === "UPCOMING"
                  ? "border-l-[3px] border-l-amber-500"
                  : lifecycle.stage === "LIVE_NOW"
                    ? "border-l-[3px] border-l-emerald-500"
                    : lifecycle.stage === "FEEDBACK_REQUIRED"
                      ? "border-l-[3px] border-l-purple-500"
                      : "border-l-[3px] border-l-emerald-500";

              return (
                <div
                  key={session.id}
                  className={`bg-white dark:bg-[#111C35] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700 ${borderLeftClass}`}
                >
                  <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                    {/* Left Side: Timeline status + Avatar + Course Meta */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 min-w-0">
                      {/* Timeline Status Badge */}
                      <div className="flex sm:flex-col items-center sm:items-start gap-1.5 sm:gap-0.5 shrink-0 min-w-[110px]">
                        <div className="flex items-center gap-1.5">
                          {lifecycle.stage === "UPCOMING" && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          )}
                          {lifecycle.stage === "LIVE_NOW" && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          )}
                          {lifecycle.stage === "FEEDBACK_REQUIRED" && (
                            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                          )}
                          {lifecycle.stage === "FEEDBACK_SUBMITTED" && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            {lifecycle.statusText}
                          </span>
                        </div>
                        <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">
                          {lifecycle.subText}
                        </span>
                      </div>

                      <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-slate-800 shrink-0" />

                      {/* Course Avatar Badge */}
                      <div
                        className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl ${session.avatarBg} font-black text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                      >
                        {session.avatarText}
                      </div>

                      {/* Course Details */}
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {session.title}
                          </h3>
                          <span className="px-1.5 py-0.2 rounded bg-blue-50 text-[#1D4ED8] border border-blue-200 dark:bg-blue-950/60 dark:text-sky-400 dark:border-sky-800/50 text-[9px] font-black uppercase">
                            {session.courseCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <User className="h-3 w-3 text-slate-400" />
                            <span>{session.facultyName}</span>
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {session.roomNo}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="flex items-center gap-1">
                            {session.mode}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="flex items-center gap-1 font-mono font-semibold text-slate-700 dark:text-slate-300">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {session.startTime} – {session.endTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Exact Lifecycle Workflow Action States */}
                    <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
                      {/* ── 1. UPCOMING CLASS ──────────────────────────────── */}
                      {lifecycle.stage === "UPCOMING" && (
                        <div className="flex items-center gap-2.5">
                          <div className="text-right hidden sm:block">
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                              Starts at {session.startTime}
                            </span>
                            <span className="block text-[9.5px] text-amber-600 dark:text-amber-400 font-semibold">
                              Join in {lifecycle.minutesLeft} mins
                            </span>
                          </div>

                          <Button
                            disabled
                            variant="outline"
                            className="h-8 px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#111C35] rounded-xl cursor-not-allowed opacity-75 flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </Button>
                        </div>
                      )}

                      {/* ── 2. LIVE NOW CLASS ──────────────────────────────── */}
                      {lifecycle.stage === "LIVE_NOW" && (
                        <div className="flex items-center gap-3 flex-wrap">
                          {session.attendanceStatus === "PRESENT" && (
                            <div className="text-right hidden sm:block border-r border-slate-200 dark:border-slate-800 pr-3">
                              <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>PRESENT</span>
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={() => {
                              if (!academic.isAuthorizedForSession(session)) {
                                alert("Access denied. This class is not assigned to you.");
                                return;
                              }
                              setLiveJoiningSession(session);
                            }}
                            className="h-8 px-4 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102"
                          >
                            <Video className="w-3.5 h-3.5 text-white" />
                            <span>Join Class</span>
                          </Button>
                        </div>
                      )}

                      {/* ── 3. CLASS COMPLETED & MANDATORY FEEDBACK REQUIRED ─── */}
                      {lifecycle.stage === "FEEDBACK_REQUIRED" && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => navigate("/student/recordings")}
                            className="h-8 px-2.5 text-xs font-bold text-[#1769AA] border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl"
                          >
                            <Video className="w-3 h-3 mr-1" />
                            <span>Recording</span>
                          </Button>
                          <Button
                            onClick={() => handleOpenFeedbackModal(session)}
                            className="h-8 px-3 text-xs font-bold text-white bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] rounded-xl shadow-xs flex items-center gap-1 cursor-pointer transition-all hover:scale-102"
                          >
                            <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                            <span>Feedback</span>
                          </Button>
                        </div>
                      )}

                      {/* ── 4. CLASS COMPLETED & FEEDBACK SUBMITTED ─────────── */}
                      {lifecycle.stage === "FEEDBACK_SUBMITTED" && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button
                            variant="outline"
                            onClick={() => navigate("/student/recordings")}
                            className="h-8 px-2.5 text-xs font-bold text-[#1769AA] border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl"
                          >
                            <Video className="w-3 h-3 mr-1" />
                            <span>Recording</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => navigate("/student/study-materials")}
                            className="h-8 px-2.5 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl"
                          >
                            <BookOpen className="w-3 h-3 mr-1" />
                            <span>Materials</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              setViewingFeedbackSession(
                                lifecycle.feedback || {
                                  id: session.id,
                                  sessionId: session.id,
                                  courseName: session.title,
                                  batchCode: session.courseCode,
                                  facultyName: session.facultyName,
                                  classDate: session.date,
                                  classTime: `${session.startTime} – ${session.endTime}`,
                                  studentId,
                                  studentName,
                                  rating: session.submittedRating || 4.8,
                                  ratingLabel: "Excellent",
                                  teachingRating: 5,
                                  understandingRating: 5,
                                  overallExperienceRating: 5,
                                  comments:
                                    "Great live coding session on React Hooks, useEffect dependency arrays, and state optimization.",
                                  submittedAt: session.submittedAtFormatted || "27 Aug 2026, 09:10 PM",
                                }
                              )
                            }
                            className="h-8 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#0D1527] hover:bg-slate-50 dark:hover:bg-[#152342] border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            <span>Feedback</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── 5. BOTTOM HORIZONTAL CLASS WORKFLOW VISUAL ───────────────────── */}
      <div className="bg-white dark:bg-[#111C35] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-50 text-[#5B50EC] dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
            Class Session Lifecycle
          </h3>
        </div>

        {/* 4 Core Lifecycle Stages Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-center">
          {/* Stage 1: Upcoming */}
          <div className="p-3 bg-slate-50 dark:bg-[#0D1527] rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1 h-full">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-slate-400">STAGE 01</span>
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white mt-0.5">1. UPCOMING</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Time &lt; Start. Join locked until allowed window.
            </span>
          </div>

          {/* Stage 2: Live Now */}
          <div className="p-3 bg-slate-50 dark:bg-[#0D1527] rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1 h-full">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
                <Video className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-slate-400">STAGE 02</span>
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white mt-0.5">2. LIVE NOW</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Class is in session. Join Class opens Google Meet.
            </span>
          </div>

          {/* Stage 3: Class Completed */}
          <div className="p-3 bg-slate-50 dark:bg-[#0D1527] rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1 h-full">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-slate-400">STAGE 03</span>
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white mt-0.5">3. COMPLETED</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Class ends. Feedback &amp; recording buttons activate.
            </span>
          </div>

          {/* Stage 4: Feedback Submitted */}
          <div className="p-3 bg-slate-50 dark:bg-[#0D1527] rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1 h-full">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span className="text-[10px] font-black text-slate-400">STAGE 04</span>
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white mt-0.5">4. FEEDBACK LOGGED</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Feedback saved. Access recording &amp; study notes.
            </span>
          </div>
        </div>
      </div>

      {/* ─── 6. MANDATORY 3-QUESTION FEEDBACK MODAL ───────────────────────── */}
      <Dialog
        open={!!activeFeedbackModalSession}
        onOpenChange={(open) => !open && setActiveFeedbackModalSession(null)}
      >
        <DialogContent className="max-w-xl rounded-3xl p-6 bg-white dark:bg-[#111C35] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
          {activeFeedbackModalSession && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Star className="h-5 w-5 fill-amber-300 text-amber-300" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                      Class Feedback
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                      Feedback is required after every completed class.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Class Metadata Overview */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#0D1527] rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Class:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{activeFeedbackModalSession.title}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Faculty:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{activeFeedbackModalSession.facultyName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Class Date:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{activeFeedbackModalSession.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Class Time:</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {activeFeedbackModalSession.startTime} – {activeFeedbackModalSession.endTime}
                  </span>
                </div>
              </div>

              {/* 3 Mandatory Rating Questions */}
              <div className="space-y-4 pt-1 text-xs">
                {/* Question 1: Faculty Teaching */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="font-bold text-slate-900 dark:text-white block">
                    1. How would you rate the faculty's teaching?
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((st) => {
                      const effective = hoverTeaching !== null ? hoverTeaching : teachingRating;
                      const isFilled = st <= effective;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setTeachingRating(st)}
                          onMouseEnter={() => setHoverTeaching(st)}
                          onMouseLeave={() => setHoverTeaching(null)}
                          className="p-1 hover:scale-120 transition-transform cursor-pointer focus:outline-none"
                          aria-label={`Rate teaching ${st} stars`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${isFilled
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300 dark:text-slate-700 hover:text-amber-300"
                              }`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 font-bold text-xs text-amber-600 dark:text-amber-400">
                      {teachingRating > 0 ? RATING_LABELS[teachingRating] : "Select Rating"}
                    </span>
                  </div>
                </div>

                {/* Question 2: Understanding */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="font-bold text-slate-900 dark:text-white block">
                    2. How well did you understand the class?
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((st) => {
                      const effective = hoverUnderstanding !== null ? hoverUnderstanding : understandingRating;
                      const isFilled = st <= effective;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setUnderstandingRating(st)}
                          onMouseEnter={() => setHoverUnderstanding(st)}
                          onMouseLeave={() => setHoverUnderstanding(null)}
                          className="p-1 hover:scale-120 transition-transform cursor-pointer focus:outline-none"
                          aria-label={`Rate understanding ${st} stars`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${isFilled
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300 dark:text-slate-700 hover:text-amber-300"
                              }`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 font-bold text-xs text-amber-600 dark:text-amber-400">
                      {understandingRating > 0 ? RATING_LABELS[understandingRating] : "Select Rating"}
                    </span>
                  </div>
                </div>

                {/* Question 3: Overall Experience */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="font-bold text-slate-900 dark:text-white block">
                    3. How would you rate the overall class experience?
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((st) => {
                      const effective = hoverOverall !== null ? hoverOverall : overallExperienceRating;
                      const isFilled = st <= effective;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setOverallExperienceRating(st)}
                          onMouseEnter={() => setHoverOverall(st)}
                          onMouseLeave={() => setHoverOverall(null)}
                          className="p-1 hover:scale-120 transition-transform cursor-pointer focus:outline-none"
                          aria-label={`Rate overall experience ${st} stars`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${isFilled
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300 dark:text-slate-700 hover:text-amber-300"
                              }`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 font-bold text-xs text-amber-600 dark:text-amber-400">
                      {overallExperienceRating > 0 ? RATING_LABELS[overallExperienceRating] : "Select Rating"}
                    </span>
                  </div>
                </div>

                {/* Additional Comments */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Additional Comments:
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Write your feedback here..."
                    className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1325] text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B1325] focus:border-[#5B50EC] outline-none resize-none transition-all"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveFeedbackModalSession(null)}
                  className="h-10 text-xs font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={teachingRating === 0 || understandingRating === 0 || overallExperienceRating === 0}
                  onClick={handleSubmitFeedback}
                  className="h-10 flex-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Feedback
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── 7. JOIN LIVE CLASS DIALOG ────────────────────────────────────── */}
      <Dialog open={!!liveJoiningSession} onOpenChange={(open) => !open && setLiveJoiningSession(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-[#111C35] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          {liveJoiningSession && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
                      Join {liveJoiningSession.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                      Live interactive session with {liveJoiningSession.facultyName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B1325] border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3">
                  <div className="h-20 w-20 rounded-full bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <Camera className="h-8 w-8 text-[#5B50EC] dark:text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/50">
                      <Mic className="w-3 h-3" /> Mic Ready
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/50">
                      <Camera className="w-3 h-3" /> Camera Ready
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#0D1527] p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Faculty Host:</span>
                    <span className="text-slate-900 dark:text-white font-bold">{liveJoiningSession.facultyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Batch Slot:</span>
                    <span className="text-slate-900 dark:text-white font-bold">{liveJoiningSession.startTime} – {liveJoiningSession.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classroom:</span>
                    <span className="text-slate-900 dark:text-white font-bold">{liveJoiningSession.roomNo}, {liveJoiningSession.block}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLiveJoiningSession(null)}
                  className="text-xs font-bold rounded-xl h-10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    academic.verifyAndJoinMeeting(
                      {
                        courseId: liveJoiningSession.courseId,
                        batchId: liveJoiningSession.batchId,
                        courseName: liveJoiningSession.courseName,
                        meetingUrl: liveJoiningSession.meetingUrl,
                        status: liveJoiningSession.forceStatus || "LIVE",
                      },
                      (errMsg) => alert(errMsg)
                    );
                    setLiveJoiningSession(null);
                  }}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl h-10 flex-1 gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Video className="w-4 h-4 text-white" />
                  <span>Launch Google Meet</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── 8. VIEW SUBMITTED FEEDBACK DIALOG ─────────────────────────────── */}
      <Dialog
        open={!!viewingFeedbackSession}
        onOpenChange={(open) => !open && setViewingFeedbackSession(null)}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-[#111C35] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          {viewingFeedbackSession && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
                    <Check className="h-5 w-5 stroke-[3]" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
                      Submitted Feedback
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                      {viewingFeedbackSession.courseName} • {viewingFeedbackSession.facultyName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-[#0D1527] rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Overall Rating:</span>
                    <span className="font-black text-amber-500 flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      {viewingFeedbackSession.rating} / 5.0
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Faculty Teaching:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {viewingFeedbackSession.teachingRating ? `${viewingFeedbackSession.teachingRating} / 5 Stars` : "5 / 5 Stars"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Understanding:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {viewingFeedbackSession.understandingRating ? `${viewingFeedbackSession.understandingRating} / 5 Stars` : "5 / 5 Stars"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Submitted On:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {viewingFeedbackSession.submittedAt}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 dark:bg-[#0B1325] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="font-bold text-slate-600 dark:text-slate-400 block text-[11px]">
                    Student Comments:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 italic">
                    "{viewingFeedbackSession.comments || "Great live class and clear faculty explanations."}"
                  </p>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setViewingFeedbackSession(null)}
                  className="w-full bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl h-10"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
