import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBranches } from "@/hooks/useBranches";
import { useBranchStore } from "@/store/branch.store";
import { useFacultyList, useFacultyDailyAttendance, useSaveFacultyDailyAttendance } from "@/hooks/useFaculty";
import type { FacultyDailyAttendanceDeskResponse } from "@/types/faculty.types";

export type AttendanceDeskStatus = "PRESENT" | "ABSENT" | "LEAVE" | "WEEKLY_OFF";

interface AttendanceRowState {
  status: AttendanceDeskStatus;
  inTime: string;
  outTime: string;
  comments: string;
}

// Helper to normalize time strings to HH:mm for type="time" input
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

export const FacultyAttendance: React.FC = () => {
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

  // Live faculty from database
  const { data: facultyListResponse, isLoading: isFacultyLoading } = useFacultyList({
    branchId: activeBranchId,
    limit: 100,
  });
  const facultyMembers = facultyListResponse?.data || [];

  // Date selection state (YYYY-MM-DD)
  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr);

  // Calendar month view date
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Attendance storage by Date -> Faculty ID -> AttendanceRowState
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, AttendanceRowState>>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [hydratedDateKey, setHydratedDateKey] = useState<string | null>(null);

  const { data: dailyAttendanceResponse, isLoading: isDailyLoading } =
    useFacultyDailyAttendance({
      date: selectedDate,
      branchId: activeBranchId,
    });
  const saveDailyAttendance = useSaveFacultyDailyAttendance();

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
    const isSunday = new Date(selectedDate + "T00:00:00").getDay() === 0;

    for (const row of payload.records) {
      if (row.attendance) {
        dayMap[row.facultyId] = {
          status: row.attendance.status,
          inTime: row.attendance.inTime || "",
          outTime: row.attendance.outTime || "",
          comments: row.attendance.comments || "",
        };
      } else {
        dayMap[row.facultyId] = {
          status: isSunday ? "WEEKLY_OFF" : "PRESENT",
          inTime: isSunday ? "" : "09:30",
          outTime: isSunday ? "" : "17:30",
          comments: "",
        };
      }
    }

    setAttendanceRecords((prev) => ({ ...prev, [selectedDate]: dayMap }));
    setHydratedDateKey(hydrateKey);
    setHasUnsavedChanges(false);
  }, [dailyAttendanceResponse, selectedDate, activeBranchId, hasUnsavedChanges, hydratedDateKey]);

  // Check if selected date is Sunday (default to WEEKLY_OFF like reference)
  const isSelectedDateSunday = useMemo(() => {
    const d = new Date(selectedDate + "T00:00:00");
    return d.getDay() === 0;
  }, [selectedDate]);

  // Calendar month grid calculation
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({
        dateStr: prevDate.toISOString().split("T")[0],
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const curDate = new Date(Date.UTC(year, month, i));
      days.push({
        dateStr: curDate.toISOString().split("T")[0],
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill multiple of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        dateStr: nextDate.toISOString().split("T")[0],
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [calendarMonth]);

  // Current day attendance map
  const currentDayAttendance = attendanceRecords[selectedDate] || {};

  // Row helper
  const getRowData = (facultyId: string): AttendanceRowState => {
    if (currentDayAttendance[facultyId]) {
      return currentDayAttendance[facultyId];
    }
    // Default fallback: Sunday is Weekly Off, other days Present
    return {
      status: isSelectedDateSunday ? "WEEKLY_OFF" : "PRESENT",
      inTime: isSelectedDateSunday ? "" : "09:30",
      outTime: isSelectedDateSunday ? "" : "17:30",
      comments: "",
    };
  };

  // Update status for single faculty
  const handleStatusChange = (facultyId: string, status: AttendanceDeskStatus) => {
    setAttendanceRecords((prev) => {
      const dayMap = { ...(prev[selectedDate] || {}) };
      const current = getRowData(facultyId);
      dayMap[facultyId] = {
        ...current,
        status,
        inTime: status === "PRESENT" ? (current.inTime || "09:30") : "",
        outTime: status === "PRESENT" ? (current.outTime || "17:30") : "",
      };
      return { ...prev, [selectedDate]: dayMap };
    });
    setHasUnsavedChanges(true);
  };

  // Update text field
  const handleFieldChange = (facultyId: string, field: "inTime" | "outTime" | "comments", value: string) => {
    setAttendanceRecords((prev) => {
      const dayMap = { ...(prev[selectedDate] || {}) };
      const current = getRowData(facultyId);
      dayMap[facultyId] = { ...current, [field]: value };
      return { ...prev, [selectedDate]: dayMap };
    });
    setHasUnsavedChanges(true);
  };

  // Bulk set all visible faculty to status
  const handleBulkSetStatus = (status: AttendanceDeskStatus) => {
    if (filteredFaculty.length === 0) return;
    setAttendanceRecords((prev) => {
      const dayMap = { ...(prev[selectedDate] || {}) };
      filteredFaculty.forEach((f) => {
        const current = getRowData(f.id);
        dayMap[f.id] = {
          ...current,
          status,
          inTime: status === "PRESENT" ? (current.inTime || "09:30") : "",
          outTime: status === "PRESENT" ? (current.outTime || "17:30") : "",
        };
      });
      return { ...prev, [selectedDate]: dayMap };
    });
    setHasUnsavedChanges(true);
    showToast(`Marked all as ${status.replace("_", " ")}`, "info");
  };

  // Save changes
  const handleSaveAttendance = async () => {
    if (filteredFaculty.length === 0) {
      showToast("No faculty to save", "error");
      return;
    }

    const records = filteredFaculty.map((f) => {
      const row = getRowData(f.id);
      return {
        facultyId: f.id,
        status: row.status,
        inTime: row.status === "PRESENT" ? row.inTime || "09:30" : null,
        outTime: row.status === "PRESENT" ? row.outTime || "17:30" : null,
        comments: row.comments || null,
      };
    });

    try {
      await saveDailyAttendance.mutateAsync({ date: selectedDate, records });
      setHasUnsavedChanges(false);
      showToast(`Attendance saved successfully for ${selectedDate}!`, "success");
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Failed to save attendance";
      showToast(message, "error");
    }
  };

  // Calendar jump
  const handleSelectDate = (dateStr: string) => {
    if (dateStr !== selectedDate) {
      setHasUnsavedChanges(false);
      setHydratedDateKey(null);
    }
    setSelectedDate(dateStr);
  };

  const handleToday = () => {
    const today = getTodayStr();
    setSelectedDate(today);
    setCalendarMonth(new Date());
  };

  const handleClear = () => {
    const today = getTodayStr();
    setSelectedDate(today);
    setCalendarMonth(new Date());
  };

  // Filtered faculty
  const filteredFaculty = useMemo(() => {
    return facultyMembers.filter((f) => {
      const name = f.user?.name?.toLowerCase() || "";
      const code = f.employeeCode?.toLowerCase() || "";
      const phone = f.user?.phone?.toLowerCase() || "";
      const spec = f.specialization?.toLowerCase() || "";
      const query = searchTerm.toLowerCase();

      return name.includes(query) || code.includes(query) || phone.includes(query) || spec.includes(query);
    });
  }, [facultyMembers, searchTerm]);

  // Header checkbox checked states
  const allStatusCheck = useMemo(() => {
    if (filteredFaculty.length === 0) return { present: false, absent: false, leave: false, weeklyOff: false };
    const firstStatus = getRowData(filteredFaculty[0].id).status;
    const allSame = filteredFaculty.every((f) => getRowData(f.id).status === firstStatus);

    return {
      present: allSame && firstStatus === "PRESENT",
      absent: allSame && firstStatus === "ABSENT",
      leave: allSame && firstStatus === "LEAVE",
      weeklyOff: allSame && firstStatus === "WEEKLY_OFF",
    };
  }, [filteredFaculty, currentDayAttendance]);

  return (
    <div className="p-5 max-w-[1600px] mx-auto space-y-4 animate-in fade-in duration-300 text-slate-800 dark:text-slate-100">
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

      {/* PAGE HEADER */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Faculty Attendance
        </h1>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Attendance Details (Calendar Card) */}
        <div className="lg:col-span-3">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-none">
            <CardHeader className="p-3.5 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Attendance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col items-center">
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
                  {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
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
                          ? "bg-[#F3C279] text-slate-900 font-bold" // Amber/yellow highlight matching reference
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
              <div className="mt-4 flex flex-col items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                <button
                  type="button"
                  onClick={handleToday}
                  className="hover:underline"
                >
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
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Attendance List Table */}
        <div className="lg:col-span-9 space-y-3">
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
                <Button
                  size="sm"
                  onClick={handleSaveAttendance}
                  disabled={saveDailyAttendance.isPending || filteredFaculty.length === 0}
                  className={`h-8 text-xs font-semibold px-3 rounded-none ${
                    hasUnsavedChanges
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
                    : hasUnsavedChanges
                      ? "Save *"
                      : "Save"}
                </Button>

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
            {isFacultyLoading || (isDailyLoading && !attendanceRecords[selectedDate]) ? (
              <div className="p-10 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <p className="text-xs">Loading faculty attendance list...</p>
              </div>
            ) : filteredFaculty.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold">No faculty found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                        MOBILE NO
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                        CODE
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                        DESIGNATION
                      </th>

                      {/* PRESENT Column with Select-All Checkbox */}
                      <th className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center w-20">
                        <label className="flex flex-col items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allStatusCheck.present}
                            onChange={() => handleBulkSetStatus("PRESENT")}
                            className="w-3.5 h-3.5 accent-blue-600 rounded-none cursor-pointer"
                          />
                          <span className="text-[10px] font-bold mt-0.5">PRESENT</span>
                        </label>
                      </th>

                      {/* ABSENT Column with Select-All Checkbox */}
                      <th className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center w-20">
                        <label className="flex flex-col items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allStatusCheck.absent}
                            onChange={() => handleBulkSetStatus("ABSENT")}
                            className="w-3.5 h-3.5 accent-blue-600 rounded-none cursor-pointer"
                          />
                          <span className="text-[10px] font-bold mt-0.5">ABSENT</span>
                        </label>
                      </th>

                      {/* LEAVE Column with Select-All Checkbox */}
                      <th className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center w-20">
                        <label className="flex flex-col items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allStatusCheck.leave}
                            onChange={() => handleBulkSetStatus("LEAVE")}
                            className="w-3.5 h-3.5 accent-blue-600 rounded-none cursor-pointer"
                          />
                          <span className="text-[10px] font-bold mt-0.5">LEAVE</span>
                        </label>
                      </th>

                      {/* WEEKLY OFF Column with Select-All Checkbox */}
                      <th className="py-2 px-2 border-r border-slate-200 dark:border-slate-800 text-center w-24">
                        <label className="flex flex-col items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allStatusCheck.weeklyOff}
                            onChange={() => handleBulkSetStatus("WEEKLY_OFF")}
                            className="w-3.5 h-3.5 accent-blue-600 rounded-none cursor-pointer"
                          />
                          <span className="text-[10px] font-bold mt-0.5 leading-tight text-center">WEEKLY OFF</span>
                        </label>
                      </th>

                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 w-24 text-center">
                        IN TIME
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 w-24 text-center">
                        OUT TIME
                      </th>
                      <th className="py-2.5 px-3 min-w-[120px]">
                        COMMENTS
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredFaculty.map((f, idx) => {
                      const row = getRowData(f.id);
                      const isInactiveTime = row.status === "WEEKLY_OFF" || row.status === "ABSENT" || row.status === "LEAVE";

                      return (
                        <tr
                          key={f.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* SR. NO. */}
                          <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 font-medium border-r border-slate-200 dark:border-slate-800">
                            {idx + 1}
                          </td>

                          {/* NAME */}
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800">
                            {f.user?.name || "Faculty Member"}
                          </td>

                          {/* MOBILE NO */}
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                            {f.user?.phone || "—"}
                          </td>

                          {/* CODE */}
                          <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                            {f.employeeCode || "—"}
                          </td>

                          {/* DESIGNATION */}
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                            {f.designation || f.specialization || "Faculty"}
                          </td>

                          {/* PRESENT Radio */}
                          <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="radio"
                              name={`attendance-${f.id}`}
                              checked={row.status === "PRESENT"}
                              onChange={() => handleStatusChange(f.id, "PRESENT")}
                              className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer align-middle"
                            />
                          </td>

                          {/* ABSENT Radio */}
                          <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="radio"
                              name={`attendance-${f.id}`}
                              checked={row.status === "ABSENT"}
                              onChange={() => handleStatusChange(f.id, "ABSENT")}
                              className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer align-middle"
                            />
                          </td>

                          {/* LEAVE Radio */}
                          <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="radio"
                              name={`attendance-${f.id}`}
                              checked={row.status === "LEAVE"}
                              onChange={() => handleStatusChange(f.id, "LEAVE")}
                              className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer align-middle"
                            />
                          </td>

                          {/* WEEKLY OFF Radio */}
                          <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="radio"
                              name={`attendance-${f.id}`}
                              checked={row.status === "WEEKLY_OFF"}
                              onChange={() => handleStatusChange(f.id, "WEEKLY_OFF")}
                              className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer align-middle"
                            />
                          </td>

                          {/* IN TIME */}
                          <td className="py-1.5 px-2 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="time"
                              value={toTimeValue(row.inTime)}
                              disabled={isInactiveTime}
                              onChange={(e) => handleFieldChange(f.id, "inTime", e.target.value)}
                              onClick={(e) => {
                                if (!isInactiveTime) e.currentTarget.showPicker?.();
                              }}
                              className={`w-full h-7 px-1 text-xs border border-slate-200 dark:border-slate-700 rounded-none text-center outline-none transition-colors ${
                                isInactiveTime
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                  : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 cursor-pointer focus:border-blue-500 hover:border-slate-400"
                              }`}
                            />
                          </td>

                          {/* OUT TIME */}
                          <td className="py-1.5 px-2 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="time"
                              value={toTimeValue(row.outTime)}
                              disabled={isInactiveTime}
                              onChange={(e) => handleFieldChange(f.id, "outTime", e.target.value)}
                              onClick={(e) => {
                                if (!isInactiveTime) e.currentTarget.showPicker?.();
                              }}
                              className={`w-full h-7 px-1 text-xs border border-slate-200 dark:border-slate-700 rounded-none text-center outline-none transition-colors ${
                                isInactiveTime
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                  : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 cursor-pointer focus:border-blue-500 hover:border-slate-400"
                              }`}
                            />
                          </td>

                          {/* COMMENTS */}
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={row.comments}
                              onChange={(e) => handleFieldChange(f.id, "comments", e.target.value)}
                              placeholder=""
                              className="w-full h-7 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-blue-500 outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FacultyAttendance;
