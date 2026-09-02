import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Radio,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Play,
  Film,
  FileText,
  RefreshCw,
  Loader2,
  CalendarDays,
  Coffee,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth.store";
import { useSessionStore } from "@/store/session.store";
import { useFacultyDashboard } from "@/hooks/useFaculty";
import { useClassSessions } from "@/hooks/useClassSessions";
import { StartClassModal, type ClassSessionModalData } from "@/components/faculty/StartClassModal";
import { UploadRecordingModal } from "@/components/faculty/UploadRecordingModal";
import { UploadStudyMaterialsModal } from "@/components/faculty/UploadStudyMaterialsModal";

interface FormattedTimetableClass {
  id: string;
  title: string;
  courseName: string;
  subjectName: string;
  batchId?: string;
  batchName: string;
  batchCode: string;
  date: string;
  startTime: string;
  endTime: string;
  timeRange: string;
  roomNo: string;
  mode: "OFFLINE" | "ONLINE" | "HYBRID";
  meetingUrl?: string;
  status: "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED" | "NOT STARTED";
  studentCount: number;
  attendancePresent?: number;
  attendanceTotal?: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  hasRecording?: boolean;
  hasMaterials?: boolean;
}

const DAYS_OF_WEEK = [
  { key: 1, name: "Monday", short: "MON" },
  { key: 2, name: "Tuesday", short: "TUE" },
  { key: 3, name: "Wednesday", short: "WED" },
  { key: 4, name: "Thursday", short: "THU" },
  { key: 5, name: "Friday", short: "FRI" },
  { key: 6, name: "Saturday", short: "SAT" },
  { key: 0, name: "Sunday", short: "SUN" },
];

const TIME_SLOTS = [
  { id: 1, label: "09:00 – 10:00", title: "09:00", hour24: 9, isBreak: false },
  { id: 2, label: "10:00 – 11:00", title: "10:00", hour24: 10, isBreak: false },
  { id: 3, label: "11:00 – 12:00", title: "11:00", hour24: 11, isBreak: false },
  { id: 4, label: "12:00 – 01:00", title: "12:00", hour24: 12, isBreak: false },
  { id: 5, label: "01:00 – 02:00", title: "01:00", hour24: 13, isBreak: true, breakTitle: "Lunch Break" },
  { id: 6, label: "02:00 – 03:00", title: "02:00", hour24: 14, isBreak: false },
  { id: 7, label: "03:00 – 04:00", title: "03:00", hour24: 15, isBreak: false },
  { id: 8, label: "04:00 – 05:00", title: "04:00", hour24: 16, isBreak: false },
  { id: 9, label: "05:00 – 06:00", title: "05:00", hour24: 17, isBreak: false },
];

const parseTimeTo24Hour = (timeStr: string): { hour: number; min: number } => {
  if (!timeStr) return { hour: 9, min: 0 };
  const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3]?.toUpperCase();
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return { hour: h, min: m };
  }
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 9;
  const m = parseInt(parts[1], 10) || 0;
  return { hour: h, min: m };
};

const toISODateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const FacultyMySchedule: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeLiveClass } = useSessionStore();

  const { data: dashRes, isLoading: isDashLoading, refetch: refetchDash } = useFacultyDashboard();
  const dashboard = dashRes?.data;
  const facultyId = user?.facultyId || dashboard?.profile?.id;

  // Query class sessions strictly for this faculty
  const { data: sessionsRes, isLoading: isSessionsLoading, refetch: refetchSessions } = useClassSessions(
    facultyId ? { facultyId, limit: 100 } : undefined
  );

  // Week Navigator State (Base Monday date)
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Mobile selected day index (0 to 6)
  const [mobileDayIndex, setMobileDayIndex] = useState<number>(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1; // 0 for Monday, 6 for Sunday
  });

  // Filters State
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [selectedMode, setSelectedMode] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"TIMETABLE" | "LIST">("TIMETABLE");

  // Active selected modal state
  const [selectedClassForModal, setSelectedClassForModal] = useState<ClassSessionModalData | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [recordingModalSession, setRecordingModalSession] = useState<ClassSessionModalData | null>(null);
  const [materialsModalSession, setMaterialsModalSession] = useState<ClassSessionModalData | null>(null);

  const todayIso = useMemo(() => toISODateString(new Date()), []);

  // Compute 7 days for current week view
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentWeekMonday);
      d.setDate(d.getDate() + i);
      const iso = toISODateString(d);
      const dayNum = d.getDay();
      const dayMeta = DAYS_OF_WEEK.find((item) => item.key === dayNum) || {
        name: "Day",
        short: "DAY",
      };
      return {
        date: d,
        iso,
        dayName: dayMeta.name,
        dayShort: dayMeta.short,
        formattedDate: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        isToday: iso === todayIso,
      };
    });
  }, [currentWeekMonday, todayIso]);

  // Demo preview toggle (default true so faculty can explore interactive schedule)
  const [showDemoData, setShowDemoData] = useState<boolean>(true);

  // Combine and normalize sessions strictly assigned to this faculty
  const assignedClasses: FormattedTimetableClass[] = useMemo(() => {
    const rawSessions = sessionsRes?.data || [];
    const dashToday = dashboard?.todaySessions || [];
    const dashUpcoming = dashboard?.upcomingSessions || [];

    const map = new Map<string, FormattedTimetableClass>();

    const userFacultyId = user?.facultyId || dashboard?.profile?.id;
    const userEmail = user?.email || dashboard?.profile?.email;
    const userName = user?.name || dashboard?.profile?.name;

    const isAssigned = (s: any) => {
      if (userFacultyId && (s.facultyId === userFacultyId || s.faculty?.id === userFacultyId)) return true;
      if (userEmail && s.faculty?.user?.email && s.faculty.user.email.toLowerCase() === userEmail.toLowerCase()) return true;
      if (userName && s.faculty?.user?.name && s.faculty.user.name.toLowerCase() === userName.toLowerCase()) return true;
      if (!userFacultyId && !s.facultyId) return true;
      return false;
    };

    // 1. Process from class-sessions API
    rawSessions.forEach((s: any) => {
      if (!isAssigned(s)) return;

      const scheduledDate = s.scheduledDate
        ? toISODateString(new Date(s.scheduledDate))
        : todayIso;

      let status = (s.sessionStatus || s.status || "UPCOMING").toUpperCase() as any;
      if (activeLiveClass?.status === "LIVE" && activeLiveClass?.sessionId === s.id) {
        status = "LIVE";
      }

      const startParsed = parseTimeTo24Hour(s.startTime || "10:00");
      const endParsed = parseTimeTo24Hour(s.endTime || "11:30");

      map.set(s.id, {
        id: s.id,
        title: s.title || s.batchModule?.courseModule?.name || "Class Session",
        courseName: s.batch?.course?.name || "Assigned Course",
        subjectName: s.batchModule?.courseModule?.name || s.title || "Subject Module",
        batchId: s.batchId,
        batchName: s.batch?.name || s.batch?.code || "Batch",
        batchCode: s.batch?.code || "BATCH",
        date: scheduledDate,
        startTime: s.startTime || "10:00 AM",
        endTime: s.endTime || "11:30 AM",
        timeRange: `${s.startTime || "10:00 AM"} – ${s.endTime || "11:30 AM"}`,
        roomNo: s.roomNo || "Room 101",
        mode: (s.mode as any) || "OFFLINE",
        meetingUrl: s.meetingUrl,
        status,
        studentCount: s.enrolledStudentsCount || s.batch?._count?.enrollments || 0,
        attendancePresent: status === "COMPLETED" ? (s.enrolledStudentsCount || 28) : undefined,
        attendanceTotal: s.enrolledStudentsCount || 30,
        startHour: startParsed.hour,
        startMin: startParsed.min,
        endHour: endParsed.hour,
        endMin: endParsed.min,
        hasRecording: status === "COMPLETED",
        hasMaterials: true,
      });
    });

    // 2. Supplement from dashboard sessions
    [...dashToday, ...dashUpcoming].forEach((s: any) => {
      if (!map.has(s.id)) {
        const scheduledDate = s.scheduledDate
          ? toISODateString(new Date(s.scheduledDate))
          : todayIso;

        let status = (s.sessionStatus || "UPCOMING").toUpperCase() as any;
        if (activeLiveClass?.status === "LIVE" && activeLiveClass?.sessionId === s.id) {
          status = "LIVE";
        }

        const startParsed = parseTimeTo24Hour(s.startTime || "10:00");
        const endParsed = parseTimeTo24Hour(s.endTime || "11:30");

        map.set(s.id, {
          id: s.id,
          title: s.title || s.subjectName || "Class Session",
          courseName: s.courseName || "Assigned Course",
          subjectName: s.subjectName || s.courseName || "Subject Module",
          batchId: s.batchId,
          batchName: s.batchName || s.batchCode || "Batch",
          batchCode: s.batchCode || "BATCH",
          date: scheduledDate,
          startTime: s.startTime || "10:00 AM",
          endTime: s.endTime || "11:30 AM",
          timeRange: `${s.startTime || "10:00 AM"} – ${s.endTime || "11:30 AM"}`,
          roomNo: s.roomNo || "Room 101",
          mode: (s.mode as any) || "OFFLINE",
          meetingUrl: s.meetingUrl,
          status,
          studentCount: s.assignedStudents || 0,
          attendancePresent: status === "COMPLETED" ? s.assignedStudents : undefined,
          attendanceTotal: s.assignedStudents || 0,
          startHour: startParsed.hour,
          startMin: startParsed.min,
          endHour: endParsed.hour,
          endMin: endParsed.min,
          hasRecording: status === "COMPLETED",
          hasMaterials: true,
        });
      }
    });

    // 3. Mock demo classes injection (for testing & previewing the full workflow)
    if (showDemoData && map.size === 0 && weekDays.length >= 7) {
      const [mon, tue, wed, thu, fri] = weekDays;
      const mockItems: FormattedTimetableClass[] = [
        {
          id: "mock-mon-1",
          title: "OOP & Multithreading",
          courseName: "Java Fullstack Development",
          subjectName: "Multithreading & JVM Architecture",
          batchName: "Java Fullstack - Batch 01",
          batchCode: "JAV-01",
          date: mon.iso,
          startTime: "09:00 AM",
          endTime: "11:00 AM",
          timeRange: "09:00 AM – 11:00 AM",
          roomNo: "Room 301",
          mode: "OFFLINE",
          status: "COMPLETED",
          studentCount: 30,
          attendancePresent: 28,
          attendanceTotal: 30,
          startHour: 9,
          startMin: 0,
          endHour: 11,
          endMin: 0,
          hasRecording: true,
          hasMaterials: true,
        },
        {
          id: "mock-mon-2",
          title: "SQL & Query Optimization",
          courseName: "Database Systems",
          subjectName: "Indexes, Transactions & Views",
          batchName: "Database - Batch 02",
          batchCode: "DB-02",
          date: mon.iso,
          startTime: "02:00 PM",
          endTime: "04:00 PM",
          timeRange: "02:00 PM – 04:00 PM",
          roomNo: "LAB-104",
          mode: "OFFLINE",
          status: "COMPLETED",
          studentCount: 26,
          attendancePresent: 25,
          attendanceTotal: 26,
          startHour: 14,
          startMin: 0,
          endHour: 16,
          endMin: 0,
          hasRecording: true,
          hasMaterials: true,
        },
        {
          id: "mock-tue-1",
          title: "Data Manipulation with Pandas",
          courseName: "Python for Data Science",
          subjectName: "Pandas, NumPy & Vectorization",
          batchName: "Data Science - Batch 01",
          batchCode: "DS-01",
          date: tue.iso,
          startTime: "10:00 AM",
          endTime: "12:00 PM",
          timeRange: "10:00 AM – 12:00 PM",
          roomNo: "LAB-205",
          mode: "OFFLINE",
          status: "COMPLETED",
          studentCount: 34,
          attendancePresent: 32,
          attendanceTotal: 34,
          startHour: 10,
          startMin: 0,
          endHour: 12,
          endMin: 0,
          hasRecording: true,
          hasMaterials: true,
        },
        {
          id: "mock-tue-2",
          title: "Modern CSS Grid & Animations",
          courseName: "React & Frontend Development",
          subjectName: "Responsive Layouts & Tailwind",
          batchName: "Full Stack - Batch 01",
          batchCode: "FSD-01",
          date: tue.iso,
          startTime: "03:00 PM",
          endTime: "05:00 PM",
          timeRange: "03:00 PM – 05:00 PM",
          roomNo: "LAB-204",
          mode: "OFFLINE",
          status: "COMPLETED",
          studentCount: 32,
          attendancePresent: 30,
          attendanceTotal: 32,
          startHour: 15,
          startMin: 0,
          endHour: 17,
          endMin: 0,
          hasRecording: true,
          hasMaterials: true,
        },
        {
          id: "mock-wed-1",
          title: "React Hooks & State Management",
          courseName: "React & Frontend Development",
          subjectName: "useEffect, useMemo & Context API",
          batchName: "Full Stack - Batch 01",
          batchCode: "FSD-01",
          date: wed.iso,
          startTime: "10:00 AM",
          endTime: "12:00 PM",
          timeRange: "10:00 AM – 12:00 PM",
          roomNo: "LAB-204",
          mode: "OFFLINE",
          status: activeLiveClass?.status === "COMPLETED" ? "COMPLETED" : "LIVE",
          studentCount: 32,
          attendancePresent: 28,
          attendanceTotal: 32,
          startHour: 10,
          startMin: 0,
          endHour: 12,
          endMin: 0,
          hasRecording: false,
          hasMaterials: true,
        },
        {
          id: "mock-wed-2",
          title: "RESTful API Architecture",
          courseName: "Node.js & Backend Architecture",
          subjectName: "Express Routing & Middleware",
          batchName: "Full Stack - Batch 02",
          batchCode: "FSD-02",
          date: wed.iso,
          startTime: "02:00 PM",
          endTime: "04:00 PM",
          timeRange: "02:00 PM – 04:00 PM",
          roomNo: "LAB-202",
          mode: "OFFLINE",
          status: "UPCOMING",
          studentCount: 28,
          startHour: 14,
          startMin: 0,
          endHour: 16,
          endMin: 0,
          hasRecording: false,
          hasMaterials: true,
        },
        {
          id: "mock-thu-1",
          title: "Custom React Hooks & Performance",
          courseName: "React & Frontend Development",
          subjectName: "useCallback & Virtual DOM Tuning",
          batchName: "Full Stack - Batch 01",
          batchCode: "FSD-01",
          date: thu.iso,
          startTime: "10:00 AM",
          endTime: "12:00 PM",
          timeRange: "10:00 AM – 12:00 PM",
          roomNo: "LAB-204",
          mode: "OFFLINE",
          status: "UPCOMING",
          studentCount: 32,
          startHour: 10,
          startMin: 0,
          endHour: 12,
          endMin: 0,
          hasRecording: false,
          hasMaterials: true,
        },
        {
          id: "mock-thu-2",
          title: "Docker Containers & Deployments",
          courseName: "DevOps & Cloud Systems",
          subjectName: "Dockerizing Node Apps & Compose",
          batchName: "Cloud - Batch 01",
          batchCode: "CLD-01",
          date: thu.iso,
          startTime: "03:00 PM",
          endTime: "05:00 PM",
          timeRange: "03:00 PM – 05:00 PM",
          roomNo: "Online",
          mode: "ONLINE",
          meetingUrl: "https://meet.google.com/aady-cld-demo",
          status: "UPCOMING",
          studentCount: 40,
          startHour: 15,
          startMin: 0,
          endHour: 17,
          endMin: 0,
          hasRecording: false,
          hasMaterials: true,
        },
        {
          id: "mock-fri-1",
          title: "JWT Authentication & Security",
          courseName: "Node.js & Backend Architecture",
          subjectName: "bcrypt, Token Verification & RBAC",
          batchName: "Full Stack - Batch 02",
          batchCode: "FSD-02",
          date: fri.iso,
          startTime: "09:00 AM",
          endTime: "11:00 AM",
          timeRange: "09:00 AM – 11:00 AM",
          roomNo: "LAB-202",
          mode: "OFFLINE",
          status: "UPCOMING",
          studentCount: 28,
          startHour: 9,
          startMin: 0,
          endHour: 11,
          endMin: 0,
          hasRecording: false,
          hasMaterials: true,
        },
        {
          id: "mock-fri-2",
          title: "Fullstack Project Mentorship",
          courseName: "Capstone Project Mentorship",
          subjectName: "Sprint Review & Code Walkthroughs",
          batchName: "Full Stack - Batch 01",
          batchCode: "FSD-01",
          date: fri.iso,
          startTime: "02:00 PM",
          endTime: "04:00 PM",
          timeRange: "02:00 PM – 04:00 PM",
          roomNo: "LAB-204",
          mode: "OFFLINE",
          status: "UPCOMING",
          studentCount: 32,
          startHour: 14,
          startMin: 0,
          endHour: 16,
          endMin: 0,
          hasRecording: false,
          hasMaterials: true,
        },
      ];

      mockItems.forEach((m) => map.set(m.id, m));
    }

    return Array.from(map.values());
  }, [sessionsRes, dashboard, user, activeLiveClass, todayIso]);

  // Extract filter option lists strictly from assigned classes
  const coursesList = useMemo(() => {
    const set = new Set<string>();
    assignedClasses.forEach((c) => {
      if (c.courseName) set.add(c.courseName);
    });
    return Array.from(set);
  }, [assignedClasses]);

  const batchesList = useMemo(() => {
    const set = new Set<string>();
    assignedClasses.forEach((c) => {
      if (c.batchCode) set.add(c.batchCode);
    });
    return Array.from(set);
  }, [assignedClasses]);

  // Filtered assigned classes
  const filteredClasses = useMemo(() => {
    return assignedClasses.filter((c) => {
      if (selectedCourse !== "ALL" && c.courseName !== selectedCourse) return false;
      if (selectedBatch !== "ALL" && c.batchCode !== selectedBatch) return false;
      if (selectedMode !== "ALL" && c.mode !== selectedMode) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchCourse = c.courseName.toLowerCase().includes(q);
        const matchSubject = c.subjectName.toLowerCase().includes(q);
        const matchBatch = c.batchCode.toLowerCase().includes(q) || c.batchName.toLowerCase().includes(q);
        const matchRoom = c.roomNo.toLowerCase().includes(q);
        if (!matchTitle && !matchCourse && !matchSubject && !matchBatch && !matchRoom) {
          return false;
        }
      }
      return true;
    });
  }, [assignedClasses, selectedCourse, selectedBatch, selectedMode, searchQuery]);

  // Today Highlights
  const todayClasses = useMemo(() => {
    return assignedClasses.filter((c) => c.date === todayIso);
  }, [assignedClasses, todayIso]);

  const liveClassToday = useMemo(() => {
    return todayClasses.find((c) => c.status === "LIVE");
  }, [todayClasses]);

  const nextUpcomingClassToday = useMemo(() => {
    return todayClasses.find((c) => c.status === "UPCOMING");
  }, [todayClasses]);

  // Week navigation helpers
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekMonday);
    next.setDate(next.getDate() + 7);
    setCurrentWeekMonday(next);
  };

  const handleCurrentWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekMonday(monday);
  };

  const handleOpenClassModal = (cls: FormattedTimetableClass) => {
    navigate(
      `/faculty/class-session?id=${encodeURIComponent(cls.id)}&course=${encodeURIComponent(cls.courseName)}&subject=${encodeURIComponent(cls.subjectName)}&batch=${encodeURIComponent(cls.batchName || cls.batchCode)}&room=${encodeURIComponent(cls.roomNo)}&time=${encodeURIComponent(cls.timeRange || `${cls.startTime} – ${cls.endTime}`)}&date=${encodeURIComponent(cls.date)}`
    );
  };

  const handleSessionStatusChange = () => {
    refetchSessions();
    refetchDash();
  };

  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0].formattedDate;
    const end = weekDays[6].formattedDate;
    const year = currentWeekMonday.getFullYear();
    return `${start} – ${end}, ${year}`;
  }, [weekDays, currentWeekMonday]);

  const isLoading = isDashLoading || isSessionsLoading;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1680px] mx-auto min-h-screen">
      {/* ─── Top Header Banner ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1769AA] bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full">
              Faculty Portal
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">My Schedule</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-[#1769AA]" />
            My Class Timetable
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live and upcoming classes assigned to you.
          </p>
        </div>

        {/* View Switcher, Demo Mode Toggle & Quick Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDemoData(!showDemoData)}
            className={`h-9 text-xs rounded-xl font-bold transition-all ${
              showDemoData
                ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300"
                : "bg-slate-50 text-slate-600 border-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            {showDemoData ? "Sample Mock Active (Toggle)" : "Real Backend Only"}
          </Button>

          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("TIMETABLE")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "TIMETABLE"
                  ? "bg-white dark:bg-slate-900 text-[#1769AA] shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Timetable Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "LIST"
                  ? "bg-white dark:bg-slate-900 text-[#1769AA] shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Class List
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSessions();
              refetchDash();
            }}
            className="rounded-xl h-9 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-500" /> Refresh
          </Button>
        </div>
      </div>

      {/* ─── Today Highlights Strip (If Classes Scheduled) ─── */}
      {liveClassToday ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-white animate-ping" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-md">
                ● LIVE NOW
              </span>
              <p className="font-bold text-sm sm:text-base mt-1">
                {liveClassToday.courseName} — {liveClassToday.subjectName} ({liveClassToday.batchCode})
              </p>
              <p className="text-xs text-red-100 font-medium">
                {liveClassToday.timeRange} • {liveClassToday.roomNo} • {liveClassToday.studentCount} Students
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenClassModal(liveClassToday)}
            className="bg-white hover:bg-slate-100 text-red-700 font-black text-xs rounded-xl shadow-xs self-start sm:self-auto h-9"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Manage Live Class
          </Button>
        </div>
      ) : nextUpcomingClassToday ? (
        <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-[#1769AA] text-white flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#1769AA] dark:text-blue-400">
                Next Class Today: {nextUpcomingClassToday.courseName} ({nextUpcomingClassToday.timeRange})
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Batch: {nextUpcomingClassToday.batchCode} • {nextUpcomingClassToday.roomNo} • {nextUpcomingClassToday.studentCount} Students
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleOpenClassModal(nextUpcomingClassToday)}
            className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs rounded-xl h-8 self-start sm:self-auto"
          >
            <Play className="w-3 h-3 mr-1 fill-current" /> Start Class
          </Button>
        </div>
      ) : null}

      {/* ─── Week Navigation & Filters Bar ─── */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Week Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevWeek}
                className="h-8 w-8 p-0 rounded-xl"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCurrentWeek}
                className="h-8 text-xs font-semibold px-3 rounded-xl border-[#1769AA]/30 text-[#1769AA] hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                Current Week (Today)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
                className="h-8 w-8 p-0 rounded-xl"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <CalendarIcon className="w-4 h-4 text-[#1769AA]" />
              <span>{weekRangeLabel}</span>
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search course, module, batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            {/* Course Filter */}
            <div>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">All Assigned Courses</option>
                {coursesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Filter */}
            <div>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">All Batches</option>
                {batchesList.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Filter */}
            <div>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">All Modes (Offline / Online)</option>
                <option value="OFFLINE">Offline / Campus</option>
                <option value="ONLINE">Online / Virtual</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Main Timetable Grid / List Display ─── */}
      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1769AA] mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading your assigned class timetable...</p>
        </div>
      ) : viewMode === "TIMETABLE" ? (
        <div className="space-y-4">
          {/* ─── Desktop Academic Timetable Matrix (Hidden on Mobile) ─── */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full border-collapse text-left min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="p-3.5 border-r border-slate-200 dark:border-slate-800 w-36 text-center shrink-0">
                    DAY / DATE
                  </th>
                  {TIME_SLOTS.map((slot) => (
                    <th
                      key={slot.id}
                      className={`p-3 border-r border-slate-200 dark:border-slate-800 text-center ${
                        slot.isBreak
                          ? "bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 w-24"
                          : "min-w-[130px]"
                      }`}
                    >
                      <span className="block font-black">{slot.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{slot.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {weekDays.map((day) => {
                  const dayClasses = filteredClasses.filter((c) => c.date === day.iso);

                  return (
                    <tr
                      key={day.iso}
                      className={`transition-colors ${
                        day.isToday
                          ? "bg-blue-50/30 dark:bg-blue-950/10 ring-1 ring-inset ring-[#1769AA]/30"
                          : "hover:bg-slate-50/40 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      {/* Left Day/Date Header Cell */}
                      <td
                        className={`p-3.5 border-r border-slate-200 dark:border-slate-800 text-center font-bold ${
                          day.isToday
                            ? "bg-[#1769AA]/10 text-[#1769AA] dark:bg-blue-950/40"
                            : "bg-slate-50/40 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-xs uppercase tracking-wider font-black">
                            {day.dayShort}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 mt-0.5">
                            {day.formattedDate}
                          </span>
                          {day.isToday && (
                            <Badge className="bg-[#1769AA] text-white text-[9px] font-bold px-1.5 py-0 mt-1 rounded-full">
                              TODAY
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Time Slot Cells */}
                      {TIME_SLOTS.map((slot) => {
                        if (slot.isBreak) {
                          return (
                            <td
                              key={slot.id}
                              className="p-2 border-r border-slate-200 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/10 text-center"
                            >
                              <div className="flex flex-col items-center justify-center text-amber-700/70 dark:text-amber-400/60 text-[10px] font-semibold py-4">
                                <Coffee className="w-3.5 h-3.5 mb-0.5" />
                                <span>Break</span>
                              </div>
                            </td>
                          );
                        }

                        // Find class matching this time slot
                        const matchingClass = dayClasses.find((c) => {
                          return c.startHour <= slot.hour24 && c.endHour > slot.hour24;
                        });

                        return (
                          <td
                            key={slot.id}
                            className="p-1.5 border-r border-slate-200 dark:border-slate-800 align-top min-h-[90px]"
                          >
                            {matchingClass ? (
                              <div
                                onClick={() => handleOpenClassModal(matchingClass)}
                                className={`p-2 rounded-xl border text-left cursor-pointer transition-all hover:shadow-md ${
                                  matchingClass.status === "LIVE"
                                    ? "bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 shadow-sm"
                                    : matchingClass.status === "COMPLETED"
                                    ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                                    : "bg-blue-50/50 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/50 hover:border-[#1769AA]"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-[9px] px-1 py-0 h-3.5 bg-white dark:bg-slate-800"
                                  >
                                    {matchingClass.batchCode}
                                  </Badge>
                                  {matchingClass.status === "LIVE" ? (
                                    <Badge className="bg-red-600 text-white font-bold text-[8px] px-1 py-0 h-3.5 animate-pulse">
                                      LIVE
                                    </Badge>
                                  ) : matchingClass.status === "COMPLETED" ? (
                                    <Badge className="bg-emerald-600 text-white text-[8px] px-1 py-0 h-3.5">
                                      Done
                                    </Badge>
                                  ) : null}
                                </div>

                                <p className="font-bold text-[11px] text-slate-900 dark:text-white line-clamp-1">
                                  {matchingClass.courseName}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                  {matchingClass.subjectName}
                                </p>

                                <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 mt-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                                  <span className="truncate max-w-[70px]">{matchingClass.roomNo}</span>
                                  <span>{matchingClass.startTime}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full min-h-[70px] flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs select-none">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ─── Mobile / Tablet Responsive Daily View ─── */}
          <div className="lg:hidden space-y-3">
            {/* Mobile Day Switcher Tabs */}
            <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto gap-1">
              {weekDays.map((day, idx) => (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setMobileDayIndex(idx)}
                  className={`flex-1 min-w-[42px] py-2 px-1 text-center rounded-xl transition-all ${
                    mobileDayIndex === idx
                      ? "bg-[#1769AA] text-white font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
                  }`}
                >
                  <span className="block text-[10px] uppercase font-mono">{day.dayShort}</span>
                  <span className="block text-xs font-black">{day.date.getDate()}</span>
                </button>
              ))}
            </div>

            {/* Selected Mobile Day Classes */}
            {(() => {
              const activeDay = weekDays[mobileDayIndex] || weekDays[0];
              const dayClasses = filteredClasses.filter((c) => c.date === activeDay.iso);

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 px-1">
                    <span>
                      {activeDay.dayName}, {activeDay.formattedDate}
                    </span>
                    {activeDay.isToday && (
                      <Badge className="bg-[#1769AA] text-white text-[10px]">TODAY</Badge>
                    )}
                  </div>

                  {dayClasses.length > 0 ? (
                    dayClasses.map((cls) => (
                      <Card
                        key={cls.id}
                        onClick={() => handleOpenClassModal(cls)}
                        className={`rounded-2xl border cursor-pointer hover:shadow-md transition-all ${
                          cls.status === "LIVE"
                            ? "bg-red-50/70 dark:bg-red-950/30 border-red-300"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <CardContent className="p-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold font-mono text-[#1769AA]">
                              {cls.timeRange}
                            </span>
                            {cls.status === "LIVE" ? (
                              <Badge className="bg-red-600 text-white text-xs font-black animate-pulse">
                                ● LIVE NOW
                              </Badge>
                            ) : cls.status === "COMPLETED" ? (
                              <Badge className="bg-emerald-600 text-white text-xs">Completed</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Upcoming
                              </Badge>
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {cls.courseName}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {cls.subjectName}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {cls.batchCode}
                            </Badge>
                            <span>{cls.roomNo} ({cls.mode})</span>
                            <span>{cls.studentCount} Students</span>
                          </div>

                          <Button
                            size="sm"
                            className={`w-full text-xs font-bold rounded-xl h-8 ${
                              cls.status === "LIVE"
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-[#1769AA] hover:bg-[#125890] text-white"
                            }`}
                          >
                            {cls.status === "LIVE" ? "Resume Class" : "Open Class Session"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="rounded-2xl border-dashed border-slate-200 dark:border-slate-800">
                      <CardContent className="py-12 text-center text-xs text-slate-400 space-y-1">
                        <BookOpen className="w-6 h-6 mx-auto opacity-50" />
                        <p>No classes scheduled for {activeDay.dayName}.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Empty schedule notice if zero classes in the entire week */}
          {assignedClasses.length === 0 && (
            <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-center space-y-1.5 max-w-xl mx-auto mt-4">
              <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                No classes allocated for this week.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Your assigned lecture timetable will populate automatically as academic batches are scheduled.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ─── Class List View ─── */
        <div className="space-y-3">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls) => (
              <Card
                key={cls.id}
                className="border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-md transition-shadow overflow-hidden"
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cls.status === "LIVE" ? (
                        <Badge className="bg-red-500 text-white font-bold text-xs px-2 py-0.5 animate-pulse">
                          ● LIVE NOW
                        </Badge>
                      ) : cls.status === "COMPLETED" ? (
                        <Badge className="bg-emerald-600 text-white font-semibold text-xs px-2 py-0.5">
                          COMPLETED
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs px-2 py-0.5 text-[#1769AA] bg-blue-50/60 font-semibold"
                        >
                          UPCOMING
                        </Badge>
                      )}
                      <Badge variant="outline" className="font-mono text-xs">
                        {cls.batchCode}
                      </Badge>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#1769AA]" />
                        {cls.date} ({cls.timeRange})
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {cls.courseName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Module: <span className="font-medium text-slate-700 dark:text-slate-300">{cls.subjectName}</span>
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {cls.roomNo} ({cls.mode})
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {cls.studentCount} Students
                      </span>
                      {cls.status === "COMPLETED" && (
                        <span className="text-emerald-600 font-semibold">
                          Attendance: {cls.attendancePresent || cls.studentCount}/{cls.studentCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {cls.status === "LIVE" ? (
                      <Button
                        onClick={() => handleOpenClassModal(cls)}
                        className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold h-9 text-xs px-4"
                      >
                        <Play className="w-3.5 h-3.5 mr-1 fill-current" /> RESUME CLASS
                      </Button>
                    ) : cls.status === "COMPLETED" ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecordingModalSession(cls)}
                          className="rounded-xl h-8 text-xs font-semibold"
                        >
                          <Film className="w-3.5 h-3.5 mr-1 text-[#1769AA]" /> Recording
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMaterialsModalSession(cls)}
                          className="rounded-xl h-8 text-xs font-semibold"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Materials
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenClassModal(cls)}
                          className="rounded-xl h-8 text-xs"
                        >
                          Details
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleOpenClassModal(cls)}
                        className="rounded-xl bg-[#1769AA] hover:bg-[#125890] text-white font-bold h-9 text-xs px-4"
                      >
                        <Play className="w-3.5 h-3.5 mr-1 fill-current" /> START CLASS
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              No classes matching your filter criteria.
            </div>
          )}
        </div>
      )}

      {/* ─── Start Class Centered Modal ─── */}
      <StartClassModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        session={selectedClassForModal}
        onSessionStatusChange={handleSessionStatusChange}
      />

      {/* ─── Recording Modal ─── */}
      {recordingModalSession && (
        <UploadRecordingModal
          isOpen={Boolean(recordingModalSession)}
          onClose={() => setRecordingModalSession(null)}
          sessionData={{
            id: recordingModalSession.id,
            title: recordingModalSession.title || "Lecture Recording",
            courseName: recordingModalSession.courseName,
            batchCode: recordingModalSession.batchCode,
            batchName: recordingModalSession.batchName,
            facultyName: user?.name || "Faculty",
            date: recordingModalSession.date,
            startTime: recordingModalSession.startTime,
            endTime: recordingModalSession.endTime,
          }}
        />
      )}

      {/* ─── Study Materials Modal ─── */}
      {materialsModalSession && (
        <UploadStudyMaterialsModal
          isOpen={Boolean(materialsModalSession)}
          onClose={() => setMaterialsModalSession(null)}
          sessionData={{
            id: materialsModalSession.id,
            courseName: materialsModalSession.courseName,
            subjectName: materialsModalSession.subjectName,
            batchCode: materialsModalSession.batchCode,
            batchName: materialsModalSession.batchName,
            facultyName: user?.name || "Faculty",
          }}
        />
      )}
    </div>
  );
};
