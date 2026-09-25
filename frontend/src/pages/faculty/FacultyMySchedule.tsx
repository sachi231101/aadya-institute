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
  Coffee,
  UtensilsCrossed,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FilterToolbar, PageContainer, PageHeader, PageSection } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth.store";
import { useSessionStore } from "@/store/session.store";
import { useFacultyDashboard } from "@/hooks/useFaculty";
import { getSessionSubjectLabel } from "@/utils/batch.utils";
import { useClassSessions } from "@/hooks/useClassSessions";
import { useFacultyScheduleBlocks } from "@/hooks/useFacultyScheduleBlocks";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { useTimetableSlotColumns } from "@/hooks/useTimetableSlotColumns";
import {
  periodFromStartTime,
  spanSlotsForSession,
  isMasterHolidayDate,
  getMasterHolidayLabel,
  toDateKey,
  getWeekRangeFromOffset,
  localTodayKey,
  findSlotByMasterId,
  selectFacultyTimetableColumns,
  type TimetablePeriodSlot,
} from "@/constants/timetable-slots";
import { useIstTodayKey } from "@/hooks/useIstTodayKey";
import {
  canHostClassSession,
  getSessionHostPhase,
  hostWindowDisabledReason,
  resolveDisplaySessionStatus,
} from "@/utils/session-window";
import { StartClassModal, type ClassSessionModalData } from "@/components/faculty/StartClassModal";
import { UploadRecordingModal } from "@/components/faculty/UploadRecordingModal";
import { UploadStudyMaterialsModal } from "@/components/faculty/UploadStudyMaterialsModal";
import { classSessionsApi, type BackendClassSession } from "@/services/class-sessions.api";
import type {
  BackendFacultyScheduleBlock,
  FacultyScheduleBlockType,
} from "@/services/faculty-schedule-blocks.api";

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
  attendanceMarkedCount?: number;
  enrolledStudentsCount?: number;
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

  // Week Navigator — real current week's Monday (IST), not a hardcoded demo week
  const [weekOffset, setWeekOffset] = useState(0);
  const todayIso = useIstTodayKey(30_000);
  const weekRange = useMemo(
    () => getWeekRangeFromOffset(weekOffset),
    [weekOffset, todayIso]
  );

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
  const branchId =
    user?.branchId ||
    (dashboard as { profile?: { branchId?: string } } | undefined)?.profile?.branchId ||
    undefined;

  const blockQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      from: weekRange.from,
      to: weekRange.to,
      limit: 200,
    };
    if (facultyId) params.facultyId = facultyId;
    if (branchId) params.branchId = branchId;
    return params;
  }, [facultyId, branchId, weekRange.from, weekRange.to]);

  const { data: blocksRes } = useFacultyScheduleBlocks(blockQueryParams);
  const scheduleBlocks = blocksRes?.data ?? [];

  const { options: holidayOptions } = useMasterDropdown("holiday", branchId);
  const {
    slots: masterTimeSlots,
    isLoading: slotsLoading,
    isEmpty: slotsEmpty,
  } = useTimetableSlotColumns(branchId);

  // Mobile selected day index (0 to 6) — track IST today within the visible week
  const [mobileDayIndex, setMobileDayIndex] = useState<number>(() => {
    const todayKey = localTodayKey();
    const [y, m, d] = todayKey.split("-").map(Number);
    const jsDay = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
    return (jsDay + 6) % 7;
  });

  useEffect(() => {
    const [y, m, d] = todayIso.split("-").map(Number);
    if (!y || !m || !d) return;
    const monday = weekRange.mondayKey;
    const [my, mm, md] = monday.split("-").map(Number);
    const todayUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
    const mondayUtc = Date.UTC(my, mm - 1, md, 12, 0, 0);
    const diffDays = Math.round((todayUtc - mondayUtc) / (24 * 60 * 60 * 1000));
    if (diffDays >= 0 && diffDays <= 6) {
      setMobileDayIndex(diffDays);
    }
  }, [todayIso, weekRange.mondayKey]);

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
      const holidayTitle = getMasterHolidayLabel(iso, holidayOptions);
      return {
        date: localDate,
        iso,
        dayName: dayMeta.name,
        dayShort: dayMeta.short,
        formattedDate: localDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        isToday: iso === todayIso,
        isHoliday: isMasterHolidayDate(iso, holidayOptions),
        holidayTitle,
      };
    });
  }, [weekRange.mondayKey, todayIso, holidayOptions]);

  const assignedClasses: FormattedTimetableClass[] = useMemo(() => {
    const userFacultyId = user?.facultyId || dashboard?.profile?.id || undefined;
    const userEmail = (user?.email || dashboard?.profile?.email || "").toLowerCase();
    const userName = (user?.name || dashboard?.profile?.name || "").toLowerCase();

    const notCancelled = (s: BackendClassSession) =>
      String(s.sessionStatus || "").toUpperCase() !== "CANCELLED";

    let rawSessions: BackendClassSession[] = (sessionsRes?.data || []).filter((s: BackendClassSession) => {
      if (!notCancelled(s)) return false;
      if (!userFacultyId && !userEmail && !userName) return true;
      if (userFacultyId && (s.facultyId === userFacultyId || s.faculty?.id === userFacultyId)) return true;
      if (user?.id && s.faculty?.user?.id === user.id) return true;
      if (userEmail && s.faculty?.user?.email && s.faculty.user.email.toLowerCase() === userEmail) return true;
      if (userName && s.faculty?.user?.name && s.faculty.user.name.toLowerCase() === userName) return true;
      return false;
    });

    // Server already scopes pure FACULTY; keep sessions if client identity fields are incomplete.
    if (rawSessions.length === 0 && (sessionsRes?.data?.length ?? 0) > 0) {
      rawSessions = sessionsRes!.data.filter(notCancelled);
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
        masterTimeSlots
      );
      const startTime = s.startTime || masterSlot?.start || "09:00 AM";
      const endTime = s.endTime || masterSlot?.end || "10:00 AM";
      // liveSeconds ticks every second so display status flips at window boundaries
      void liveSeconds;
      status = resolveDisplaySessionStatus({
        dbStatus: status,
        dateKey: scheduledDate,
        startTime,
        endTime,
      });
      const startParsed = parseTimeTo24Hour(startTime);
      const endParsed = parseTimeTo24Hour(endTime);

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
        enrolledStudentsCount: s.enrolledStudentsCount ?? 0,
        attendanceMarkedCount:
          (s as BackendClassSession & { attendanceMarkedCount?: number }).attendanceMarkedCount ??
          0,
        attendanceStatus: (() => {
          const enrolled = s.enrolledStudentsCount ?? 0;
          const marked =
            (s as BackendClassSession & { attendanceMarkedCount?: number })
              .attendanceMarkedCount ?? 0;
          const donePct =
            (s as BackendClassSession & { attendanceDonePercentage?: number })
              .attendanceDonePercentage ?? 0;
          if (enrolled > 0 && (marked >= enrolled || donePct >= 100)) return "Updated";
          if (sessionAttendance[s.id]?.length) return "Updated";
          return "Pending";
        })(),
        startHour: startParsed.hour,
        startMin: startParsed.min,
        endHour: endParsed.hour,
        endMin: endParsed.min,
        spanHours: 1,
        startPeriod: null,
        timeslotMasterId:
          (s as BackendClassSession & { timeslotMasterId?: string }).timeslotMasterId ||
          masterSlot?.timeslotMasterId,
      });
    });

    return Array.from(map.values());
  }, [sessionsRes, dashboard, user, activeLiveClass, sessionAttendance, getSessionStatus, todayIso, masterTimeSlots, liveSeconds]);

  const timeSlotColumns: TimetablePeriodSlot[] = useMemo(
    () =>
      selectFacultyTimetableColumns(
        masterTimeSlots,
        assignedClasses.map((c) => c.timeslotMasterId),
        assignedClasses.map((c) => c.startTime)
      ),
    [masterTimeSlots, assignedClasses]
  );

  const classesForGrid = useMemo(() => {
    return assignedClasses.map((cls) => {
      const masterSlot = findSlotByMasterId(cls.timeslotMasterId, timeSlotColumns);
      const startPeriod =
        masterSlot?.period ?? periodFromStartTime(cls.startTime, timeSlotColumns);
      const span = spanSlotsForSession(
        cls.startTime,
        cls.endTime,
        timeSlotColumns,
        startPeriod
      );
      return { ...cls, startPeriod, spanHours: span };
    });
  }, [assignedClasses, timeSlotColumns]);

  /** O(1) lookup: scheduledDate + timeslotMasterId, with startTime fallback. */
  const blocksByDateSlot = useMemo(() => {
    const byMasterId = new Map<string, BackendFacultyScheduleBlock>();
    const byStartTime = new Map<string, BackendFacultyScheduleBlock>();
    scheduleBlocks.forEach((block) => {
      const dateKey = toDateKey(block.scheduledDate);
      if (block.timeslotMasterId) {
        byMasterId.set(`${dateKey}|${block.timeslotMasterId}`, block);
      }
      byStartTime.set(`${dateKey}|${block.startTime.trim().toLowerCase()}`, block);
    });
    return { byMasterId, byStartTime };
  }, [scheduleBlocks]);

  const findBlockForSlot = (
    dateKey: string,
    slot: TimetablePeriodSlot
  ): BackendFacultyScheduleBlock | undefined => {
    if (slot.timeslotMasterId) {
      const byId = blocksByDateSlot.byMasterId.get(`${dateKey}|${slot.timeslotMasterId}`);
      if (byId) return byId;
    }
    return blocksByDateSlot.byStartTime.get(
      `${dateKey}|${slot.start.trim().toLowerCase()}`
    );
  };

  const resolveBreakLunchLabel = (
    blockType?: FacultyScheduleBlockType | null,
    slot?: TimetablePeriodSlot
  ): "BREAK" | "LUNCH" | null => {
    if (blockType === "LUNCH") return "LUNCH";
    if (blockType === "BREAK") return "BREAK";
    if (slot?.isLunch) return "LUNCH";
    if (slot?.isBreak) return "BREAK";
    return null;
  };

  const filteredClasses = classesForGrid;

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
    // Attendance marking uses the dedicated Mark Attendance screen (same ClassSession).
    if (defaultTab === "attendance") {
      const enrolled = cls.enrolledStudentsCount ?? cls.studentCount ?? 0;
      const marked = cls.attendanceMarkedCount ?? 0;
      const fullyMarked =
        cls.attendanceStatus === "Updated" || (enrolled > 0 && marked >= enrolled);
      navigate(
        fullyMarked
          ? `/faculty/attendance/mark?sessionId=${encodeURIComponent(cls.id)}&mode=view`
          : `/faculty/attendance/mark?sessionId=${encodeURIComponent(cls.id)}`
      );
      return;
    }
    navigate(
      `/faculty/class-session?id=${encodeURIComponent(cls.id)}&course=${encodeURIComponent(cls.courseName)}&subject=${encodeURIComponent(cls.subjectName)}&batch=${encodeURIComponent(cls.batchCode)}&batchId=${encodeURIComponent(cls.batchId || "")}&room=${encodeURIComponent(cls.roomNo)}&time=${encodeURIComponent(cls.timeRange)}&date=${encodeURIComponent(cls.date)}${defaultTab ? `&tab=${defaultTab}` : ""}`
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

    const phase = getSessionHostPhase({
      dateKey: cls.date,
      startTime: cls.startTime,
      endTime: cls.endTime,
    });
    const inWindow = phase === "during";

    // Prefer StartClassModal for the full startLive path (same as Dashboard).
    // If already LIVE and still in window, open modal so faculty can rejoin Meet / manage attendance.
    if (cls.status === "LIVE" && inWindow) {
      setSelectedClassForModal(modalData);
      setIsClassModalOpen(true);
      return;
    }

    if (!inWindow) {
      alert(hostWindowDisabledReason(phase) || "Class cannot be hosted outside its scheduled time.");
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

  const canHostClass = (cls: FormattedTimetableClass) =>
    canHostClassSession({
      dateKey: cls.date,
      startTime: cls.startTime,
      endTime: cls.endTime,
    });

  /** Same scheduled window as Host Class — mark only while phase is `during`. */
  const canMarkAttendance = (cls: FormattedTimetableClass) => canHostClass(cls);

  const attendanceWindowTitle = (cls: FormattedTimetableClass) => {
    if (cls.attendanceStatus === "Updated" || canMarkAttendance(cls)) return undefined;
    return (
      hostWindowDisabledReason(
        getSessionHostPhase({
          dateKey: cls.date,
          startTime: cls.startTime,
          endTime: cls.endTime,
        })
      ) || undefined
    );
  };

  const hostButtonLabel = (cls: FormattedTimetableClass) => {
    if (cls.status === "LIVE") return "Open Google Meet";
    if (cls.status === "COMPLETED") return "Ended";
    return "Host Class";
  };

  const statusBadgeLabel = (status: FormattedTimetableClass["status"]) => {
    if (status === "LIVE") return "LIVE";
    if (status === "COMPLETED") return "Ended";
    if (status === "CANCELLED") return "Cancelled";
    return "Upcoming";
  };

  const weekRangeLabel = useMemo(() => weekRange.label, [weekRange.label]);

  return (
    <PageContainer density="compact">
      <PageHeader
        title="My Class Timetable"
        description="Your assigned classes this week."
      />

      <FilterToolbar className="flex flex-wrap items-center gap-2 !py-0">
        <div className="inline-flex items-center h-9 rounded-lg border border-border bg-background shrink-0">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="h-full px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-l-lg transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2.5 text-xs font-semibold text-foreground whitespace-nowrap tabular-nums min-w-[9.5rem] text-center flex items-center justify-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            {weekRangeLabel}
          </span>
          <button
            type="button"
            onClick={handleNextWeek}
            className="h-full px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-r-lg transition-colors"
            title="Next Week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCurrentWeek}
          className="h-9 px-3 text-xs font-semibold border-border"
        >
          Today
        </Button>

        <div className="inline-flex items-center h-9 rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode("TIMETABLE")}
            className={`h-8 px-3 rounded-md transition-colors cursor-pointer ${
              viewMode === "TIMETABLE"
                ? "bg-background text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode("LIST")}
            className={`h-8 px-3 rounded-md transition-colors cursor-pointer ${
              viewMode === "LIST"
                ? "bg-background text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            List
          </button>
        </div>
      </FilterToolbar>

      {/* --- Main Timetable Grid / List Display --- */}
      {viewMode === "TIMETABLE" ? (
        <PageSection density="compact">
        <div className="space-y-4">
          {slotsLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading time slots from Master Setup…
            </div>
          ) : slotsEmpty ? (
            <Card className="rounded-xl border-dashed border-border shadow-xs">
              <CardContent className="py-10 text-center space-y-1.5">
                <Clock className="mx-auto h-7 w-7 text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">No time slots configured</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Ask an admin to add Time Slots in Master Setup. This timetable uses those slots as its columns.
                </p>
              </CardContent>
            </Card>
          ) : (
          <>
          {sessionsLoading && (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Loading your assigned classes for this week…
            </div>
          )}
          {/* --- Master Time Slot Timetable Matrix (Desktop/Tablet) --- */}
          <Card className="hidden md:block border border-border shadow-xs bg-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-left min-w-[900px] table-fixed">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider">
                  <th className="py-2 px-3 w-[100px] border-r border-border text-center shrink-0">
                    Day
                  </th>
                  {timeSlotColumns.map((slot) => (
                    <th
                      key={slot.timeslotMasterId || slot.period}
                      className="py-2 px-1 border-r border-border last:border-r-0 text-center min-w-[96px]"
                    >
                      <div className="text-[10px] font-bold text-foreground tracking-tight leading-tight">
                        {slot.timeTitle}
                      </div>
                      <div className="text-[8px] text-muted-foreground font-semibold tracking-wider uppercase mt-0.5">
                        {slot.isBreak
                          ? "Break"
                          : slot.isLunch
                            ? "Lunch"
                            : slot.subTitle || "—"}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {weekDays.map((day) => {
                  // Holiday / weekly off: full-width banner
                  if (day.isHoliday) {
                    return (
                      <tr
                        key={day.iso}
                        className="bg-rose-50/40 dark:bg-rose-950/15"
                      >
                        <td
                          colSpan={timeSlotColumns.length + 1}
                          className="p-1.5 text-center align-middle"
                        >
                          <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
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
                      className={
                        day.isToday
                          ? "bg-blue-500/[0.03] dark:bg-blue-950/10"
                          : "hover:bg-muted/20"
                      }
                    >
                      {/* Left Day/Date Cell */}
                      <td
                        className={`py-1.5 px-2 border-r border-border text-center align-middle ${
                          day.isToday
                            ? "bg-blue-500/10 text-primary"
                            : "bg-muted/30 text-foreground"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center leading-tight">
                          <span className="text-[11px] uppercase tracking-wider font-semibold">
                            {day.dayShort}
                          </span>
                          <span className="text-[9px] font-medium text-muted-foreground mt-0.5">
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

                        // 1. Class session wins
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
                              className="p-1 border-r border-border last:border-r-0 align-middle"
                            >
                              <div
                                onClick={() => handleOpenClassDetails(matchingClass)}
                                className={`px-1.5 py-1 rounded-md border text-left cursor-pointer transition-all select-none relative min-h-[44px] flex flex-col justify-center gap-0.5 ${
                                  isLive
                                    ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
                                    : isExam
                                      ? "bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50"
                                      : isSelected
                                        ? "bg-blue-500/20 border-blue-500/50 ring-1 ring-primary/25"
                                        : "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15 hover:border-blue-500/50"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 min-w-0">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        isLive
                                          ? "bg-emerald-500 animate-ping"
                                          : isExam
                                            ? "bg-rose-500"
                                            : "bg-blue-600"
                                      }`}
                                    />
                                    <p className="font-semibold text-[9px] text-blue-900 dark:text-blue-200 truncate leading-tight">
                                      {matchingClass.courseName}
                                    </p>
                                  </div>
                                  <span className="shrink-0">
                                    {matchingClass.mode === "ONLINE" ? (
                                      <Video className="w-2.5 h-2.5 text-blue-600" />
                                    ) : (
                                      <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                                    )}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-1 text-[8px] font-medium text-foreground/90 leading-tight">
                                  <span className="font-mono truncate">
                                    {matchingClass.batchCode}
                                  </span>
                                  <span className="text-muted-foreground shrink-0 tabular-nums">
                                    {matchingClass.startTime.replace(" ", "")}–{matchingClass.endTime.replace(" ", "")}
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        // 2. FacultyScheduleBlock, then 3. master isBreak / isLunch
                        const scheduleBlock = findBlockForSlot(day.iso, slot);
                        const breakLunchKind = resolveBreakLunchLabel(
                          scheduleBlock?.blockType,
                          slot
                        );

                        if (breakLunchKind === "BREAK") {
                          return (
                            <td
                              key={slot.timeslotMasterId || slot.period}
                              className="p-1 border-r border-border last:border-r-0 align-middle"
                            >
                              <div className="min-h-[44px] w-full rounded-md border border-amber-500/30 bg-amber-500/10 flex flex-col items-center justify-center text-amber-600 dark:text-amber-300 select-none">
                                <span className="text-[8px] font-semibold uppercase">Break</span>
                                <Coffee className="h-2.5 w-2.5 mt-0.5 text-amber-500 dark:text-amber-400" />
                              </div>
                            </td>
                          );
                        }

                        if (breakLunchKind === "LUNCH") {
                          return (
                            <td
                              key={slot.timeslotMasterId || slot.period}
                              className="p-1 border-r border-border last:border-r-0 align-middle"
                            >
                              <div className="min-h-[44px] w-full rounded-md border border-orange-500/30 bg-orange-500/10 flex flex-col items-center justify-center text-orange-600 dark:text-orange-300 select-none">
                                <span className="text-[8px] font-semibold uppercase">Lunch</span>
                                <UtensilsCrossed className="h-2.5 w-2.5 mt-0.5 text-orange-500 dark:text-orange-400" />
                              </div>
                            </td>
                          );
                        }

                        // 4. Empty teaching slot
                        return (
                          <td
                            key={slot.timeslotMasterId || slot.period}
                            className="p-1 border-r border-border last:border-r-0 align-middle text-center"
                          >
                            <div className="min-h-[44px] flex items-center justify-center">
                              <span className="text-muted-foreground/40 text-[10px] font-medium select-none">
                                —
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </Card>

          {/* --- Mobile Daily Cards View (Small Screens) --- */}
          <div className="md:hidden space-y-2.5">
            <div className="flex items-center justify-between p-1 bg-card border border-border rounded-lg overflow-x-auto gap-0.5">
              {weekDays.map((day, idx) => (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setMobileDayIndex(idx)}
                  className={`flex-1 min-w-[40px] py-1.5 px-1 text-center rounded-md transition-colors cursor-pointer ${
                    mobileDayIndex === idx
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="block text-[9px] uppercase font-mono leading-tight">{day.dayShort}</span>
                  <span className="block text-[11px] font-semibold leading-tight">{day.date.getDate()}</span>
                </button>
              ))}
            </div>

            {(() => {
              const activeDay = weekDays[mobileDayIndex] || weekDays[0];
              const dayClasses = filteredClasses.filter((c) => c.date === activeDay.iso);

              type MobileDayItem =
                | { kind: "CLASS"; sortKey: number; cls: FormattedTimetableClass }
                | {
                    kind: "BREAK" | "LUNCH";
                    sortKey: number;
                    label: string;
                    timeLabel: string;
                    key: string;
                  };

              const occupiedPeriods = new Set<number>();
              const mobileItems: MobileDayItem[] = [];

              dayClasses.forEach((cls) => {
                const period =
                  cls.startPeriod ??
                  periodFromStartTime(cls.startTime, timeSlotColumns) ??
                  0;
                const span = cls.spanHours || 1;
                for (let p = period; p < period + span; p++) occupiedPeriods.add(p);
                const sortKey =
                  cls.startHour * 60 + cls.startMin;
                mobileItems.push({ kind: "CLASS", sortKey, cls });
              });

              if (!activeDay.isHoliday) {
                timeSlotColumns.forEach((slot) => {
                  if (occupiedPeriods.has(slot.period)) return;
                  const scheduleBlock = findBlockForSlot(activeDay.iso, slot);
                  const breakLunchKind = resolveBreakLunchLabel(
                    scheduleBlock?.blockType,
                    slot
                  );
                  if (!breakLunchKind) return;
                  const startMins =
                    (slot.hour24 ?? 0) * 60 + (slot.minute ?? 0);
                  mobileItems.push({
                    kind: breakLunchKind,
                    sortKey: startMins,
                    label: breakLunchKind === "LUNCH" ? "Lunch" : "Break",
                    timeLabel: slot.label,
                    key: `block-${slot.timeslotMasterId || slot.period}`,
                  });
                });
              }

              mobileItems.sort((a, b) => a.sortKey - b.sortKey);

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground px-0.5">
                    <span>
                      {activeDay.dayName}, {activeDay.formattedDate}
                    </span>
                    {activeDay.isToday && (
                      <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 h-5">
                        Today
                      </Badge>
                    )}
                  </div>

                  {activeDay.isHoliday ? (
                    <div className="py-3 px-3 text-center text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/10 rounded-md border border-rose-500/20 flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>
                        {activeDay.holidayTitle || "Holiday"} – {activeDay.formattedDate}
                      </span>
                    </div>
                  ) : mobileItems.length > 0 ? (
                    mobileItems.map((item) => {
                      if (item.kind === "CLASS") {
                        const cls = item.cls;
                        return (
                          <Card
                            key={cls.id}
                            onClick={() => handleOpenClassDetails(cls)}
                            className={`rounded-lg border border-border shadow-xs cursor-pointer hover:border-primary/40 transition-colors ${
                              selectedClassId === cls.id ? "ring-1 ring-primary border-primary" : ""
                            }`}
                          >
                            <CardContent className="p-3 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold font-mono text-primary">
                                  {cls.timeRange}
                                </span>
                                <Badge
                                  className={
                                    cls.status === "LIVE"
                                      ? "bg-emerald-600 text-white animate-pulse text-[9px] px-1.5 h-5"
                                      : cls.status === "COMPLETED"
                                        ? "bg-slate-500 text-white text-[9px] px-1.5 h-5"
                                        : "bg-blue-500/10 text-blue-700 border-blue-500/20 text-[9px] px-1.5 h-5"
                                  }
                                >
                                  {statusBadgeLabel(cls.status)}
                                </Badge>
                              </div>
                              <h4 className="font-semibold text-sm text-foreground leading-tight">
                                {cls.courseName}
                              </h4>
                              <p className="text-[11px] text-muted-foreground">
                                Batch {cls.batchCode} · {cls.roomNo} ({cls.mode}) · {cls.studentCount} students
                              </p>
                            </CardContent>
                          </Card>
                        );
                      }

                      const isLunch = item.kind === "LUNCH";
                      return (
                        <Card
                          key={item.key}
                          className={`rounded-lg border shadow-xs select-none ${
                            isLunch
                              ? "border-orange-500/30 bg-orange-500/10"
                              : "border-amber-500/30 bg-amber-500/10"
                          }`}
                        >
                          <CardContent className="p-3 flex items-center justify-between gap-3">
                            <div>
                              <span
                                className={`text-[11px] font-semibold font-mono ${
                                  isLunch ? "text-orange-700" : "text-amber-700"
                                }`}
                              >
                                {item.timeLabel}
                              </span>
                              <h4
                                className={`font-semibold text-xs mt-0.5 uppercase ${
                                  isLunch
                                    ? "text-orange-600 dark:text-orange-300"
                                    : "text-amber-600 dark:text-amber-300"
                                }`}
                              >
                                {item.label}
                              </h4>
                            </div>
                            {isLunch ? (
                              <UtensilsCrossed className="h-4 w-4 text-orange-500 dark:text-orange-400 shrink-0" />
                            ) : (
                              <Coffee className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground bg-card rounded-lg border border-dashed border-border">
                      No classes scheduled for {activeDay.dayName}.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* --- Bottom Two-Column Dashboard (Today's Classes + Class Details) --- */}
          <div ref={todayClassesSectionRef} className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1 scroll-mt-6">
            {/* Left Column: Today's Classes List */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  Today&apos;s classes
                  <span className="text-muted-foreground font-medium ml-1.5">
                    ({weekDays.find((d) => d.isToday)?.dayShort || weekDays[0]?.dayShort},{" "}
                    {weekDays.find((d) => d.isToday)?.formattedDate || weekDays[0]?.formattedDate})
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setViewMode("LIST")}
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  Full list <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-0.5">
                {todayClasses.length === 0 ? (
                  <div className="text-center py-8 px-3 border border-dashed border-border rounded-lg bg-muted/20">
                    <CalendarDays className="w-6 h-6 text-muted-foreground/60 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-foreground">No classes today</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Check the grid or switch weeks for other sessions.
                    </p>
                  </div>
                ) : (
                  todayClasses.map((cls) => {
                    const isSelected = selectedClassId === cls.id;
                    const isLive = cls.status === "LIVE";

                    return (
                      <Card
                        key={cls.id}
                        onClick={() => setSelectedClassId(cls.id)}
                        className={`rounded-lg border shadow-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "border-primary ring-1 ring-primary/20 bg-blue-500/5"
                            : "border-border bg-card hover:border-primary/30"
                        }`}
                      >
                        <CardContent className="p-3 flex items-center justify-between gap-2.5">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-semibold text-foreground tabular-nums">
                                {cls.startTime} – {cls.endTime}
                              </span>
                              <Badge
                                className={`text-[9px] font-semibold px-1.5 py-0 h-5 rounded-md ${
                                  isLive
                                    ? "bg-emerald-600 text-white animate-pulse"
                                    : cls.status === "COMPLETED"
                                      ? "bg-slate-500 text-white"
                                      : "bg-blue-500/10 text-blue-700 border border-blue-500/20"
                                }`}
                              >
                                {statusBadgeLabel(cls.status)}
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-sm text-foreground leading-tight truncate">
                              {cls.courseName}
                            </h4>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap">
                              <span>Batch {cls.batchCode}</span>
                              <span>·</span>
                              <span>{cls.mode === "ONLINE" ? "Online" : "Offline"}</span>
                              {cls.roomNo && cls.roomNo !== "Online" && (
                                <>
                                  <span>·</span>
                                  <span>{cls.roomNo}</span>
                                </>
                              )}
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <Users className="w-3 h-3 text-muted-foreground" /> {cls.studentCount}
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
                            className="rounded-lg text-[11px] font-semibold h-8 px-2.5 shrink-0 cursor-pointer border-border"
                          >
                            View
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
                <Card className="rounded-lg border border-border bg-card shadow-xs overflow-hidden h-full flex flex-col justify-between">
                  <div>
                    {/* Card Header */}
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <h3 className="text-base font-semibold text-foreground truncate">
                          {currentSelectedClass.courseName}
                        </h3>
                        <Badge
                          className={`text-[9px] font-semibold px-1.5 py-0 h-5 rounded-md ${
                            currentSelectedClass.status === "LIVE"
                              ? "bg-emerald-600 text-white animate-pulse"
                              : currentSelectedClass.status === "COMPLETED"
                                ? "bg-slate-500 text-white"
                                : "bg-blue-500/10 text-blue-700 border border-blue-500/20"
                          }`}
                        >
                          {statusBadgeLabel(currentSelectedClass.status)}
                        </Badge>
                        {currentSelectedClass.status === "LIVE" && (
                          <span className="text-[11px] font-mono font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            {formatLiveTimer(liveSeconds)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleNavigateToSession(currentSelectedClass)}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                      >
                        Go to class <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* 8-Point Metadata Grid */}
                    <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                      {/* Row 1 */}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-500/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <BookOpen className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground block">Batch</span>
                          <span className="font-semibold text-foreground text-[12px]">
                            {currentSelectedClass.batchCode}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                          <UserCheck className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground block">Faculty</span>
                          <span className="font-semibold text-foreground text-[12px]">
                            {user?.name || "Faculty01"}
                          </span>
                        </div>
                      </div>

                      {/* Row 2 */}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground block">Subject / Module</span>
                          <span className="font-semibold text-foreground text-[12px] truncate block">
                            {currentSelectedClass.subjectName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CalendarIcon className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground block">Date</span>
                          <span className="font-semibold text-foreground text-[12px]">
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
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Clock className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground block">Scheduled Time</span>
                          <span className="font-semibold text-foreground text-[12px]">
                            {currentSelectedClass.timeRange}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Users className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground block">Enrolled Students</span>
                          <span className="font-semibold text-foreground text-[12px]">
                            {currentSelectedClass.studentCount}
                          </span>
                        </div>
                      </div>

                      {/* Row 4 */}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground block">Mode</span>
                          <span className="font-semibold text-foreground text-[12px]">
                            {currentSelectedClass.mode === "ONLINE" ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground block">Attendance Status</span>
                          <span
                            className={`font-semibold text-[12px] ${
                              currentSelectedClass.attendanceStatus === "Updated"
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {currentSelectedClass.attendanceStatus || "Pending"}
                          </span>
                        </div>
                      </div>

                      {/* Row 5 */}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground block">Room</span>
                          <span className="font-semibold text-foreground text-[12px]">
                            {currentSelectedClass.roomNo || "Room No 1"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-500/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <Video className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-muted-foreground block">Class Link</span>
                          {currentSelectedClass.meetingUrl ? (
                            <a
                              href={currentSelectedClass.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-primary hover:underline truncate block max-w-[150px] text-[12px]"
                            >
                              Google Meet link
                            </a>
                          ) : (
                            <span className="font-semibold text-muted-foreground text-[12px]">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Dual Actions Bar */}
                  <div className="p-3 bg-muted/40 border-t border-border flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleNavigateToSession(currentSelectedClass, "attendance")}
                      disabled={
                        currentSelectedClass.attendanceStatus !== "Updated" &&
                        !canMarkAttendance(currentSelectedClass)
                      }
                      title={attendanceWindowTitle(currentSelectedClass)}
                      className="flex-1 h-9 rounded-lg border-border bg-background text-foreground font-semibold text-xs shadow-xs hover:bg-muted/60 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-primary" />{" "}
                      {currentSelectedClass.attendanceStatus === "Updated"
                        ? "View Attendance"
                        : "Update Attendance"}
                    </Button>

                    <Button
                      type="button"
                      onClick={() => handleGoLive(currentSelectedClass)}
                      disabled={!canHostClass(currentSelectedClass)}
                      title={
                        canHostClass(currentSelectedClass)
                          ? undefined
                          : hostWindowDisabledReason(
                              getSessionHostPhase({
                                dateKey: currentSelectedClass.date,
                                startTime: currentSelectedClass.startTime,
                                endTime: currentSelectedClass.endTime,
                              })
                            ) || undefined
                      }
                      className="flex-1 h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Video className="w-3.5 h-3.5" />{" "}
                      {hostButtonLabel(currentSelectedClass)}
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="rounded-lg border border-border bg-card shadow-xs overflow-hidden h-full flex items-center justify-center p-6 text-center min-h-[280px]">
                  <div className="max-w-xs space-y-1.5">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-primary flex items-center justify-center mx-auto mb-2">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">No class selected</h3>
                    <p className="text-xs text-muted-foreground">
                      Select a class from the list or timetable to view details, host class, or update attendance.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
          </>
          )}
        </div>
        </PageSection>
      ) : (
        /* --- Class List View --- */
        <PageSection density="compact">
        <div className="space-y-2">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls) => (
              <Card
                key={cls.id}
                className="border-border rounded-lg shadow-xs hover:border-primary/30 transition-colors overflow-hidden bg-card"
              >
                <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {cls.status === "LIVE" ? (
                        <Badge className="bg-emerald-600 text-white font-semibold text-[9px] px-1.5 py-0 h-5 animate-pulse">
                          LIVE
                        </Badge>
                      ) : cls.status === "COMPLETED" ? (
                        <Badge className="bg-slate-500 text-white font-semibold text-[9px] px-1.5 py-0 h-5">
                          Ended
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-5 text-primary bg-blue-500/10 border-blue-500/20 font-semibold"
                        >
                          Upcoming
                        </Badge>
                      )}
                      <Badge variant="outline" className="font-mono text-[10px] font-semibold h-5 px-1.5">
                        {cls.batchCode}
                      </Badge>
                      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        {cls.date} ({cls.timeRange})
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground leading-tight">
                      {cls.courseName}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Module: <span className="font-semibold text-foreground/80">{cls.subjectName}</span>
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {cls.roomNo} ({cls.mode})
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {cls.studentCount} students
                      </span>
                      <span>
                        Attendance:{" "}
                        <strong className="text-foreground font-semibold">
                          {cls.attendanceStatus || "Pending"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => handleNavigateToSession(cls, "attendance")}
                      disabled={
                        cls.attendanceStatus !== "Updated" && !canMarkAttendance(cls)
                      }
                      title={attendanceWindowTitle(cls)}
                      className="rounded-lg h-9 text-xs font-semibold border-border disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1 text-primary" />{" "}
                      {cls.attendanceStatus === "Updated" ? "View Attendance" : "Attendance"}
                    </Button>
                    <Button
                      onClick={() => handleGoLive(cls)}
                      disabled={!canHostClass(cls)}
                      title={
                        canHostClass(cls)
                          ? undefined
                          : hostWindowDisabledReason(
                              getSessionHostPhase({
                                dateKey: cls.date,
                                startTime: cls.startTime,
                                endTime: cls.endTime,
                              })
                            ) || undefined
                      }
                      className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 text-xs px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Video className="w-3.5 h-3.5 mr-1.5" />{" "}
                      {hostButtonLabel(cls)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground bg-card rounded-lg border border-dashed border-border">
              No classes matching your filter criteria.
            </div>
          )}
        </div>
        </PageSection>
      )}

      {/* --- Start Class Centered Modal --- */}
      <StartClassModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        session={selectedClassForModal}
        onSessionStatusChange={(sessionId, newStatus) => {
          setSelectedClassForModal((prev) =>
            prev && prev.id === sessionId
              ? { ...prev, status: newStatus }
              : prev
          );
          refetchSessions();
          refetchDash();
        }}
      />

      {/* --- Recording Modal --- */}
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

      {/* --- Study Materials Modal --- */}
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
