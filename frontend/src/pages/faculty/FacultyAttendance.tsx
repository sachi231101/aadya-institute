import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Info,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Briefcase,
  AlertCircle,
  Sparkles,
  CalendarDays,
  FileSpreadsheet,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, MetricGrid, PageSection } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth.store";
import { useFacultyDailyAttendance } from "@/hooks/useFaculty";
import type { FacultyDailyAttendanceHistoryResponse } from "@/types/faculty.types";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "HALF_DAY" | "HOLIDAY" | "WEEKEND" | "WEEKLY_OFF" | "NOT_MARKED";

interface DailyAttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  dayName: string; // Monday, etc.
  checkIn: string | null;
  checkOut: string | null;
  workingHours: string | null;
  status: AttendanceStatus;
  markedBy: string;
  markedAt: string | null;
  remarks: string;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const calcWorkingHours = (inTime: string | null, outTime: string | null): string | null => {
  if (!inTime || !outTime) return null;
  const [ih, im] = inTime.split(":").map(Number);
  const [oh, om] = outTime.split(":").map(Number);
  if ([ih, im, oh, om].some((n) => Number.isNaN(n))) return null;
  const mins = oh * 60 + om - (ih * 60 + im);
  if (mins <= 0) return null;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
};



export const FacultyAttendance: React.FC = () => {
  const { user } = useAuthStore();
  const facultyId = (user as any)?.facultyId as string | undefined;

  // Selected Month/Year State
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [timeFilter, setTimeFilter] = useState<"ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM">("THIS_MONTH");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"UNIFIED" | "CALENDAR" | "TABLE">("UNIFIED");

  const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
  const monthEndDate = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const monthEnd = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(monthEndDate).padStart(2, "0")}`;

  const { data: apiResponse, isLoading } = useFacultyDailyAttendance(
    {
      facultyId: facultyId || undefined,
      from: monthStart,
      to: monthEnd,
    },
    !!facultyId
  );

  // Map API daily attendance records (no mock fallback)
  const attendanceRecords: DailyAttendanceRecord[] = useMemo(() => {
    const payload = apiResponse?.data as FacultyDailyAttendanceHistoryResponse | undefined;
    if (!payload || payload.mode !== "history") return [];

    return payload.records.map((rec) => {
      const dateObj = new Date(rec.date + "T00:00:00");
      const dayName = dayNames[dateObj.getDay()] || "Weekday";
      const status: AttendanceStatus =
        rec.status === "WEEKLY_OFF" ? "WEEKLY_OFF" : (rec.status as AttendanceStatus);

      return {
        id: rec.id,
        date: rec.date,
        dayName,
        checkIn: rec.inTime,
        checkOut: rec.outTime,
        workingHours: calcWorkingHours(rec.inTime, rec.outTime),
        status,
        markedBy: "Admin",
        markedAt: rec.updatedAt ? new Date(rec.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null,
        remarks: rec.comments || (status === "WEEKLY_OFF" ? "Weekly Off" : ""),
      };
    });
  }, [apiResponse]);

  // Calculations for summary metrics
  const summary = useMemo(() => {
    const presentCount = attendanceRecords.filter((r) => r.status === "PRESENT").length;
    const halfDayCount = attendanceRecords.filter((r) => r.status === "HALF_DAY").length;
    const absentCount = attendanceRecords.filter((r) => r.status === "ABSENT").length;
    const leaveCount = attendanceRecords.filter((r) => r.status === "LEAVE").length;
    const holidayCount = attendanceRecords.filter((r) => r.status === "HOLIDAY").length;
    const weekendCount = attendanceRecords.filter(
      (r) => r.status === "WEEKEND" || r.status === "WEEKLY_OFF"
    ).length;

    // Total working days (excluding weekly off / weekends & holidays)
    const workingDays = attendanceRecords.filter(
      (r) => r.status !== "WEEKEND" && r.status !== "WEEKLY_OFF" && r.status !== "HOLIDAY"
    ).length;
    const effectivePresent = presentCount + halfDayCount * 0.5;
    const attendancePercentage = workingDays > 0 ? ((effectivePresent / workingDays) * 100).toFixed(1) : "0.0";

    // Total working hours estimation
    const totalMinutes = attendanceRecords.reduce((acc, curr) => {
      if (curr.workingHours && curr.workingHours.includes("h")) {
        const parts = curr.workingHours.split("h");
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1]?.replace("m", ""), 10) || 0;
        return acc + h * 60 + m;
      }
      return acc;
    }, 0);

    const totalHoursStr = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
    const avgMinutesPerDay = presentCount + halfDayCount > 0 ? Math.round(totalMinutes / (presentCount + halfDayCount)) : 0;
    const avgHoursStr = `${Math.floor(avgMinutesPerDay / 60)}h ${avgMinutesPerDay % 60}m/day`;

    return {
      presentCount,
      halfDayCount,
      absentCount,
      leaveCount,
      holidayCount,
      weekendCount,
      workingDays,
      attendancePercentage,
      totalHoursStr,
      avgHoursStr,
    };
  }, [attendanceRecords]);

  // Filtered list for the history table
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((item) => {
      // Time filter
      if (timeFilter === "TODAY") {
        const todayStr = new Date().toISOString().split("T")[0];
        if (item.date !== todayStr) return false;
      } else if (timeFilter === "THIS_WEEK") {
        const itemDate = new Date(item.date + "T00:00:00");
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (itemDate < weekStart || itemDate > weekEnd) return false;
      } else if (timeFilter === "THIS_MONTH") {
        if (!item.date.startsWith(`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`)) return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (item.status !== statusFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDate = item.date.toLowerCase().includes(q);
        const matchDay = item.dayName.toLowerCase().includes(q);
        const matchRemarks = item.remarks.toLowerCase().includes(q);
        const matchMarkedBy = item.markedBy.toLowerCase().includes(q);
        const matchStatus = item.status.toLowerCase().includes(q);
        if (!matchDate && !matchDay && !matchRemarks && !matchMarkedBy && !matchStatus) return false;
      }

      return true;
    }).sort((a, b) => (a.date < b.date ? 1 : -1)); // Recent first
  }, [attendanceRecords, timeFilter, statusFilter, searchQuery]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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
    setTimeFilter("THIS_MONTH");
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 gap-1.5 font-semibold text-xs px-2.5 py-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            PRESENT
          </Badge>
        );
      case "ABSENT":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 gap-1.5 font-semibold text-xs px-2.5 py-0.5">
            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            ABSENT
          </Badge>
        );
      case "LEAVE":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 gap-1.5 font-semibold text-xs px-2.5 py-0.5">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            LEAVE
          </Badge>
        );
      case "HALF_DAY":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800 gap-1.5 font-semibold text-xs px-2.5 py-0.5">
            <Clock className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
            HALF DAY
          </Badge>
        );
      case "HOLIDAY":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 gap-1.5 font-medium text-xs px-2.5 py-0.5">
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            HOLIDAY
          </Badge>
        );
      case "WEEKEND":
      case "WEEKLY_OFF":
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 gap-1.5 font-medium text-xs px-2.5 py-0.5">
            WEEKLY OFF
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-xs px-2.5 py-0.5">
            NOT MARKED
          </Badge>
        );
    }
  };

  // Calendar Day cell helper
  const getCalendarDayColor = (dayNum: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const record = attendanceRecords.find((r) => r.date === dateStr);
    const todayStr = new Date().toISOString().split("T")[0];
    if (!record) return { bg: "bg-slate-50 dark:bg-slate-900/40 text-slate-400", dot: "bg-slate-300", label: "—" };

    if (dateStr === todayStr) {
      return { bg: "bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20", dot: "bg-white", label: "Today" };
    }

    switch (record.status) {
      case "PRESENT":
        return { bg: "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300", dot: "bg-emerald-500", label: "P" };
      case "ABSENT":
        return { bg: "bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300", dot: "bg-rose-500", label: "A" };
      case "LEAVE":
        return { bg: "bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300", dot: "bg-amber-500", label: "L" };
      case "HALF_DAY":
        return { bg: "bg-yellow-50 hover:bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300", dot: "bg-yellow-500", label: "HD" };
      case "HOLIDAY":
        return { bg: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300", dot: "bg-purple-400", label: "H" };
      case "WEEKEND":
      case "WEEKLY_OFF":
        return { bg: "bg-slate-50/50 text-slate-400 dark:bg-slate-900/20", dot: "bg-slate-300", label: "Off" };
      default:
        return { bg: "bg-slate-50 text-slate-600", dot: "bg-slate-300", label: "—" };
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Faculty Attendance"
        actions={
        <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl p-1.5 shadow-xs">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg"
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="px-3 py-1 text-sm font-bold text-foreground tracking-wide min-w-[130px] text-center select-none">
            {monthNames[selectedMonth]} {selectedYear}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg"
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border/60 mx-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleTodayClick}
            className="h-9 px-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100"
          >
            Today
          </Button>
        </div>
        }
      />

      <MetricGrid density="compact">
        <Card size="compact" className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Present</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-0.5">
              {summary.presentCount}
              {summary.halfDayCount > 0 ? ` (+${summary.halfDayCount} HD)` : ""}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {summary.workingDays > 0 ? `${Math.round((summary.presentCount / summary.workingDays) * 100)}%` : "0%"} of working days
            </p>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Absent</p>
            <h3 className="text-xl font-bold text-rose-600 mt-0.5">{summary.absentCount}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {summary.workingDays > 0 ? `${Math.round((summary.absentCount / summary.workingDays) * 100)}%` : "0%"} of working days
            </p>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Leave</p>
            <h3 className="text-xl font-bold text-amber-600 mt-0.5">{summary.leaveCount}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {summary.workingDays > 0 ? `${Math.round((summary.leaveCount / summary.workingDays) * 100)}%` : "0%"} of working days
            </p>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Attendance</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5">{summary.attendancePercentage}%</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {summary.workingDays} days · {summary.totalHoursStr} hrs
            </p>
          </CardContent>
        </Card>
      </MetricGrid>

      {/* ─── Calendar & Month Breakdown Grid ────────────────────────────── */}
      {(viewMode === "UNIFIED" || viewMode === "CALENDAR") && (
        <PageSection title="Monthly calendar">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Monthly Interactive Calendar */}
          <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-xs">
            <CardHeader className="p-5 border-b border-border/40 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base md:text-lg font-bold">
                  {monthNames[selectedMonth]} {selectedYear}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-9 w-9 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-9 w-9 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {/* Day Headers (Sun - Sat) */}
              <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                  <div
                    key={day}
                    className={`text-xs font-bold py-1 uppercase tracking-wider ${
                      i === 0 ? "text-rose-500 font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Month Grid — dynamically calculated */}
              {(() => {
                const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay(); // 0=Sun
                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                const todayStr = new Date().toISOString().split("T")[0];
                return (
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {/* Leading blank cells */}
                    {Array.from({ length: firstDayIndex }).map((_, idx) => (
                      <div key={`blank-${idx}`} className="h-12 md:h-14 rounded-xl bg-slate-50/40 dark:bg-slate-900/10 border border-transparent" />
                    ))}

                    {/* Day cells 1..daysInMonth */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                      const style = getCalendarDayColor(d);
                      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const isToday = dateStr === todayStr;
                      return (
                        <div
                          key={`day-${d}`}
                          className={`h-12 md:h-14 rounded-xl p-1 md:p-1.5 flex flex-col justify-between items-center transition-all cursor-default border border-border/20 ${style.bg}`}
                          title={`${monthNames[selectedMonth]} ${d}, ${selectedYear}: ${style.label}`}
                        >
                          <div className="w-full flex justify-between items-center px-1">
                            <span className={`text-xs md:text-sm font-bold ${isToday ? "text-white" : ""}`}>
                              {d}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                          </div>
                          <span className={`text-[10px] font-semibold tracking-tight ${isToday ? "text-blue-100" : "opacity-80"}`}>
                            {style.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Calendar Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3.5 mt-5 pt-4 border-t border-border/40 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Leave</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span>Holiday</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span>Not Marked</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Side Summary Breakdown Card */}
          <Card className="border border-border/60 rounded-xl shadow-xs flex flex-col justify-between">
            <CardHeader className="p-4 md:p-5 border-b border-border/40">
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-5 space-y-3.5 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm py-1 border-b border-border/30">
                  <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Present Days</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{summary.presentCount}</span>
                </div>

                <div className="flex items-center justify-between text-sm py-1 border-b border-border/30">
                  <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Absent Days</span>
                  </div>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{summary.absentCount}</span>
                </div>

                <div className="flex items-center justify-between text-sm py-1 border-b border-border/30">
                  <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Approved Leave</span>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{summary.leaveCount}</span>
                </div>

                <div className="flex items-center justify-between text-sm py-1 border-b border-border/30">
                  <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    <span>Holidays</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{summary.holidayCount}</span>
                </div>

                <div className="flex items-center justify-between text-sm py-1 border-b border-border/30">
                  <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span>Not Marked</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">0</span>
                </div>

                <div className="flex items-center justify-between text-sm py-2 bg-slate-50 dark:bg-slate-900/60 px-3 rounded-xl border border-border/40 font-bold">
                  <span className="text-slate-900 dark:text-slate-100">Total Working Days</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{summary.workingDays}</span>
                </div>
              </div>

              {/* Notice footnote */}
              <div className="p-3 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-border/40 text-xs text-muted-foreground flex items-start gap-2 mt-4">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  Your attendance is marked daily by Center Management or Admin upon biometric/session verification.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        </PageSection>
      )}

      {/* ─── Attendance History Table (Desktop) & Card List (Mobile) ──────── */}
      {(viewMode === "UNIFIED" || viewMode === "TABLE") && (
        <PageSection title="Attendance history">
        <Card className="border border-border/60 rounded-xl shadow-xs overflow-hidden">
          <CardHeader className="p-5 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Attendance History
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing {filteredRecords.length} records for the selected period
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4">Working Hours</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Marked By</th>
                    <th className="py-3 px-4">Marked At</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        <CalendarDays className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="font-semibold text-sm">No attendance records found</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your filters or date range</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec, index) => {
                      const isToday = rec.date === new Date().toISOString().split("T")[0];
                      return (
                        <tr
                          key={rec.id}
                          className={`hover:bg-muted/20 transition-colors ${
                            isToday ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
                          }`}
                        >
                          <td className="py-3 px-4 text-center text-xs text-muted-foreground font-medium">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {rec.date}
                            {isToday && (
                              <Badge className="ml-2 bg-blue-600 text-white text-[10px] py-0 px-1.5">
                                Today
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground font-medium">
                            {rec.dayName}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            {rec.checkIn || "—"}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            {rec.checkOut || "—"}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {rec.workingHours || "—"}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(rec.status)}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                            {rec.markedBy}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                            {rec.markedAt || "—"}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {rec.remarks || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-border/40">
              {filteredRecords.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="font-semibold text-sm">No attendance records found</p>
                </div>
              ) : (
                filteredRecords.map((rec) => (
                  <div key={rec.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-foreground">{rec.date}</span>
                        <span className="text-xs text-muted-foreground ml-2">({rec.dayName})</span>
                      </div>
                      {getStatusBadge(rec.status)}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-border/40">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Check In</span>
                        <span className="font-mono font-semibold">{rec.checkIn || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Check Out</span>
                        <span className="font-mono font-semibold">{rec.checkOut || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Working Hours</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{rec.workingHours || "—"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                      <span>Marked by: <strong className="text-foreground">{rec.markedBy}</strong></span>
                      <span>{rec.remarks}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        </PageSection>
      )}
    </PageContainer>
  );
};

export default FacultyAttendance;
