import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  CalendarDays,
  Video,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth.store";
import { useSessionStore } from "@/store/session.store";
import { useFacultyDashboard } from "@/hooks/useFaculty";
import { getSessionSubjectLabel } from "@/utils/batch.utils";
import { useClassSessions } from "@/hooks/useClassSessions";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { useTimetableSlotColumns } from "@/hooks/useTimetableSlotColumns";
import {
  periodFromStartTime,
  spanSlotsForSession,
  toHolidayDateKey,
  toDateKey,
  getWeekRangeFromOffset,
  localTodayKey,
  findSlotByMasterId,
} from "@/constants/timetable-slots";
import { StartClassModal, type ClassSessionModalData } from "@/components/faculty/StartClassModal";
import { UploadRecordingModal } from "@/components/faculty/UploadRecordingModal";
import { UploadStudyMaterialsModal } from "@/components/faculty/UploadStudyMaterialsModal";
import { classSessionsApi, type BackendClassSession } from "@/services/class-sessions.api";

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
  startPeriod?: number | null;
  timeslotMasterId?: string;
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

export const FacultyMySchedule: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    activeLiveClass,
    setActiveLiveClass,
    getSessionStatus,
    sessionAttendance,
  } = useSessionStore();

  const { data: dashRes, refetch: refetchDash } = useFacultyDashboard();
  const dashboard = dashRes?.data;
  const facultyId = user?.facultyId || dashboard?.profile?.id;

  // Week Navigator — real current week's Monday (local), not a hardcoded demo week
  const [weekOffset, setWeekOffset] = useState(0);
  const weekRange = useMemo(() => getWeekRangeFromOffset(weekOffset), [weekOffset]);

  // Query sessions for this faculty within the visible week
  const sessionQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      startDate: weekRange.from,
      endDate: weekRange.to,
      limit: 200,
    };
    if (facultyId) params.facultyId = facultyId;
    return params;
  }, [facultyId, weekRange.from, weekRange.to]);

  const { data: sessionsRes, refetch: refetchSessions, isLoading: sessionsLoading } =
    useClassSessions(sessionQueryParams);
  const branchId = user?.branchId || undefined;
  const { options: holidayOptions } = useMasterDropdown("holiday", branchId);
  const {
    slots: timeSlotColumns,
    isLoading: slotsLoading,
    isEmpty: slotsEmpty,
  } = useTimetableSlotColumns(branchId);

  // Mobile selected day index (0 to 6) — default to local today within the week
  const [mobileDayIndex, setMobileDayIndex] = useState<number>(() => {
    const todayKey = localTodayKey();
    const [y, m, d] = todayKey.split("-").map(Number);
    const jsDay = new Date(y, m - 1, d).getDay();
    return (jsDay + 6) % 7;
  });

  const [viewMode, setViewMode] = useState<"TIMETABLE" | "LIST">("TIMETABLE");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const todayClassesSectionRef = useRef<HTMLDivElement>(null);
  const [liveSeconds, setLiveSeconds] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatLiveTimer = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const sec = secs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const [selectedClassForModal, setSelectedClassForModal] = useState<ClassSessionModalData | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [recordingModalSession, setRecordingModalSession] = useState<ClassSessionModalData | null>(null);
  const [materialsModalSession, setMaterialsModalSession] = useState<ClassSessionModalData | null>(null);

  const todayIso = useMemo(() => localTodayKey(), []);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const iso = (() => {
        const [y, m, d] = weekRange.mondayKey.split("-").map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d + i, 12, 0, 0));
        return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      })();
      const [yy, mm, dd] = iso.split("-").map(Number);
      const localDate = new Date(yy, mm - 1, dd);
      const dayNum = localDate.getDay();
      const dayMeta = DAYS_OF_WEEK.find((item) => item.key === dayNum) || {
        name: "Day",
        short: "DAY",
      };
      const holiday = holidayOptions.find(
        (item) => toHolidayDateKey(item.data?.date) === iso
      );
      const isSunday = dayNum === 0;
      return {
        date: localDate,
        iso,
        dayName: dayMeta.name,
        dayShort: dayMeta.short,
        formattedDate: localDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        isToday: iso === todayIso,
        isHoliday: Boolean(holiday) || isSunday,
        holidayTitle: holiday?.label || (isSunday ? "Sunday" : undefined),
      };
    });
  }, [weekRange.mondayKey, todayIso, holidayOptions]);

  const assignedClasses: FormattedTimetableClass[] = useMemo(() => {
    const userFacultyId = user?.facultyId || dashboard?.profile?.id || undefined;
    const userEmail = (user?.email || dashboard?.profile?.email || "").toLowerCase();
    const userName = (user?.name || dashboard?.profile?.name || "").toLowerCase();

    let rawSessions: BackendClassSession[] = (sessionsRes?.data || []).filter((s: BackendClassSession) => {
      if (!userFacultyId && !userEmail && !userName) return true;
      if (userFacultyId && (s.facultyId === userFacultyId || s.faculty?.id === userFacultyId)) return true;
      if (user?.id && s.faculty?.user?.id === user.id) return true;
      if (userEmail && s.faculty?.user?.email && s.faculty.user.email.toLowerCase() === userEmail) return true;
      if (userName && s.faculty?.user?.name && s.faculty.user.name.toLowerCase() === userName) return true;
      return false;
    });

    // Server already scopes pure FACULTY; keep sessions if client identity fields are incomplete.
    if (rawSessions.length === 0 && (sessionsRes?.data?.length ?? 0) > 0) {
      rawSessions = sessionsRes!.data;
    }

    const map = new Map<string, FormattedTimetableClass>();

    rawSessions.forEach((s: BackendClassSession) => {
      const scheduledDate = s.scheduledDate ? toDateKey(s.scheduledDate) : todayIso;

      let status = (s.sessionStatus || s.status || "UPCOMING").toUpperCase() as FormattedTimetableClass["status"];
      if (activeLiveClass?.status === "LIVE" && (activeLiveClass?.id === s.id || activeLiveClass?.sessionId === s.id)) {
        status = "LIVE";
      }
      const storeStatus = getSessionStatus(s.id);
      if (storeStatus) status = storeStatus;

      const masterSlot = findSlotByMasterId(
        (s as BackendClassSession & { timeslotMasterId?: string }).timeslotMasterId,
        timeSlotColumns
      );
      const startTime = s.startTime || masterSlot?.start || "09:00 AM";
      const endTime = s.endTime || masterSlot?.end || "10:00 AM";
      const startParsed = parseTimeTo24Hour(startTime);
      const endParsed = parseTimeTo24Hour(endTime);
      const startPeriod =
        masterSlot?.period ?? periodFromStartTime(startTime, timeSlotColumns);
      const span = spanSlotsForSession(startTime, endTime, timeSlotColumns, startPeriod);

      map.set(s.id, {
        id: s.id,
        title: s.title || s.batchModule?.courseModule?.name || "Class Session",
        courseName: getSessionSubjectLabel({ title: s.title, batch: s.batch }),
        subjectName: s.batchModule?.courseModule?.name || s.title || "Subject Module",
        batchId: s.batchId,
        batchName: s.batch?.name || s.batch?.code || "B001",
        batchCode: s.batch?.code || "B001",
        date: scheduledDate,
        startTime,
        endTime,
        timeRange: `${startTime} – ${endTime}`,
        roomNo: s.roomNo || "Room No 1",
        mode: (s.mode as FormattedTimetableClass["mode"]) || "OFFLINE",
        meetingUrl: s.meetingUrl || undefined,
        status,
        studentCount: s.enrolledStudentsCount ?? 0,
        attendanceStatus: sessionAttendance[s.id]?.length ? "Updated" : "Pending",
        startHour: startParsed.hour,
        startMin: startParsed.min,
        endHour: endParsed.hour,
        endMin: endParsed.min,
        spanHours: span,
        startPeriod,
        timeslotMasterId:
          (s as BackendClassSession & { timeslotMasterId?: string }).timeslotMasterId ||
          masterSlot?.timeslotMasterId,
      });
    });

    return Array.from(map.values());
  }, [sessionsRes, dashboard, user, activeLiveClass, sessionAttendance, getSessionStatus, todayIso, timeSlotColumns]);

  const filteredClasses = assignedClasses;

  const todayClasses = useMemo(() => {
    return assignedClasses.filter((c) => c.date === todayIso);
  }, [assignedClasses, todayIso]);

  const currentSelectedClass = useMemo(() => {
    return (
      assignedClasses.find((c) => c.id === selectedClassId) ||
      todayClasses[0] ||
      assignedClasses[0]
    );
  }, [assignedClasses, selectedClassId, todayClasses]);

  const handlePrevWeek = () => setWeekOffset((o) => o - 1);
  const handleNextWeek = () => setWeekOffset((o) => o + 1);
  const handleCurrentWeek = () => setWeekOffset(0);

  const handleOpenClassDetails = (cls: FormattedTimetableClass) => {
    setSelectedClassId(cls.id);
    setTimeout(() => {
      todayClassesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleNavigateToSession = (cls: FormattedTimetableClass, defaultTab?: string) => {
    navigate(
      `/faculty/class-session?id=${encodeURIComponent(cls.id)}&course=${encodeURIComponent(cls.courseName)}&subject=${encodeURIComponent(cls.subjectName)}&batch=${encodeURIComponent(cls.batchCode)}&room=${encodeURIComponent(cls.roomNo)}&time=${encodeURIComponent(cls.timeRange)}&date=${encodeURIComponent(cls.date)}${defaultTab ? `&tab=${defaultTab}` : ""}`
    );
  };

  const isRealGoogleMeetUrl = (url?: string | null) =>
    Boolean(url?.trim() && url.includes("meet.google.com"));

  const handleGoLive = async (cls: FormattedTimetableClass) => {
    const modalData: ClassSessionModalData = {
      id: cls.id,
      title: cls.title,
      courseName: cls.courseName,
      subjectName: cls.subjectName,
      batchId: cls.batchId,
      batchCode: cls.batchCode,
      batchName: cls.batchName,
      date: cls.date,
      startTime: cls.startTime,
      endTime: cls.endTime,
      roomNo: cls.roomNo,
      mode: cls.mode,
      meetingUrl: cls.meetingUrl,
      status: cls.status,
      enrolledStudentsCount: cls.studentCount,
    };

    // Prefer StartClassModal for the full startLive path (same as Dashboard).
    // If already LIVE, open modal so faculty can rejoin Meet / manage attendance.
    if (cls.status === "LIVE") {
      setSelectedClassForModal(modalData);
      setIsClassModalOpen(true);
      return;
    }

    try {
      let meetingUrl = isRealGoogleMeetUrl(cls.meetingUrl) ? cls.meetingUrl : undefined;

      if (cls.mode === "ONLINE" || cls.mode === "HYBRID") {
        if (!meetingUrl) {
          const current = await classSessionsApi.getMeeting(cls.id);
          meetingUrl = current.data.meetingUrl || undefined;
        }
        if (!isRealGoogleMeetUrl(meetingUrl)) {
          const created = await classSessionsApi.createGoogleMeet(cls.id);
          meetingUrl = created.data.meetingUri;
        }
        if (!isRealGoogleMeetUrl(meetingUrl)) {
          throw new Error("No Google Meet is available for this class.");
        }
      }

      await classSessionsApi.startLive(cls.id, meetingUrl);

      const startedAt = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

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
        meetUrl: meetingUrl || "",
        meetId: meetingUrl?.split("/").pop() || "",
        startedAt,
        studentCount: cls.studentCount,
        status: "LIVE",
      });

      setSelectedClassForModal({
        ...modalData,
        meetingUrl,
        status: "LIVE",
      });
      setIsClassModalOpen(true);

      if (meetingUrl) {
        window.open(meetingUrl, "_blank", "noopener,noreferrer");
      }

      refetchSessions();
      refetchDash();
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err as Error)?.message ||
          "Connect or reauthorize Google Workspace before joining this class."
      );
    }
  };

  const weekRangeLabel = useMemo(() => weekRange.label, [weekRange.label]);

  return (
    <PageContainer className="bg-slate-50/50 dark:bg-slate-950/40">
      {/* ─── Top Header Banner ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl border-2 border-[#2563EB] flex items-center justify-center text-[#2563EB] bg-blue-50/50">
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
              <CalendarIcon className="w-3.5 h-3.5 text-[#2563EB]" />
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
            className="h-9 px-3.5 text-xs font-bold rounded-xl border-[#2563EB]/30 text-[#2563EB] hover:bg-blue-50 bg-white dark:bg-slate-900 shadow-xs"
          >
            Today
          </Button>

          {/* Timetable Grid / Class List Toggle */}
          <div className="bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl flex items-center text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("TIMETABLE")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${viewMode === "TIMETABLE"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
            >
              Timetable Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${viewMode === "LIST"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
            >
              Class List
            </button>
          </div>
        </div>
      </div>


      {/* ─── Main Timetable Grid / List Display ─── */}
      {viewMode === "TIMETABLE" ? (
        <div className="space-y-6">
          {slotsLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
              Loading time slots from Master Setup…
            </div>
          ) : slotsEmpty ? (
            <Card className="rounded-3xl border-dashed">
              <CardContent className="py-14 text-center space-y-2">
                <Clock className="mx-auto h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">No time slots configured</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Ask an admin to add Time Slots in Master Setup (for example 9:00 AM – 10:00 AM). This timetable uses those slots as its base structure.
                </p>
              </CardContent>
            </Card>
          ) : (
          <>
          {sessionsLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
              Loading your assigned classes for this week…
            </div>
          )}
          {/* ─── Master Time Slot Timetable Matrix (Desktop/Tablet) ─── */}
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full border-collapse text-left min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <th className="p-3.5 border-r border-slate-200 dark:border-slate-800 w-32 text-center shrink-0">
                    DAY / DATE
                  </th>
                  {timeSlotColumns.map((slot) => (
                    <th
                      key={slot.timeslotMasterId || slot.period}
                      className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-center min-w-[95px]"
                    >
                      <span className="block font-black text-xs text-slate-800 dark:text-slate-100">
                        {slot.start.replace(/\s*(AM|PM)$/i, "")}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold block">{slot.subTitle || "—"}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {weekDays.map((day) => {
                  // Holiday / weekly off: full-width banner
                  if (day.isHoliday) {
                    return (
                      <tr
                        key={day.iso}
                        className="transition-colors h-[54px] bg-rose-50/30 dark:bg-rose-950/10"
                      >
                        <td
                          colSpan={timeSlotColumns.length + 1}
                          className="p-2.5 text-center align-middle"
                        >
                          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-rose-50 border border-rose-200/90 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 text-xs font-black shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span>
                              {day.holidayTitle || "Holiday"} – {day.formattedDate}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const dayClasses = filteredClasses.filter((c) => c.date === day.iso);

                  // Keep track of spanned slots to skip rendering empty cells
                  let skipSlotsRemaining = 0;

                  return (
                    <tr
                      key={day.iso}
                      className={`transition-colors h-[86px] ${day.isToday
                        ? "bg-blue-50/20 dark:bg-blue-950/10"
                        : "hover:bg-slate-50/30 dark:hover:bg-slate-800/20"
                        }`}
                    >
                      {/* Left Day/Date Cell */}
                      <td
                        className={`p-3 border-r border-slate-200 dark:border-slate-800 text-center font-bold ${day.isToday
                          ? "bg-blue-50/60 text-[#2563EB] dark:bg-blue-950/40"
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

                      {timeSlotColumns.map((slot) => {
                        if (skipSlotsRemaining > 0) {
                          skipSlotsRemaining--;
                          return null;
                        }

                        const matchingClass = dayClasses.find((c) => {
                          if (c.timeslotMasterId && slot.timeslotMasterId) {
                            return c.timeslotMasterId === slot.timeslotMasterId;
                          }
                          return (c.startPeriod ?? periodFromStartTime(c.startTime, timeSlotColumns)) === slot.period;
                        });

                        if (matchingClass) {
                          const span = matchingClass.spanHours || 1;
                          if (span > 1) {
                            skipSlotsRemaining = span - 1;
                          }

                          const isSelected = selectedClassId === matchingClass.id;
                          const isLive = matchingClass.status === "LIVE";
                          const isExam = matchingClass.isExam;

                          return (
                            <td
                              key={slot.timeslotMasterId || slot.period}
                              colSpan={span}
                              className="p-1 border-r border-slate-200 dark:border-slate-800 align-middle"
                            >
                              <div
                                onClick={() => handleOpenClassDetails(matchingClass)}
                                className={`p-2 rounded-2xl border text-left cursor-pointer transition-all duration-200 hover:shadow-md select-none relative h-[72px] flex flex-col justify-between ${isLive
                                  ? "bg-emerald-50/90 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 ring-2 ring-emerald-500/40 shadow-xs"
                                  : isExam
                                    ? "bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 hover:border-rose-400"
                                    : isSelected
                                      ? "bg-blue-50 border-[#2563EB] ring-2 ring-[#2563EB]/30 shadow-xs"
                                      : "bg-blue-50/50 border-blue-100 hover:border-[#2563EB]/60 dark:bg-slate-800/60 dark:border-slate-700"
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${isLive
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

                        return (
                          <td
                            key={slot.timeslotMasterId || slot.period}
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
                  className={`flex-1 min-w-[42px] py-2 px-1 text-center rounded-xl transition-all cursor-pointer ${mobileDayIndex === idx
                    ? "bg-[#2563EB] text-white font-bold shadow-xs"
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
                    {activeDay.isToday && <Badge className="bg-[#2563EB] text-white text-[10px]">TODAY</Badge>}
                  </div>

                  {activeDay.isHoliday ? (
                    <div className="py-4 px-4 text-center text-xs font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-2xs flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span>
                        {activeDay.holidayTitle || "Holiday"} – {activeDay.formattedDate}
                      </span>
                    </div>
                  ) : dayClasses.length > 0 ? (
                    dayClasses.map((cls) => (
                      <Card
                        key={cls.id}
                        onClick={() => handleOpenClassDetails(cls)}
                        className={`rounded-2xl border cursor-pointer hover:shadow-md transition-all ${selectedClassId === cls.id ? "ring-2 ring-[#2563EB] border-[#2563EB]" : ""
                          }`}
                      >
                        <CardContent className="p-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold font-mono text-[#2563EB]">{cls.timeRange}</span>
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
          <div ref={todayClassesSectionRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 scroll-mt-6">
            {/* Left Column: Today's Classes List */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Today's Classes ({weekDays.find((d) => d.isToday)?.dayShort || weekDays[0]?.dayShort}, {weekDays.find((d) => d.isToday)?.formattedDate || weekDays[0]?.formattedDate})
                </h3>
                <button
                  type="button"
                  onClick={() => setViewMode("LIST")}
                  className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View Full Day <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {todayClasses.length === 0 ? (
                  <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50">
                    <CalendarDays className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No classes scheduled for today</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Check the timetable grid or switch dates to view other sessions.</p>
                  </div>
                ) : (
                  todayClasses.map((cls) => {
                    const isSelected = selectedClassId === cls.id;
                    const isLive = cls.status === "LIVE";

                    return (
                      <Card
                        key={cls.id}
                        onClick={() => setSelectedClassId(cls.id)}
                        className={`rounded-2xl border transition-all cursor-pointer ${isSelected
                            ? "border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-blue-50/30 dark:bg-slate-800"
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
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isLive
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
                            className="rounded-xl text-xs font-extrabold h-8 px-3.5 shrink-0 cursor-pointer text-[#2563EB] border-blue-200 hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB] bg-white transition-all shadow-2xs"
                          >
                            View Class
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Class Details Card */}
            <div className="lg:col-span-6">
              {currentSelectedClass ? (
                <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden h-full flex flex-col justify-between">
                  <div>
                    {/* Card Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                          {currentSelectedClass.courseName}
                        </h3>
                        <Badge
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${currentSelectedClass.status === "LIVE"
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
                        className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Go to Class <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 8-Point Metadata Grid */}
                    <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                      {/* Row 1 */}
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
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
                            className={`font-extrabold ${currentSelectedClass.attendanceStatus === "Updated"
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
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                          <Video className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 block">Class Link</span>
                          {currentSelectedClass.meetingUrl ? (
                            <a
                              href={currentSelectedClass.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-[#2563EB] hover:underline truncate block max-w-[150px]"
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
                      <UserCheck className="w-4 h-4 text-[#2563EB]" /> Update Attendance
                    </Button>

                    <Button
                      type="button"
                      onClick={() => handleGoLive(currentSelectedClass)}
                      className="flex-1 h-11 rounded-2xl bg-[#2563EB] hover:bg-[#125386] text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Video className="w-4 h-4" /> Join / Go Live Class
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden h-full flex items-center justify-center p-8 text-center min-h-[360px]">
                  <div className="max-w-xs space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 text-[#2563EB] flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">No Class Selected</h3>
                    <p className="text-xs text-slate-400">
                      Select a scheduled class from the list or timetable above to view session details, join live, or update attendance.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
          </>
          )}
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
                          className="text-xs px-2.5 py-0.5 text-[#2563EB] bg-blue-50 font-extrabold"
                        >
                          UPCOMING
                        </Badge>
                      )}
                      <Badge variant="outline" className="font-mono text-xs font-bold">
                        {cls.batchCode}
                      </Badge>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
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
                      <UserCheck className="w-3.5 h-3.5 mr-1 text-[#2563EB]" /> Attendance
                    </Button>
                    <Button
                      onClick={() => handleGoLive(cls)}
                      className="rounded-2xl bg-[#2563EB] hover:bg-[#125386] text-white font-extrabold h-9 text-xs px-4"
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
    </PageContainer>
  );
};
