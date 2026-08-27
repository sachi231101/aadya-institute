import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  Code2,
  Shield,
  Atom,
  Lock,
  ArrowRight,
  Building,
  CheckCircle2,
  CalendarDays,
  X,
  Star,
  MessageSquareQuote,
  Sparkles,
  Info,
  Check,
  ChevronDown,
  Video,
  Radio,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  courseName: string;
  batchCode: string;
  facultyName: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  duration: string;
  roomNo: string;
  block: string;
  mode: "Campus" | "Online" | "Hybrid";
  status: "Upcoming" | "Live Now" | "Completed" | "Cancelled";
  completedTime?: string;
  avatarText: string;
  avatarBg: string;
  avatarColor: string;
  topics?: string[];
}

interface DayData {
  dayName: string;
  dateNumber: string;
  monthName: string;
  fullDate: string; // YYYY-MM-DD
  isToday?: boolean;
  classCount: number;
  dotColor?: string;
}

const RATING_LABELS: Record<number, "Poor" | "Fair" | "Good" | "Very Good" | "Excellent"> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const WEEK_DAYS: DayData[] = [
  { dayName: "TUE", dateNumber: "13", monthName: "AUG", fullDate: "2026-08-13", isToday: true, classCount: 2 },
  { dayName: "WED", dateNumber: "14", monthName: "AUG", fullDate: "2026-08-14", classCount: 1, dotColor: "bg-emerald-500" },
  { dayName: "THU", dateNumber: "15", monthName: "AUG", fullDate: "2026-08-15", classCount: 0, dotColor: "bg-slate-300" },
  { dayName: "FRI", dateNumber: "16", monthName: "AUG", fullDate: "2026-08-16", classCount: 3, dotColor: "bg-purple-500" },
  { dayName: "SAT", dateNumber: "17", monthName: "AUG", fullDate: "2026-08-17", classCount: 0, dotColor: "bg-slate-300" },
  { dayName: "SUN", dateNumber: "18", monthName: "AUG", fullDate: "2026-08-18", classCount: 0, dotColor: "bg-slate-300" },
  { dayName: "MON", dateNumber: "19", monthName: "AUG", fullDate: "2026-08-19", classCount: 2, dotColor: "bg-amber-500" },
];

const SCHEDULE_SESSIONS: StudentClassSession[] = [
  // Tuesday, 13 August 2026 (2 Classes)
  {
    id: "sc-1",
    title: "JavaScript Essentials",
    courseName: "JavaScript Essentials",
    batchCode: "JS-2026-A",
    facultyName: "Ramesh Kumar",
    date: "2026-08-13",
    startTime: "02:00 PM",
    endTime: "04:00 PM",
    duration: "2h 00m",
    roomNo: "Lab 1",
    block: "Main Block",
    mode: "Campus",
    status: "Completed",
    completedTime: "04:05 PM",
    avatarText: "JS",
    avatarBg: "bg-amber-100",
    avatarColor: "text-amber-800",
    topics: ["ES6+ Syntax", "Promises & Async/Await", "DOM Manipulation", "Event Loop Mechanics"],
  },
  {
    id: "sc-2",
    title: "Data Structures",
    courseName: "Data Structures",
    batchCode: "DS-2026-B",
    facultyName: "Anjali Singh",
    date: "2026-08-13",
    startTime: "06:30 PM",
    endTime: "08:30 PM",
    duration: "2h 00m",
    roomNo: "Room 204",
    block: "Main Block",
    mode: "Campus",
    status: "Upcoming",
    avatarText: "DS",
    avatarBg: "bg-purple-100",
    avatarColor: "text-purple-800",
    topics: ["Binary Search Trees", "Tree Traversals (Inorder, Preorder)", "Balancing Logic"],
  },

  // Wednesday, 14 August 2026 (1 Class)
  {
    id: "sc-3",
    title: "Full Stack Web Development",
    courseName: "Full Stack Web Development",
    batchCode: "WD-2026-A",
    facultyName: "HM Adithya",
    date: "2026-08-14",
    startTime: "09:00 AM",
    endTime: "11:00 AM",
    duration: "2h 00m",
    roomNo: "Room 101",
    block: "Main Block",
    mode: "Campus",
    status: "Upcoming",
    avatarText: "WD",
    avatarBg: "bg-blue-100",
    avatarColor: "text-blue-800",
    topics: ["Node.js Architecture", "Express Controllers & Services", "Prisma Database ORM"],
  },

  // Friday, 16 August 2026 (3 Classes)
  {
    id: "sc-4",
    title: "React & State Management",
    courseName: "React & State Management",
    batchCode: "RT-2026-A",
    facultyName: "HM Adithya",
    date: "2026-08-16",
    startTime: "09:00 AM",
    endTime: "11:00 AM",
    duration: "2h 00m",
    roomNo: "Lab 2",
    block: "Tech Block",
    mode: "Campus",
    status: "Upcoming",
    avatarText: "RT",
    avatarBg: "bg-indigo-100",
    avatarColor: "text-indigo-800",
    topics: ["Zustand State Store", "Custom Hooks", "Performance Optimization with useMemo"],
  },
  {
    id: "sc-5",
    title: "Database Engineering (PostgreSQL)",
    courseName: "Database Engineering",
    batchCode: "DB-2026-A",
    facultyName: "Vikram Aditya",
    date: "2026-08-16",
    startTime: "11:30 AM",
    endTime: "01:30 PM",
    duration: "2h 00m",
    roomNo: "Room 105",
    block: "Main Block",
    mode: "Campus",
    status: "Upcoming",
    avatarText: "DB",
    avatarBg: "bg-teal-100",
    avatarColor: "text-teal-800",
    topics: ["Indexes & Query Optimization", "Foreign Keys & Constraints", "Transactions & ACID"],
  },
  {
    id: "sc-6",
    title: "JavaScript Essentials Lab",
    courseName: "JavaScript Essentials",
    batchCode: "JS-2026-A",
    facultyName: "Ramesh Kumar",
    date: "2026-08-16",
    startTime: "02:30 PM",
    endTime: "04:30 PM",
    duration: "2h 00m",
    roomNo: "Lab 1",
    block: "Main Block",
    mode: "Campus",
    status: "Upcoming",
    avatarText: "JS",
    avatarBg: "bg-amber-100",
    avatarColor: "text-amber-800",
    topics: ["Mini Project Submission", "Fetch API Integration", "Async Debugging"],
  },

  // Monday, 19 August 2026 (2 Classes)
  {
    id: "sc-7",
    title: "Full Stack Web Development",
    courseName: "Full Stack Web Development",
    batchCode: "WD-2026-A",
    facultyName: "HM Adithya",
    date: "2026-08-19",
    startTime: "09:00 AM",
    endTime: "11:00 AM",
    duration: "2h 00m",
    roomNo: "Room 101",
    block: "Main Block",
    mode: "Campus",
    status: "Upcoming",
    avatarText: "WD",
    avatarBg: "bg-blue-100",
    avatarColor: "text-blue-800",
    topics: ["REST API Security", "JWT Authentication", "Role-Based Access Control"],
  },
  {
    id: "sc-8",
    title: "Data Structures Practical",
    courseName: "Data Structures",
    batchCode: "DS-2026-B",
    facultyName: "Anjali Singh",
    date: "2026-08-19",
    startTime: "02:00 PM",
    endTime: "04:00 PM",
    duration: "2h 00m",
    roomNo: "Lab 3",
    block: "Main Block",
    mode: "Campus",
    status: "Upcoming",
    avatarText: "DS",
    avatarBg: "bg-purple-100",
    avatarColor: "text-purple-800",
    topics: ["Graph Traversal Algorithms (BFS, DFS)", "Shortest Path (Dijkstra)"],
  },
];

export const StudentSchedule: React.FC = () => {
  const { user } = useAuthStore();
  const { feedbacks, submitFeedback, getFeedbackForSession } = useFeedbackStore();

  const studentId = user?.id || "std-current";
  const studentName = user?.name || "Rahul Verma";

  // Selected Day State
  const [selectedDay, setSelectedDay] = useState<DayData>(WEEK_DAYS[0]);
  
  // Inline feedback rating state keyed by session id
  const [inlineRatings, setInlineRatings] = useState<Record<string, number>>({
    "sc-1": 5, // default 5 star selected on class 1
  });
  const [inlineComments, setInlineComments] = useState<Record<string, string>>({});
  const [ratingDropdownOpen, setRatingDropdownOpen] = useState<Record<string, boolean>>({});

  // View Class Modal State
  const [viewingSession, setViewingSession] = useState<StudentClassSession | null>(null);

  // Dedicated Modal Feedback State
  const [feedbackModalSession, setFeedbackModalSession] = useState<StudentClassSession | null>(null);
  const [modalRating, setModalRating] = useState<number>(5);
  const [modalComments, setModalComments] = useState<string>("");

  // Filter sessions for selected day
  const daySessions = useMemo(() => {
    return SCHEDULE_SESSIONS.filter((s) => s.date === selectedDay.fullDate);
  }, [selectedDay]);

  // Handle submitting inline feedback
  const handleInlineSubmit = (session: StudentClassSession) => {
    const rating = inlineRatings[session.id] || 5;
    const ratingLabel = RATING_LABELS[rating] || "Excellent";
    const comments = inlineComments[session.id] || "";

    submitFeedback({
      sessionId: session.id,
      courseName: session.courseName,
      batchCode: session.batchCode,
      facultyName: session.facultyName,
      classDate: session.date,
      classTime: `${session.startTime} – ${session.endTime}`,
      studentId,
      studentName,
      rating,
      ratingLabel,
      comments,
    });
  };

  // Handle submitting modal feedback
  const handleModalSubmit = () => {
    if (!feedbackModalSession) return;
    const ratingLabel = RATING_LABELS[modalRating] || "Excellent";

    submitFeedback({
      sessionId: feedbackModalSession.id,
      courseName: feedbackModalSession.courseName,
      batchCode: feedbackModalSession.batchCode,
      facultyName: feedbackModalSession.facultyName,
      classDate: feedbackModalSession.date,
      classTime: `${feedbackModalSession.startTime} – ${feedbackModalSession.endTime}`,
      studentId,
      studentName,
      rating: modalRating,
      ratingLabel,
      comments: modalComments,
    });

    setFeedbackModalSession(null);
    setModalComments("");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto animate-in fade-in duration-300">
      {/* ─── 1. TOP HEADER / TITLE CARD ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                My Class Schedule
              </h1>
              <Badge className="bg-blue-50 text-[#1D4ED8] border-blue-200 text-[10px] font-bold rounded-lg gap-1">
                <Lock className="w-3 h-3" />
                <span>Assigned Access</span>
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Only classes assigned to you by your Counsellor are shown here.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 shadow-2xs">
            <CalendarDays className="h-4 w-4 text-[#1D4ED8]" />
            <div>
              <span className="block text-[11px] font-black text-slate-900 leading-tight">
                Academic Week 33
              </span>
              <span className="block text-[10px] text-slate-400 font-normal">
                Aug 13 – Aug 19, 2026
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. WEEKLY HORIZONTAL DAY SELECTOR BAR ───────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3 justify-between">
        <button
          onClick={() => {
            const currIdx = WEEK_DAYS.findIndex((d) => d.fullDate === selectedDay.fullDate);
            if (currIdx > 0) setSelectedDay(WEEK_DAYS[currIdx - 1]);
          }}
          className="h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shrink-0 shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 grid grid-cols-7 gap-2 overflow-x-auto no-scrollbar py-1">
          {WEEK_DAYS.map((day) => {
            const isSelected = selectedDay.fullDate === day.fullDate;
            return (
              <button
                key={day.fullDate}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`py-3.5 px-2 rounded-2xl flex flex-col items-center justify-between text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#1D4ED8] text-white shadow-md scale-[1.02]"
                    : "bg-white border border-slate-200/80 text-slate-600 hover:border-blue-300 hover:bg-slate-50/80 shadow-2xs"
                }`}
              >
                <span
                  className={`text-[10px] font-black tracking-wider ${
                    isSelected ? "text-blue-100" : "text-slate-400"
                  }`}
                >
                  {day.dayName}
                </span>
                <span
                  className={`text-lg sm:text-xl font-black my-1 ${
                    isSelected ? "text-white" : "text-slate-800"
                  }`}
                >
                  {day.dateNumber} {day.monthName}
                </span>

                {day.isToday ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      isSelected ? "bg-white text-[#1D4ED8]" : "bg-blue-100 text-[#1D4ED8]"
                    }`}
                  >
                    TODAY
                  </span>
                ) : (
                  <span
                    className={`h-1.5 w-1.5 rounded-full my-0.5 ${
                      day.dotColor || "bg-slate-300"
                    }`}
                  />
                )}

                <span
                  className={`text-[10px] font-bold mt-1 ${
                    isSelected ? "text-blue-100" : "text-slate-400"
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
          onClick={() => {
            const currIdx = WEEK_DAYS.findIndex((d) => d.fullDate === selectedDay.fullDate);
            if (currIdx < WEEK_DAYS.length - 1) setSelectedDay(WEEK_DAYS[currIdx + 1]);
          }}
          className="h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shrink-0 shadow-2xs cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ─── 3. ACTIVE DAY TITLE & SCHEDULE LIST ─────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {new Date(selectedDay.fullDate).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Badge className="bg-blue-50 text-[#1D4ED8] border-blue-200 text-xs font-bold rounded-xl px-2.5 py-0.5">
              {daySessions.length} {daySessions.length === 1 ? "Class Scheduled" : "Classes Scheduled"}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border-slate-200 gap-1.5 shadow-2xs"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>View Weekly</span>
          </Button>
        </div>

        {/* List of Session Cards */}
        <div className="space-y-5">
          {daySessions.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200/80 rounded-3xl shadow-xs flex flex-col items-center justify-center">
              <CalendarIcon className="h-12 w-12 text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Classes Scheduled</h3>
              <p className="text-xs text-slate-400 mt-1">
                You have no assigned classes on this date.
              </p>
            </div>
          ) : (
            daySessions.map((session) => {
              const feedbackRecord = getFeedbackForSession(session.id, studentId);
              const isCompleted = session.status === "Completed";
              const isLive = session.status === "Live Now";
              const isUpcoming = session.status === "Upcoming";

              const currentRating = inlineRatings[session.id] || 5;
              const currentRatingLabel = RATING_LABELS[currentRating] || "Excellent";

              return (
                <div
                  key={session.id}
                  className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Main Class Card Row */}
                  <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Time Pill & Avatar */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Time box */}
                      <div className="px-3.5 py-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 flex items-center gap-2 shrink-0">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <div>
                          <span className="text-xs font-black text-slate-900 block leading-tight">
                            {session.startTime} - {session.endTime}
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 block leading-tight">
                            {session.duration}
                          </span>
                        </div>
                      </div>

                      {/* Course Avatar */}
                      <div
                        className={`h-11 w-11 rounded-2xl ${session.avatarBg} ${session.avatarColor} font-black text-sm flex items-center justify-center shrink-0 shadow-2xs`}
                      >
                        {session.avatarText}
                      </div>

                      {/* Title & Metadata */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-slate-900 truncate">
                            {session.title}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1D4ED8] border border-blue-200 text-[10px] font-black uppercase">
                            {session.batchCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            Faculty: <strong className="text-slate-800">{session.facultyName}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {session.roomNo}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <Building className="h-3.5 w-3.5 text-slate-400" />
                            {session.block}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            🏫 {session.mode}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill & Action Buttons */}
                    <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
                      {isCompleted && (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                            <Check className="h-3.5 w-3.5" />
                            Completed
                          </span>
                          {session.completedTime && (
                            <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                              Completed at {session.completedTime}
                            </span>
                          )}
                        </div>
                      )}

                      {isLive && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black animate-pulse">
                          <Radio className="h-3.5 w-3.5 text-rose-600" />
                          Live Now
                        </span>
                      )}

                      {isUpcoming && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black">
                          Upcoming
                        </span>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => setViewingSession(session)}
                        className="h-9 px-4 text-xs font-bold text-indigo-600 bg-white border-indigo-200 hover:bg-indigo-50 rounded-xl cursor-pointer"
                      >
                        View Class
                      </Button>
                    </div>
                  </div>

                  {/* ─── DEDICATED FEEDBACK SECTION (ONLY FOR COMPLETED CLASSES) ─── */}
                  {isCompleted && (
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 via-slate-50/60 to-purple-50/60 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Class Completed Greeting */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <MessageSquareQuote className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                            Class Completed!
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Thank you for attending the class.
                          </p>
                        </div>
                      </div>

                      {/* Center: Star Rating Form / Submitted State */}
                      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600">
                          Your Feedback helps us improve the learning experience.
                        </span>

                        {feedbackRecord ? (
                          // Submitted State
                          <div className="flex items-center gap-2 pt-0.5">
                            <div className="flex items-center gap-1 text-amber-400">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= feedbackRecord.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-slate-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-black text-slate-800">
                              {feedbackRecord.ratingLabel}
                            </span>
                          </div>
                        ) : (
                          // Active Interactive Stars
                          <div className="flex items-center gap-2.5 pt-0.5">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() =>
                                    setInlineRatings((prev) => ({
                                      ...prev,
                                      [session.id]: star,
                                    }))
                                  }
                                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                                >
                                  <Star
                                    className={`h-5 w-5 ${
                                      star <= currentRating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-slate-300 hover:text-amber-300"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>

                            {/* Rating Label Dropdown / Badge */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setRatingDropdownOpen((prev) => ({
                                    ...prev,
                                    [session.id]: !prev[session.id],
                                  }))
                                }
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <span>{currentRatingLabel}</span>
                                <ChevronDown className="h-3 w-3 text-slate-400" />
                              </button>

                              {ratingDropdownOpen[session.id] && (
                                <div className="absolute top-full mt-1 right-0 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-30 w-32 animate-in fade-in duration-150">
                                  {[5, 4, 3, 2, 1].map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => {
                                        setInlineRatings((prev) => ({
                                          ...prev,
                                          [session.id]: st,
                                        }));
                                        setRatingDropdownOpen((prev) => ({
                                          ...prev,
                                          [session.id]: false,
                                        }));
                                      }}
                                      className="w-full text-left px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-[#1D4ED8] rounded-lg transition-colors flex items-center justify-between"
                                    >
                                      <span>{RATING_LABELS[st]}</span>
                                      <span className="text-[10px] text-amber-500">★ {st}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Success Message under center if submitted */}
                        {feedbackRecord && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 pt-0.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Feedback Submitted! Thanks for your valuable feedback.</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Submit Button / State Pill */}
                      <div className="shrink-0 self-center">
                        {feedbackRecord ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFeedbackModalSession(session)}
                            className="h-9 px-4 text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 rounded-xl cursor-pointer"
                          >
                            ✓ Feedback Submitted
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleInlineSubmit(session)}
                            disabled={!currentRating}
                            className="h-9 px-5 text-xs font-bold text-white bg-[#5B50EC] hover:bg-[#4C41E0] rounded-xl shadow-xs cursor-pointer"
                          >
                            Submit Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── 4. BOTTOM NOTICE BANNER ─────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/70 flex items-center gap-3 text-xs text-purple-900 font-semibold shadow-2xs">
        <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
          <Info className="h-4 w-4" />
        </div>
        <span>Feedback can be given only after the class is marked as completed.</span>
      </div>

      {/* ─── 5. VIEW CLASS DETAILS MODAL ─────────────────────────────────── */}
      {viewingSession && (
        <Dialog open={!!viewingSession} onOpenChange={() => setViewingSession(null)}>
          <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1D4ED8] border border-blue-200 text-[10px] font-black uppercase">
                  {viewingSession.batchCode}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    viewingSession.status === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {viewingSession.status}
                </span>
              </div>
              <DialogTitle className="text-lg font-black text-slate-900">
                {viewingSession.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Faculty: {viewingSession.facultyName} • {viewingSession.roomNo}, {viewingSession.block}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Class Timing</span>
                  <span className="font-bold text-slate-800">
                    {viewingSession.startTime} - {viewingSession.endTime} ({viewingSession.duration})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Classroom Mode</span>
                  <span className="font-bold text-slate-800">{viewingSession.mode}</span>
                </div>
              </div>

              {viewingSession.topics && viewingSession.topics.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-slate-800 mb-2">Covered Topics:</h4>
                  <ul className="space-y-1.5">
                    {viewingSession.topics.map((tp, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-slate-600 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1D4ED8]" />
                        <span>{tp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingSession(null)}
                className="rounded-xl text-xs font-bold"
              >
                Close
              </Button>

              {viewingSession.status === "Completed" && (
                <Button
                  size="sm"
                  onClick={() => {
                    setFeedbackModalSession(viewingSession);
                    setViewingSession(null);
                  }}
                  className="rounded-xl text-xs font-bold bg-[#5B50EC] hover:bg-[#4C41E0] text-white gap-1.5"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  <span>
                    {getFeedbackForSession(viewingSession.id, studentId)
                      ? "View Feedback"
                      : "Give Feedback"}
                  </span>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── 6. DEDICATED FEEDBACK MODAL POPUP ───────────────────────────── */}
      {feedbackModalSession && (
        <Dialog
          open={!!feedbackModalSession}
          onOpenChange={() => setFeedbackModalSession(null)}
        >
          <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                  Class Completed
                </span>
              </div>
              <DialogTitle className="text-lg font-black text-slate-900">
                How was your class?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                {feedbackModalSession.title} • Faculty: {feedbackModalSession.facultyName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Star Rating selector */}
              <div className="text-center space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-600 block">
                  Rate your learning experience
                </span>

                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setModalRating(star)}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          star <= modalRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300 hover:text-amber-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <span className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-black text-slate-800 shadow-2xs">
                  {RATING_LABELS[modalRating]}
                </span>
              </div>

              {/* Optional Text feedback */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Share your experience (Optional)
                </label>
                <textarea
                  rows={3}
                  value={modalComments}
                  onChange={(e) => setModalComments(e.target.value)}
                  placeholder="Tell us what you liked or what could be improved about the teaching, speed, or coding examples..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#1D4ED8] transition-all"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeedbackModalSession(null)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={handleModalSubmit}
                className="rounded-xl text-xs font-bold bg-[#5B50EC] hover:bg-[#4C41E0] text-white"
              >
                Submit Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
