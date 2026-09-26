import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Users,
  ChevronDown,
  CalendarDays,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBranches } from "@/hooks/useBranches";
import { useBranchStore } from "@/store/branch.store";
import { useFacultyDailyAttendance, useSaveFacultyDailyAttendance } from "@/hooks/useFaculty";
import type {
  FacultyDailyAttendanceDeskResponse,
  FacultyDailyAttendanceDeskRow,
  FacultyDailyAttendanceWritableStatus,
} from "@/types/faculty.types";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { localTodayKey } from "@/constants/timetable-slots";
import { useIstTodayKey } from "@/hooks/useIstTodayKey";
import { AttendancePunchList } from "@/components/faculty/AttendancePunchList";
import { formatDurationMinutes, formatTime12h } from "@/utils/format";

/** Desk-selectable statuses only (WEEKLY_OFF is legacy / not offered). */
export type AttendanceDeskStatus = FacultyDailyAttendanceWritableStatus;

const WRITABLE_STATUSES: AttendanceDeskStatus[] = ["PRESENT", "ABSENT", "LEAVE"];

const isWritableStatus = (status: string | null): status is AttendanceDeskStatus =>
  status !== null && (WRITABLE_STATUSES as string[]).includes(status);

/** null = Not marked (UI-only; never persisted). */
interface AttendanceRowState {
  status: AttendanceDeskStatus | null;
  inTime: string;
  outTime: string;
  comments: string;
}

const unmarkedRow = (): AttendanceRowState => ({
  status: null,
  inTime: "",
  outTime: "",
  comments: "",
});

/** Local calendar YYYY-MM-DD without UTC drift from toISOString(). */
const formatYmd = (year: number, monthIndex: number, day: number): string =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const toTimeValue = (val: string): string => {
  if (!val) return "";
  if (/^\d{2}:\d{2}$/.test(val)) return val;
  const match = val.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = match[3]?.toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  return val;
};

const timeToMinutes = (hhmm: string): number | null => {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export const FacultyAttendance: React.FC = () => {
  const { canEditItem } = usePermissions();
  const canEditAttendance = canEditItem("faculty.attendance");
  // Global branch filter
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];

  useEffect(() => {
    if (branches.length > 0 && selectedBranchId !== "ALL" && !branches.some((b) => b.id === selectedBranchId)) {
      setSelectedBranchId("ALL");
    }
  }, [branches, selectedBranchId, setSelectedBranchId]);

  const activeBranchId =
    selectedBranchId !== "ALL" && branches.some((b) => b.id === selectedBranchId)
      ? selectedBranchId
      : undefined;

  // Date selection (IST / institute calendar day — not UTC via toISOString)
  const todayKey = useIstTodayKey();
  const [selectedDate, setSelectedDate] = useState<string>(() => localTodayKey());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const key = localTodayKey();
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, AttendanceRowState>>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [hydratedDateKey, setHydratedDateKey] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarPopoverRef = useRef<HTMLDivElement>(null);
  const calendarCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Only today's IST date is editable; other dates are view-only. */
  const isSelectedDateToday = selectedDate === todayKey;
  const canEditDay = canEditAttendance && isSelectedDateToday;

  const clearCalendarCloseTimer = useCallback(() => {
    if (calendarCloseTimerRef.current) {
      clearTimeout(calendarCloseTimerRef.current);
      calendarCloseTimerRef.current = null;
    }
  }, []);

  const openCalendar = useCallback(() => {
    clearCalendarCloseTimer();
    setCalendarOpen(true);
  }, [clearCalendarCloseTimer]);

  const scheduleCloseCalendar = useCallback(() => {
    clearCalendarCloseTimer();
    calendarCloseTimerRef.current = setTimeout(() => {
      setCalendarOpen(false);
      calendarCloseTimerRef.current = null;
    }, 150);
  }, [clearCalendarCloseTimer]);

  const closeCalendar = useCallback(() => {
    clearCalendarCloseTimer();
    setCalendarOpen(false);
  }, [clearCalendarCloseTimer]);

  useEffect(() => {
    return () => clearCalendarCloseTimer();
  }, [clearCalendarCloseTimer]);

  // Close calendar when clicking outside (touch / click-opened)
  useEffect(() => {
    if (!calendarOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(target)) {
        closeCalendar();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [calendarOpen, closeCalendar]);

  const toggleExpanded = (facultyId: string) =>
    setExpandedRows((prev) => ({ ...prev, [facultyId]: !prev[facultyId] }));

  const { data: dailyAttendanceResponse, isLoading: isDailyLoading } =
    useFacultyDailyAttendance({
      date: selectedDate,
      branchId: activeBranchId,
    });
  const saveDailyAttendance = useSaveFacultyDailyAttendance();

  const deskPayload = dailyAttendanceResponse?.data as FacultyDailyAttendanceDeskResponse | undefined;
  const deskRows: FacultyDailyAttendanceDeskRow[] =
    deskPayload?.mode === "desk" && deskPayload.date === selectedDate ? deskPayload.records : [];

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Hydrate local row state from API when date/branch data arrives (skip if dirty)
  useEffect(() => {
    const payload = dailyAttendanceResponse?.data as FacultyDailyAttendanceDeskResponse | undefined;
    if (!payload || payload.mode !== "desk" || payload.date !== selectedDate) return;

    const hydrateKey = `${selectedDate}:${activeBranchId || "ALL"}`;
    if (hasUnsavedChanges && hydratedDateKey === hydrateKey) return;

    const dayMap: Record<string, AttendanceRowState> = {};

    for (const row of payload.records) {
      if (row.attendance) {
        // Legacy WEEKLY_OFF is not desk-editable; treat as unmarked for new saves.
        const status = isWritableStatus(row.attendance.status) ? row.attendance.status : null;
        dayMap[row.facultyId] = {
          status,
          inTime: status === "PRESENT" ? row.attendance.inTime || "" : "",
          outTime: status === "PRESENT" ? row.attendance.outTime || "" : "",
          comments: row.attendance.comments || "",
        };
      } else {
        dayMap[row.facultyId] = unmarkedRow();
      }
    }

    setAttendanceRecords((prev) => ({ ...prev, [selectedDate]: dayMap }));
    setHydratedDateKey(hydrateKey);
    setHasUnsavedChanges(false);
  }, [dailyAttendanceResponse, selectedDate, activeBranchId, hasUnsavedChanges, hydratedDateKey]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({
        dateStr: formatYmd(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate()),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        dateStr: formatYmd(year, month, i),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        dateStr: formatYmd(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()),
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [calendarMonth]);

  const currentDayAttendance = attendanceRecords[selectedDate] || {};

  const getRowData = (facultyId: string): AttendanceRowState => {
    return currentDayAttendance[facultyId] || unmarkedRow();
  };

  const applyStatus = (
    current: AttendanceRowState,
    status: AttendanceDeskStatus | null
  ): AttendanceRowState => {
    if (status === null) {
      return { ...current, status: null, inTime: "", outTime: "" };
    }
    if (status === "PRESENT") {
      return { ...current, status, inTime: current.inTime || "", outTime: current.outTime || "" };
    }
    return { ...current, status, inTime: "", outTime: "" };
  };

  const handleStatusChange = (facultyId: string, status: AttendanceDeskStatus | null) => {
    if (!canEditDay) return;
    setAttendanceRecords((prev) => {
      const dayMap = { ...(prev[selectedDate] || {}) };
      dayMap[facultyId] = applyStatus(getRowData(facultyId), status);
      return { ...prev, [selectedDate]: dayMap };
    });
    setHasUnsavedChanges(true);
  };

  const handleCommentsChange = (facultyId: string, value: string) => {
    if (!canEditDay) return;
    setAttendanceRecords((prev) => {
      const dayMap = { ...(prev[selectedDate] || {}) };
      const current = getRowData(facultyId);
      dayMap[facultyId] = { ...current, comments: value };
      return { ...prev, [selectedDate]: dayMap };
    });
    setHasUnsavedChanges(true);
  };

  const handleBulkSetStatus = (status: AttendanceDeskStatus | null) => {
    if (!canEditDay || filteredFaculty.length === 0) return;
    setAttendanceRecords((prev) => {
      const dayMap = { ...(prev[selectedDate] || {}) };
      filteredFaculty.forEach((f) => {
        dayMap[f.facultyId] = applyStatus(getRowData(f.facultyId), status);
      });
      return { ...prev, [selectedDate]: dayMap };
    });
    setHasUnsavedChanges(true);
    showToast(
      status === null ? "Cleared marks for visible faculty" : `Marked all as ${status.replace("_", " ")}`,
      "info"
    );
  };

  const handleSaveAttendance = async () => {
    if (!canEditDay) {
      showToast("Only today's attendance can be edited", "error");
      return;
    }
    if (filteredFaculty.length === 0) {
      showToast("No faculty to save", "error");
      return;
    }

    const marked = filteredFaculty
      .map((f) => ({ faculty: f, row: getRowData(f.facultyId) }))
      .filter(({ row }) => isWritableStatus(row.status));

    if (marked.length === 0) {
      showToast("Mark at least one faculty before saving", "error");
      return;
    }

    for (const { faculty, row } of marked) {
      if (row.status !== "PRESENT") continue;
      const inTime = toTimeValue(row.inTime) || null;
      const outTime = toTimeValue(row.outTime) || null;
      if (outTime && !inTime) {
        showToast(
          `${faculty.user?.name || faculty.employeeCode}: in time is required when out time is set`,
          "error"
        );
        return;
      }
      if (inTime && outTime) {
        const inMins = timeToMinutes(inTime);
        const outMins = timeToMinutes(outTime);
        if (inMins == null || outMins == null || outMins <= inMins) {
          showToast(
            `${faculty.user?.name || faculty.employeeCode}: logout must be after login`,
            "error"
          );
          return;
        }
      }
    }

    const records = marked.map(({ faculty, row }) => {
      const isPresent = row.status === "PRESENT";
      const inTime = isPresent ? toTimeValue(row.inTime) || null : null;
      const outTime = isPresent ? toTimeValue(row.outTime) || null : null;
      return {
        facultyId: faculty.facultyId,
        status: row.status as AttendanceDeskStatus,
        inTime,
        outTime,
        comments: row.comments || null,
      };
    });

    try {
      await saveDailyAttendance.mutateAsync({ date: selectedDate, records });
      setHasUnsavedChanges(false);
      showToast(`Saved attendance for ${records.length} faculty on ${selectedDate}`, "success");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        "Failed to save attendance";
      showToast(message, "error");
    }
  };

  const handleSelectDate = (dateStr: string) => {
    if (dateStr !== selectedDate) {
      setHasUnsavedChanges(false);
      setHydratedDateKey(null);
    }
    setSelectedDate(dateStr);
    const [y, m] = dateStr.split("-").map(Number);
    setCalendarMonth(new Date(y, m - 1, 1));
    closeCalendar();
  };

  const handleToday = () => {
    setSelectedDate(todayKey);
    const [y, m] = todayKey.split("-").map(Number);
    setCalendarMonth(new Date(y, m - 1, 1));
    closeCalendar();
  };

  const selectedDateLabel = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    if (!y || !m || !d) return selectedDate;
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [selectedDate]);

  // Drop dirty edits if the IST day rolls over while a past/future date is selected,
  // or if the user was editing "today" and midnight passes.
  useEffect(() => {
    if (selectedDate !== todayKey && hasUnsavedChanges) {
      setHasUnsavedChanges(false);
    }
  }, [todayKey, selectedDate, hasUnsavedChanges]);

  const handleClear = () => {
    handleToday();
  };

  const filteredFaculty = useMemo(() => {
    return deskRows.filter((f) => {
      const name = f.user?.name?.toLowerCase() || "";
      const code = f.employeeCode?.toLowerCase() || "";
      const phone = f.user?.phone?.toLowerCase() || "";
      const spec = f.specialization?.toLowerCase() || "";
      const query = searchTerm.toLowerCase();
      return name.includes(query) || code.includes(query) || phone.includes(query) || spec.includes(query);
    });
  }, [deskRows, searchTerm]);

  const markedCount = useMemo(
    () => filteredFaculty.filter((f) => isWritableStatus(getRowData(f.facultyId).status)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getRowData depends on currentDayAttendance
    [filteredFaculty, currentDayAttendance]
  );

  const canSave =
    canEditDay && hasUnsavedChanges && markedCount > 0 && !saveDailyAttendance.isPending;

  const allStatusCheck = useMemo(() => {
    if (filteredFaculty.length === 0) {
      return { present: false, absent: false, leave: false };
    }
    const firstStatus = getRowData(filteredFaculty[0].facultyId).status;
    const allSame = filteredFaculty.every((f) => getRowData(f.facultyId).status === firstStatus);
    return {
      present: allSame && firstStatus === "PRESENT",
      absent: allSame && firstStatus === "ABSENT",
      leave: allSame && firstStatus === "LEAVE",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredFaculty, currentDayAttendance]);

  return (
    <PageContainer density="compact" className="animate-in fade-in duration-300 text-slate-800 dark:text-slate-100">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs font-semibold shadow-xs ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-blue-50 border-blue-300 text-blue-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-blue-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-slate-800 text-xs">
            ✕
          </button>
        </div>
      )}

      <PageHeader title="Faculty Attendance" />

      {/* Single-column: date controls on top, list full width below */}
      <div className="space-y-5">
        {/* Top bar: Attendance Details + selected date + calendar popover */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-none">
          <div className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
            <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Attendance Details
            </CardTitle>

            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Selected date
                </p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {selectedDateLabel}
                </p>
              </div>

              <div
                ref={calendarPopoverRef}
                className="relative shrink-0"
                onMouseEnter={openCalendar}
                onMouseLeave={scheduleCloseCalendar}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Open calendar"
                  aria-expanded={calendarOpen}
                  aria-haspopup="dialog"
                  className={`h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 ${
                    calendarOpen ? "bg-slate-100 dark:bg-slate-800" : ""
                  }`}
                  onClick={openCalendar}
                >
                  <CalendarDays className="w-4 h-4" />
                </Button>

                {calendarOpen ? (
                  <div
                    role="dialog"
                    aria-label="Choose attendance date"
                    className="absolute right-0 top-full z-30 mt-1.5 w-[240px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md p-3"
                  >
                    {/* Calendar Month & Navigation */}
                    <div className="w-full flex items-center justify-between mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-500 hover:text-slate-800"
                        onClick={() => {
                          const m = new Date(calendarMonth);
                          m.setMonth(m.getMonth() - 1);
                          setCalendarMonth(m);
                        }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span>
                        {calendarMonth.toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-500 hover:text-slate-800"
                        onClick={() => {
                          const m = new Date(calendarMonth);
                          m.setMonth(m.getMonth() + 1);
                          setCalendarMonth(m);
                        }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Day of Week Headers */}
                    <div className="w-full grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      <span>Su</span>
                      <span>Mo</span>
                      <span>Tu</span>
                      <span>We</span>
                      <span>Th</span>
                      <span>Fr</span>
                      <span>Sa</span>
                    </div>

                    {/* Day Numbers Grid */}
                    <div className="w-full grid grid-cols-7 gap-1 text-center text-xs">
                      {calendarDays.map((d, idx) => {
                        const isSelected = d.dateStr === selectedDate;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectDate(d.dateStr)}
                            className={`h-7 w-7 mx-auto flex items-center justify-center text-xs transition-colors rounded-none ${
                              isSelected
                                ? "bg-[#F3C279] text-slate-900 font-bold"
                                : d.isCurrentMonth
                                  ? "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  : "text-slate-300 dark:text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {d.dayNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Today & Clear Shortcuts */}
                    <div className="mt-3 flex items-center justify-center gap-4 text-xs font-bold text-slate-900 dark:text-slate-100">
                      <button type="button" onClick={handleToday} className="hover:underline">
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={handleClear}
                        className="hover:underline font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        {/* Attendance List — full width */}
        <div className="space-y-3">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-none overflow-hidden">
            {/* Table Header Bar */}
            <div className="p-3 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Attendance List
                </CardTitle>
                <span className="text-xs text-slate-500">
                  ({selectedDate})
                </span>
              </div>

              {/* Controls: Branch filter, Save Button, Search Input */}
              <div className="flex items-center gap-2">
                {/* Branch Dropdown */}
                <select
                  className="h-8 px-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-none outline-none"
                  value={selectedBranchId || "ALL"}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Save Button */}
                <PermissionGate itemKey="faculty.attendance" mode="write">
                <Button
                  size="sm"
                  onClick={handleSaveAttendance}
                  disabled={!canSave}
                  className={`h-8 text-xs font-semibold px-3 rounded-none ${
                    canSave
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {saveDailyAttendance.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1" />
                  )}
                  {saveDailyAttendance.isPending
                    ? "Saving..."
                    : hasUnsavedChanges && markedCount > 0
                      ? `Save * (${markedCount})`
                      : "Save"}
                </Button>
                </PermissionGate>

                {/* Search Box */}
                <div className="relative w-44">
                  <Input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-none pr-7"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Table Content */}
            {isDailyLoading && !attendanceRecords[selectedDate] ? (
              <div className="p-10 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <p className="text-xs">Loading faculty attendance list...</p>
              </div>
            ) : filteredFaculty.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold">No faculty found.</p>
                <p className="text-[11px] text-slate-400 mt-1">Active and on-leave faculty for this branch will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {!isSelectedDateToday ? (
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-300">
                    Only today&apos;s attendance can be edited. This date is view-only.
                  </div>
                ) : markedCount === 0 ? (
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-amber-50/80 dark:bg-amber-950/20 text-[11px] text-amber-800 dark:text-amber-200">
                    Select a status for each faculty you want to save — unmarked rows are skipped. Re-click a selected status to clear it.
                  </div>
                ) : null}
                <table className="w-full text-left border-collapse text-xs border border-slate-200 dark:border-slate-800">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <th className="py-2.5 px-3 w-12 border-r border-slate-200 dark:border-slate-800 text-center">
                        SR. NO.
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-1">
                          <span>NAME</span>
                          <span className="text-[10px] text-blue-600">▲</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                        CODE
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                        DESIGNATION
                      </th>

                      {/* PRESENT Column with Select-All Checkbox */}
                      <th className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center w-20">
                        <label className={`flex flex-col items-center select-none ${canEditDay ? "cursor-pointer" : "cursor-default"}`}>
                          <input
                            type="checkbox"
                            checked={allStatusCheck.present}
                            disabled={!canEditDay}
                            onChange={() => handleBulkSetStatus("PRESENT")}
                            className="w-3.5 h-3.5 accent-blue-600 rounded-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <span className="text-[10px] font-bold mt-0.5">PRESENT</span>
                        </label>
                      </th>

                      {/* ABSENT Column with Select-All Checkbox */}
                      <th className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center w-20">
                        <label className={`flex flex-col items-center select-none ${canEditDay ? "cursor-pointer" : "cursor-default"}`}>
                          <input
                            type="checkbox"
                            checked={allStatusCheck.absent}
                            disabled={!canEditDay}
                            onChange={() => handleBulkSetStatus("ABSENT")}
                            className="w-3.5 h-3.5 accent-blue-600 rounded-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <span className="text-[10px] font-bold mt-0.5">ABSENT</span>
                        </label>
                      </th>

                      {/* LEAVE Column with Select-All Checkbox */}
                      <th className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center w-20">
                        <label className={`flex flex-col items-center select-none ${canEditDay ? "cursor-pointer" : "cursor-default"}`}>
                          <input
                            type="checkbox"
                            checked={allStatusCheck.leave}
                            disabled={!canEditDay}
                            onChange={() => handleBulkSetStatus("LEAVE")}
                            className="w-3.5 h-3.5 accent-blue-600 rounded-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <span className="text-[10px] font-bold mt-0.5">LEAVE</span>
                        </label>
                      </th>

                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 w-24 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span>FIRST IN</span>
                          <span className="normal-case tracking-normal font-medium text-[9px] text-slate-400">
                            From Check In
                          </span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 w-24 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span>LAST OUT</span>
                          <span className="normal-case tracking-normal font-medium text-[9px] text-slate-400">
                            From Check Out
                          </span>
                        </div>
                      </th>
                      <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 w-20 text-center">
                        SESSIONS
                      </th>
                      <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 w-20 text-center">
                        DURATION
                      </th>
                      <th className="py-2.5 px-3 min-w-[120px]">
                        COMMENTS
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredFaculty.map((f, idx) => {
                      const row = getRowData(f.facultyId);
                      const summary = f.attendance;
                      const punches = summary?.punches ?? [];
                      const showTimes = row.status === "PRESENT";
                      const displayInTime = showTimes
                        ? formatTime12h(summary?.firstIn || toTimeValue(row.inTime))
                        : "—";
                      const displayOutTime = showTimes
                        ? formatTime12h(summary?.lastOut || toTimeValue(row.outTime))
                        : "—";
                      const sessionCount = summary?.sessionCount ?? 0;
                      const isExpanded = !!expandedRows[f.facultyId] && punches.length > 0;

                      return (
                        <React.Fragment key={f.facultyId}>
                        <tr
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isExpanded ? "bg-slate-50/60 dark:bg-slate-800/30" : ""
                          }`}
                        >
                          <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 font-medium border-r border-slate-200 dark:border-slate-800">
                            {idx + 1}
                          </td>

                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800">
                            {f.user?.name || "Faculty Member"}
                          </td>

                          <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                            {f.employeeCode || "—"}
                          </td>

                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                            {f.designation || f.specialization || "Faculty"}
                          </td>

                          <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="radio"
                              name={`attendance-${f.facultyId}`}
                              checked={row.status === "PRESENT"}
                              disabled={!canEditDay}
                              onChange={() => handleStatusChange(f.facultyId, "PRESENT")}
                              onClick={() => {
                                if (canEditDay && row.status === "PRESENT") {
                                  handleStatusChange(f.facultyId, null);
                                }
                              }}
                              title={canEditDay ? "Present (click again to clear)" : "View only — not today"}
                              className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer align-middle disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </td>

                          <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="radio"
                              name={`attendance-${f.facultyId}`}
                              checked={row.status === "ABSENT"}
                              disabled={!canEditDay}
                              onChange={() => handleStatusChange(f.facultyId, "ABSENT")}
                              onClick={() => {
                                if (canEditDay && row.status === "ABSENT") {
                                  handleStatusChange(f.facultyId, null);
                                }
                              }}
                              title={canEditDay ? "Absent (click again to clear)" : "View only — not today"}
                              className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer align-middle disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </td>

                          <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="radio"
                              name={`attendance-${f.facultyId}`}
                              checked={row.status === "LEAVE"}
                              disabled={!canEditDay}
                              onChange={() => handleStatusChange(f.facultyId, "LEAVE")}
                              onClick={() => {
                                if (canEditDay && row.status === "LEAVE") {
                                  handleStatusChange(f.facultyId, null);
                                }
                              }}
                              title={canEditDay ? "Leave (click again to clear)" : "View only — not today"}
                              className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer align-middle disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </td>

                          <td
                            className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-700 dark:text-slate-300 tabular-nums"
                            title="Set by faculty Check In"
                          >
                            {displayInTime}
                          </td>

                          <td
                            className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-700 dark:text-slate-300 tabular-nums"
                            title="Set by faculty Check Out"
                          >
                            {displayOutTime}
                            {summary?.openSession ? (
                              <span className="block font-sans text-[9px] font-semibold text-blue-600 dark:text-blue-400">
                                Checked in
                              </span>
                            ) : null}
                          </td>

                          <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center">
                            {punches.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(f.facultyId)}
                                aria-expanded={isExpanded}
                                title={isExpanded ? "Hide punch history" : "Show punch history"}
                                className="inline-flex items-center gap-0.5 font-semibold text-blue-700 dark:text-blue-400 hover:underline tabular-nums"
                              >
                                {sessionCount}
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                />
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                            {sessionCount > 0 ? formatDurationMinutes(summary?.totalMinutes) : "—"}
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={row.comments}
                              disabled={!canEditDay}
                              onChange={(e) => handleCommentsChange(f.facultyId, e.target.value)}
                              placeholder=""
                              className="w-full h-7 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-blue-500 outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                            />
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="bg-slate-50/60 dark:bg-slate-800/30">
                            <td colSpan={12} className="py-2 px-4 pl-16">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Punch history
                              </p>
                              <AttendancePunchList punches={punches} openSession={summary?.openSession} />
                            </td>
                          </tr>
                        ) : null}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

export default FacultyAttendance;
