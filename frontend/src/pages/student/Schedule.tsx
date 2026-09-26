import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Star,
  Check,
  Lock,
  Video,
  Camera,
  Mic,
  Eye,
  BookOpen,
  Loader2,
  Coffee,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useFeedbackByStudent, useSubmitFeedback } from "@/hooks/useFeedback";
import { useSessionStore } from "@/store/session.store";
import { classSessionsApi } from "@/services/class-sessions.api";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";
import { FilterToolbar, PageContainer, PageHeader, PageSection } from "@/components/layout";
import { getSessionSubjectLabel } from "@/utils/batch.utils";
import { useRecordings } from "@/hooks/useRecordings";
import { useTimetableSlotColumns } from "@/hooks/useTimetableSlotColumns";
import {
  toDateKey,
  periodFromStartTime,
  findSlotByMasterId,
  getWeekRangeFromOffset,
  localTodayKey,
  addDaysToDateKey,
  formatDateKeyLabel,
  type TimetablePeriodSlot,
} from "@/constants/timetable-slots";
import {
  canStudentJoinSession,
  getSessionHostPhase,
  istTodayKey,
  resolveDisplaySessionStatus,
} from "@/utils/session-window";

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
    facultyId: raw.facultyId || raw.faculty?.id || "",
    date: raw.scheduledDate ? toDateKey(raw.scheduledDate) : "",
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
    avatarBg: "bg-primary/10 text-primary border border-primary/20",
    avatarColor: "text-primary",
    meetingUrl: raw.meetingUrl,
    timeslotMasterId: raw.timeslotMasterId || undefined,
    branchId: raw.branchId || undefined,
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
  facultyId: string;
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
  timeslotMasterId?: string;
  branchId?: string;
  startPeriod?: number | null;
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

const DAYS_OF_WEEK = [
  { key: 1, name: "Monday", short: "MON" },
  { key: 2, name: "Tuesday", short: "TUE" },
  { key: 3, name: "Wednesday", short: "WED" },
  { key: 4, name: "Thursday", short: "THU" },
  { key: 5, name: "Friday", short: "FRI" },
  { key: 6, name: "Saturday", short: "SAT" },
  { key: 0, name: "Sunday", short: "SUN" },
] as const;

const buildWeekDays = (weekOffset = 0, sessions: StudentClassSession[] = []): DayData[] => {
  const weekRange = getWeekRangeFromOffset(weekOffset);
  const todayKey = localTodayKey();

  return Array.from({ length: 7 }, (_, i) => {
    const fullDate = addDaysToDateKey(weekRange.mondayKey, i);
    const [y, m, d] = fullDate.split("-").map(Number);
    const localDate = new Date(y, m - 1, d);
    const isToday = fullDate === todayKey;
    const classCount = sessions.filter((s) => s.date === fullDate).length;
    return {
      dayName: DAY_NAMES[localDate.getDay()],
      dateNumber: String(localDate.getDate()).padStart(2, "0"),
      monthName: MONTH_NAMES[localDate.getMonth()],
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
  const submitFeedbackMutation = useSubmitFeedback();
  const { activeLiveClass } = useSessionStore();
  const { data: recordingsRes } = useRecordings({ limit: 100, recordingStatus: "AVAILABLE" });
  const [recordingsNow] = useState(() => Date.now());
  const availableRecordingSessionIds = useMemo(
    () =>
      new Set(
        (recordingsRes?.data ?? [])
          .filter(
            (recording: { expiresAt: string }) =>
              new Date(recording.expiresAt).getTime() > recordingsNow
          )
          .map((recording: { classSessionId: string }) => recording.classSessionId)
      ),
    [recordingsRes, recordingsNow]
  );

  const studentId = academic.studentId || user?.studentId || user?.id || "";
  const apiStudentId = academic.studentId || user?.studentId || "";
  const studentName = academic.studentName || user?.name || "Student";
  const { data: myFeedbackRes } = useFeedbackByStudent(apiStudentId);
  const [apiSessions, setApiSessions] = useState<StudentClassSession[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => localTodayKey());
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const dayDetailRef = useRef<HTMLDivElement>(null);

  const weekRange = useMemo(() => getWeekRangeFromOffset(weekOffset), [weekOffset]);

  const branchIdFromSessions = useMemo(() => {
    const withBranch = apiSessions.find((s) => s.branchId);
    return withBranch?.branchId;
  }, [apiSessions]);

  const slotBranchId = user?.branchId || branchIdFromSessions || undefined;
  const {
    slots: timeSlotColumns,
    isLoading: slotsLoading,
    isEmpty: slotsEmpty,
  } = useTimetableSlotColumns(slotBranchId);

  const effectiveSessions = apiSessions;

  const weekDays = useMemo(
    () => buildWeekDays(weekOffset, effectiveSessions),
    [weekOffset, effectiveSessions]
  );

  const weekGridDays = useMemo(() => {
    const todayKey = localTodayKey();
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysToDateKey(weekRange.mondayKey, i);
      const [yy, mm, dd] = iso.split("-").map(Number);
      const localDate = new Date(yy, mm - 1, dd);
      const dayNum = localDate.getDay();
      const dayMeta = DAYS_OF_WEEK.find((item) => item.key === dayNum) || {
        name: "Day",
        short: "DAY",
      };
      return {
        iso,
        dayName: dayMeta.name,
        dayShort: dayMeta.short,
        dayNumber: String(localDate.getDate()),
        formattedDate: formatDateKeyLabel(iso),
        isToday: iso === todayKey,
      };
    });
  }, [weekRange.mondayKey]);

  /** dayKey × period → stacked session chips */
  const weekSlotGrid = useMemo(() => {
    const emptyDay = (): Record<number, StudentClassSession[]> => {
      const slots: Record<number, StudentClassSession[]> = {};
      timeSlotColumns.forEach((col) => {
        slots[col.period] = [];
      });
      return slots;
    };
    const grid: Record<string, Record<number, StudentClassSession[]>> = {};
    weekGridDays.forEach((d) => {
      grid[d.iso] = emptyDay();
    });

    effectiveSessions.forEach((session) => {
      if (!grid[session.date]) return;
      const masterSlot = findSlotByMasterId(session.timeslotMasterId, timeSlotColumns);
      const period =
        masterSlot?.period ?? periodFromStartTime(session.startTime, timeSlotColumns);
      if (!period || !grid[session.date][period]) return;
      grid[session.date][period].push(session);
    });

    return grid;
  }, [effectiveSessions, timeSlotColumns, weekGridDays]);

  const selectedDay = useMemo(
    () => weekDays.find((d) => d.fullDate === selectedDate) ?? weekDays[0],
    [weekDays, selectedDate]
  );

  const weekRangeLabel = useMemo(() => weekRange.label, [weekRange.label]);

  const goToCurrentWeek = () => {
    setWeekOffset(0);
    setSelectedDate(localTodayKey());
  };

  const handleSelectGridCell = (dateKey: string, session?: StudentClassSession) => {
    setSelectedDate(dateKey);
    if (session) setSelectedSessionId(session.id);
    setTimeout(() => {
      dayDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      const range = getWeekRangeFromOffset(weekOffset);
      try {
        const res = await classSessionsApi.getAll({
          startDate: range.from,
          endDate: range.to,
          limit: 100,
        });
        // Backend already scopes STUDENT lists to ACTIVE enrollments — trust API result.
        const mapped = (res.data || []).map(mapApiSessionToStudentSession);
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
  }, [weekOffset]);

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
      const today = localTodayKey();
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
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [justSubmittedIds, setJustSubmittedIds] = useState<string[]>([]);
  const syncedSessionIds = useRef(new Set<string>());

  // Modals
  const [liveJoiningSession, setLiveJoiningSession] = useState<StudentClassSession | null>(null);
  const [isJoiningMeeting, setIsJoiningMeeting] = useState(false);
  const [viewingFeedbackSession, setViewingFeedbackSession] = useState<ClassFeedbackItem | null>(null);

  // Filter sessions for the active selected day — prefer live API data once loaded
  const daySessions = useMemo(() => {
    if (!selectedDay) return [];
    const list = effectiveSessions.filter((s) => s.date === selectedDay.fullDate);
    if (!selectedSessionId) return list;
    return [...list].sort((a, b) => {
      if (a.id === selectedSessionId) return -1;
      if (b.id === selectedSessionId) return 1;
      return a.startHour24 * 60 + a.startMin - (b.startHour24 * 60 + b.startMin);
    });
  }, [selectedDay, effectiveSessions, selectedSessionId]);

  // Determine real-time lifecycle status of a session (IST clock wins over stuck DB LIVE)
  const getSessionLifecycle = (session: StudentClassSession) => {
    const serverFeedback = submittedBySession.get(session.id);
    const storedFeedback =
      getFeedbackForSession(session.id, apiStudentId) ||
      getFeedbackForSession(session.id, studentId);
    if (serverFeedback || justSubmittedIds.includes(session.id)) {
      const submittedAt = serverFeedback?.submittedAt
        ? new Date(serverFeedback.submittedAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : storedFeedback?.submittedAt;
      return {
        stage: "FEEDBACK_SUBMITTED" as const,
        statusText: "COMPLETED",
        subText: "Feedback Submitted • Thank you for your feedback.",
        badgeColor: "emerald",
        feedback:
          storedFeedback ||
          (serverFeedback
            ? {
                id: session.id,
                sessionId: session.id,
                courseName: session.title,
                batchCode: session.courseCode,
                facultyName: session.facultyName,
                classDate: session.date,
                classTime: `${session.startTime} – ${session.endTime}`,
                studentId: apiStudentId,
                studentName,
                rating: serverFeedback.rating,
                ratingLabel: RATING_LABELS[Math.round(serverFeedback.rating)] || "Excellent",
                comments: serverFeedback.comment,
                submittedAt: submittedAt || "",
              }
            : undefined),
        submittedAt,
      };
    }

    const now = currentSystemTime;
    const todayStr = istTodayKey(now);
    const windowParams = {
      dateKey: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      now,
    };
    const phase = getSessionHostPhase(windowParams);
    const dbStatusHint =
      session.forceStatus === "LIVE NOW"
        ? "LIVE"
        : session.forceStatus === "COMPLETED"
          ? "COMPLETED"
          : "UPCOMING";
    const isLiveInStore =
      activeLiveClass?.status === "LIVE" &&
      (activeLiveClass.id === session.id ||
        activeLiveClass.sessionId === session.id ||
        activeLiveClass.batchCode?.toLowerCase() === session.batchCode?.toLowerCase());
    const effectiveDbStatus = isLiveInStore ? "LIVE" : dbStatusHint;
    const displayStatus = resolveDisplaySessionStatus({
      ...windowParams,
      dbStatus: effectiveDbStatus,
    });
    const canJoin = canStudentJoinSession({
      ...windowParams,
      dbStatus: effectiveDbStatus,
    });

    const completedFeedback = () => {
      if (session.submittedRating) {
        return {
          stage: "FEEDBACK_SUBMITTED" as const,
          statusText: "COMPLETED",
          subText: "Feedback Submitted • Thank you for helping us improve.",
          badgeColor: "emerald",
          submittedAt: session.submittedAtFormatted,
          rating: session.submittedRating,
          feedback: undefined as ClassFeedbackItem | undefined,
        };
      }
      return {
        stage: "FEEDBACK_REQUIRED" as const,
        statusText: "CLASS COMPLETED",
        subText: "Class time has ended.",
        badgeColor: "sky",
        feedback: undefined as ClassFeedbackItem | undefined,
      };
    };

    // 1. CANCELLED / COMPLETED / phase after / past day → completed (hide Join)
    if (
      displayStatus === "COMPLETED" ||
      displayStatus === "CANCELLED" ||
      phase === "after" ||
      session.date < todayStr ||
      session.forceStatus === "COMPLETED"
    ) {
      return completedFeedback();
    }

    // 2. Future day or phase before → upcoming (no Join until LIVE + during)
    if (session.date > todayStr || phase === "before") {
      const startMinutes = session.startHour24 * 60 + session.startMin;
      const joinMinutes = startMinutes - (session.joinAvailableMinutesBefore || 15);
      const joinTimeStr = formatMinutesToTime(joinMinutes);
      const nowParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(now);
      const hour = Number(nowParts.find((p) => p.type === "hour")?.value ?? 0);
      const minute = Number(nowParts.find((p) => p.type === "minute")?.value ?? 0);
      const nowMinutes = hour * 60 + minute;
      const minsLeft =
        session.date === todayStr
          ? Math.max(1, Math.ceil(joinMinutes - nowMinutes))
          : session.joinAvailableMinutesBefore || 15;
      return {
        stage: "UPCOMING" as const,
        statusText: "UPCOMING",
        subText: `Starts at ${session.startTime}`,
        joinTimeStr,
        minutesLeft: minsLeft,
        badgeColor: "amber",
      };
    }

    // 3. phase during + LIVE (DB or store) → Join Class
    if (canJoin) {
      return {
        stage: "LIVE_NOW" as const,
        statusText: "LIVE NOW",
        subText: "Your class is currently live.",
        badgeColor: "emerald",
      };
    }

    // 4. phase during + not LIVE → waiting for faculty (no Join)
    return {
      stage: "UPCOMING" as const,
      statusText: "UPCOMING",
      subText: "Waiting for faculty to start the class.",
      joinTimeStr: session.startTime,
      minutesLeft: undefined,
      badgeColor: "amber",
    };
  };

  // Open Feedback Modal for a specific completed session
  const submittedBySession = useMemo(() => {
    const map = new Map<string, { rating: number; comment?: string; submittedAt: string }>();
    for (const item of myFeedbackRes?.data ?? []) {
      if (!item?.classSessionId) continue;
      map.set(item.classSessionId, {
        rating: item.rating,
        comment: item.comment,
        submittedAt: item.submittedAt,
      });
    }
    return map;
  }, [myFeedbackRes]);

  useEffect(() => {
    if (!apiStudentId || !myFeedbackRes) return;
    const pending = feedbacks.filter((item) => {
      if (syncedSessionIds.current.has(item.sessionId)) return false;
      if (submittedBySession.has(item.sessionId)) return false;
      if (!item.sessionId || item.sessionId.length < 20) return false;
      return item.studentId === apiStudentId || item.studentId === user?.id;
    });
    if (pending.length === 0) return;

    for (const item of pending) {
      syncedSessionIds.current.add(item.sessionId);
      const rating = Math.min(
        5,
        Math.max(1, Math.round(Number(item.rating) || item.teachingRating || 5))
      );
      const session = apiSessions.find((row) => row.id === item.sessionId);
      submitFeedbackMutation.mutate(
        {
          classSessionId: item.sessionId,
          studentId: apiStudentId,
          facultyId: session?.facultyId || undefined,
          rating,
          comment: item.comments,
        },
        {
          onSuccess: () => {
            setJustSubmittedIds((current) =>
              current.includes(item.sessionId) ? current : [...current, item.sessionId]
            );
          },
        }
      );
    }
  }, [
    apiStudentId,
    apiSessions,
    feedbacks,
    myFeedbackRes,
    submittedBySession,
    submitFeedbackMutation,
    user?.id,
  ]);

  const handleOpenFeedbackModal = (session: StudentClassSession) => {
    setActiveFeedbackModalSession(session);
    setTeachingRating(5);
    setUnderstandingRating(5);
    setOverallExperienceRating(5);
    setFeedbackComment("");
    setFeedbackError(null);
    setHoverTeaching(null);
    setHoverUnderstanding(null);
    setHoverOverall(null);
  };

  // Submit Feedback Handler
  const handleSubmitFeedback = async () => {
    if (!activeFeedbackModalSession) return;
    if (teachingRating === 0 || understandingRating === 0 || overallExperienceRating === 0) return;
    if (submitFeedbackMutation.isPending) return;

    if (!apiStudentId) {
      setFeedbackError("Student profile is not linked. Log out and log in again, then retry.");
      return;
    }

    const avgRating =
      Math.round(((teachingRating + understandingRating + overallExperienceRating) / 3) * 10) / 10;
    const rating = Math.min(5, Math.max(1, Math.round(avgRating)));
    const ratingLabel = RATING_LABELS[rating] || "Excellent";
    const breakdown = `Teaching ${teachingRating}/5 · Understanding ${understandingRating}/5 · Overall ${overallExperienceRating}/5`;
    const comment = feedbackComment.trim()
      ? `${feedbackComment.trim()}\n${breakdown}`
      : breakdown;

    setFeedbackError(null);
    try {
      await submitFeedbackMutation.mutateAsync({
        classSessionId: activeFeedbackModalSession.id,
        studentId: apiStudentId,
        facultyId: activeFeedbackModalSession.facultyId || undefined,
        rating,
        comment,
      });
      setJustSubmittedIds((current) =>
        current.includes(activeFeedbackModalSession.id)
          ? current
          : [...current, activeFeedbackModalSession.id]
      );
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not save feedback. Please try again.";
      setFeedbackError(message);
      return;
    }

    submitFeedback({
      sessionId: activeFeedbackModalSession.id,
      courseName: activeFeedbackModalSession.title,
      batchCode: activeFeedbackModalSession.courseCode,
      facultyName: activeFeedbackModalSession.facultyName,
      classDate: activeFeedbackModalSession.date,
      classTime: `${activeFeedbackModalSession.startTime} – ${activeFeedbackModalSession.endTime}`,
      studentId: apiStudentId,
      studentName,
      rating,
      ratingLabel,
      teachingRating,
      understandingRating,
      overallExperienceRating,
      teachingQuality: "Excellent",
      comments: comment,
    });

    setSuccessToast(
      `Feedback submitted for ${activeFeedbackModalSession.title}! Your feedback is anonymous to faculty.`
    );
    setActiveFeedbackModalSession(null);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <PageContainer density="compact">
      <PageHeader
        title="My Class Schedule"
        description="Classes assigned to you by your counsellor."
      />

      {successToast && (
        <div className="px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:opacity-75 cursor-pointer shrink-0 ml-2"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <FilterToolbar className="flex flex-wrap items-center gap-2 !py-0">
        <div className="inline-flex items-center h-10 sm:h-9 rounded-lg border border-border bg-background flex-1 sm:flex-initial min-w-0 max-w-full">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="h-full min-w-[44px] sm:min-w-0 px-3 sm:px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-l-lg transition-colors touch-manipulation"
            aria-label="Previous week"
            title="Previous week"
          >
            <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
          <span className="px-1.5 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap tabular-nums min-w-0 flex-1 sm:min-w-[9.5rem] text-center flex items-center justify-center gap-1 sm:gap-1.5 truncate">
            <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{weekRangeLabel}</span>
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="h-full min-w-[44px] sm:min-w-0 px-3 sm:px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-r-lg transition-colors touch-manipulation"
            aria-label="Next week"
            title="Next week"
          >
            <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToCurrentWeek}
          className="h-10 sm:h-9 px-4 sm:px-3 text-xs font-semibold border-border shrink-0 touch-manipulation"
        >
          Today
        </Button>
      </FilterToolbar>

      {/* Overall-week-style timetable: Mon–Sun rows × master time columns */}
      {slotsLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground border border-border rounded-lg bg-card">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading time slots from Master Setup…
        </div>
      ) : slotsEmpty ? (
        <div className="py-10 px-4 text-center border border-dashed border-border rounded-lg bg-muted/20 space-y-1.5">
          <Clock className="mx-auto h-7 w-7 text-muted-foreground/50" />
          <p className="text-sm font-semibold text-foreground">No time slots configured</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Ask an admin to add Time Slots in Master Setup. This timetable uses those slots as its columns.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-2.5 text-xs text-muted-foreground border-b border-border bg-muted/20">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Loading your classes for this week…
            </div>
          )}
          <p className="sm:hidden px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border bg-muted/15 leading-snug">
            Swipe sideways for all time slots · Tap a day or class for details below
          </p>
          <div className="overflow-x-auto w-full overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[980px] border-collapse text-left table-fixed">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider">
                  <th className="py-2 px-2 sm:px-3 pl-2.5 sm:pl-4 w-[72px] sm:w-[100px] md:w-[140px] border-r border-border sticky left-0 bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] text-foreground">
                    DAY
                  </th>
                  {timeSlotColumns.map((col: TimetablePeriodSlot) => (
                    <th
                      key={col.period}
                      className="py-2 px-1 text-center w-[100px] sm:w-[96px] border-r border-border last:border-r-0 font-bold text-foreground whitespace-nowrap"
                    >
                      <div className="text-[10px] font-bold text-foreground tracking-tight whitespace-nowrap">
                        {col.timeTitle}
                      </div>
                      <div className="text-[8px] text-muted-foreground font-semibold tracking-wider uppercase">
                        {col.subTitle}
                        {col.isBreak || col.isLunch
                          ? col.isLunch
                            ? " · Lunch"
                            : " · Break"
                          : ""}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {weekGridDays.map((day, dayIdx) => {
                  const bandBg = dayIdx % 2 === 0 ? "bg-muted/15" : "bg-card";
                  const isSelectedDay = selectedDate === day.iso;
                  return (
                    <tr
                      key={day.iso}
                      className={`hover:bg-muted/30 transition-colors ${
                        day.isToday ? "bg-blue-500/[0.03] dark:bg-blue-950/10" : bandBg
                      } ${isSelectedDay ? "ring-1 ring-inset ring-primary/20" : ""}`}
                    >
                      <td
                        className={`py-1.5 px-2 sm:px-3 pl-2.5 sm:pl-4 border-r border-border align-middle sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] cursor-pointer touch-manipulation ${
                          day.isToday
                            ? "bg-blue-500/10 text-primary"
                            : isSelectedDay
                              ? "bg-primary/5"
                              : bandBg
                        }`}
                        onClick={() => handleSelectGridCell(day.iso)}
                      >
                        <div className="min-w-0">
                          <h4 className="font-semibold text-[11px] truncate leading-tight text-foreground">
                            <span className="sm:hidden">{day.dayShort}</span>
                            <span className="hidden sm:inline">{day.dayName}</span>
                          </h4>
                          <p className="text-[9px] text-muted-foreground truncate leading-tight">
                            <span className="sm:hidden">{day.dayNumber}</span>
                            <span className="hidden sm:inline">{day.formattedDate}</span>
                          </p>
                          {day.isToday && (
                            <p className="text-[8px] font-semibold text-primary mt-0.5">Today</p>
                          )}
                        </div>
                      </td>
                      {timeSlotColumns.map((col) => {
                        const chips = weekSlotGrid[day.iso]?.[col.period] ?? [];

                        return (
                          <td
                            key={`${day.iso}-${col.period}`}
                            className="p-1 border-r border-border last:border-r-0 align-top"
                          >
                            <div className="flex flex-col gap-1 min-h-[48px] sm:min-h-[52px]">
                              {chips.map((session) => {
                                const isSelected = selectedSessionId === session.id;
                                return (
                                  <button
                                    key={session.id}
                                    type="button"
                                    onClick={() => handleSelectGridCell(day.iso, session)}
                                    className={`w-full text-left px-1.5 py-1.5 sm:py-1 rounded-md border transition-all cursor-pointer touch-manipulation min-h-[44px] sm:min-h-0 ${
                                      isSelected
                                        ? "border-blue-500/50 bg-blue-500/20 ring-1 ring-primary/25"
                                        : "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 hover:border-blue-500/50"
                                    }`}
                                    title={`${session.title} · ${session.facultyName}`}
                                  >
                                    <div className="text-[10px] sm:text-[9px] font-semibold text-blue-900 dark:text-blue-200 truncate leading-tight">
                                      {session.title}
                                    </div>
                                    <div className="text-[9px] sm:text-[8px] font-medium text-foreground/90 truncate leading-tight">
                                      {session.roomNo}
                                      {session.mode !== "Campus" ? ` · ${session.mode}` : ""}
                                    </div>
                                    <div className="text-[9px] sm:text-[8px] text-muted-foreground truncate leading-tight tabular-nums">
                                      {session.startTime.replace(" ", "")}–{session.endTime.replace(" ", "")}
                                    </div>
                                  </button>
                                );
                              })}
                              {chips.length === 0 && (col.isLunch || col.isBreak) && (
                                <div
                                  className={`min-h-[48px] sm:min-h-[52px] w-full rounded-md border flex flex-col items-center justify-center select-none ${
                                    col.isLunch
                                      ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300"
                                      : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                                  }`}
                                >
                                  <span className="text-[9px] sm:text-[8px] font-semibold uppercase">
                                    {col.isLunch ? "Lunch" : "Break"}
                                  </span>
                                  {col.isLunch ? (
                                    <UtensilsCrossed className="h-3 w-3 sm:h-2.5 sm:w-2.5 mt-0.5 text-orange-500 dark:text-orange-400" />
                                  ) : (
                                    <Coffee className="h-3 w-3 sm:h-2.5 sm:w-2.5 mt-0.5 text-amber-500 dark:text-amber-400" />
                                  )}
                                </div>
                              )}
                              {chips.length === 0 && !col.isLunch && !col.isBreak && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectGridCell(day.iso)}
                                  className="min-h-[48px] sm:min-h-[52px] w-full flex items-center justify-center cursor-pointer touch-manipulation"
                                  aria-label={`Select ${day.dayName}`}
                                >
                                  <span className="text-muted-foreground/30 text-[10px] font-medium select-none">
                                    —
                                  </span>
                                </button>
                              )}
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
        </div>
      )}

      <div ref={dayDetailRef}>
      <PageSection
        density="compact"
        title={
          <span className="flex items-center gap-2 flex-wrap">
            <span>{selectedDay ? formatDayHeader(selectedDay) : "Selected day"}</span>
            {selectedDay?.isToday && (
              <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 h-5 font-semibold">
                Today
              </Badge>
            )}
          </span>
        }
        description={
          isLoading
            ? "Loading…"
            : daySessions.length === 0
              ? "No classes"
              : `${daySessions.length} ${daySessions.length === 1 ? "class" : "classes"}`
        }
      >
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground border border-border rounded-lg bg-card">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Loading your schedule…
            </div>
          ) : daySessions.length === 0 ? (
            <div className="py-10 px-4 text-center border border-dashed border-border rounded-lg bg-muted/20">
              <CalendarIcon className="mx-auto h-6 w-6 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">No classes</p>
              {selectedDay.isToday && (
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Nothing scheduled for today</p>
              )}
            </div>
          ) : (
            daySessions.map((session) => {
              const lifecycle = getSessionLifecycle(session);

              const accentBorder =
                lifecycle.stage === "UPCOMING"
                  ? "border-l-amber-500"
                  : lifecycle.stage === "LIVE_NOW"
                    ? "border-l-emerald-500"
                    : lifecycle.stage === "FEEDBACK_REQUIRED"
                      ? "border-l-sky-500"
                      : "border-l-emerald-500";

              const statusDot =
                lifecycle.stage === "UPCOMING"
                  ? "bg-amber-500"
                  : lifecycle.stage === "LIVE_NOW"
                    ? "bg-emerald-500 animate-pulse"
                    : lifecycle.stage === "FEEDBACK_REQUIRED"
                      ? "bg-sky-500"
                      : "bg-emerald-500";

              return (
                <div
                  key={session.id}
                  className={`bg-card border border-border rounded-lg shadow-xs overflow-hidden transition-colors hover:border-primary/30 border-l-[3px] ${accentBorder} ${
                    selectedSessionId === session.id ? "ring-1 ring-primary/40 border-primary/40" : ""
                  }`}
                >
                  <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      {/* Time column */}
                      <div className="shrink-0 w-[4.75rem] sm:w-[5.25rem]">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                            {lifecycle.statusText}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold font-mono text-foreground tabular-nums leading-tight">
                          {session.startTime}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground tabular-nums">
                          {session.endTime}
                        </p>
                      </div>

                      <div className="hidden sm:block w-px self-stretch bg-border shrink-0" />

                      <div
                        className={`hidden sm:flex h-9 w-9 rounded-lg ${session.avatarBg} font-semibold text-[11px] items-center justify-center shrink-0`}
                      >
                        {session.avatarText}
                      </div>

                      <div className="min-w-0 space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-foreground truncate leading-tight">
                            {session.title}
                          </h3>
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15 text-[9px] font-semibold uppercase tracking-wide">
                            {session.courseCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground flex-wrap">
                          <span className="inline-flex items-center gap-1 text-foreground/80">
                            <User className="h-3 w-3 text-muted-foreground shrink-0" />
                            {session.facultyName}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {session.roomNo}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {session.mode}
                          </span>
                        </div>
                        {lifecycle.stage === "UPCOMING" && lifecycle.minutesLeft != null && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            Join opens in {lifecycle.minutesLeft} min
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-stretch sm:self-center shrink-0 w-full sm:w-auto sm:justify-end">
                      {lifecycle.stage === "UPCOMING" && (
                        <Button
                          disabled
                          variant="outline"
                          className="h-10 sm:h-8 px-3 text-xs sm:text-[11px] font-semibold border-border text-muted-foreground cursor-not-allowed opacity-70 w-full sm:w-auto"
                        >
                          <Lock className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1" />
                          Locked
                        </Button>
                      )}

                      {lifecycle.stage === "LIVE_NOW" && (
                        <>
                          {session.attendanceStatus === "PRESENT" && (
                            <span className="inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 sm:mr-1 h-10 sm:h-auto">
                              <CheckCircle2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                              Present
                            </span>
                          )}
                          <Button
                            onClick={() => {
                              if (!academic.isAuthorizedForSession(session)) {
                                alert("Access denied. This class is not assigned to you.");
                                return;
                              }
                              setLiveJoiningSession(session);
                            }}
                            className="h-10 sm:h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto touch-manipulation"
                          >
                            <Video className="w-3.5 h-3.5 mr-1.5" />
                            Join Class
                          </Button>
                        </>
                      )}

                      {lifecycle.stage === "FEEDBACK_REQUIRED" && (
                        <>
                          {availableRecordingSessionIds.has(session.id) && (
                            <Button
                              variant="outline"
                              onClick={() =>
                                navigate(
                                  `/student/recordings?classSessionId=${encodeURIComponent(session.id)}`
                                )
                              }
                              className="h-10 sm:h-8 px-3 sm:px-2.5 text-xs font-semibold border-border w-full sm:w-auto touch-manipulation"
                            >
                              <Video className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1" />
                              Recording
                            </Button>
                          )}
                          <Button
                            onClick={() => handleOpenFeedbackModal(session)}
                            className="h-10 sm:h-8 px-3 text-xs font-semibold w-full sm:w-auto touch-manipulation"
                          >
                            <Star className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1 fill-current" />
                            Feedback
                          </Button>
                        </>
                      )}

                      {lifecycle.stage === "FEEDBACK_SUBMITTED" && (
                        <>
                          {availableRecordingSessionIds.has(session.id) && (
                            <Button
                              variant="outline"
                              onClick={() =>
                                navigate(
                                  `/student/recordings?classSessionId=${encodeURIComponent(session.id)}`
                                )
                              }
                              className="h-10 sm:h-8 px-3 sm:px-2.5 text-xs font-semibold border-border w-full sm:w-auto touch-manipulation"
                            >
                              <Video className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1" />
                              Recording
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => navigate("/student/study-materials")}
                            className="h-10 sm:h-8 px-3 sm:px-2.5 text-xs font-semibold border-border w-full sm:w-auto touch-manipulation"
                          >
                            <BookOpen className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1" />
                            Materials
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              setViewingFeedbackSession(
                                ("feedback" in lifecycle && lifecycle.feedback) || {
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
                            className="h-10 sm:h-8 px-3 sm:px-2.5 text-xs font-semibold border-border w-full sm:w-auto touch-manipulation"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1" />
                            Feedback
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PageSection>
      </div>

      {/* Feedback modal */}
      <Dialog
        open={!!activeFeedbackModalSession}
        onOpenChange={(open) => !open && setActiveFeedbackModalSession(null)}
      >
        <DialogContent className="max-w-xl w-[calc(100%-1.5rem)] sm:w-full rounded-xl p-4 sm:p-6 bg-card border border-border text-foreground max-h-[90vh] overflow-y-auto">
          {activeFeedbackModalSession && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/15">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold text-foreground">
                      Class Feedback
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Feedback is required after every completed class.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-3 bg-muted/40 rounded-lg border border-border grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Class</span>
                  <span className="font-semibold text-foreground">{activeFeedbackModalSession.title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Faculty</span>
                  <span className="font-semibold text-foreground">{activeFeedbackModalSession.facultyName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Date</span>
                  <span className="font-medium text-foreground/80">{activeFeedbackModalSession.date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Time</span>
                  <span className="font-mono font-medium text-foreground/80">
                    {activeFeedbackModalSession.startTime} – {activeFeedbackModalSession.endTime}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-1 text-xs">
                <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                  <label className="font-semibold text-foreground block">
                    1. How would you rate the faculty&apos;s teaching?
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
                          className="p-1.5 sm:p-1 hover:scale-110 transition-transform cursor-pointer focus:outline-none touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
                          aria-label={`Rate teaching ${st} stars`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              isFilled
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/40 hover:text-amber-300"
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 font-semibold text-xs text-amber-600 dark:text-amber-400">
                      {teachingRating > 0 ? RATING_LABELS[teachingRating] : "Select rating"}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                  <label className="font-semibold text-foreground block">
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
                          className="p-1.5 sm:p-1 hover:scale-110 transition-transform cursor-pointer focus:outline-none touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
                          aria-label={`Rate understanding ${st} stars`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              isFilled
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/40 hover:text-amber-300"
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 font-semibold text-xs text-amber-600 dark:text-amber-400">
                      {understandingRating > 0 ? RATING_LABELS[understandingRating] : "Select rating"}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                  <label className="font-semibold text-foreground block">
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
                          className="p-1.5 sm:p-1 hover:scale-110 transition-transform cursor-pointer focus:outline-none touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
                          aria-label={`Rate overall experience ${st} stars`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              isFilled
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/40 hover:text-amber-300"
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 font-semibold text-xs text-amber-600 dark:text-amber-400">
                      {overallExperienceRating > 0 ? RATING_LABELS[overallExperienceRating] : "Select rating"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground/80 block">Additional comments</label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Write your feedback here…"
                    className="w-full text-xs p-3 rounded-lg border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary outline-none resize-none transition-colors"
                  />
                </div>
                {feedbackError && (
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg px-3 py-2">
                    {feedbackError}
                  </p>
                )}
              </div>

              <DialogFooter className="pt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveFeedbackModalSession(null)}
                  className="h-10 text-xs font-semibold rounded-lg border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    teachingRating === 0 ||
                    understandingRating === 0 ||
                    overallExperienceRating === 0 ||
                    submitFeedbackMutation.isPending
                  }
                  onClick={handleSubmitFeedback}
                  className="h-10 flex-1 text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitFeedbackMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Submit Feedback"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Join live class */}
      <Dialog open={!!liveJoiningSession} onOpenChange={(open) => !open && setLiveJoiningSession(null)}>
        <DialogContent className="max-w-md w-[calc(100%-1.5rem)] sm:w-full rounded-xl p-4 sm:p-6 bg-card border border-border text-foreground">
          {liveJoiningSession && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold text-foreground">
                      Join {liveJoiningSession.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Live session with {liveJoiningSession.facultyName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-lg bg-muted/40 border border-border flex flex-col items-center justify-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
                    <Camera className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <Mic className="w-3 h-3" /> Mic ready
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <Camera className="w-3 h-3" /> Camera ready
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
                  <div className="flex justify-between gap-2">
                    <span>Faculty</span>
                    <span className="text-foreground font-semibold">{liveJoiningSession.facultyName}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Time</span>
                    <span className="text-foreground font-semibold font-mono">
                      {liveJoiningSession.startTime} – {liveJoiningSession.endTime}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Room</span>
                    <span className="text-foreground font-semibold">
                      {liveJoiningSession.roomNo}
                      {liveJoiningSession.block ? `, ${liveJoiningSession.block}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLiveJoiningSession(null)}
                  className="text-xs font-semibold rounded-lg h-10 border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!liveJoiningSession) return;
                    setIsJoiningMeeting(true);
                    try {
                      // Enrollment-scoped Meet URL — never trust list meetingUrl alone
                      const meeting = await classSessionsApi.getMeeting(liveJoiningSession.id);
                      const meetingUrl = meeting.data.meetingUrl?.trim();
                      if (!meetingUrl || !meetingUrl.includes("meet.google.com")) {
                        alert("No valid meeting link found for this class.");
                        return;
                      }
                      academic.verifyAndJoinMeeting(
                        {
                          courseId: liveJoiningSession.courseId,
                          batchId: liveJoiningSession.batchId,
                          courseName: liveJoiningSession.courseName,
                          meetingUrl,
                          status: liveJoiningSession.forceStatus || "LIVE",
                          scheduledDate: liveJoiningSession.date,
                          startTime: liveJoiningSession.startTime,
                          endTime: liveJoiningSession.endTime,
                        },
                        (errMsg) => alert(errMsg)
                      );
                      setLiveJoiningSession(null);
                    } catch (err: unknown) {
                      alert(
                        (err as { response?: { data?: { message?: string } } })?.response?.data
                          ?.message ||
                          (err as Error)?.message ||
                          "Unable to join this class. You may not be enrolled."
                      );
                    } finally {
                      setIsJoiningMeeting(false);
                    }
                  }}
                  disabled={isJoiningMeeting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg h-10 flex-1 gap-2"
                >
                  {isJoiningMeeting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                  <span>{isJoiningMeeting ? "Joining…" : "Join Google Meet"}</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View submitted feedback */}
      <Dialog
        open={!!viewingFeedbackSession}
        onOpenChange={(open) => !open && setViewingFeedbackSession(null)}
      >
        <DialogContent className="max-w-md w-[calc(100%-1.5rem)] sm:w-full rounded-xl p-4 sm:p-6 bg-card border border-border text-foreground">
          {viewingFeedbackSession && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Check className="h-5 w-5 stroke-[3]" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold text-foreground">
                      Submitted Feedback
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      {viewingFeedbackSession.courseName} · {viewingFeedbackSession.facultyName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Overall rating</span>
                    <span className="font-semibold text-amber-500 flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      {viewingFeedbackSession.rating} / 5.0
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Faculty teaching</span>
                    <span className="font-semibold text-foreground">
                      {viewingFeedbackSession.teachingRating
                        ? `${viewingFeedbackSession.teachingRating} / 5`
                        : "5 / 5"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Understanding</span>
                    <span className="font-semibold text-foreground">
                      {viewingFeedbackSession.understandingRating
                        ? `${viewingFeedbackSession.understandingRating} / 5`
                        : "5 / 5"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-medium text-foreground/80">
                      {viewingFeedbackSession.submittedAt}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-muted/20 rounded-lg border border-border space-y-1">
                  <span className="font-semibold text-muted-foreground block text-[11px]">
                    Comments
                  </span>
                  <p className="text-foreground/90 italic">
                    &ldquo;
                    {viewingFeedbackSession.comments ||
                      "Great live class and clear faculty explanations."}
                    &rdquo;
                  </p>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setViewingFeedbackSession(null)}
                  className="w-full text-xs font-semibold rounded-lg h-10"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
