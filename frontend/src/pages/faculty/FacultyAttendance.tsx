import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, MetricGrid } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { useFacultyDailyAttendance } from "@/hooks/useFaculty";
import type {
  FacultyAttendancePunch,
  FacultyDailyAttendanceHistoryResponse,
} from "@/types/faculty.types";
import { localTodayKey } from "@/constants/timetable-slots";
import { AttendanceDaySummary, AttendancePunchList } from "@/components/faculty/AttendancePunchList";
import { formatDurationMinutes } from "@/utils/format";

type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LEAVE"
  | "HALF_DAY"
  | "HOLIDAY"
  | "WEEKEND"
  | "WEEKLY_OFF"
  | "NOT_MARKED";

interface DailyAttendanceRecord {
  id: string;
  date: string;
  dayName: string;
  checkIn: string | null;
  checkOut: string | null;
  workingMinutes: number | null;
  workingHours: string | null;
  punches: FacultyAttendancePunch[];
  openSession: boolean;
  sessionCount: number;
  status: AttendanceStatus;
  remarks: string;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const weekdayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Fallback for admin-entered days without punches. */
const calcWorkingMinutes = (inTime: string | null, outTime: string | null): number | null => {
  if (!inTime || !outTime) return null;
  const [ih, im] = inTime.split(":").map(Number);
  const [oh, om] = outTime.split(":").map(Number);
  if ([ih, im, oh, om].some((n) => Number.isNaN(n))) return null;
  const mins = oh * 60 + om - (ih * 60 + im);
  return mins > 0 ? mins : null;
};

const formatDisplayDate = (dateStr: string, dayName?: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const label = `${d} ${monthNames[m - 1]?.slice(0, 3) ?? ""} ${y}`;
  return dayName ? `${label} · ${dayName}` : label;
};

export const FacultyAttendance: React.FC = () => {
  const { user } = useAuthStore();
  const facultyId = (user as { facultyId?: string } | null)?.facultyId;

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(() => localTodayKey());

  const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
  const monthEndDate = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const monthEnd = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(monthEndDate).padStart(2, "0")}`;

  const {
    data: apiResponse,
    isLoading,
    isError,
    refetch,
  } = useFacultyDailyAttendance(
    {
      facultyId: facultyId || undefined,
      from: monthStart,
      to: monthEnd,
    },
    !!facultyId
  );

  const attendanceRecords: DailyAttendanceRecord[] = useMemo(() => {
    const payload = apiResponse?.data as FacultyDailyAttendanceHistoryResponse | undefined;
    if (!payload || payload.mode !== "history") return [];

    return payload.records.map((rec): DailyAttendanceRecord => {
      const dateObj = new Date(`${rec.date}T00:00:00`);
      const dayName = dayNames[dateObj.getDay()] || "Weekday";
      const status: AttendanceStatus =
        rec.status === "WEEKLY_OFF" ? "WEEKLY_OFF" : (rec.status as AttendanceStatus);

      const punches = rec.punches ?? [];
      const sessionCount = rec.sessionCount ?? 0;
      const workingMinutes =
        sessionCount > 0 ? rec.totalMinutes : calcWorkingMinutes(rec.inTime, rec.outTime);

      return {
        id: rec.id,
        date: rec.date,
        dayName,
        checkIn: rec.firstIn ?? rec.inTime,
        checkOut: rec.lastOut ?? rec.outTime,
        workingMinutes,
        workingHours: workingMinutes != null ? formatDurationMinutes(workingMinutes) : null,
        punches,
        openSession: !!rec.openSession,
        sessionCount,
        status,
        remarks: rec.comments || (status === "WEEKLY_OFF" ? "Weekly Off" : ""),
      };
    });
  }, [apiResponse]);

  const summary = useMemo(() => {
    const presentCount = attendanceRecords.filter((r) => r.status === "PRESENT").length;
    const halfDayCount = attendanceRecords.filter((r) => r.status === "HALF_DAY").length;
    const absentCount = attendanceRecords.filter((r) => r.status === "ABSENT").length;
    const leaveCount = attendanceRecords.filter((r) => r.status === "LEAVE").length;

    const workingDays = attendanceRecords.filter(
      (r) => r.status !== "WEEKEND" && r.status !== "WEEKLY_OFF" && r.status !== "HOLIDAY"
    ).length;
    const effectivePresent = presentCount + halfDayCount * 0.5;
    const attendancePercentage =
      workingDays > 0 ? ((effectivePresent / workingDays) * 100).toFixed(1) : "0.0";

    const totalMinutes = attendanceRecords.reduce((acc, curr) => acc + (curr.workingMinutes ?? 0), 0);
    const totalHoursStr = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

    return {
      presentCount,
      halfDayCount,
      absentCount,
      leaveCount,
      workingDays,
      attendancePercentage,
      totalHoursStr,
    };
  }, [attendanceRecords]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
    setSelectedDate(localTodayKey());
  };

  const selectedDayRecord = attendanceRecords.find((r) => r.date === selectedDate) ?? null;

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 gap-1 font-medium text-xs"
          >
            <CheckCircle2 className="w-3 h-3" />
            Present
          </Badge>
        );
      case "ABSENT":
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 gap-1 font-medium text-xs"
          >
            <XCircle className="w-3 h-3" />
            Absent
          </Badge>
        );
      case "LEAVE":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 gap-1 font-medium text-xs"
          >
            <Clock className="w-3 h-3" />
            Leave
          </Badge>
        );
      case "HALF_DAY":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800 gap-1 font-medium text-xs"
          >
            <Clock className="w-3 h-3" />
            Half day
          </Badge>
        );
      case "HOLIDAY":
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 gap-1 font-medium text-xs"
          >
            <Sparkles className="w-3 h-3 text-slate-500" />
            Holiday
          </Badge>
        );
      case "WEEKEND":
      case "WEEKLY_OFF":
        return (
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 font-medium text-xs"
          >
            Weekly off
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground font-medium text-xs">
            Not marked
          </Badge>
        );
    }
  };

  const getCalendarDayStyle = (dayNum: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const record = attendanceRecords.find((r) => r.date === dateStr);
    if (!record) {
      return { bg: "bg-transparent text-muted-foreground/50", mark: "" };
    }

    switch (record.status) {
      case "PRESENT":
        return { bg: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300", mark: "P" };
      case "ABSENT":
        return { bg: "bg-rose-50 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300", mark: "A" };
      case "LEAVE":
        return { bg: "bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300", mark: "L" };
      case "HALF_DAY":
        return { bg: "bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300", mark: "H" };
      case "HOLIDAY":
        return { bg: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300", mark: "·" };
      case "WEEKEND":
      case "WEEKLY_OFF":
        return { bg: "bg-muted/40 text-muted-foreground", mark: "" };
      default:
        return { bg: "bg-transparent text-muted-foreground", mark: "" };
    }
  };

  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const todayStr = localTodayKey();

  if (!facultyId) {
    return (
      <PageContainer>
        <PageHeader title="Faculty Attendance" />
        <Card className="border border-border/60 shadow-xs">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No faculty profile is linked to this account.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Faculty Attendance"
        description={`${monthNames[selectedMonth]} ${selectedYear}`}
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 text-muted-foreground"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTodayClick}
              className="h-8 px-2.5 text-xs font-medium"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 text-muted-foreground"
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {isError ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load attendance.
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-rose-700 dark:text-rose-300"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      <MetricGrid density="compact">
        <Card size="compact" className="border border-border/60 shadow-xs bg-card">
          <CardContent size="compact">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Present
            </p>
            <p className="text-xl font-semibold text-emerald-600 mt-0.5 tabular-nums">
              {summary.presentCount}
              {summary.halfDayCount > 0 ? (
                <span className="text-sm font-medium text-muted-foreground ml-1">
                  +{summary.halfDayCount} HD
                </span>
              ) : null}
            </p>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/60 shadow-xs bg-card">
          <CardContent size="compact">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Absent
            </p>
            <p className="text-xl font-semibold text-rose-600 mt-0.5 tabular-nums">
              {summary.absentCount}
            </p>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/60 shadow-xs bg-card">
          <CardContent size="compact">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Leave
            </p>
            <p className="text-xl font-semibold text-amber-600 mt-0.5 tabular-nums">
              {summary.leaveCount}
            </p>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/60 shadow-xs bg-card">
          <CardContent size="compact">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Attendance
            </p>
            <p className="text-xl font-semibold text-foreground mt-0.5 tabular-nums">
              {summary.attendancePercentage}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {summary.workingDays} days · {summary.totalHoursStr}
            </p>
          </CardContent>
        </Card>
      </MetricGrid>

      <Card className="border border-border/60 shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading attendance…</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdayHeaders.map((day) => (
                  <div
                    key={day}
                    className="text-[11px] font-medium text-muted-foreground py-1 uppercase tracking-wide"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`blank-${idx}`} className="h-11 sm:h-12" />
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const style = getCalendarDayStyle(d);
                  const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <button
                      type="button"
                      key={`day-${d}`}
                      onClick={() => setSelectedDate(dateStr)}
                      aria-pressed={isSelected}
                      aria-label={`${monthNames[selectedMonth]} ${d}, ${selectedYear}`}
                      className={`h-11 sm:h-12 rounded-lg p-1 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer border ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/25"
                          : isToday
                            ? "border-primary/40"
                            : "border-transparent"
                      } ${style.bg}`}
                    >
                      <span className={`text-xs sm:text-sm tabular-nums ${isToday ? "font-semibold" : "font-medium"}`}>
                        {d}
                      </span>
                      {style.mark ? (
                        <span className="text-[9px] font-semibold leading-none opacity-70">
                          {style.mark}
                        </span>
                      ) : (
                        <span className="h-2.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Leave
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400" /> Holiday
                </span>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">
                    {formatDisplayDate(selectedDate, selectedDayRecord?.dayName)}
                    {selectedDate === todayStr ? (
                      <span className="ml-2 text-[11px] font-medium text-muted-foreground">Today</span>
                    ) : null}
                  </p>
                  {selectedDayRecord ? getStatusBadge(selectedDayRecord.status) : null}
                </div>

                {selectedDayRecord ? (
                  <>
                    <AttendanceDaySummary
                      summary={{
                        firstIn: selectedDayRecord.checkIn,
                        lastOut: selectedDayRecord.checkOut,
                        sessionCount: selectedDayRecord.sessionCount,
                        totalMinutes: selectedDayRecord.workingMinutes ?? 0,
                        openSession: selectedDayRecord.openSession,
                      }}
                    />
                    <AttendancePunchList
                      punches={selectedDayRecord.punches}
                      openSession={selectedDayRecord.openSession}
                      className="pt-2 border-t border-border/40"
                    />
                    {selectedDayRecord.remarks ? (
                      <p className="text-[11px] text-muted-foreground pt-1">
                        {selectedDayRecord.remarks}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No attendance recorded for this day. Select a marked day to see punches.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default FacultyAttendance;
