import React, { useState, useMemo, useEffect } from "react";
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
  ExternalLink,
  ChevronDown,
  Video,
  Check,
  X,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth.store";
import { useSessionStore } from "@/store/session.store";
import { useFacultyDashboard } from "@/hooks/useFaculty";
import { getSessionSubjectLabel } from "@/utils/batch.utils";
import { useClassSessions } from "@/hooks/useClassSessions";
import { StartClassModal, type ClassSessionModalData } from "@/components/faculty/StartClassModal";
import { UploadRecordingModal } from "@/components/faculty/UploadRecordingModal";
import { UploadStudyMaterialsModal } from "@/components/faculty/UploadStudyMaterialsModal";

export interface FormattedTimetableClass {
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
  status: "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";
  studentCount: number;
  attendancePresent?: number;
  attendanceTotal?: number;
  attendanceStatus?: "Pending" | "Updated";
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  spanHours?: number;
  isLunch?: boolean;
  isExam?: boolean;
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

// 12-Hour Schedule Matrix: 09:00 AM -> 09:00 PM
const FULL_TIME_SLOTS = [
  { id: "1", title: "09:00", ampm: "AM", label: "09:00 – 10:00", hour24: 9, isBreak: false },
  { id: "2", title: "10:00", ampm: "AM", label: "10:00 – 11:00", hour24: 10, isBreak: false },
  { id: "3", title: "11:00", ampm: "AM", label: "11:00 – 12:00", hour24: 11, isBreak: false },
  { id: "4", title: "12:00", ampm: "PM", label: "12:00 – 01:00", hour24: 12, isBreak: false },
  { id: "5", title: "01:00", ampm: "PM", label: "01:00 – 02:00", hour24: 13, isBreak: true, breakTitle: "Lunch" },
  { id: "6", title: "02:00", ampm: "PM", label: "02:00 – 03:00", hour24: 14, isBreak: false },
  { id: "7", title: "03:00", ampm: "PM", label: "03:00 – 04:00", hour24: 15, isBreak: false },
  { id: "8", title: "04:00", ampm: "PM", label: "04:00 – 05:00", hour24: 16, isBreak: false },
  { id: "9", title: "05:00", ampm: "PM", label: "05:00 – 06:00", hour24: 17, isBreak: false },
  { id: "10", title: "06:00", ampm: "PM", label: "06:00 – 07:00", hour24: 18, isBreak: false },
  { id: "11", title: "07:00", ampm: "PM", label: "07:00 – 08:00", hour24: 19, isBreak: false },
  { id: "12", title: "08:00", ampm: "PM", label: "08:00 – 09:00", hour24: 20, isBreak: false },
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
  const {
    activeLiveClass,
    setActiveLiveClass,
    sessionStatuses,
    getSessionStatus,
    sessionAttendance,
  } = useSessionStore();

  const { data: dashRes, isLoading: isDashLoading, refetch: refetchDash } = useFacultyDashboard();
  const dashboard = dashRes?.data;
  const facultyId = user?.facultyId || dashboard?.profile?.id;

  // Query class sessions strictly for this faculty
  const { data: sessionsRes, isLoading: isSessionsLoading, refetch: refetchSessions } = useClassSessions(
    facultyId ? { facultyId, limit: 100 } : undefined
  );

  // Week Navigator State (Base Monday date: fixed default anchor or dynamic current Monday)
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => {
    const base = new Date(2026, 7, 31); // 31 Aug 2026 Monday default
    base.setHours(0, 0, 0, 0);
    return base;
  });

  // Mobile selected day index (0 to 6)
  const [mobileDayIndex, setMobileDayIndex] = useState<number>(0);

  // Filters State
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [selectedMode, setSelectedMode] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"TIMETABLE" | "LIST">("TIMETABLE");

  // Selected Class in bottom details pane
  const [selectedClassId, setSelectedClassId] = useState<string>("mon-java-live");

  // Live Timer State
  const [liveSeconds, setLiveSeconds] = useState<number>(42 * 60 + 18); // 00:42:18 initial demo timer

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatLiveTimer = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Active selected modal state
  const [selectedClassForModal, setSelectedClassForModal] = useState<ClassSessionModalData | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [recordingModalSession, setRecordingModalSession] = useState<ClassSessionModalData | null>(null);
  const [materialsModalSession, setMaterialsModalSession] = useState<ClassSessionModalData | null>(null);

  const todayIso = useMemo(() => toISODateString(currentWeekMonday), [currentWeekMonday]);

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
        isToday: i === 0 || iso === todayIso,
      };
    });
  }, [currentWeekMonday, todayIso]);

  // Master Assigned Classes strictly for the logged-in Faculty
  const assignedClasses: FormattedTimetableClass[] = useMemo(() => {
    const dMon = weekDays[0]?.iso || "2026-08-31";
    const dTue = weekDays[1]?.iso || "2026-09-01";
    const dWed = weekDays[2]?.iso || "2026-09-02";
    const dThu = weekDays[3]?.iso || "2026-09-03";
    const dFri = weekDays[4]?.iso || "2026-09-04";
    const dSat = weekDays[5]?.iso || "2026-09-05";

    const userFacultyId = user?.facultyId || dashboard?.profile?.id || user?.id;
    const userEmail = (user?.email || dashboard?.profile?.email || "").toLowerCase();
    const userName = (user?.name || dashboard?.profile?.name || "").toLowerCase();

    // 1. Process from class-sessions API & dashboard assigned sessions
    const rawSessions = (sessionsRes?.data || []).filter((s: any) => {
      if (userFacultyId && (s.facultyId === userFacultyId || s.faculty?.id === userFacultyId)) return true;
      if (userEmail && s.faculty?.user?.email && s.faculty.user.email.toLowerCase() === userEmail) return true;
      if (userName && s.faculty?.user?.name && s.faculty.user.name.toLowerCase() === userName) return true;
      return false;
    });

    const map = new Map<string, FormattedTimetableClass>();

    if (rawSessions.length > 0) {
      // Use live API sessions assigned to this faculty
      rawSessions.forEach((s: any) => {
        const scheduledDate = s.scheduledDate
          ? toISODateString(new Date(s.scheduledDate))
          : todayIso;

        let status = (s.sessionStatus || s.status || "UPCOMING").toUpperCase() as any;
        if (activeLiveClass?.status === "LIVE" && (activeLiveClass?.id === s.id || activeLiveClass?.sessionId === s.id)) {
          status = "LIVE";
        }
        const storeStatus = getSessionStatus(s.id);
        if (storeStatus) status = storeStatus;

        const startParsed = parseTimeTo24Hour(s.startTime || "09:00");
        const endParsed = parseTimeTo24Hour(s.endTime || "10:00");
        const span = Math.max(1, endParsed.hour - startParsed.hour);

        map.set(s.id, {
          id: s.id,
          title: s.title || s.batchModule?.courseModule?.name || "Class Session",
          courseName: getSessionSubjectLabel({ title: s.title, batch: s.batch }),
          subjectName: s.batchModule?.courseModule?.name || s.title || "Subject Module",
          batchId: s.batchId,
          batchName: s.batch?.name || s.batch?.code || "B001",
          batchCode: s.batch?.code || "B001",
          date: scheduledDate,
          startTime: s.startTime || "09:00 AM",
          endTime: s.endTime || "10:00 AM",
          timeRange: `${s.startTime || "09:00 AM"} – ${s.endTime || "10:00 AM"}`,
          roomNo: s.roomNo || "Room No 1",
          mode: (s.mode as any) || "OFFLINE",
          meetingUrl: s.meetingUrl || "https://meet.google.com/aadya-live",
          status,
          studentCount: s.enrolledStudentsCount || s.batch?._count?.enrollments || 3,
          attendanceStatus: sessionAttendance[s.id]?.length ? "Updated" : "Pending",
          startHour: startParsed.hour,
          startMin: startParsed.min,
          endHour: endParsed.hour,
          endMin: endParsed.min,
          spanHours: span,
        });
      });
    } else {
      // 2. Multi-Faculty Isolated Fallback Mapping (when offline/demo without backend DB rows)
      const isFaculty01 = !userEmail || userEmail.includes("sachin") || userEmail.includes("faculty01") || userName.includes("faculty01") || userName.includes("sachin") || userName.includes("faculty");
      const isFaculty02 = userEmail.includes("faculty02") || userName.includes("faculty02") || userEmail.includes("priya");

      let initialFallbackClasses: FormattedTimetableClass[] = [];
      if (isFaculty01) {
        initialFallbackClasses = [
          // Mon
          { id: "mon-java-live", title: "Java Class", courseName: "Java Class", subjectName: "Java Class", batchId: "B001", batchName: "Batch B001", batchCode: "B001", date: dMon, startTime: "09:00 AM", endTime: "10:00 AM", timeRange: "09:00 AM – 10:00 AM", roomNo: "Room No 1", mode: "OFFLINE", meetingUrl: "https://meet.google.com/aadya-java-001", status: "LIVE", studentCount: 3, attendanceStatus: "Pending", startHour: 9, startMin: 0, endHour: 10, endMin: 0, spanHours: 1 },
          { id: "mon-java-up", title: "Java Class", courseName: "Java Class", subjectName: "Java Class", batchId: "B001", batchName: "Batch B001", batchCode: "B001", date: dMon, startTime: "10:00 AM", endTime: "11:00 AM", timeRange: "10:00 AM – 11:00 AM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-java-002", status: "UPCOMING", studentCount: 3, attendanceStatus: "Pending", startHour: 10, startMin: 0, endHour: 11, endMin: 0, spanHours: 1 },
          { id: "mon-dsa", title: "DSA", courseName: "DSA", subjectName: "DSA", batchId: "B002", batchName: "Batch B002", batchCode: "B002", date: dMon, startTime: "11:00 AM", endTime: "12:00 PM", timeRange: "11:00 AM – 12:00 PM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-dsa-001", status: "UPCOMING", studentCount: 5, attendanceStatus: "Pending", startHour: 11, startMin: 0, endHour: 12, endMin: 0, spanHours: 1 },
          { id: "mon-webdev", title: "Web Dev", courseName: "Web Dev", subjectName: "Web Dev", batchId: "B003", batchName: "Batch B003", batchCode: "B003", date: dMon, startTime: "02:00 PM", endTime: "03:00 PM", timeRange: "02:00 PM – 03:00 PM", roomNo: "Room 102", mode: "OFFLINE", status: "UPCOMING", studentCount: 4, attendanceStatus: "Pending", startHour: 14, startMin: 0, endHour: 15, endMin: 0, spanHours: 1 },
          { id: "mon-dbms", title: "DBMS", courseName: "DBMS", subjectName: "DBMS", batchId: "B001", batchName: "Batch B001", batchCode: "B001", date: dMon, startTime: "04:00 PM", endTime: "05:00 PM", timeRange: "04:00 PM – 05:00 PM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-dbms-001", status: "UPCOMING", studentCount: 3, attendanceStatus: "Pending", startHour: 16, startMin: 0, endHour: 17, endMin: 0, spanHours: 1 },
          { id: "mon-react", title: "React", courseName: "React", subjectName: "React", batchId: "B003", batchName: "Batch B003", batchCode: "B003", date: dMon, startTime: "06:00 PM", endTime: "08:00 PM", timeRange: "06:00 PM – 08:00 PM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-react-001", status: "UPCOMING", studentCount: 6, attendanceStatus: "Pending", startHour: 18, startMin: 0, endHour: 20, endMin: 0, spanHours: 2 },
          // Tue
          { id: "tue-python", title: "Python", courseName: "Python", subjectName: "Python", batchId: "B002", batchName: "Batch B002", batchCode: "B002", date: dTue, startTime: "10:00 AM", endTime: "11:30 AM", timeRange: "10:00 AM – 11:30 AM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-py-001", status: "UPCOMING", studentCount: 5, attendanceStatus: "Pending", startHour: 10, startMin: 0, endHour: 12, endMin: 0, spanHours: 2 },
          { id: "tue-softskills", title: "Soft Skills", courseName: "Soft Skills", subjectName: "Soft Skills", batchId: "B001", batchName: "Batch B001", batchCode: "B001", date: dTue, startTime: "03:00 PM", endTime: "04:00 PM", timeRange: "03:00 PM – 04:00 PM", roomNo: "Room No 1", mode: "OFFLINE", status: "UPCOMING", studentCount: 3, attendanceStatus: "Pending", startHour: 15, startMin: 0, endHour: 16, endMin: 0, spanHours: 1 },
          { id: "tue-sysdesign", title: "System Design", courseName: "System Design", subjectName: "System Design", batchId: "B002", batchName: "Batch B002", batchCode: "B002", date: dTue, startTime: "07:00 PM", endTime: "09:00 PM", timeRange: "07:00 PM – 09:00 PM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-sd-001", status: "UPCOMING", studentCount: 5, attendanceStatus: "Pending", startHour: 19, startMin: 0, endHour: 21, endMin: 0, spanHours: 2 },
          // Wed
          { id: "wed-java", title: "Java Class", courseName: "Java Class", subjectName: "Java Class", batchId: "B001", batchName: "Batch B001", batchCode: "B001", date: dWed, startTime: "09:00 AM", endTime: "10:00 AM", timeRange: "09:00 AM – 10:00 AM", roomNo: "Room No 1", mode: "OFFLINE", status: "UPCOMING", studentCount: 3, attendanceStatus: "Pending", startHour: 9, startMin: 0, endHour: 10, endMin: 0, spanHours: 1 },
          { id: "wed-docker", title: "Docker", courseName: "Docker", subjectName: "Docker", batchId: "B003", batchName: "Batch B003", batchCode: "B003", date: dWed, startTime: "12:00 PM", endTime: "01:00 PM", timeRange: "12:00 PM – 01:00 PM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-docker-001", status: "UPCOMING", studentCount: 4, attendanceStatus: "Pending", startHour: 12, startMin: 0, endHour: 13, endMin: 0, spanHours: 1 },
          { id: "wed-aws", title: "AWS", courseName: "AWS", subjectName: "AWS", batchId: "B003", batchName: "Batch B003", batchCode: "B003", date: dWed, startTime: "05:00 PM", endTime: "06:00 PM", timeRange: "05:00 PM – 06:00 PM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-aws-001", status: "UPCOMING", studentCount: 4, attendanceStatus: "Pending", startHour: 17, startMin: 0, endHour: 18, endMin: 0, spanHours: 1 },
          // Thu
          { id: "thu-spring", title: "Spring Boot", courseName: "Spring Boot", subjectName: "Spring Boot", batchId: "B001", batchName: "Batch B001", batchCode: "B001", date: dThu, startTime: "11:00 AM", endTime: "12:00 PM", timeRange: "11:00 AM – 12:00 PM", roomNo: "Room No 1", mode: "OFFLINE", status: "UPCOMING", studentCount: 3, attendanceStatus: "Pending", startHour: 11, startMin: 0, endHour: 12, endMin: 0, spanHours: 1 },
          { id: "thu-micro", title: "Microservices", courseName: "Microservices", subjectName: "Microservices", batchId: "B002", batchName: "Batch B002", batchCode: "B002", date: dThu, startTime: "02:00 PM", endTime: "03:00 PM", timeRange: "02:00 PM – 03:00 PM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-micro-001", status: "UPCOMING", studentCount: 5, attendanceStatus: "Pending", startHour: 14, startMin: 0, endHour: 15, endMin: 0, spanHours: 1 },
          // Fri
          { id: "fri-apt", title: "Aptitude", courseName: "Aptitude", subjectName: "Aptitude", batchId: "B001", batchName: "Batch B001", batchCode: "B001", date: dFri, startTime: "10:00 AM", endTime: "11:00 AM", timeRange: "10:00 AM – 11:00 AM", roomNo: "Room No 1", mode: "OFFLINE", status: "UPCOMING", studentCount: 3, attendanceStatus: "Pending", startHour: 10, startMin: 0, endHour: 11, endMin: 0, spanHours: 1 },
          { id: "fri-project", title: "Project Mentoring", courseName: "Project Mentoring", subjectName: "Project Mentoring", batchId: "B003", batchName: "Batch B003", batchCode: "B003", date: dFri, startTime: "04:00 PM", endTime: "06:00 PM", timeRange: "04:00 PM – 06:00 PM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-project-001", status: "UPCOMING", studentCount: 4, attendanceStatus: "Pending", startHour: 16, startMin: 0, endHour: 18, endMin: 0, spanHours: 2 },
          // Sat
          { id: "sat-mock", title: "Mock Test", courseName: "Mock Test", subjectName: "Mock Test", batchId: "B001", batchName: "Batch B001", batchCode: "B001", date: dSat, startTime: "09:00 AM", endTime: "11:00 AM", timeRange: "09:00 AM – 11:00 AM", roomNo: "Room No 1", mode: "OFFLINE", status: "UPCOMING", studentCount: 3, attendanceStatus: "Pending", startHour: 9, startMin: 0, endHour: 11, endMin: 0, spanHours: 2, isExam: true },
        ];
      } else if (isFaculty02) {
        initialFallbackClasses = [
          { id: "f2-mon-ds", title: "Data Science with Python", courseName: "Data Science", subjectName: "Data Analytics & Pandas", batchId: "DS01", batchName: "Batch DS01", batchCode: "DS01", date: dMon, startTime: "10:00 AM", endTime: "11:30 AM", timeRange: "10:00 AM – 11:30 AM", roomNo: "Room 103", mode: "OFFLINE", status: "UPCOMING", studentCount: 4, attendanceStatus: "Pending", startHour: 10, startMin: 0, endHour: 12, endMin: 0, spanHours: 2 },
          { id: "f2-wed-ml", title: "Machine Learning", courseName: "AI & ML", subjectName: "Supervised Learning", batchId: "AI01", batchName: "Batch AI01", batchCode: "AI01", date: dWed, startTime: "02:00 PM", endTime: "04:00 PM", timeRange: "02:00 PM – 04:00 PM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-ai-001", status: "UPCOMING", studentCount: 6, attendanceStatus: "Pending", startHour: 14, startMin: 0, endHour: 16, endMin: 0, spanHours: 2 },
          { id: "f2-fri-nlp", title: "Natural Language Processing", courseName: "AI & ML", subjectName: "NLP Foundations", batchId: "AI01", batchName: "Batch AI01", batchCode: "AI01", date: dFri, startTime: "04:00 PM", endTime: "06:00 PM", timeRange: "04:00 PM – 06:00 PM", roomNo: "Online", mode: "ONLINE", meetingUrl: "https://meet.google.com/aadya-ai-002", status: "UPCOMING", studentCount: 6, attendanceStatus: "Pending", startHour: 16, startMin: 0, endHour: 18, endMin: 0, spanHours: 2 },
        ];
      } else {
        initialFallbackClasses = [];
      }

      initialFallbackClasses.forEach((cls) => {
        let status = cls.status;
        const storeStatus = getSessionStatus(cls.id);
        if (storeStatus) status = storeStatus;
        if (activeLiveClass?.id === cls.id || activeLiveClass?.sessionId === cls.id) {
          status = "LIVE";
        }
        const attendance = sessionAttendance[cls.id];
        const attendanceStatus = attendance && attendance.length > 0 ? "Updated" : cls.attendanceStatus;

        map.set(cls.id, {
          ...cls,
          status,
          attendanceStatus,
        });
      });
    }

    return Array.from(map.values());
  }, [weekDays, sessionsRes, dashboard, user, activeLiveClass, sessionStatuses, sessionAttendance, getSessionStatus, todayIso]);

  // Extract filter option lists
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

  // Today Classes
  const todayClasses = useMemo(() => {
    const targetDate = weekDays[0]?.iso;
    return assignedClasses.filter((c) => c.date === targetDate);
  }, [assignedClasses, weekDays]);

  // Currently selected class for bottom right pane
  const currentSelectedClass = useMemo(() => {
    return (
      assignedClasses.find((c) => c.id === selectedClassId) ||
      todayClasses[0] ||
      assignedClasses[0]
    );
  }, [assignedClasses, selectedClassId, todayClasses]);

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
    const base = new Date(2026, 7, 31);
    base.setHours(0, 0, 0, 0);
    setCurrentWeekMonday(base);
  };

  const handleOpenClassDetails = (cls: FormattedTimetableClass) => {
    setSelectedClassId(cls.id);
  };

  const handleNavigateToSession = (cls: FormattedTimetableClass, defaultTab?: string) => {
    navigate(
      `/faculty/class-session?id=${encodeURIComponent(cls.id)}&course=${encodeURIComponent(cls.courseName)}&subject=${encodeURIComponent(cls.subjectName)}&batch=${encodeURIComponent(cls.batchCode)}&room=${encodeURIComponent(cls.roomNo)}&time=${encodeURIComponent(cls.timeRange)}&date=${encodeURIComponent(cls.date)}${defaultTab ? `&tab=${defaultTab}` : ""}`
    );
  };

  const handleGoLive = (cls: FormattedTimetableClass) => {
    setActiveLiveClass({
      id: cls.id,
      sessionId: cls.id,
      courseName: cls.courseName,
      batchCode: cls.batchCode,
      batchName: cls.batchName,
      moduleName: cls.subjectName,
      facultyName: user?.name || "Faculty01",
      date: cls.date,
      time: cls.timeRange,
      meetUrl: cls.meetingUrl || "https://meet.google.com/aadya-live",
      meetId: "aadya-live-01",
      startedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      studentCount: cls.studentCount,
      status: "LIVE",
    });

    if (cls.meetingUrl) {
      window.open(cls.meetingUrl, "_blank", "noopener,noreferrer");
    }
    handleNavigateToSession(cls);
  };

  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0]?.formattedDate || "31 Aug";
    const end = weekDays[6]?.formattedDate || "6 Sept";
    const year = currentWeekMonday.getFullYear();
    return `${start} – ${end} ${year}`;
  }, [weekDays, currentWeekMonday]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1680px] mx-auto min-h-screen bg-slate-50/50 dark:bg-slate-950/40">
      {/* ─── Top Header Banner ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl border-2 border-[#1769AA] flex items-center justify-center text-[#1769AA] bg-blue-50/50">
              <CalendarDays className="w-5 h-5" />
            </div>
            My Class Timetable
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Live and upcoming classes assigned to you.
          </p>
        </div>

        {/* Week Switcher & View Mode Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Week Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevWeek}
              className="h-8 w-8 p-0 rounded-xl hover:bg-slate-100"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </Button>
            <div className="flex items-center gap-2 px-2 text-xs font-extrabold text-slate-800 dark:text-slate-200">
              <CalendarIcon className="w-3.5 h-3.5 text-[#1769AA]" />
              <span>{weekRangeLabel}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextWeek}
              className="h-8 w-8 p-0 rounded-xl hover:bg-slate-100"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentWeek}
            className="h-9 px-3.5 text-xs font-bold rounded-xl border-[#1769AA]/30 text-[#1769AA] hover:bg-blue-50 bg-white dark:bg-slate-900 shadow-xs"
          >
            Today
          </Button>

          {/* Timetable Grid / Class List Toggle */}
          <div className="bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl flex items-center text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("TIMETABLE")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === "TIMETABLE"
                  ? "bg-[#1769AA] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Timetable Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === "LIST"
                  ? "bg-[#1769AA] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
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
            className="rounded-2xl h-9 text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Refresh
          </Button>
        </div>
      </div>

      {/* ─── Filters & Legend Bar ─── */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardContent className="p-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1">
              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search course, module, batch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-slate-50/70 border-slate-200 dark:bg-slate-800"
                />
              </div>

              {/* Course Filter */}
              <div>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20"
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
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20"
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
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20"
                >
                  <option value="ALL">All Modes (Offline / Online)</option>
                  <option value="OFFLINE">Offline / Classroom</option>
                  <option value="ONLINE">Online / Virtual</option>
                </select>
              </div>
            </div>

            {/* Status Legend */}
            <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0 self-start lg:self-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Now</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Upcoming</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Cancelled</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Main Timetable Grid / List Display ─── */}
      {viewMode === "TIMETABLE" ? (
        <div className="space-y-6">
          {/* ─── Full 9:00 AM to 9:00 PM Timetable Matrix (Desktop/Tablet) ─── */}
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full border-collapse text-left min-w-[1300px]">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <th className="p-3.5 border-r border-slate-200 dark:border-slate-800 w-32 text-center shrink-0">
                    DAY / DATE
                  </th>
                  {FULL_TIME_SLOTS.map((slot) => (
                    <th
                      key={slot.id}
                      className={`p-2.5 border-r border-slate-200 dark:border-slate-800 text-center ${
                        slot.isBreak
                          ? "bg-amber-50/40 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 w-24"
                          : "min-w-[95px]"
                      }`}
                    >
                      <span className="block font-black text-xs text-slate-800 dark:text-slate-100">
                        {slot.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold block">{slot.ampm}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {weekDays.map((day) => {
                  const dayClasses = filteredClasses.filter((c) => c.date === day.iso);

                  // Keep track of spanned slots to skip rendering empty cells
                  let skipHoursRemaining = 0;

                  return (
                    <tr
                      key={day.iso}
                      className={`transition-colors h-[86px] ${
                        day.isToday
                          ? "bg-blue-50/20 dark:bg-blue-950/10"
                          : "hover:bg-slate-50/30 dark:hover:bg-slate-800/20"
                      }`}
                    >
                      {/* Left Day/Date Cell */}
                      <td
                        className={`p-3 border-r border-slate-200 dark:border-slate-800 text-center font-bold ${
                          day.isToday
                            ? "bg-blue-50/60 text-[#1769AA] dark:bg-blue-950/40"
                            : "bg-slate-50/30 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-xs uppercase tracking-wider font-black">
                            {day.dayShort}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                            {day.formattedDate}
                          </span>
                        </div>
                      </td>

                      {/* 12 Hour Time Slot Cells */}
                      {FULL_TIME_SLOTS.map((slot, sIdx) => {
                        if (skipHoursRemaining > 0) {
                          skipHoursRemaining--;
                          return null;
                        }

                        // Lunch Slot (01:00 PM - 02:00 PM)
                        if (slot.isBreak) {
                          return (
                            <td
                              key={slot.id}
                              className="p-1 border-r border-slate-200 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/10 text-center align-middle"
                            >
                              <div className="flex flex-col items-center justify-center bg-amber-50 border border-amber-200/80 rounded-xl py-2 px-1 text-amber-800 text-[10px] font-extrabold shadow-2xs">
                                <div className="flex items-center gap-1">
                                  <span>🥪</span>
                                  <span>Lunch</span>
                                </div>
                                <span className="text-[9px] text-amber-700/80 font-mono mt-0.5">01:00 – 02:00</span>
                              </div>
                            </td>
                          );
                        }

                        // Find class starting at this hour
                        const matchingClass = dayClasses.find((c) => c.startHour === slot.hour24);

                        if (matchingClass) {
                          const span = matchingClass.spanHours || 1;
                          if (span > 1) {
                            skipHoursRemaining = span - 1;
                          }

                          const isSelected = selectedClassId === matchingClass.id;
                          const isLive = matchingClass.status === "LIVE";
                          const isExam = matchingClass.isExam;

                          return (
                            <td
                              key={slot.id}
                              colSpan={span}
                              className="p-1 border-r border-slate-200 dark:border-slate-800 align-middle"
                            >
                              <div
                                onClick={() => handleOpenClassDetails(matchingClass)}
                                className={`p-2 rounded-2xl border text-left cursor-pointer transition-all duration-200 hover:shadow-md select-none relative h-[72px] flex flex-col justify-between ${
                                  isLive
                                    ? "bg-emerald-50/90 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 ring-2 ring-emerald-500/40 shadow-xs"
                                    : isExam
                                    ? "bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 hover:border-rose-400"
                                    : isSelected
                                    ? "bg-blue-50 border-[#1769AA] ring-2 ring-[#1769AA]/30 shadow-xs"
                                    : "bg-blue-50/50 border-blue-100 hover:border-[#1769AA]/60 dark:bg-slate-800/60 dark:border-slate-700"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        isLive
                                          ? "bg-emerald-500 animate-ping"
                                          : isExam
                                          ? "bg-rose-500"
                                          : "bg-blue-600"
                                      }`}
                                    />
                                    <p className="font-extrabold text-[11px] text-slate-900 dark:text-white truncate">
                                      {matchingClass.courseName}
                                    </p>
                                  </div>
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    {matchingClass.mode === "ONLINE" ? (
                                      <Video className="w-3 h-3 text-blue-600" />
                                    ) : (
                                      <MapPin className="w-3 h-3 text-slate-500" />
                                    )}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                  <span className="font-mono text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-700/80 px-1 py-0.2 rounded border border-slate-200/60">
                                    {matchingClass.batchCode}
                                  </span>
                                  <span className="text-[9px] font-medium text-slate-500">
                                    {matchingClass.startTime.replace(" ", "")} – {matchingClass.endTime.replace(" ", "")}
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        // Empty Slot Cell
                        return (
                          <td
                            key={slot.id}
                            className="p-1 border-r border-slate-200 dark:border-slate-800 align-middle text-center"
                          >
                            <span className="text-slate-300 dark:text-slate-700 text-xs font-bold select-none">
                              —
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ─── Mobile Daily Cards View (Small Screens) ─── */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl overflow-x-auto gap-1">
              {weekDays.map((day, idx) => (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setMobileDayIndex(idx)}
                  className={`flex-1 min-w-[42px] py-2 px-1 text-center rounded-xl transition-all cursor-pointer ${
                    mobileDayIndex === idx
                      ? "bg-[#1769AA] text-white font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="block text-[10px] uppercase font-mono">{day.dayShort}</span>
                  <span className="block text-xs font-black">{day.date.getDate()}</span>
                </button>
              ))}
            </div>

            {(() => {
              const activeDay = weekDays[mobileDayIndex] || weekDays[0];
              const dayClasses = filteredClasses.filter((c) => c.date === activeDay.iso);

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                    <span>
                      {activeDay.dayName}, {activeDay.formattedDate}
                    </span>
                    {activeDay.isToday && <Badge className="bg-[#1769AA] text-white text-[10px]">TODAY</Badge>}
                  </div>

                  {dayClasses.length > 0 ? (
                    dayClasses.map((cls) => (
                      <Card
                        key={cls.id}
                        onClick={() => setSelectedClassId(cls.id)}
                        className={`rounded-2xl border cursor-pointer hover:shadow-md transition-all ${
                          selectedClassId === cls.id ? "ring-2 ring-[#1769AA] border-[#1769AA]" : ""
                        }`}
                      >
                        <CardContent className="p-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold font-mono text-[#1769AA]">{cls.timeRange}</span>
                            <Badge
                              className={
                                cls.status === "LIVE"
                                  ? "bg-emerald-600 text-white animate-pulse"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }
                            >
                              {cls.status === "LIVE" ? "● LIVE NOW" : "Upcoming"}
                            </Badge>
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-900">{cls.courseName}</h4>
                          <p className="text-xs text-slate-500">
                            Batch {cls.batchCode} • {cls.roomNo} ({cls.mode}) • {cls.studentCount} Students
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-dashed">
                      No classes scheduled for {activeDay.dayName}.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ─── Bottom Two-Column Dashboard (Today's Classes + Class Details) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left Column: Today's Classes List */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Today's Classes ({weekDays[0]?.dayShort}, {weekDays[0]?.formattedDate} 2026)
                </h3>
                <button
                  type="button"
                  onClick={() => setViewMode("LIST")}
                  className="text-xs font-bold text-[#1769AA] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View Full Day <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {todayClasses.map((cls) => {
                  const isSelected = selectedClassId === cls.id;
                  const isLive = cls.status === "LIVE";

                  return (
                    <Card
                      key={cls.id}
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#1769AA] ring-2 ring-[#1769AA]/20 bg-blue-50/30 dark:bg-slate-800"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                      }`}
                    >
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {cls.startTime} – {cls.endTime}
                            </span>
                            <Badge
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                isLive
                                  ? "bg-emerald-600 text-white animate-pulse"
                                  : "bg-blue-50 text-blue-600 border border-blue-200"
                              }`}
                            >
                              {isLive ? "LIVE NOW" : "Upcoming"}
                            </Badge>
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {cls.courseName}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span>Batch {cls.batchCode}</span>
                            <span>|</span>
                            <span>{cls.mode === "ONLINE" ? "Online" : "Offline"}</span>
                            {cls.roomNo && cls.roomNo !== "Online" && (
                              <>
                                <span>|</span>
                                <span>{cls.roomNo}</span>
                              </>
                            )}
                            <span>|</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" /> {cls.studentCount} Students
                            </span>
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToSession(cls);
                          }}
                          className="rounded-xl text-xs font-extrabold h-8 px-3.5 shrink-0 cursor-pointer text-[#1769AA] border-blue-200 hover:bg-[#1769AA] hover:text-white hover:border-[#1769AA] bg-white transition-all shadow-2xs"
                        >
                          View Class
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Class Details Card */}
            <div className="lg:col-span-6">
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden h-full flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {currentSelectedClass.courseName}
                      </h3>
                      <Badge
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          currentSelectedClass.status === "LIVE"
                            ? "bg-emerald-600 text-white animate-pulse"
                            : "bg-blue-50 text-blue-600 border border-blue-200"
                        }`}
                      >
                        {currentSelectedClass.status === "LIVE" ? "LIVE NOW" : "UPCOMING"}
                      </Badge>
                      {currentSelectedClass.status === "LIVE" && (
                        <span className="text-xs font-mono font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          {formatLiveTimer(liveSeconds)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavigateToSession(currentSelectedClass)}
                      className="text-xs font-bold text-[#1769AA] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Go to Class <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 8-Point Metadata Grid */}
                  <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    {/* Row 1 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1769AA] flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">Batch</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {currentSelectedClass.batchCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">Faculty</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {user?.name || "Faculty01"}
                        </span>
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">Subject / Module</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {currentSelectedClass.subjectName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CalendarIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">Date</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {currentSelectedClass.date
                            ? new Date(currentSelectedClass.date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "31 Aug 2026"}
                        </span>
                      </div>
                    </div>

                    {/* Row 3 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">Scheduled Time</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {currentSelectedClass.timeRange}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">Enrolled Students</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {currentSelectedClass.studentCount}
                        </span>
                      </div>
                    </div>

                    {/* Row 4 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">Mode</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {currentSelectedClass.mode === "ONLINE" ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">Attendance Status</span>
                        <span
                          className={`font-extrabold ${
                            currentSelectedClass.attendanceStatus === "Updated"
                              ? "text-emerald-600 font-bold"
                              : "text-amber-600"
                          }`}
                        >
                          {currentSelectedClass.attendanceStatus || "Pending"}
                        </span>
                      </div>
                    </div>

                    {/* Row 5 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">Room</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {currentSelectedClass.roomNo || "Room No 1"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1769AA] flex items-center justify-center shrink-0 mt-0.5">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 block">Class Link</span>
                        {currentSelectedClass.meetingUrl ? (
                          <a
                            href={currentSelectedClass.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[#1769AA] hover:underline truncate block max-w-[150px]"
                          >
                            Google Meet link
                          </a>
                        ) : (
                          <span className="font-extrabold text-slate-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Dual Actions Bar */}
                <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleNavigateToSession(currentSelectedClass, "attendance")}
                    className="flex-1 h-11 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-extrabold text-xs shadow-xs hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-[#1769AA]" /> Update Attendance
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleGoLive(currentSelectedClass)}
                    className="flex-1 h-11 rounded-2xl bg-[#1769AA] hover:bg-[#125386] text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Video className="w-4 h-4" /> Join / Go Live Class
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        /* ─── Class List View ─── */
        <div className="space-y-3">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls) => (
              <Card
                key={cls.id}
                className="border-slate-200 dark:border-slate-800 rounded-3xl hover:shadow-md transition-shadow overflow-hidden bg-white dark:bg-slate-900"
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cls.status === "LIVE" ? (
                        <Badge className="bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-0.5 animate-pulse">
                          ● LIVE NOW
                        </Badge>
                      ) : cls.status === "COMPLETED" ? (
                        <Badge className="bg-slate-500 text-white font-semibold text-xs px-2 py-0.5">
                          COMPLETED
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs px-2.5 py-0.5 text-[#1769AA] bg-blue-50 font-extrabold"
                        >
                          UPCOMING
                        </Badge>
                      )}
                      <Badge variant="outline" className="font-mono text-xs font-bold">
                        {cls.batchCode}
                      </Badge>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#1769AA]" />
                        {cls.date} ({cls.timeRange})
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {cls.courseName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Module: <span className="font-bold text-slate-700 dark:text-slate-300">{cls.subjectName}</span>
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
                      <span className="text-slate-600">
                        Attendance: <strong className="text-slate-900">{cls.attendanceStatus || "Pending"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => handleNavigateToSession(cls, "attendance")}
                      className="rounded-2xl h-9 text-xs font-bold border-slate-200 hover:bg-slate-50"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1 text-[#1769AA]" /> Attendance
                    </Button>
                    <Button
                      onClick={() => handleGoLive(cls)}
                      className="rounded-2xl bg-[#1769AA] hover:bg-[#125386] text-white font-extrabold h-9 text-xs px-4"
                    >
                      <Video className="w-3.5 h-3.5 mr-1.5" /> GO LIVE
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-dashed">
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
        onSessionStatusChange={() => {
          refetchSessions();
          refetchDash();
        }}
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
