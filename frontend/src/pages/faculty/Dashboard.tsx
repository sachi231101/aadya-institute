import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Radio,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
  Filter,
  GraduationCap,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth.store";
import { useSessionStore } from "@/store/session.store";
import { FacultyTimetable } from "@/pages/admin/faculty/FacultyTimetable";
import { InstallDashboardBanner } from "@/components/common/InstallDashboardBanner";

export interface AssignedClass {
  id: string;
  courseName: string;
  subjectName: string;
  batchName: string;
  batchCode: string;
  date: string;
  timeRange: string;
  startTime: string;
  endTime: string;
  location: string;
  roomNo: string;
  mode: "Campus" | "Online" | "Hybrid";
  assignedStudents: number;
  status: "UPCOMING" | "LIVE" | "COMPLETED";
  facultyName: string;
  topics: string[];
}

// ─── ASSIGNED CLASSES DATA FOR FACULTY (STRICTLY ASSIGNED) ─────────────────────

const BASE_ASSIGNED_CLASSES: AssignedClass[] = [
  {
    id: "cls-1",
    courseName: "Java Programming",
    subjectName: "Core Java & OOP Architecture",
    batchName: "Batch C · Full Stack Development",
    batchCode: "JAVA-2026-C",
    date: "Today, 25 Aug 2026",
    timeRange: "09:00 AM – 10:00 AM",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    location: "Room 301, Main Block",
    roomNo: "Room 301",
    mode: "Campus",
    assignedStudents: 28,
    status: "UPCOMING",
    facultyName: "Ramesh Kumar",
    topics: ["Polymorphism & Abstract Classes", "Interfaces in Java", "Exception Handling Basics"],
  },
  {
    id: "cls-2",
    courseName: "Advanced Java",
    subjectName: "Enterprise Java & REST APIs",
    batchName: "Batch A · Enterprise Development",
    batchCode: "ADV-JAVA-2026-A",
    date: "Today, 25 Aug 2026",
    timeRange: "10:00 AM – 11:00 AM",
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    location: "Lab 2, Tech Block",
    roomNo: "Lab 2",
    mode: "Campus",
    assignedStudents: 25,
    status: "UPCOMING",
    facultyName: "Ramesh Kumar",
    topics: ["Spring Boot Starters", "Controller Layer Architecture", "Prisma Database Relations"],
  },
  {
    id: "cls-3",
    courseName: "Python Basics",
    subjectName: "Data Structures & Python Syntax",
    batchName: "Batch B · Data Science Track",
    batchCode: "PY-2026-B",
    date: "Today, 25 Aug 2026",
    timeRange: "02:00 PM – 03:00 PM",
    startTime: "02:00 PM",
    endTime: "03:00 PM",
    location: "Room 302, Main Block",
    roomNo: "Room 302",
    mode: "Campus",
    assignedStudents: 24,
    status: "UPCOMING",
    facultyName: "Ramesh Kumar",
    topics: ["List Comprehensions", "Dictionaries and Sets", "File I/O in Python"],
  },
  {
    id: "cls-4",
    courseName: "OOP Concepts",
    subjectName: "Object Oriented Design Patterns",
    batchName: "Batch C · Core Software",
    batchCode: "OOP-2026-C",
    date: "Tomorrow, 26 Aug 2026",
    timeRange: "11:00 AM – 12:00 PM",
    startTime: "11:00 AM",
    endTime: "12:00 PM",
    location: "Room 303, Main Block",
    roomNo: "Room 303",
    mode: "Campus",
    assignedStudents: 26,
    status: "UPCOMING",
    facultyName: "Ramesh Kumar",
    topics: ["Factory Pattern", "Singleton Design", "Dependency Injection"],
  },
  {
    id: "cls-5",
    courseName: "Database Systems",
    subjectName: "PostgreSQL & Query Optimization",
    batchName: "Batch D · Backend Engineering",
    batchCode: "DB-2026-D",
    date: "Thu, 27 Aug 2026",
    timeRange: "02:00 PM – 03:00 PM",
    startTime: "02:00 PM",
    endTime: "03:00 PM",
    location: "Room 304, Main Block",
    roomNo: "Room 304",
    mode: "Campus",
    assignedStudents: 22,
    status: "UPCOMING",
    facultyName: "Ramesh Kumar",
    topics: ["Indexing Strategies", "Foreign Key Constraints", "Prisma Migrations"],
  },
  {
    id: "cls-6",
    courseName: "Mini Project",
    subjectName: "Full Stack Capstone Mentorship",
    batchName: "Batch C · Capstone Lab",
    batchCode: "PRJ-2026-C",
    date: "Sat, 29 Aug 2026",
    timeRange: "11:00 AM – 01:00 PM",
    startTime: "11:00 AM",
    endTime: "01:00 PM",
    location: "Room 305, Main Block",
    roomNo: "Room 305",
    mode: "Campus",
    assignedStudents: 18,
    status: "UPCOMING",
    facultyName: "Ramesh Kumar",
    topics: ["Project Architecture Review", "API Integration", "Milestone 1 Submissions"],
  },
];

export const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeLiveClass } = useSessionStore();

  const facultyName = user?.name || "Ramesh Kumar";
  const branchName = (user as any)?.branchName || "Bangalore Center";

  // Filter state
  const [activeTab, setActiveTab] = useState<"TODAY" | "ALL" | "UPCOMING" | "COMPLETED">("TODAY");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dynamically map assigned classes & merge live class state
  const myAssignedClasses = useMemo(() => {
    return BASE_ASSIGNED_CLASSES.map((cls) => {
      // Check if session store marks this class as LIVE
      const isLiveNow =
        activeLiveClass?.status === "LIVE" &&
        (activeLiveClass.courseName.toLowerCase().includes(cls.courseName.toLowerCase()) ||
          cls.courseName.toLowerCase().includes(activeLiveClass.courseName.toLowerCase()));

      if (isLiveNow) {
        return { ...cls, status: "LIVE" as const, mode: "Online" as const };
      }
      return cls;
    });
  }, [activeLiveClass]);

  // Metric counts
  const todayClasses = myAssignedClasses.filter((c) => c.date.includes("Today"));
  const liveClasses = myAssignedClasses.filter((c) => c.status === "LIVE");
  const upcomingClasses = myAssignedClasses.filter((c) => c.status === "UPCOMING");
  const completedClasses = myAssignedClasses.filter((c) => c.status === "COMPLETED");

  // Filtered view based on tab and search query
  const displayedClasses = useMemo(() => {
    return myAssignedClasses.filter((c) => {
      // Tab filter
      if (activeTab === "TODAY" && !c.date.includes("Today") && c.status !== "LIVE") return false;
      if (activeTab === "UPCOMING" && c.status !== "UPCOMING" && c.status !== "LIVE") return false;
      if (activeTab === "COMPLETED" && c.status !== "COMPLETED") return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.courseName.toLowerCase().includes(q) ||
          c.subjectName.toLowerCase().includes(q) ||
          c.batchName.toLowerCase().includes(q) ||
          c.batchCode.toLowerCase().includes(q) ||
          c.roomNo.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [myAssignedClasses, activeTab, searchQuery]);

  // Navigate to Class Session Screen
  const handleOpenClass = (cls: AssignedClass) => {
    navigate(
      `/faculty/class-session?course=${encodeURIComponent(cls.courseName)}&batch=${encodeURIComponent(
        cls.batchName
      )}&room=${encodeURIComponent(cls.roomNo)}&time=${encodeURIComponent(
        cls.timeRange
      )}&students=${cls.assignedStudents}`
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1680px] mx-auto space-y-7 animate-in fade-in duration-300">
      <InstallDashboardBanner />

      {/* ─── 1. TOP HEADER BANNER (PERSONALLY GREETING LOGGED-IN FACULTY) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-[#1769AA] to-indigo-900 p-6 sm:p-8 text-white shadow-xl shadow-blue-950/15">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge className="bg-white/20 hover:bg-white/25 text-white border-white/30 text-xs px-3 py-1 font-bold">
                👨‍🏫 Faculty Teaching Desk
              </Badge>
              <Badge className="bg-emerald-400 text-slate-950 hover:bg-emerald-400 font-black text-xs px-3 py-1 border-0">
                {branchName} • Active Instructor
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              Welcome back, {facultyName}! 📚
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed opacity-90">
              Here is your daily teaching schedule. You can view only your assigned courses, mark student attendance, and seamlessly launch your Google Meet live classrooms.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {todayClasses.length > 0 && (
              <Button
                onClick={() => handleOpenClass(todayClasses[0])}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm h-11 px-5 rounded-2xl shadow-lg gap-2 cursor-pointer transition-all transform hover:scale-105"
              >
                <Clock className="w-4 h-4 text-slate-950" />
                <span>Next: {todayClasses[0].courseName} ({todayClasses[0].startTime})</span>
              </Button>
            )}
          </div>
        </div>

        {/* Decorative Background Accents */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* ─── 2. TOP SUMMARY METRICS CARDS ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Today's Classes */}
        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Today's Classes
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {todayClasses.length}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Scheduled for today</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1769AA] shrink-0">
              <Calendar className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Classes */}
        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Upcoming Classes
              </span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-700">
                {upcomingClasses.length}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Next 7 days schedule</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <BookOpen className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>

        {/* Live Classes */}
        <Card
          className={`rounded-2xl shadow-2xs hover:shadow-md transition-all ${
            liveClasses.length > 0
              ? "bg-rose-50/60 border-2 border-rose-400 text-rose-950 animate-pulse"
              : "bg-white border-slate-200/80"
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                {liveClasses.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />}
                Live Classes
              </span>
              <div
                className={`text-2xl sm:text-3xl font-black ${
                  liveClasses.length > 0 ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {liveClasses.length > 0 ? "1 ACTIVE" : "0"}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {liveClasses.length > 0 ? "Google Meet running" : "No live session right now"}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                liveClasses.length > 0
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                  : "bg-rose-50 border border-rose-100 text-rose-600"
              }`}
            >
              <Radio className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>

        {/* Completed Classes */}
        <Card className="bg-white border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Completed Classes
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">14</div>
              <p className="text-[11px] text-slate-500 font-medium">Attendance & recordings saved</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. PROMINENT SECTION: MY ASSIGNED CLASSES ─────────────────────── */}
      <Card className="bg-white border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  My Assigned Classes
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                Teaching schedule strictly filtered for <strong className="text-slate-800 font-bold">{facultyName}</strong> ({branchName}).
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-start md:self-auto overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab("TODAY")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "TODAY"
                    ? "bg-white text-[#1769AA] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Today's Classes ({todayClasses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "ALL"
                    ? "bg-white text-[#1769AA] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Assigned ({myAssignedClasses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("UPCOMING")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "UPCOMING"
                    ? "bg-white text-[#1769AA] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("COMPLETED")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "COMPLETED"
                    ? "bg-white text-[#1769AA] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3 pt-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search assigned courses, batches, or subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50/50 text-xs font-medium focus:bg-white"
              />
            </div>
            <span className="text-xs font-bold text-slate-400 hidden sm:inline">
              Showing {displayedClasses.length} {displayedClasses.length === 1 ? "class" : "classes"}
            </span>
          </div>
        </CardHeader>

        {/* ─── CLASS CARDS GRID ────────────────────────────────────────────── */}
        <CardContent className="p-6 space-y-4">
          {displayedClasses.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-700">No assigned classes found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? "No teaching slots matched your search term."
                  : "You have no classes scheduled under this filter view."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {displayedClasses.map((cls) => {
                const isLive = cls.status === "LIVE";

                return (
                  <div
                    key={cls.id}
                    className={`rounded-3xl p-5 sm:p-6 transition-all flex flex-col justify-between gap-5 relative overflow-hidden group ${
                      isLive
                        ? "bg-rose-50/70 border-2 border-rose-400/90 shadow-lg shadow-rose-950/5"
                        : "bg-slate-50/50 hover:bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    {/* Live pulse accent bar */}
                    {isLive && (
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 animate-pulse" />
                    )}

                    <div className="space-y-3.5">
                      {/* Status & Batch Badge Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-[#1769AA] border-blue-200 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg"
                          >
                            {cls.batchCode}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-500">
                            {cls.batchName}
                          </span>
                        </div>

                        {isLive ? (
                          <Badge className="bg-rose-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-sm animate-pulse flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            🔴 LIVE NOW
                          </Badge>
                        ) : cls.status === "COMPLETED" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200">
                            ✓ Completed
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            🟢 Upcoming
                          </Badge>
                        )}
                      </div>

                      {/* Course Title & Subject */}
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight group-hover:text-[#1769AA] transition-colors">
                          {cls.courseName}
                        </h3>
                        <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                          {cls.subjectName}
                        </p>
                      </div>

                      {/* Info Chips (Time, Location, Assigned Students) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-white/80 p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                          <Clock className="w-4 h-4 text-[#1769AA] shrink-0" />
                          <span className="font-bold">{cls.timeRange}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-white/80 p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                          <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong className="font-black text-slate-900">{cls.assignedStudents}</strong> Assigned Students
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{cls.date}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                          {isLive ? (
                            <>
                              <Video className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="font-bold text-rose-700">Google Meet (Online)</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{cls.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold text-slate-500">
                        Assigned Faculty: <strong className="text-slate-800">{cls.facultyName}</strong>
                      </div>

                      {isLive ? (
                        <Button
                          type="button"
                          onClick={() => handleOpenClass(cls)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs h-10 px-5 rounded-xl shadow-md shadow-rose-600/20 gap-2 cursor-pointer transform hover:scale-105 transition-all"
                        >
                          <Video className="w-4 h-4" />
                          <span>Manage Live Class →</span>
                        </Button>
                      ) : cls.status === "COMPLETED" ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleOpenClass(cls)}
                          className="text-xs font-bold h-10 px-4 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 cursor-pointer"
                        >
                          <span>View Summary →</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => handleOpenClass(cls)}
                          className="bg-[#1769AA] hover:bg-[#125890] text-white font-black text-xs h-10 px-5 rounded-xl shadow-md gap-2 cursor-pointer transform hover:scale-105 transition-all"
                        >
                          <span>Open Class Session & Attendance</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 4. TIMETABLE SECTION (STRICTLY FACULTY'S ASSIGNED SCHEDULE) ───── */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1769AA]" />
              My Weekly Timetable Overview
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Only your assigned teaching slots are shown. Free slots display as <strong className="text-emerald-700">FREE</strong> without class creation options.
            </p>
          </div>

          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-semibold px-3 py-1 self-start sm:self-auto">
            Admin Controlled Scheduling
          </Badge>
        </div>

        {/* Embedded read-only Timetable */}
        <FacultyTimetable readOnly={true} />
      </div>
    </div>
  );
};
