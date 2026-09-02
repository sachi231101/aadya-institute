import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Bell,
  SlidersHorizontal,
  Building2,
  BookOpen,
  Search,
  Filter,
  Calendar,
  Coffee,
  UtensilsCrossed,
  Plus,
  Edit3,
  Users,
  Info,
  Save,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth.store";
import { ClassroomDropdown } from "@/components/common/ClassroomDropdown";
import { useClassSessions } from "@/hooks/useClassSessions";
import { getSessionSubjectLabel } from "@/utils/batch.utils";

// ─── TYPES & SLOTS ──────────────────────────────────────────────────────────

export type SlotType =
  | "CLASS"
  | "FREE"
  | "BREAK"
  | "LUNCH"
  | "LEAVE"
  | "NOT_ASSIGNED";

export interface FacultyTimetableSlot {
  id: string;
  period: number;
  timeRange: string;
  type: SlotType;
  courseName?: string;
  batchCode?: string;
  roomNo?: string;
  studentCount?: number;
  attendanceStatus?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}

export interface FacultyDaySchedule {
  dayKey: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  dayName: string;
  dayShort: string;
  dateStr: string;
  isHoliday?: boolean;
  holidayTitle?: string;
  slots: Record<number, FacultyTimetableSlot>;
}

const TIME_SLOT_COLUMNS = [
  { period: 1, label: "09:00 – 10:00 AM", timeTitle: "09:00 – 10:00", subTitle: "AM" },
  { period: 2, label: "10:00 – 11:00 AM", timeTitle: "10:00 – 11:00", subTitle: "AM" },
  { period: 3, label: "11:00 – 12:00 PM", timeTitle: "11:00 – 12:00", subTitle: "PM" },
  { period: 4, label: "12:00 – 01:00 PM", timeTitle: "12:00 – 01:00", subTitle: "PM", isBreak: true },
  { period: 5, label: "01:00 – 02:00 PM", timeTitle: "01:00 – 02:00", subTitle: "PM", isLunch: true },
  { period: 6, label: "02:00 – 03:00 PM", timeTitle: "02:00 – 03:00", subTitle: "PM" },
  { period: 7, label: "03:00 – 04:00 PM", timeTitle: "03:00 – 04:00", subTitle: "PM" },
  { period: 8, label: "04:00 – 05:00 PM", timeTitle: "04:00 – 05:00", subTitle: "PM" },
];

const createDefaultDaySlots = (
  custom?: Partial<Record<number, Partial<FacultyTimetableSlot>>>
): Record<number, FacultyTimetableSlot> => {
  const slots: Record<number, FacultyTimetableSlot> = {};
  TIME_SLOT_COLUMNS.forEach((col) => {
    if (col.isBreak) {
      slots[col.period] = {
        id: `slot-break-${col.period}`,
        period: col.period,
        timeRange: col.label,
        type: "BREAK",
      };
    } else if (col.isLunch) {
      slots[col.period] = {
        id: `slot-lunch-${col.period}`,
        period: col.period,
        timeRange: col.label,
        type: "LUNCH",
      };
    } else {
      slots[col.period] = {
        id: `slot-free-${col.period}`,
        period: col.period,
        timeRange: col.label,
        type: "FREE",
      };
    }
  });

  if (custom) {
    Object.entries(custom).forEach(([pStr, override]) => {
      const p = Number(pStr);
      if (slots[p] && override) {
        slots[p] = { ...slots[p], ...override } as FacultyTimetableSlot;
      }
    });
  }
  return slots;
};

// ─── INITIAL LOGGED-IN FACULTY WEEKLY SCHEDULE (MATCHING IMAGE SPEC) ──────────

const INITIAL_FACULTY_WEEK: FacultyDaySchedule[] = [
  {
    dayKey: "MON",
    dayName: "Monday",
    dayShort: "Mon",
    dateStr: "18 Aug",
    slots: createDefaultDaySlots({
      1: { id: "mon-1", type: "CLASS", courseName: "Java Programming", batchCode: "Batch C", roomNo: "Room 301", studentCount: 28, attendanceStatus: "COMPLETED" },
      2: { id: "mon-2", type: "CLASS", courseName: "Advanced Java", batchCode: "Batch A", roomNo: "Room 301", studentCount: 25, attendanceStatus: "COMPLETED" },
      3: { id: "mon-3", type: "FREE" },
      6: { id: "mon-6", type: "CLASS", courseName: "Python Basics", batchCode: "Batch B", roomNo: "Room 302", studentCount: 24, attendanceStatus: "PENDING" },
      7: { id: "mon-7", type: "FREE" },
      8: { id: "mon-8", type: "NOT_ASSIGNED" },
    }),
  },
  {
    dayKey: "TUE",
    dayName: "Tuesday",
    dayShort: "Tue",
    dateStr: "19 Aug",
    slots: createDefaultDaySlots({
      1: { id: "tue-1", type: "FREE" },
      2: { id: "tue-2", type: "FREE" },
      3: { id: "tue-3", type: "CLASS", courseName: "Advanced Java", batchCode: "Batch A", roomNo: "Room 301", studentCount: 25, attendanceStatus: "PENDING" },
      6: { id: "tue-6", type: "CLASS", courseName: "Python Basics", batchCode: "Batch B", roomNo: "Room 302", studentCount: 24, attendanceStatus: "PENDING" },
      7: { id: "tue-7", type: "FREE" },
      8: { id: "tue-8", type: "NOT_ASSIGNED" },
    }),
  },
  {
    dayKey: "WED",
    dayName: "Wednesday",
    dayShort: "Wed",
    dateStr: "20 Aug",
    slots: createDefaultDaySlots({
      1: { id: "wed-1", type: "CLASS", courseName: "Java Programming", batchCode: "Batch C", roomNo: "Room 301", studentCount: 28, attendanceStatus: "PENDING" },
      2: { id: "wed-2", type: "CLASS", courseName: "Java Programming", batchCode: "Batch C", roomNo: "Room 301", studentCount: 28, attendanceStatus: "PENDING" },
      3: { id: "wed-3", type: "FREE" },
      6: { id: "wed-6", type: "CLASS", courseName: "Database Systems", batchCode: "Batch D", roomNo: "Room 304", studentCount: 22, attendanceStatus: "PENDING" },
      7: { id: "wed-7", type: "CLASS", courseName: "Database Systems", batchCode: "Batch D", roomNo: "Room 304", studentCount: 22, attendanceStatus: "PENDING" },
      8: { id: "wed-8", type: "FREE" },
    }),
  },
  {
    dayKey: "THU",
    dayName: "Thursday",
    dayShort: "Thu",
    dateStr: "21 Aug",
    slots: createDefaultDaySlots({
      1: { id: "thu-1", type: "FREE" },
      2: { id: "thu-2", type: "CLASS", courseName: "Advanced Java", batchCode: "Batch A", roomNo: "Room 301", studentCount: 25, attendanceStatus: "PENDING" },
      3: { id: "thu-3", type: "CLASS", courseName: "OOP Concepts", batchCode: "Batch C", roomNo: "Room 303", studentCount: 26, attendanceStatus: "PENDING" },
      6: { id: "thu-6", type: "FREE" },
      7: { id: "thu-7", type: "CLASS", courseName: "Data Structures", batchCode: "Batch C", roomNo: "Room 303", studentCount: 26, attendanceStatus: "PENDING" },
      8: { id: "thu-8", type: "NOT_ASSIGNED" },
    }),
  },
  {
    dayKey: "FRI",
    dayName: "Friday",
    dayShort: "Fri",
    dateStr: "22 Aug",
    slots: createDefaultDaySlots({
      1: { id: "fri-1", type: "CLASS", courseName: "Data Structures", batchCode: "Batch C", roomNo: "Room 303", studentCount: 26, attendanceStatus: "PENDING" },
      2: { id: "fri-2", type: "CLASS", courseName: "Database Systems", batchCode: "Batch D", roomNo: "Room 304", studentCount: 22, attendanceStatus: "PENDING" },
      3: { id: "fri-3", type: "FREE" },
      6: { id: "fri-6", type: "CLASS", courseName: "Python Basics", batchCode: "Batch B", roomNo: "Room 302", studentCount: 24, attendanceStatus: "PENDING" },
      7: { id: "fri-7", type: "FREE" },
      8: { id: "fri-8", type: "FREE" },
    }),
  },
  {
    dayKey: "SAT",
    dayName: "Saturday",
    dayShort: "Sat",
    dateStr: "23 Aug",
    slots: createDefaultDaySlots({
      1: { id: "sat-1", type: "CLASS", courseName: "OOP Concepts", batchCode: "Batch C", roomNo: "Room 303", studentCount: 26, attendanceStatus: "PENDING" },
      2: { id: "sat-2", type: "FREE" },
      3: { id: "sat-3", type: "CLASS", courseName: "Mini Project", batchCode: "Batch C", roomNo: "Room 305", studentCount: 18, attendanceStatus: "PENDING" },
      6: { id: "sat-6", type: "CLASS", courseName: "Mini Project", batchCode: "Batch C", roomNo: "Room 305", studentCount: 18, attendanceStatus: "PENDING" },
      7: { id: "sat-7", type: "FREE" },
      8: { id: "sat-8", type: "NOT_ASSIGNED" },
    }),
  },
  {
    dayKey: "SUN",
    dayName: "Sunday",
    dayShort: "Sun",
    dateStr: "24 Aug",
    isHoliday: true,
    holidayTitle: "HOLIDAY",
    slots: createDefaultDaySlots(),
  },
];

export interface FacultyTimetableProps {
  readOnly?: boolean;
}

export const FacultyTimetable: React.FC<FacultyTimetableProps> = ({ readOnly = true }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isFacultyUser = readOnly || !user?.roles?.includes("ADMIN");
  const facultyCenterName = (user as any)?.branchName || "Bangalore Center";

  const weekRange = useMemo(() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // Mon=0
    const monday = new Date(now);
    monday.setDate(now.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return {
      from: monday.toISOString().split("T")[0],
      to: sunday.toISOString().split("T")[0],
      monday,
    };
  }, []);

  const { data: sessionsRes } = useClassSessions({
    startDate: weekRange.from,
    endDate: weekRange.to,
    limit: 100,
  });

  // State
  const [scheduleData, setScheduleData] = useState<FacultyDaySchedule[]>(INITIAL_FACULTY_WEEK);
  const [selectedBranch, setSelectedBranch] = useState<string>("Bangalore Center");
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const periodFromStartTime = (startTime: string): number | null => {
    const hour = parseInt(String(startTime).slice(0, 2), 10);
    if (Number.isNaN(hour)) return null;
    const map: Record<number, number> = { 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 7, 16: 8 };
    return map[hour] ?? null;
  };

  useEffect(() => {
    const sessions = sessionsRes?.data ?? [];
    if (!sessions.length && !isFacultyUser) return;

    const dayKeys: FacultyDaySchedule["dayKey"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const built: FacultyDaySchedule[] = dayKeys.map((dayKey, idx) => {
      const date = new Date(weekRange.monday);
      date.setDate(weekRange.monday.getDate() + idx);
      const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const dayName = date.toLocaleDateString("en-IN", { weekday: "long" });
      const dayShort = date.toLocaleDateString("en-IN", { weekday: "short" });
      const isSunday = dayKey === "SUN";
      const slots = createDefaultDaySlots();

      sessions.forEach((raw: any) => {
        const sched = new Date(raw.scheduledDate);
        if (
          sched.getFullYear() !== date.getFullYear() ||
          sched.getMonth() !== date.getMonth() ||
          sched.getDate() !== date.getDate()
        ) {
          return;
        }
        const period = periodFromStartTime(raw.startTime);
        if (!period || slots[period]?.type === "BREAK" || slots[period]?.type === "LUNCH") return;
        slots[period] = {
          id: raw.id,
          period,
          timeRange: `${raw.startTime} – ${raw.endTime}`,
          type: "CLASS",
          courseName: getSessionSubjectLabel({ title: raw.title, batch: raw.batch }),
          batchCode: raw.batch?.code || raw.batch?.name || "",
          roomNo: raw.roomNo || "TBD",
          studentCount: raw.batch?._count?.enrollments,
          attendanceStatus:
            raw.sessionStatus === "COMPLETED"
              ? "COMPLETED"
              : raw.sessionStatus === "LIVE" || raw.sessionStatus === "ONGOING"
              ? "IN_PROGRESS"
              : "PENDING",
        };
      });

      return {
        dayKey,
        dayName,
        dayShort,
        dateStr,
        isHoliday: isSunday,
        holidayTitle: isSunday ? "HOLIDAY" : undefined,
        slots,
      };
    });

    setScheduleData(built);
  }, [sessionsRes, weekRange.monday, isFacultyUser]);

  // Modals
  const [selectedSlot, setSelectedSlot] = useState<{ day: FacultyDaySchedule; slot: FacultyTimetableSlot } | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit / Add Form State
  const [formDayKey, setFormDayKey] = useState<string>("MON");
  const [formPeriod, setFormPeriod] = useState<number>(1);
  const [formType, setFormType] = useState<SlotType>("CLASS");
  const [formCourseName, setFormCourseName] = useState<string>("");
  const [formBatchCode, setFormBatchCode] = useState<string>("Batch C");
  const [formRoomNo, setFormRoomNo] = useState<string>("Room 301");
  const [formStudentCount, setFormStudentCount] = useState<number>(28);

  // Filtered schedule
  const filteredSchedule = useMemo(() => {
    return scheduleData.map((day) => {
      if (day.isHoliday) return day;

      const filteredSlots: Record<number, FacultyTimetableSlot> = {};
      Object.entries(day.slots).forEach(([pStr, slot]) => {
        const p = Number(pStr);
        let matches = true;

        if (selectedCourse !== "ALL") {
          if (slot.type !== "CLASS" || slot.courseName !== selectedCourse) {
            matches = false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (slot.type === "CLASS") {
            const mCourse = slot.courseName?.toLowerCase().includes(q);
            const mBatch = slot.batchCode?.toLowerCase().includes(q);
            const mRoom = slot.roomNo?.toLowerCase().includes(q);
            if (!mCourse && !mBatch && !mRoom) matches = false;
          } else {
            matches = false;
          }
        }

        if (matches) {
          filteredSlots[p] = slot;
        } else {
          // If filtered out, show as neutral not matching
          filteredSlots[p] = {
            id: `slot-unmatched-${p}`,
            period: p,
            timeRange: slot.timeRange,
            type: "NOT_ASSIGNED",
          };
        }
      });

      return { ...day, slots: filteredSlots };
    });
  }, [scheduleData, selectedCourse, searchQuery]);

  // Handle Slot Click (Open Details or Add)
  const handleSlotClick = (day: FacultyDaySchedule, slot: FacultyTimetableSlot) => {
    if (day.isHoliday) return;

    if (slot.type === "CLASS") {
      navigate(
        `/faculty/class-session?sessionId=${encodeURIComponent(slot.id)}&course=${encodeURIComponent(
          slot.courseName || "Class"
        )}&batch=${encodeURIComponent(
          slot.batchCode || ""
        )}&room=${encodeURIComponent(
          slot.roomNo || ""
        )}&time=${encodeURIComponent(
          slot.timeRange || ""
        )}&students=${slot.studentCount || 0}`
      );
    } else {
      // Open add / configure slot
      setFormDayKey(day.dayKey);
      setFormPeriod(slot.period);
      setFormType(slot.type);
      setFormCourseName(slot.courseName || "Java Programming");
      setFormBatchCode(slot.batchCode || "Batch C");
      setFormRoomNo(slot.roomNo || "Room 301");
      setFormStudentCount(slot.studentCount || 28);
      setIsEditModalOpen(true);
    }
  };

  // Open Edit for active class
  const handleOpenEditFromDetails = () => {
    if (!selectedSlot) return;
    const { day, slot } = selectedSlot;
    setFormDayKey(day.dayKey);
    setFormPeriod(slot.period);
    setFormType(slot.type);
    setFormCourseName(slot.courseName || "");
    setFormBatchCode(slot.batchCode || "");
    setFormRoomNo(slot.roomNo || "");
    setFormStudentCount(slot.studentCount || 28);
    setIsDetailsModalOpen(false);
    setIsEditModalOpen(true);
  };

  // Save changes
  const handleSaveSlotForm = () => {
    setScheduleData((prev) =>
      prev.map((d) => {
        if (d.dayKey !== formDayKey) return d;
        const col = TIME_SLOT_COLUMNS.find((c) => c.period === formPeriod);
        const updatedSlots = { ...d.slots };

        if (formType === "CLASS") {
          updatedSlots[formPeriod] = {
            id: `slot-${formDayKey}-${formPeriod}-${Date.now()}`,
            period: formPeriod,
            timeRange: col?.label || "09:00 – 10:00 AM",
            type: "CLASS",
            courseName: formCourseName,
            batchCode: formBatchCode,
            roomNo: formRoomNo,
            studentCount: formStudentCount,
            attendanceStatus: "PENDING",
          };
        } else {
          updatedSlots[formPeriod] = {
            id: `slot-${formDayKey}-${formPeriod}-${Date.now()}`,
            period: formPeriod,
            timeRange: col?.label || "09:00 – 10:00 AM",
            type: formType,
          };
        }

        return { ...d, slots: updatedSlots };
      })
    );

    setIsEditModalOpen(false);
    setNotificationMsg(`✓ Schedule updated for ${formDayKey} Period ${formPeriod}.`);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // Quick state change (Mark Free, Break, Leave)
  const handleQuickStatusChange = (newType: SlotType) => {
    if (!selectedSlot) return;
    const { day, slot } = selectedSlot;

    setScheduleData((prev) =>
      prev.map((d) => {
        if (d.dayKey !== day.dayKey) return d;
        const updatedSlots = { ...d.slots };
        updatedSlots[slot.period] = {
          ...slot,
          type: newType,
          courseName: undefined,
          batchCode: undefined,
          roomNo: undefined,
        };
        return { ...d, slots: updatedSlots };
      })
    );

    setIsDetailsModalOpen(false);
    setNotificationMsg(`✓ Slot marked as ${newType}.`);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = "Day,Date,09-10 AM,10-11 AM,11-12 PM,12-01 PM,01-02 PM,02-03 PM,03-04 PM,04-05 PM\n";
    const rows = scheduleData
      .map((day) => {
        if (day.isHoliday) {
          return `"${day.dayName}","${day.dateStr}","HOLIDAY","HOLIDAY","HOLIDAY","HOLIDAY","HOLIDAY","HOLIDAY","HOLIDAY","HOLIDAY"`;
        }
        const slotsStr = TIME_SLOT_COLUMNS.map((col) => {
          const s = day.slots[col.period];
          if (!s) return "Not Assigned";
          if (s.type === "CLASS") return `${s.courseName} (${s.batchCode}) [${s.roomNo}]`;
          return s.type;
        }).join('","');
        return `"${day.dayName}","${day.dateStr}","${slotsStr}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Faculty_Timetable_Weekly.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 text-slate-800 font-sans w-full max-w-[1720px] mx-auto animate-in fade-in duration-200">
      {/* ─── 1. TOP ESSENTIAL ACTIONS (NO LARGE HEADING OR WEEK CARDS) ──── */}
      <div className="flex items-center justify-end gap-2.5">
        <Button
          variant="outline"
          onClick={handleExportCSV}
          className="text-xs font-bold h-9 px-4 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs rounded-xl cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" /> Export CSV
        </Button>
        <button
          className="relative p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
            6
          </span>
        </button>
        <button
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors cursor-pointer"
          title="Timetable Controls & Settings"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* ─── 2. COMPACT FILTER BAR ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Assigned Center Dropdown */}
          <div className="relative min-w-[190px]">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5B50EC]/30 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="Bangalore Center">🏢 {facultyCenterName}</option>
              <option value="Mysore Center">🏢 Mysore Center</option>
              <option value="Hubli Center">🏢 Hubli Center</option>
            </select>
          </div>

          {/* All Courses Dropdown */}
          <div className="relative min-w-[180px]">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5B50EC]/30 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">📚 All Courses</option>
              <option value="Java Programming">Java Programming</option>
              <option value="Advanced Java">Advanced Java</option>
              <option value="Python Basics">Python Basics</option>
              <option value="Database Systems">Database Systems</option>
              <option value="OOP Concepts">OOP Concepts</option>
              <option value="Data Structures">Data Structures</option>
              <option value="Mini Project">Mini Project</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search subjects or batch codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 bg-slate-50 border-slate-200 text-xs font-medium rounded-xl focus:ring-2 focus:ring-[#5B50EC]/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCourse("ALL");
              setSearchQuery("");
            }}
            className="text-xs font-bold h-10 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl shrink-0 gap-1.5 cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5" /> More Filters
          </Button>
        </div>
      </div>

      {/* ─── 3. STATUS LEGEND ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-5 px-1 py-1 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#4F46E5]" />
          <span>Class</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span>Free</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C]" />
          <span>Break</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" />
          <span>Lunch</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span>Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          <span>Not Assigned</span>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-bold shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* ─── 4. TIMETABLE MATRIX TABLE (DAYS AS ROWS × TIME SLOTS) ───────── */}
      <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[1240px] border-collapse text-left table-fixed">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider">
                {/* 1st Column: DAY / DATE (Sticky Left) */}
                <th className="py-3.5 px-4 w-[130px] border-r border-border sticky left-0 bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] text-foreground">
                  DAY / DATE
                </th>

                {/* 8 Time Slot Columns */}
                {TIME_SLOT_COLUMNS.map((col) => (
                  <th
                    key={col.period}
                    className="py-3 px-2 text-center w-[135px] border-r border-border last:border-r-0 font-bold text-foreground whitespace-nowrap"
                  >
                    <div className="text-[11px] font-bold text-foreground tracking-tight whitespace-nowrap">
                      {col.timeTitle}
                    </div>
                    <div className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                      {col.subTitle}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSchedule.map((day) => {
                // If this is a Holiday (e.g. Sunday)
                if (day.isHoliday) {
                  return (
                    <tr key={day.dayKey} className="bg-rose-50/40 hover:bg-rose-50/60 transition-colors">
                      {/* Day Column */}
                      <td className="py-3 px-4 border-r border-rose-200/60 align-middle bg-rose-50/40 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-rose-500 shrink-0" />
                          <div>
                            <div className="font-extrabold text-xs text-rose-900">{day.dayShort}</div>
                            <div className="text-[10px] font-semibold text-rose-700/80">{day.dateStr}</div>
                          </div>
                        </div>
                      </td>

                      {/* Full-width Holiday banner across all time slots */}
                      <td colSpan={8} className="py-3 px-4 text-center align-middle">
                        <div className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-rose-100/70 border border-rose-200 text-rose-700 text-xs font-black tracking-wider uppercase shadow-2xs">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{day.holidayTitle || "HOLIDAY"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={day.dayKey} className="hover:bg-slate-50/40 transition-colors">
                    {/* Day / Date Column (Sticky) */}
                    <td className="py-3 px-4 border-r border-slate-200/60 align-middle bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#5B50EC] shrink-0" />
                        <div>
                          <div className="font-extrabold text-xs text-slate-900">{day.dayShort}</div>
                          <div className="text-[10px] font-semibold text-slate-400">{day.dateStr}</div>
                        </div>
                      </div>
                    </td>

                    {/* 8 Time Slot Cells */}
                    {TIME_SLOT_COLUMNS.map((col) => {
                      const slot = day.slots[col.period] || {
                        id: `slot-${col.period}`,
                        period: col.period,
                        timeRange: col.label,
                        type: col.isBreak ? "BREAK" : col.isLunch ? "LUNCH" : "FREE",
                      };

                      // 1. CLASS CARD
                      if (slot.type === "CLASS") {
                        return (
                          <td key={col.period} className="p-1.5 border-r border-slate-200/60 last:border-r-0 align-middle">
                            <div
                              onClick={() => handleSlotClick(day, slot)}
                              className="h-[74px] p-2 rounded-xl border border-blue-200/80 bg-blue-50/40 hover:bg-blue-50/90 hover:border-blue-300 hover:shadow-xs transition-all text-left flex flex-col justify-between cursor-pointer group"
                            >
                              <div className="text-[11px] font-bold text-[#1E293B] group-hover:text-[#4F46E5] truncate">
                                {slot.courseName}
                              </div>
                              <div className="text-[10px] font-semibold text-slate-600 truncate">
                                {slot.batchCode}
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5 border-t border-blue-200/40">
                                <span className="truncate">{slot.roomNo}</span>
                                <span className="flex items-center gap-0.5 font-bold text-slate-700 shrink-0">
                                  <Users className="h-2.5 w-2.5 text-slate-400" />
                                  {slot.studentCount || 24}
                                </span>
                              </div>
                            </div>
                          </td>
                        );
                      }

                      // 2. FREE SLOT
                      if (slot.type === "FREE") {
                        return (
                          <td key={col.period} className="p-1.5 border-r border-slate-200/60 last:border-r-0 align-middle">
                            <div
                              onClick={() => !isFacultyUser && handleSlotClick(day, slot)}
                              className={`h-[74px] rounded-xl border border-emerald-200/70 bg-emerald-50/30 flex flex-col items-center justify-center text-center ${
                                isFacultyUser
                                  ? "cursor-default"
                                  : "hover:bg-emerald-100/50 hover:border-emerald-300 transition-all cursor-pointer group"
                              }`}
                            >
                              <span className="text-[11px] font-bold text-emerald-700 tracking-wide uppercase">FREE</span>
                              {!isFacultyUser && (
                                <span className="text-[10px] font-bold text-emerald-600 mt-0.5 flex items-center gap-0.5 opacity-90 group-hover:opacity-100">
                                  <Plus className="h-2.5 w-2.5" /> Add Class
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // 3. BREAK SLOT
                      if (slot.type === "BREAK") {
                        return (
                          <td key={col.period} className="p-1.5 border-r border-slate-200/60 last:border-r-0 align-middle">
                            <div
                              className="h-[74px] rounded-xl border border-amber-200/60 bg-amber-50/40 flex flex-col items-center justify-center text-[#C2410C] cursor-default"
                            >
                              <span className="text-[11px] font-bold tracking-wide uppercase">BREAK</span>
                              <Coffee className="h-3.5 w-3.5 mt-1 text-[#EA580C]" />
                            </div>
                          </td>
                        );
                      }

                      // 4. LUNCH SLOT
                      if (slot.type === "LUNCH") {
                        return (
                          <td key={col.period} className="p-1.5 border-r border-slate-200/60 last:border-r-0 align-middle">
                            <div
                              className="h-[74px] rounded-xl border border-yellow-200/60 bg-yellow-50/40 flex flex-col items-center justify-center text-[#B45309] cursor-default"
                            >
                              <span className="text-[11px] font-bold tracking-wide uppercase">LUNCH</span>
                              <UtensilsCrossed className="h-3.5 w-3.5 mt-1 text-[#D97706]" />
                            </div>
                          </td>
                        );
                      }

                      // 5. LEAVE SLOT
                      if (slot.type === "LEAVE") {
                        return (
                          <td key={col.period} className="p-1.5 border-r border-slate-200/60 last:border-r-0 align-middle">
                            <div
                              className="h-[74px] rounded-xl border border-rose-200/60 bg-rose-50/40 flex flex-col items-center justify-center text-rose-700 cursor-default"
                            >
                              <span className="text-[11px] font-bold tracking-wide uppercase">ON LEAVE</span>
                              <span className="text-[9px] text-rose-500 font-semibold mt-0.5">Off</span>
                            </div>
                          </td>
                        );
                      }

                      // 6. NOT ASSIGNED SLOT
                      return (
                        <td key={col.period} className="p-1.5 border-r border-slate-200/60 last:border-r-0 align-middle">
                          <div
                            onClick={() => !isFacultyUser && handleSlotClick(day, slot)}
                            className={`h-[74px] rounded-xl border border-slate-200/60 bg-slate-50/50 flex flex-col items-center justify-center text-center ${
                              isFacultyUser
                                ? "cursor-default"
                                : "hover:bg-slate-100/60 transition-colors cursor-pointer group"
                            }`}
                          >
                            <span className="text-[10px] font-medium text-slate-400">Not Assigned</span>
                            {!isFacultyUser && (
                              <span className="text-[9px] font-bold text-slate-400 mt-0.5 flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                                <Plus className="h-2.5 w-2.5" /> Add Class
                              </span>
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

        {/* ─── 5. TABLE PAGINATION & STATS BAR ───────────────────────────── */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span className="text-slate-600 font-medium">
            Showing 1 to {filteredSchedule.length} of {filteredSchedule.length} days
          </span>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Rows per page:</span>
            <select className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ─── 6. BOTTOM INFORMATION & ADD NEW CLASS BAR ──────────────────── */}
      {!isFacultyUser && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Info className="h-4 w-4 text-[#5B50EC] shrink-0" />
            <span>Click on any cell to view or edit the schedule.</span>
          </div>

          <Button
            onClick={() => {
              setFormDayKey("MON");
              setFormPeriod(1);
              setFormType("CLASS");
              setFormCourseName("Java Programming");
              setFormBatchCode("Batch C");
              setFormRoomNo("Room 301");
              setFormStudentCount(28);
              setIsEditModalOpen(true);
            }}
            className="text-xs font-bold h-10 px-5 bg-[#5B50EC] hover:bg-[#4F46E5] text-white rounded-xl gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add New Class
          </Button>
        </div>
      )}

      {/* ─── MODAL 1: CLASS DETAILS PANEL ───────────────────────────────── */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          {selectedSlot && (
            <>
              <DialogHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-[#5B50EC] border border-indigo-200 uppercase">
                    {selectedSlot.day.dayName} • {selectedSlot.slot.timeRange}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-900">
                  {selectedSlot.slot.courseName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  {selectedSlot.slot.batchCode} • {selectedSlot.slot.roomNo}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 my-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Classroom</span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedSlot.slot.roomNo || "Room 301"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Enrolled Students</span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      {selectedSlot.slot.studentCount || 28} Students
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Attendance Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                    {selectedSlot.slot.attendanceStatus || "PENDING"}
                  </span>
                </div>
              </div>

              {/* Quick Actions (Admin Only) */}
              {!isFacultyUser && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick Actions</span>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickStatusChange("FREE")}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 h-8 rounded-lg"
                    >
                      Mark Free
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickStatusChange("BREAK")}
                      className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 h-8 rounded-lg"
                    >
                      Mark Break
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickStatusChange("LEAVE")}
                      className="text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 h-8 rounded-lg"
                    >
                      Mark Leave
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="text-xs font-bold rounded-xl"
                >
                  Close
                </Button>
                {!isFacultyUser && (
                  <Button
                    onClick={handleOpenEditFromDetails}
                    className="bg-[#5B50EC] hover:bg-[#4F46E5] text-white text-xs font-bold rounded-xl gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Class Details
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: ADD / EDIT CLASS FORM ─────────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-black text-slate-900">
              Manage Class Schedule
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Configure course details, timings, classroom, or slot type for your timetable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            {/* Day & Period */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-slate-700">Day of Week</Label>
                <select
                  value={formDayKey}
                  onChange={(e) => setFormDayKey(e.target.value)}
                  className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                >
                  {scheduleData.filter((d) => !d.isHoliday).map((d) => (
                    <option key={d.dayKey} value={d.dayKey}>
                      {d.dayName} ({d.dateStr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700">Time Slot</Label>
                <select
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(Number(e.target.value))}
                  className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                >
                  {TIME_SLOT_COLUMNS.map((col) => (
                    <option key={col.period} value={col.period}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Slot Type */}
            <div>
              <Label className="text-[11px] font-bold text-slate-700">Slot Status</Label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as SlotType)}
                className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#5B50EC] outline-none"
              >
                <option value="CLASS">Class Scheduled</option>
                <option value="FREE">Free</option>
                <option value="BREAK">Break</option>
                <option value="LUNCH">Lunch</option>
                <option value="LEAVE">Leave</option>
                <option value="NOT_ASSIGNED">Not Assigned</option>
              </select>
            </div>

            {/* Class Details (If Class) */}
            {formType === "CLASS" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Course / Subject Name *</Label>
                    <Input
                      value={formCourseName}
                      onChange={(e) => setFormCourseName(e.target.value)}
                      placeholder="e.g. Java Programming"
                      className="h-9 mt-1 text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Batch Code *</Label>
                    <Input
                      value={formBatchCode}
                      onChange={(e) => setFormBatchCode(e.target.value)}
                      placeholder="e.g. Batch C"
                      className="h-9 mt-1 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Classroom / Lab *</Label>
                    <ClassroomDropdown value={formRoomNo} onChange={setFormRoomNo} />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Student Count</Label>
                    <Input
                      type="number"
                      value={formStudentCount}
                      onChange={(e) => setFormStudentCount(Number(e.target.value))}
                      className="h-9 mt-1 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-3">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="text-xs font-bold h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSlotForm}
              className="bg-[#5B50EC] hover:bg-[#4F46E5] text-white text-xs font-bold h-9 rounded-xl gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save Class Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
