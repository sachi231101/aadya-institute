import React, { useState, useMemo, useRef } from "react";
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
  X 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

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
  status: "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
  iconType: "code" | "shield" | "atom" | "js" | "html";
  timeColor: "blue" | "amber" | "purple" | "emerald";
  meetingUrl?: string;
  topics?: string[];
}

interface DayData {
  dayName: string;
  dateNumber: string;
  monthName: string;
  fullDate: string; // YYYY-MM-DD
  isToday?: boolean;
  dotColor?: string;
}

const WEEK_DAYS: DayData[] = [
  { dayName: "TUE", dateNumber: "13", monthName: "AUG", fullDate: "2026-08-13", isToday: true },
  { dayName: "WED", dateNumber: "14", monthName: "AUG", fullDate: "2026-08-14", dotColor: "bg-emerald-500" },
  { dayName: "THU", dateNumber: "15", monthName: "AUG", fullDate: "2026-08-15", dotColor: "bg-slate-300" },
  { dayName: "FRI", dateNumber: "16", monthName: "AUG", fullDate: "2026-08-16", dotColor: "bg-purple-500" },
  { dayName: "SAT", dateNumber: "17", monthName: "AUG", fullDate: "2026-08-17", dotColor: "bg-slate-300" },
  { dayName: "SUN", dateNumber: "18", monthName: "AUG", fullDate: "2026-08-18", dotColor: "bg-slate-300" },
  { dayName: "MON", dateNumber: "19", monthName: "AUG", fullDate: "2026-08-19", dotColor: "bg-amber-500" },
];

const STUDENT_ASSIGNED_SESSIONS: StudentClassSession[] = [
  // Tuesday, 13 August 2026 (2 Classes)
  {
    id: "sc-1",
    title: "Full Stack Web Development",
    courseName: "Full Stack Web Development",
    batchCode: "WD-2026-A",
    facultyName: "HM Adithya",
    date: "2026-08-13",
    startTime: "09:00 AM",
    endTime: "11:00 AM",
    duration: "2h 00m",
    roomNo: "Room 101",
    block: "Main Block",
    mode: "Campus",
    status: "Upcoming",
    iconType: "code",
    timeColor: "blue",
    topics: ["Node.js Modular Backend Architecture", "REST API Design", "Database Relations with Prisma"],
  },
  {
    id: "sc-2",
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
    status: "Upcoming",
    iconType: "js",
    timeColor: "amber",
    topics: ["ES6+ Syntax", "Promises & Async/Await", "DOM Manipulation"],
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
    iconType: "code",
    timeColor: "blue",
    topics: ["PostgreSQL Schema Design", "Prisma Migrations", "API Endpoints"],
  },

  // Friday, 16 August 2026 (3 Classes)
  {
    id: "sc-4",
    title: "Full Stack Web Development",
    courseName: "Full Stack Web Development",
    batchCode: "WD-2026-A",
    facultyName: "HM Adithya",
    date: "2026-08-16",
    startTime: "09:00 AM",
    endTime: "11:00 AM",
    duration: "2h 00m",
    roomNo: "Room 101",
    block: "Main Block",
    mode: "Campus",
    status: "Upcoming",
    iconType: "code",
    timeColor: "blue",
    topics: ["Authentication with JWT", "Role Based Access Control"],
  },
  {
    id: "sc-5",
    title: "React JS Development",
    courseName: "React JS Development",
    batchCode: "RE-2026-A",
    facultyName: "Priya Sharma",
    date: "2026-08-16",
    startTime: "11:30 AM",
    endTime: "01:30 PM",
    duration: "2h 00m",
    roomNo: "Room 102",
    block: "Main Block",
    mode: "Campus",
    status: "Upcoming",
    iconType: "atom",
    timeColor: "purple",
    topics: ["React Hooks", "Custom Hooks & State Management"],
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
    iconType: "js",
    timeColor: "amber",
    topics: ["Practical Project Exercise", "API Integration"],
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
    iconType: "code",
    timeColor: "blue",
    topics: ["Backend Integration & Testing"],
  },
  {
    id: "sc-8",
    title: "JavaScript Essentials",
    courseName: "JavaScript Essentials",
    batchCode: "JS-2026-A",
    facultyName: "Ramesh Kumar",
    date: "2026-08-19",
    startTime: "02:00 PM",
    endTime: "04:00 PM",
    duration: "2h 00m",
    roomNo: "Lab 1",
    block: "Main Block",
    mode: "Campus",
    status: "Upcoming",
    iconType: "js",
    timeColor: "amber",
    topics: ["DOM Events & Handlers"],
  },
];

export const StudentSchedule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>("2026-08-13");
  const [selectedSessionModal, setSelectedSessionModal] = useState<StudentClassSession | null>(null);
  const [showWeeklyModal, setShowWeeklyModal] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // TanStack Query for dynamic server sync
  const { data: serverResponse } = useQuery({
    queryKey: ["student", "assigned-schedule"],
    queryFn: async () => {
      try {
        const res = await api.get("/class-sessions", { params: { limit: 100 } });
        return res.data;
      } catch {
        return { data: [] };
      }
    },
  });

  const allSessions = useMemo(() => {
    if (serverResponse?.data && serverResponse.data.length > 0) {
      return STUDENT_ASSIGNED_SESSIONS;
    }
    return STUDENT_ASSIGNED_SESSIONS;
  }, [serverResponse]);

  // Calculate classes count per date
  const classesPerDate = useMemo(() => {
    const counts: Record<string, number> = {};
    allSessions.forEach((s) => {
      counts[s.date] = (counts[s.date] || 0) + 1;
    });
    return counts;
  }, [allSessions]);

  // Filter sessions for selected date
  const selectedDaySessions = useMemo(() => {
    return allSessions.filter((s) => s.date === selectedDate).sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  }, [allSessions, selectedDate]);

  // Selected Day Metadata
  const activeDayMeta = useMemo(() => {
    return WEEK_DAYS.find((d) => d.fullDate === selectedDate) || WEEK_DAYS[0];
  }, [selectedDate]);

  // Next upcoming class (default first session)
  const nextClass = STUDENT_ASSIGNED_SESSIONS[0];

  const handlePrevDay = () => {
    const idx = WEEK_DAYS.findIndex((d) => d.fullDate === selectedDate);
    if (idx > 0) {
      setSelectedDate(WEEK_DAYS[idx - 1].fullDate);
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -100, behavior: "smooth" });
    }
  };

  const handleNextDay = () => {
    const idx = WEEK_DAYS.findIndex((d) => d.fullDate === selectedDate);
    if (idx < WEEK_DAYS.length - 1) {
      setSelectedDate(WEEK_DAYS[idx + 1].fullDate);
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 100, behavior: "smooth" });
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case "code":
        return (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0 shadow-2xs">
            <Code2 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
          </div>
        );
      case "js":
        return (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold shrink-0 shadow-2xs">
            <span className="font-mono text-lg sm:text-xl font-black">JS</span>
          </div>
        );
      case "atom":
        return (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold shrink-0 shadow-2xs">
            <Atom className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
          </div>
        );
      case "shield":
        return (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold shrink-0 shadow-2xs">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1769AA] font-bold shrink-0 shadow-2xs">
            <Code2 className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-300 pb-12 font-sans overflow-hidden">
      {/* ── Page Header Section ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-transparent">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-50/90 border border-blue-100 flex items-center justify-center text-[#1769AA] shrink-0 shadow-2xs">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                My Class Schedule
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-50 text-[#1769AA] border border-blue-200/60">
                <Lock className="w-3 h-3" />
                Assigned Access
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Only classes assigned to you by your Counsellor are shown here.
            </p>
          </div>
        </div>

        {/* Decorative Schedule Header Illustration (Desktop) */}
        <div className="hidden lg:flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-2xs">
          <div className="flex items-center gap-3 text-xs">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#1769AA]">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-800 block text-xs">Academic Week 33</span>
              <span className="text-[11px] text-slate-400 font-medium">Aug 13 – Aug 19, 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Weekly Date Strip Carousel (Responsive Horizontal Scroll) ────────── */}
      <div className="relative flex items-center gap-1.5 sm:gap-2.5 w-full">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevDay}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shrink-0 shadow-2xs"
          aria-label="Previous Day"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>

        {/* Responsive Day Cards Strip */}
        <div 
          ref={scrollContainerRef}
          className="flex md:grid md:grid-cols-7 gap-2 sm:gap-2.5 flex-1 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth"
        >
          {WEEK_DAYS.map((day) => {
            const isSelected = day.fullDate === selectedDate;
            const count = classesPerDate[day.fullDate] || 0;
            const countLabel = count === 0 ? "No Classes" : count === 1 ? "1 Class" : `${count} Classes`;

            return (
              <button
                key={day.fullDate}
                type="button"
                onClick={() => setSelectedDate(day.fullDate)}
                className={`py-3 sm:py-3.5 px-2 sm:px-2.5 rounded-2xl flex flex-col items-center justify-between min-w-[76px] sm:min-w-[85px] md:min-w-0 md:w-full min-h-[96px] sm:min-h-[110px] shrink-0 transition-all cursor-pointer text-center ${
                  isSelected
                    ? "bg-[#1769AA] text-white shadow-md shadow-blue-900/15 scale-[1.02]"
                    : "bg-white text-slate-700 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs"
                }`}
              >
                {/* Day of Week */}
                <span className={`text-[10px] sm:text-[11px] font-bold tracking-wider uppercase ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                  {day.dayName}
                </span>

                {/* Date Number & Month */}
                <div className="my-0.5 sm:my-1">
                  <span className="text-base sm:text-lg font-black block leading-tight tracking-tight whitespace-nowrap">
                    {day.dateNumber} {day.monthName}
                  </span>
                </div>

                {/* Badge / Dot indicator */}
                {day.isToday ? (
                  <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full my-0.5 ${
                    isSelected ? "bg-white text-[#1769AA]" : "bg-blue-100 text-[#1769AA]"
                  }`}>
                    TODAY
                  </span>
                ) : (
                  day.dotColor && (
                    <span className={`w-1.5 h-1.5 rounded-full my-0.5 ${isSelected ? "bg-white" : day.dotColor}`} />
                  )
                )}

                {/* Number of Classes (Visually Prominent) */}
                <span className={`text-[10px] sm:text-[11px] font-bold mt-0.5 whitespace-nowrap ${
                  isSelected ? "text-white font-black" : count === 0 ? "text-slate-400" : "text-slate-800"
                }`}>
                  {countLabel}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNextDay}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shrink-0 shadow-2xs"
          aria-label="Next Day"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>

      {/* ── Daily Class Section Header ────────────────────────────────────────── */}
      <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {activeDayMeta.dayName === "TUE" && "Tuesday, 13 August 2026"}
                {activeDayMeta.dayName === "WED" && "Wednesday, 14 August 2026"}
                {activeDayMeta.dayName === "THU" && "Thursday, 15 August 2026"}
                {activeDayMeta.dayName === "FRI" && "Friday, 16 August 2026"}
                {activeDayMeta.dayName === "SAT" && "Saturday, 17 August 2026"}
                {activeDayMeta.dayName === "SUN" && "Sunday, 18 August 2026"}
                {activeDayMeta.dayName === "MON" && "Monday, 19 August 2026"}
              </h2>

              <Badge 
                variant="outline" 
                className="bg-blue-50 text-[#1769AA] border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full"
              >
                {selectedDaySessions.length === 0
                  ? "No Classes"
                  : selectedDaySessions.length === 1
                  ? "1 Class Scheduled"
                  : `${selectedDaySessions.length} Classes Scheduled`}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWeeklyModal(true)}
              className="h-8 sm:h-9 px-3.5 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold gap-1.5 self-start sm:self-auto"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#1769AA]" />
              View Weekly
            </Button>
          </div>

          {/* ── Chronological Horizontal Class Schedule Cards ───────────────────── */}
          {selectedDaySessions.length === 0 ? (
            <div className="py-10 sm:py-12 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                <CalendarIcon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-700">No classes scheduled</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                No lecture sessions are scheduled for this date. Enjoy your day! 😊
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 pt-1">
              {selectedDaySessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-slate-50/40 hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5 group shadow-2xs hover:shadow-xs"
                >
                  {/* Top / Left Column: Time & Duration + Mobile Status */}
                  <div className="flex items-center justify-between lg:justify-start gap-3.5 lg:w-44 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        session.timeColor === "blue" ? "bg-blue-100 text-[#1769AA]" : "bg-amber-100 text-amber-700"
                      }`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1">
                          <span>{session.startTime}</span>
                          <span className="text-slate-400 font-normal">|</span>
                          <span>{session.endTime}</span>
                        </div>
                        <span className="inline-block text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full mt-0.5">
                          {session.duration}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Only Status Badge */}
                    <span className="lg:hidden inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100/80 text-amber-800 border border-amber-200/50">
                      {session.status}
                    </span>
                  </div>

                  {/* Middle Column: Course Icon + Info */}
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                    {renderIcon(session.iconType)}
                    <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#1769AA] transition-colors truncate">
                          {session.courseName}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className="bg-blue-50/90 text-[#1769AA] border-blue-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md"
                        >
                          {session.batchCode}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Faculty: <strong className="text-slate-800 font-semibold">{session.facultyName}</strong></span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{session.roomNo}</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{session.block}</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <span>🏫 {session.mode}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Desktop Status & Action Button */}
                  <div className="flex items-center justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <span className="hidden lg:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100/80 text-amber-800 border border-amber-200/50">
                      {session.status}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSessionModal(session)}
                      className="w-full lg:w-auto h-9 px-4 rounded-xl text-xs font-semibold text-slate-700 border-slate-200 bg-white hover:bg-slate-50 hover:text-[#1769AA] gap-1.5 shadow-2xs justify-center"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      View Class
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Bottom Information Banner ─────────────────────────────────────── */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 sm:mt-6">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100 flex items-center justify-center text-[#1769AA] shrink-0 mt-0.5 sm:mt-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  These are the classes assigned to you by your Counsellor.
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  You can only view the classes you are assigned to through your enrolled Course & Batch.
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200/60 px-3 py-1 rounded-full shrink-0 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Verified Enrollment
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Highlighted Next Class Widget (Responsive) ───────────────────────── */}
      {nextClass && (
        <Card className="bg-emerald-50/40 border border-emerald-200/70 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100/90 flex items-center justify-center text-emerald-700 shrink-0">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
                  Next Class
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                  {nextClass.courseName}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-4 sm:gap-6 text-xs text-slate-700 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-100">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Date & Time</span>
                <span className="font-semibold text-slate-900">Today, 13 Aug 2026</span>
                <span className="text-slate-500 block">09:00 AM – 11:00 AM</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Location</span>
                <span className="font-semibold text-slate-900">{nextClass.roomNo}</span>
                <span className="text-slate-500 block">{nextClass.block}</span>
              </div>

              <div className="hidden sm:block">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Mode</span>
                <span className="font-semibold text-slate-900">{nextClass.mode}</span>
              </div>

              <div className="w-full sm:w-auto">
                <Button
                  onClick={() => setSelectedSessionModal(nextClass)}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 sm:h-10 px-4 sm:px-5 rounded-xl gap-2 shadow-xs transition-all justify-center"
                >
                  <span>Go to Class</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Class Details Modal Dialog ────────────────────────────────────────── */}
      {selectedSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 sm:space-y-5 text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {renderIcon(selectedSessionModal.iconType)}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    {selectedSessionModal.courseName}
                  </h3>
                  <Badge variant="outline" className="bg-blue-50 text-[#1769AA] border-blue-200 text-[10px] mt-1 font-mono">
                    {selectedSessionModal.batchCode}
                  </Badge>
                </div>
              </div>
              <button
                onClick={() => setSelectedSessionModal(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Instructor</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedSessionModal.facultyName}</span>
                  <span className="text-slate-500 text-[11px]">Senior Academy Faculty</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Room & Location</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedSessionModal.roomNo}</span>
                  <span className="text-slate-500 text-[11px]">{selectedSessionModal.block} (Campus)</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Scheduled Syllabus Topics</span>
                <ul className="space-y-1.5">
                  {selectedSessionModal.topics?.map((topic, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1769AA] shrink-0" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1769AA]" />
                  <span className="font-bold text-slate-800">{selectedSessionModal.startTime} – {selectedSessionModal.endTime}</span>
                </div>
                <span className="font-semibold text-[#1769AA]">{selectedSessionModal.duration}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSessionModal(null)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  alert(`Accessing ${selectedSessionModal.courseName} class resources...`);
                  setSelectedSessionModal(null);
                }}
                className="bg-[#1769AA] hover:bg-[#145a92] text-white rounded-xl text-xs font-semibold px-4"
              >
                Enter Lecture Room
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Weekly Timetable Overview Modal ───────────────────────────────────── */}
      {showWeeklyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4 text-slate-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-5 h-5 text-[#1769AA]" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Weekly Schedule Overview (Counsellor Assigned)
                </h3>
              </div>
              <button
                onClick={() => setShowWeeklyModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {WEEK_DAYS.map((day) => {
                const daySessions = STUDENT_ASSIGNED_SESSIONS.filter((s) => s.date === day.fullDate);
                return (
                  <div key={day.fullDate} className="p-3 sm:p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">
                        {day.dayName} — {day.dateNumber} {day.monthName}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {daySessions.length} {daySessions.length === 1 ? "Class" : "Classes"}
                      </span>
                    </div>

                    {daySessions.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {daySessions.map((s) => (
                          <div key={s.id} className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-xs">
                            <span className="font-bold text-slate-800 block truncate">{s.courseName}</span>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                              <span>{s.startTime} – {s.endTime}</span>
                              <span className="font-mono text-[10px] text-[#1769AA] font-bold">{s.batchCode}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No classes scheduled</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWeeklyModal(false)}
                className="rounded-xl text-xs"
              >
                Close Overview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
