import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  CheckCircle2,
  CalendarDays,
  Star,
  Sparkles,
  Info,
  Check,
  Send,
  Lock,
  MessageSquare,
  Shield,
  HelpCircle,
  X,
  BookOpen,
  Video,
  Radio,
  ExternalLink,
  ChevronDown,
  Eye,
  Camera,
  Mic,
  Volume2,
  PlayCircle,
  ArrowRight,
  Sparkle,
  MoreVertical,
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

interface StudentClassSession {
  id: string;
  title: string;
  courseCode: string;
  facultyName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "02:00 PM"
  endTime: string; // e.g. "04:00 PM"
  startHour24: number; // 14
  startMin: number; // 0
  endHour24: number; // 16
  endMin: number; // 0
  joinAvailableMinutesBefore: number; // 5 mins
  duration: string;
  roomNo: string;
  block: string;
  mode: "Campus" | "Online" | "Hybrid";
  forceStatus?: "UPCOMING" | "LIVE NOW" | "COMPLETED"; // Used for showcase alignment
  avatarText: string;
  avatarBg: string;
  avatarColor: string;
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

// 7-Day Week Template matching the mockup (May 26 – Jun 01, 2025)
const DEFAULT_WEEK_DAYS: DayData[] = [
  { dayName: "MON", dateNumber: "26", monthName: "MAY", fullDate: "2025-05-26", classCount: 1 },
  { dayName: "TUE", dateNumber: "27", monthName: "MAY", fullDate: "2025-05-27", isToday: true, classCount: 3 },
  { dayName: "WED", dateNumber: "28", monthName: "MAY", fullDate: "2025-05-28", classCount: 2 },
  { dayName: "THU", dateNumber: "29", monthName: "MAY", fullDate: "2025-05-29", classCount: 2 },
  { dayName: "FRI", dateNumber: "30", monthName: "MAY", fullDate: "2025-05-30", classCount: 1 },
  { dayName: "SAT", dateNumber: "31", monthName: "MAY", fullDate: "2025-05-31", classCount: 0 },
  { dayName: "SUN", dateNumber: "01", monthName: "JUN", fullDate: "2025-06-01", classCount: 0 },
];

const SCHEDULE_SESSIONS: StudentClassSession[] = [
  // ── Card 1: UPCOMING (JavaScript Essentials JS-101) ──────────────────────
  {
    id: "sc-js-101",
    title: "JavaScript Essentials",
    courseCode: "JS-101",
    facultyName: "Ramesh Kumar",
    date: "2025-05-27",
    startTime: "02:00 PM",
    endTime: "04:00 PM",
    startHour24: 14,
    startMin: 0,
    endHour24: 16,
    endMin: 0,
    joinAvailableMinutesBefore: 5,
    duration: "2h 00m",
    roomNo: "Lab 1",
    block: "Main Block",
    mode: "Campus",
    forceStatus: "UPCOMING",
    avatarText: "JS",
    avatarBg: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    avatarColor: "text-amber-400",
    meetingUrl: "https://meet.google.com/aadya-js-101",
  },

  // ── Card 2: LIVE NOW (Python Programming PY-102) ─────────────────────────
  {
    id: "sc-py-102",
    title: "Python Programming",
    courseCode: "PY-102",
    facultyName: "Neha Sharma",
    date: "2025-05-27",
    startTime: "10:00 AM",
    endTime: "12:00 PM",
    startHour24: 10,
    startMin: 0,
    endHour24: 12,
    endMin: 0,
    joinAvailableMinutesBefore: 5,
    duration: "2h 00m",
    roomNo: "Lab 2",
    block: "Main Block",
    mode: "Campus",
    forceStatus: "LIVE NOW",
    avatarText: "PY",
    avatarBg: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    avatarColor: "text-emerald-400",
    meetingUrl: "https://meet.google.com/aadya-py-102",
  },

  // ── Card 3: COMPLETED – Feedback Required (Database Fundamentals DB-103) ──
  {
    id: "sc-db-103",
    title: "Database Fundamentals",
    courseCode: "DB-103",
    facultyName: "Arjun Mehta",
    date: "2025-05-27",
    startTime: "04:30 PM",
    endTime: "06:30 PM",
    startHour24: 16,
    startMin: 30,
    endHour24: 18,
    endMin: 30,
    joinAvailableMinutesBefore: 5,
    duration: "2h 00m",
    roomNo: "Lab 3",
    block: "Main Block",
    mode: "Campus",
    forceStatus: "COMPLETED",
    avatarText: "DB",
    avatarBg: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    avatarColor: "text-purple-400",
  },

  // ── Card 4: COMPLETED – Feedback Submitted (React Development Basics RE-104) ──
  {
    id: "sc-re-104",
    title: "React Development Basics",
    courseCode: "RE-104",
    facultyName: "Adithya HM",
    date: "2025-05-27",
    startTime: "07:00 PM",
    endTime: "09:00 PM",
    startHour24: 19,
    startMin: 0,
    endHour24: 21,
    endMin: 0,
    joinAvailableMinutesBefore: 5,
    duration: "2h 00m",
    roomNo: "Lab 2",
    block: "Main Block",
    mode: "Campus",
    forceStatus: "COMPLETED",
    avatarText: "RE",
    avatarBg: "bg-teal-500/20 text-teal-400 border border-teal-500/30",
    avatarColor: "text-teal-400",
    submittedRating: 4.5,
    submittedAtFormatted: "Submitted on 27 May 2025, 09:10 PM",
  },

  // ── Other days for interactive browsing ─────────────────────────────────
  {
    id: "sc-mon-1",
    title: "Introduction to Computer Science",
    courseCode: "CS-101",
    facultyName: "HM Adithya",
    date: "2025-05-26",
    startTime: "10:00 AM",
    endTime: "12:00 PM",
    startHour24: 10,
    startMin: 0,
    endHour24: 12,
    endMin: 0,
    joinAvailableMinutesBefore: 5,
    duration: "2h 00m",
    roomNo: "Room 101",
    block: "Main Block",
    mode: "Campus",
    avatarText: "CS",
    avatarBg: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
    avatarColor: "text-cyan-400",
  },
  {
    id: "sc-wed-1",
    title: "Node.js Backend Architecture",
    courseCode: "BE-201",
    facultyName: "Ramesh Kumar",
    date: "2025-05-28",
    startTime: "09:00 AM",
    endTime: "11:00 AM",
    startHour24: 9,
    startMin: 0,
    endHour24: 11,
    endMin: 0,
    joinAvailableMinutesBefore: 5,
    duration: "2h 00m",
    roomNo: "Lab 1",
    block: "Main Block",
    mode: "Campus",
    avatarText: "BE",
    avatarBg: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
    avatarColor: "text-indigo-400",
  },
  {
    id: "sc-wed-2",
    title: "Data Structures & Algorithms",
    courseCode: "DS-202",
    facultyName: "Neha Sharma",
    date: "2025-05-28",
    startTime: "02:00 PM",
    endTime: "04:00 PM",
    startHour24: 14,
    startMin: 0,
    endHour24: 16,
    endMin: 0,
    joinAvailableMinutesBefore: 5,
    duration: "2h 00m",
    roomNo: "Lab 3",
    block: "Tech Block",
    mode: "Campus",
    avatarText: "DS",
    avatarBg: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    avatarColor: "text-rose-400",
  },
];

export const StudentSchedule: React.FC = () => {
  const { user } = useAuthStore();
  const { feedbacks, submitFeedback, getFeedbackForSession } = useFeedbackStore();

  const studentId = user?.id || "std-current";
  const studentName = user?.name || "Rahul Verma";

  // Dynamic Live Time & Date Ticker
  const [currentSystemTime, setCurrentSystemTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentSystemTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Selected Day in Week Selector (defaults to Tuesday, 27 May)
  const [selectedDay, setSelectedDay] = useState<DayData>(DEFAULT_WEEK_DAYS[1]);

  // Expanded feedback session ID
  const [expandedFeedbackSessionId, setExpandedFeedbackSessionId] = useState<string | null>(null);

  // Multi-field Feedback State
  const [classExpRatings, setClassExpRatings] = useState<Record<string, number>>({});
  const [facultyRatings, setFacultyRatings] = useState<Record<string, number>>({});
  const [feedbackComments, setFeedbackComments] = useState<Record<string, string>>({});

  // Hover states for stars
  const [hoveredClassExp, setHoveredClassExp] = useState<Record<string, number | null>>({});
  const [hoveredFacultyExp, setHoveredFacultyExp] = useState<Record<string, number | null>>({});

  // Modals
  const [liveJoiningSession, setLiveJoiningSession] = useState<StudentClassSession | null>(null);
  const [viewingFeedbackSession, setViewingFeedbackSession] = useState<ClassFeedbackItem | null>(null);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState<boolean>(false);

  // Filter sessions for the active selected day
  const daySessions = useMemo(() => {
    return SCHEDULE_SESSIONS.filter((s) => s.date === selectedDay.fullDate);
  }, [selectedDay]);

  // Determine real-time lifecycle status of a session
  const getSessionLifecycle = (session: StudentClassSession) => {
    const feedback = getFeedbackForSession(session.id, studentId);
    if (feedback) {
      return {
        stage: "FEEDBACK_SUBMITTED" as const,
        statusText: "COMPLETED",
        subText: "Feedback Submitted",
        badgeColor: "emerald",
        feedback,
      };
    }

    if (session.forceStatus) {
      if (session.forceStatus === "UPCOMING") {
        return {
          stage: "UPCOMING" as const,
          statusText: "UPCOMING",
          subText: "Before class start time",
          badgeColor: "amber",
        };
      }
      if (session.forceStatus === "LIVE NOW") {
        return {
          stage: "LIVE_NOW" as const,
          statusText: "LIVE NOW",
          subText: "During class time",
          badgeColor: "emerald",
        };
      }
      if (session.forceStatus === "COMPLETED") {
        return {
          stage: "FEEDBACK_REQUIRED" as const,
          statusText: "COMPLETED",
          subText: "Feedback Required",
          badgeColor: "purple",
        };
      }
    }

    // Dynamic time-based evaluation fallback
    const now = currentSystemTime;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = session.startHour24 * 60 + session.startMin;
    const endMinutes = session.endHour24 * 60 + session.endMin;
    const joinMinutes = startMinutes - session.joinAvailableMinutesBefore;

    if (nowMinutes < joinMinutes) {
      return {
        stage: "UPCOMING" as const,
        statusText: "UPCOMING",
        subText: "Before class start time",
        badgeColor: "amber",
      };
    } else if (nowMinutes >= joinMinutes && nowMinutes < startMinutes) {
      return {
        stage: "READY_TO_JOIN" as const,
        statusText: "READY TO JOIN",
        subText: "Join window open",
        badgeColor: "blue",
      };
    } else if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
      return {
        stage: "LIVE_NOW" as const,
        statusText: "LIVE NOW",
        subText: "During class time",
        badgeColor: "emerald",
      };
    } else {
      return {
        stage: "FEEDBACK_REQUIRED" as const,
        statusText: "COMPLETED",
        subText: "Feedback Required",
        badgeColor: "purple",
      };
    }
  };

  // Submit Feedback Handler
  const handleFeedbackSubmit = (session: StudentClassSession) => {
    const classRating = classExpRatings[session.id] || 5;
    const facRating = facultyRatings[session.id] || 5;
    const avgRating = Math.round(((classRating + facRating) / 2) * 10) / 10 || 5;
    const ratingLabel = RATING_LABELS[Math.round(avgRating)] || "Excellent";
    const comments = feedbackComments[session.id] || "";

    submitFeedback({
      sessionId: session.id,
      courseName: session.title,
      batchCode: session.courseCode,
      facultyName: session.facultyName,
      classDate: session.date,
      classTime: `${session.startTime} – ${session.endTime}`,
      studentId,
      studentName,
      rating: avgRating,
      ratingLabel,
      classExperienceRating: classRating,
      facultyRating: facRating,
      teachingQuality: "Excellent",
      comments,
    });

    setExpandedFeedbackSessionId(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-300">
      {/* ─── 1. TOP HEADER CARD: MY CLASS SCHEDULE ─────────────────────────── */}
      <div className="bg-white dark:bg-[#111C35] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-[#1D4ED8] dark:bg-blue-500/10 dark:text-sky-400 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                My Class Schedule
              </h1>
              <Badge className="bg-blue-50 text-[#1D4ED8] border-blue-200 dark:bg-blue-950/60 dark:text-sky-400 dark:border-sky-800/50 text-[10.5px] font-bold rounded-lg gap-1 px-2 py-0.5">
                <Lock className="w-3 h-3" />
                <span>Assigned Access</span>
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Only classes assigned to you by your Counsellor are shown here.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
            <CalendarDays className="h-4 w-4 text-[#1D4ED8] dark:text-sky-400" />
            <div>
              <span className="block text-[11px] font-black text-slate-900 dark:text-white leading-tight">
                Academic Week 22
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                May 26 – Jun 01, 2025
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. DYNAMIC WEEKLY DATE SELECTOR ──────────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3 justify-between">
        <button
          type="button"
          onClick={() => {
            const currIdx = DEFAULT_WEEK_DAYS.findIndex((d) => d.fullDate === selectedDay.fullDate);
            if (currIdx > 0) setSelectedDay(DEFAULT_WEEK_DAYS[currIdx - 1]);
          }}
          aria-label="Previous Day"
          className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111C35] hover:bg-slate-50 dark:hover:bg-[#162547] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 shadow-2xs cursor-pointer transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 grid grid-cols-7 gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1">
          {DEFAULT_WEEK_DAYS.map((day) => {
            const isSelected = selectedDay.fullDate === day.fullDate;
            return (
              <button
                key={day.fullDate}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`py-3 sm:py-3.5 px-2 rounded-2xl flex flex-col items-center justify-between text-center transition-all cursor-pointer ${isSelected
                    ? "bg-gradient-to-br from-[#4F46E5] to-[#6366F1] text-white shadow-md shadow-indigo-500/20 dark:shadow-indigo-900/40 scale-[1.02] border border-indigo-400/30"
                    : "bg-white dark:bg-[#111C35] border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-[#152342] shadow-2xs"
                  }`}
              >
                <span
                  className={`text-[10px] font-black tracking-wider ${isSelected ? "text-indigo-100" : "text-slate-400"
                    }`}
                >
                  {day.dayName}
                </span>

                <span
                  className={`text-lg sm:text-xl font-black my-0.5 ${isSelected ? "text-white" : "text-slate-800 dark:text-slate-200"
                    }`}
                >
                  {day.dateNumber} {day.monthName}
                </span>

                {day.isToday ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${isSelected
                        ? "bg-white/20 text-white backdrop-blur-xs"
                        : "bg-blue-100 text-[#1D4ED8] dark:bg-blue-950/60 dark:text-sky-400 border border-blue-200/60 dark:border-sky-800/40"
                      }`}
                  >
                    TODAY
                  </span>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full my-1 bg-slate-300 dark:bg-slate-700" />
                )}

                <span
                  className={`text-[10px] font-bold mt-0.5 ${isSelected ? "text-indigo-100" : "text-slate-400 dark:text-slate-500"
                    }`}
                >
                  {day.classCount === 0
                    ? "No Classes"
                    : `${day.classCount} ${day.classCount === 1 ? "Class" : "Classes"}`}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            const currIdx = DEFAULT_WEEK_DAYS.findIndex((d) => d.fullDate === selectedDay.fullDate);
            if (currIdx < DEFAULT_WEEK_DAYS.length - 1) setSelectedDay(DEFAULT_WEEK_DAYS[currIdx + 1]);
          }}
          aria-label="Next Day"
          className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111C35] hover:bg-slate-50 dark:hover:bg-[#162547] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 shadow-2xs cursor-pointer transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* ─── 3. ACTIVE DAY HEADER & LOCAL TIME SUBTITLE ───────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Tuesday, 27 May 2025
            </h2>
            <Badge className="bg-blue-50 text-[#1D4ED8] border-blue-200 dark:bg-blue-950/60 dark:text-sky-400 dark:border-sky-800/50 text-xs font-bold rounded-xl px-2.5 py-0.5">
              3 Classes Scheduled
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>All times in your local time</span>
          </div>
        </div>

        {/* ─── 4. CLASS CARDS WITH TIMELINE METRICS ────────────────────────── */}
        <div className="space-y-4">
          {daySessions.map((session) => {
            const lifecycle = getSessionLifecycle(session);
            const isFeedbackFormOpen =
              expandedFeedbackSessionId === session.id && lifecycle.stage !== "FEEDBACK_SUBMITTED";

            // Left vertical border color
            const borderLeftClass =
              lifecycle.stage === "UPCOMING"
                ? "border-l-4 border-l-amber-500"
                : lifecycle.stage === "LIVE_NOW"
                  ? "border-l-4 border-l-emerald-500"
                  : lifecycle.stage === "FEEDBACK_REQUIRED"
                    ? "border-l-4 border-l-purple-500"
                    : "border-l-4 border-l-emerald-500";

            const classRating = classExpRatings[session.id] || 0;
            const facRating = facultyRatings[session.id] || 0;
            const classHover = hoveredClassExp[session.id];
            const facHover = hoveredFacultyExp[session.id];
            const comment = feedbackComments[session.id] || "";

            const effectiveClassRating = classHover !== null && classHover !== undefined ? classHover : classRating;
            const effectiveFacultyRating = facHover !== null && facHover !== undefined ? facHover : facRating;

            return (
              <div
                key={session.id}
                className={`bg-white dark:bg-[#111C35] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-xs overflow-hidden transition-all hover:shadow-md dark:hover:border-slate-700 ${borderLeftClass}`}
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left Side: Timeline status + Avatar + Course Meta */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5 min-w-0">
                    {/* Timeline Column */}
                    <div className="flex sm:flex-col items-start sm:items-start gap-2 sm:gap-0.5 shrink-0 min-w-[110px]">
                      <div className="flex items-center gap-1.5">
                        {lifecycle.stage === "UPCOMING" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        )}
                        {lifecycle.stage === "LIVE_NOW" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        )}
                        {lifecycle.stage === "FEEDBACK_REQUIRED" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                        )}
                        {lifecycle.stage === "FEEDBACK_SUBMITTED" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        )}
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {lifecycle.statusText}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {lifecycle.subText}
                      </span>
                    </div>

                    <div className="hidden sm:block w-px h-12 bg-slate-200 dark:bg-slate-800 shrink-0" />

                    {/* Course Avatar Badge */}
                    <div
                      className={`h-12 w-12 rounded-2xl ${session.avatarBg} font-black text-base flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      {session.avatarText}
                    </div>

                    {/* Course Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                          {session.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1D4ED8] border border-blue-200 dark:bg-blue-950/60 dark:text-sky-400 dark:border-sky-800/50 text-[10px] font-black uppercase">
                          {session.courseCode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          Faculty: <span className="text-slate-900 dark:text-white font-bold">{session.facultyName}</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {session.roomNo}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {session.block}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="flex items-center gap-1">
                          🏫 {session.mode}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {session.startTime} – {session.endTime}
                        </span>
                        <span>⏱ {session.duration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Dynamic Lifecycle Actions */}
                  <div className="flex items-center gap-4 self-end lg:self-center shrink-0">
                    {/* 1. UPCOMING CARD */}
                    {lifecycle.stage === "UPCOMING" && (
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Upcoming</span>
                          </div>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            Class starts at {session.startTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                          <div className="px-3 py-1 text-center">
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                              Join available at
                            </span>
                            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                              01:55 PM
                            </span>
                          </div>
                          <Button
                            disabled
                            variant="outline"
                            className="h-9 px-4 text-xs font-bold text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-[#111C35] rounded-xl cursor-not-allowed opacity-60 flex items-center gap-1.5"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Join Class</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* 2. LIVE NOW CARD */}
                    {lifecycle.stage === "LIVE_NOW" && (
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>LIVE NOW</span>
                          </div>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            Your class is currently live.
                          </span>
                        </div>

                        <Button
                          onClick={() => setLiveJoiningSession(session)}
                          className="h-10 px-6 text-xs font-bold text-white bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] rounded-2xl shadow-md shadow-indigo-500/20 dark:shadow-indigo-950/50 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                        >
                          <Video className="w-4 h-4" />
                          <span>Join Class</span>
                        </Button>
                      </div>
                    )}

                    {/* 3. COMPLETED & FEEDBACK REQUIRED CARD */}
                    {lifecycle.stage === "FEEDBACK_REQUIRED" && (
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Class Completed</span>
                          </div>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            You attended this class.
                          </span>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Button
                            variant="outline"
                            onClick={() =>
                              setExpandedFeedbackSessionId((prev) =>
                                prev === session.id ? null : session.id
                              )
                            }
                            className="h-10 px-5 text-xs font-bold text-[#5B50EC] dark:text-indigo-300 hover:text-[#4F46E5] dark:hover:text-white bg-indigo-50/70 hover:bg-indigo-100 dark:bg-[#162547]/60 dark:hover:bg-[#1C2F59] border border-indigo-200 dark:border-indigo-500/40 rounded-2xl shadow-2xs flex items-center gap-2 cursor-pointer transition-all"
                          >
                            <Star className="w-3.5 h-3.5 fill-[#5B50EC] text-[#5B50EC] dark:fill-indigo-400 dark:text-indigo-400" />
                            <span>Give Feedback</span>
                          </Button>
                          <span className="text-[10px] text-slate-500 font-medium">Feedback is mandatory</span>
                        </div>
                      </div>
                    )}

                    {/* 4. COMPLETED & FEEDBACK SUBMITTED CARD */}
                    {lifecycle.stage === "FEEDBACK_SUBMITTED" && (
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Feedback Submitted</span>
                          </div>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            Thank you for your feedback!
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {lifecycle.feedback?.submittedAt || session.submittedAtFormatted}
                          </span>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
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
                                  classTime: `${session.startTime} - ${session.endTime}`,
                                  studentId,
                                  studentName,
                                  rating: session.submittedRating || 4.5,
                                  ratingLabel: "Very Good",
                                  classExperienceRating: 5,
                                  facultyRating: 4,
                                  comments:
                                    "Great live coding session on React Hooks, useEffect dependency arrays, and state optimization.",
                                  submittedAt: "27 May 2025, 09:10 PM",
                                }
                              )
                            }
                            className="h-9 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#0D1527] hover:bg-slate-50 dark:hover:bg-[#152342] border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                          >
                            View Feedback
                          </Button>
                          <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((st) => (
                                <Star
                                  key={st}
                                  className="w-3 h-3 fill-amber-400 text-amber-400"
                                />
                              ))}
                            </div>
                            <span>4.5</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── MANDATORY FEEDBACK FORM (WHEN EXPANDED) ────────────────────── */}
                {isFeedbackFormOpen && (
                  <div className="p-5 sm:p-6 bg-gradient-to-r from-[#F8F7FF] via-[#FAF9FF] to-[#F5F3FF] dark:from-[#0B1325] dark:via-[#0F1932] dark:to-[#0B1325] border-t border-purple-100/90 dark:border-indigo-950/80 space-y-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Star className="h-4 w-4 fill-white text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            Your Feedback Matters!
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Feedback is mandatory for every completed class.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-[#5B50EC] border border-purple-200 dark:bg-purple-950/70 dark:text-indigo-300 dark:border-indigo-900/60 text-[11px] font-bold self-start sm:self-center shadow-2xs">
                        <Lock className="w-3 h-3" />
                        <span className="font-black">Mandatory</span>
                        <span className="text-slate-500 dark:text-slate-400 font-normal">— Feedback is required after every completed class.</span>
                      </div>
                    </div>

                    {/* 3 Review Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start bg-white dark:bg-[#111C35] border border-slate-200/90 dark:border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-2xs">
                      {/* Col 1: Rate your overall class experience */}
                      <div className="md:col-span-4 space-y-2 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/80 pb-4 md:pb-0 md:pr-4">
                        <label className="block text-xs font-bold text-slate-900 dark:text-white">
                          Rate your overall class experience
                        </label>

                        <div className="flex items-center gap-1 pt-1">
                          {[1, 2, 3, 4, 5].map((st) => {
                            const isFilled = st <= effectiveClassRating;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  setClassExpRatings((prev) => ({
                                    ...prev,
                                    [session.id]: st,
                                  }))
                                }
                                onMouseEnter={() =>
                                  setHoveredClassExp((prev) => ({
                                    ...prev,
                                    [session.id]: st,
                                  }))
                                }
                                onMouseLeave={() =>
                                  setHoveredClassExp((prev) => ({
                                    ...prev,
                                    [session.id]: null,
                                  }))
                                }
                                className="p-1 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                                aria-label={`Rate class experience ${st} star`}
                              >
                                <Star
                                  className={`h-6 w-6 transition-colors ${isFilled
                                      ? "fill-[#5B50EC] text-[#5B50EC] dark:fill-indigo-400 dark:text-indigo-400"
                                      : "text-slate-300 dark:text-slate-700 hover:text-indigo-400"
                                    }`}
                                />
                              </button>
                            );
                          })}
                        </div>

                        <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {effectiveClassRating > 0 ? RATING_LABELS[effectiveClassRating] : "Select Rating"}
                        </span>
                      </div>

                      {/* Col 2: Rate the faculty */}
                      <div className="md:col-span-4 space-y-2 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/80 pb-4 md:pb-0 md:pr-4">
                        <label className="block text-xs font-bold text-slate-900 dark:text-white">
                          Rate the faculty ({session.facultyName})
                        </label>

                        <div className="flex items-center gap-1 pt-1">
                          {[1, 2, 3, 4, 5].map((st) => {
                            const isFilled = st <= effectiveFacultyRating;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  setFacultyRatings((prev) => ({
                                    ...prev,
                                    [session.id]: st,
                                  }))
                                }
                                onMouseEnter={() =>
                                  setHoveredFacultyExp((prev) => ({
                                    ...prev,
                                    [session.id]: st,
                                  }))
                                }
                                onMouseLeave={() =>
                                  setHoveredFacultyExp((prev) => ({
                                    ...prev,
                                    [session.id]: null,
                                  }))
                                }
                                className="p-1 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                                aria-label={`Rate faculty ${st} star`}
                              >
                                <Star
                                  className={`h-6 w-6 transition-colors ${isFilled
                                      ? "fill-[#5B50EC] text-[#5B50EC] dark:fill-indigo-400 dark:text-indigo-400"
                                      : "text-slate-300 dark:text-slate-700 hover:text-indigo-400"
                                    }`}
                                />
                              </button>
                            );
                          })}
                        </div>

                        <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {effectiveFacultyRating > 0 ? RATING_LABELS[effectiveFacultyRating] : "Select Rating"}
                        </span>
                      </div>

                      {/* Col 3: Your Feedback Comments */}
                      <div className="md:col-span-4 space-y-2">
                        <label className="block text-xs font-bold text-slate-900 dark:text-white">
                          Your Feedback
                        </label>

                        <div className="relative">
                          <textarea
                            rows={3}
                            maxLength={500}
                            value={comment}
                            onChange={(e) =>
                              setFeedbackComments((prev) => ({
                                ...prev,
                                [session.id]: e.target.value,
                              }))
                            }
                            placeholder="Share your feedback about the class..."
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1325] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#0B1325] focus:border-[#5B50EC] dark:focus:border-indigo-500 focus:ring-1 focus:ring-[#5B50EC] outline-none resize-none transition-all"
                          />
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-right">
                            {comment.length}/500 characters
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setExpandedFeedbackSessionId(null)}
                        className="h-9 px-4 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleFeedbackSubmit(session)}
                        disabled={classRating === 0 || facRating === 0}
                        className="h-9 px-6 text-xs font-bold text-white bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit Feedback
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 5. BOTTOM HORIZONTAL CLASS WORKFLOW VISUAL ───────────────────── */}
      <div className="bg-white dark:bg-[#111C35] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 text-[#5B50EC] dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            How the Class Workflow Works
          </h3>
        </div>

        {/* 6 Stages Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
          {/* Stage 1: Upcoming */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#0D1527] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1.5 h-full">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-slate-400">01</span>
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white mt-1">Upcoming</span>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
              Before class start time
            </span>
          </div>

          {/* Stage 2: Join Time */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#0D1527] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1.5 h-full">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-sky-400 flex items-center justify-center">
                <PlayCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-slate-400">02</span>
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white mt-1">Join Time</span>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
              Join button becomes active
            </span>
          </div>

          {/* Stage 3: Live Class */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#0D1527] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1.5 h-full">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
                <Video className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-slate-400">03</span>
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white mt-1">Live Class</span>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
              Join and attend the live session
            </span>
          </div>

          {/* Stage 4: Completed */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#0D1527] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1.5 h-full">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-slate-400">04</span>
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white mt-1">Completed</span>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
              Class ends automatically
            </span>
          </div>

          {/* Stage 5: Give Feedback */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#0D1527] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1.5 h-full">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center">
                <Star className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-slate-400">05</span>
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white mt-1">Give Feedback</span>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
              Feedback is required after every class
            </span>
          </div>

          {/* Stage 6: Feedback Submitted */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#0D1527] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1.5 h-full">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span className="text-[10px] font-black text-slate-400">06</span>
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white mt-1">Feedback Submitted</span>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
              Your feedback is recorded
            </span>
          </div>
        </div>
      </div>

      {/* ─── 6. BOTTOM BANNER ─────────────────────────────────────────────── */}
      <div className="text-center pt-1">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-sky-400" />
          <span>Feedback is mandatory after every completed class to help us improve your learning experience.</span>
        </p>
      </div>

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
                    <span className="text-slate-900 dark:text-white font-bold">{liveJoiningSession.startTime} - {liveJoiningSession.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classroom:</span>
                    <span className="text-slate-900 dark:text-white font-bold">{liveJoiningSession.roomNo}, {liveJoiningSession.block}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLiveJoiningSession(null)}
                  className="w-full sm:w-auto bg-white dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl h-9"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    alert(`Connecting to ${liveJoiningSession.title} live class session!`);
                    setLiveJoiningSession(null);
                  }}
                  className="w-full sm:flex-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white text-xs font-bold rounded-xl h-9 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Enter Live Classroom</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── 8. VIEW SUBMITTED FEEDBACK DIALOG ────────────────────────────── */}
      <Dialog open={!!viewingFeedbackSession} onOpenChange={(open) => !open && setViewingFeedbackSession(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-[#111C35] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          {viewingFeedbackSession && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
                      Your Submitted Feedback
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                      {viewingFeedbackSession.courseName} • {viewingFeedbackSession.facultyName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1325] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Class Experience:</span>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <Star
                          key={st}
                          className={`h-3.5 w-3.5 ${st <= (viewingFeedbackSession.classExperienceRating || viewingFeedbackSession.rating)
                              ? "fill-amber-500 text-amber-500"
                              : "text-slate-300 dark:text-slate-700"
                            }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Faculty Rating:</span>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <Star
                          key={st}
                          className={`h-3.5 w-3.5 ${st <= (viewingFeedbackSession.facultyRating || viewingFeedbackSession.rating)
                              ? "fill-amber-500 text-amber-500"
                              : "text-slate-300 dark:text-slate-700"
                            }`}
                        />
                      ))}
                    </div>
                  </div>

                  {viewingFeedbackSession.comments && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Your Comments:</span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-[#0D1527] p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 italic">
                        "{viewingFeedbackSession.comments}"
                      </p>
                    </div>
                  )}

                  <div className="pt-1 text-[10.5px] text-slate-400 dark:text-slate-500">
                    Submitted on: {viewingFeedbackSession.submittedAt}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setViewingFeedbackSession(null)}
                  className="w-full bg-[#5B50EC] hover:bg-[#4C41E0] text-white text-xs font-bold rounded-xl h-9"
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
