import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Save,
  Edit3,
  Lock,
  Plus,
  MoreVertical,
  Coffee,
  UtensilsCrossed,
  Trash2,
  MoveHorizontal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  useClassSessions,
  useCreateClassSession,
  useUpdateClassSession,
  useDeleteClassSession,
} from "@/hooks/useClassSessions";
import type { BackendClassSession } from "@/services/class-sessions.api";

// ─── TYPES & SCHEDULE DATA STRUCTURES ──────────────────────────────────────

export type SlotType =
  | "CLASS"
  | "FREE"
  | "BREAK"
  | "LUNCH"
  | "MEETING"
  | "LEAVE"
  | "NOT_ASSIGNED";

export type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export interface TimetableCellItem {
  id: string;
  sessionId?: string;
  period: number;
  timeRange: string;
  type: SlotType;
  courseName?: string;
  batchCode?: string;
  batchId?: string;
  roomNo?: string;
  classroomMasterId?: string;
  studentCount?: number;
  category?: "Digital Marketing" | "Design" | "Data Analytics" | "Programming" | "Communication" | "Others";
  status?: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  attendanceStatus?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}

export interface FacultyRosterItem {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  specialization: string;
  branchId: string;
  branchName: string; // e.g. "Bangalore Center", "Mysore Center", "Hubli Center"
  avatar: string;
  liveStatus: "Available" | "In Class";
  // Schedule map: DayKey -> Period (1..8) -> TimetableCellItem
  weeklySchedule: Record<DayKey, Record<number, TimetableCellItem>>;
}

export interface WorkingDayConfig {
  key: DayKey;
  label: string;
  fullDay: string;
  dateStr: string;
  isWorking: boolean;
  statusType: "WORKING" | "HOLIDAY" | "CUSTOM";
  note?: string;
}

const TIME_SLOT_COLUMNS = [
  { period: 1, label: "09:00 - 10:00 AM", timeTitle: "09:00 – 10:00", subTitle: "AM", start: "09:00 AM", end: "10:00 AM" },
  { period: 2, label: "10:00 - 11:00 AM", timeTitle: "10:00 – 11:00", subTitle: "AM", start: "10:00 AM", end: "11:00 AM" },
  { period: 3, label: "11:00 - 12:00 PM", timeTitle: "11:00 – 12:00", subTitle: "PM", start: "11:00 AM", end: "12:00 PM" },
  { period: 4, label: "12:00 - 01:00 PM", timeTitle: "12:00 – 01:00", subTitle: "PM", start: "12:00 PM", end: "01:00 PM", isBreak: true },
  { period: 5, label: "01:00 - 02:00 PM", timeTitle: "01:00 – 02:00", subTitle: "PM", start: "01:00 PM", end: "02:00 PM", isLunch: true },
  { period: 6, label: "02:00 - 03:00 PM", timeTitle: "02:00 – 03:00", subTitle: "PM", start: "02:00 PM", end: "03:00 PM" },
  { period: 7, label: "03:00 - 04:00 PM", timeTitle: "03:00 – 04:00", subTitle: "PM", start: "03:00 PM", end: "04:00 PM" },
  { period: 8, label: "04:00 - 05:00 PM", timeTitle: "04:00 – 05:00", subTitle: "PM", start: "04:00 PM", end: "05:00 PM" },
];

const DAY_KEYS: DayKey[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const formatLocalDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const sessionDateKey = (scheduledDate: string | Date): string => {
  if (typeof scheduledDate === "string" && scheduledDate.length >= 10) {
    return scheduledDate.slice(0, 10);
  }
  return formatLocalDateKey(new Date(scheduledDate));
};

const parseTimeToHour24 = (time: string): number | null => {
  const trimmed = String(time).trim();
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hour = parseInt(ampm[1], 10) % 12;
    if (ampm[3].toUpperCase() === "PM") hour += 12;
    return hour;
  }
  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (hhmm) return parseInt(hhmm[1], 10);
  return null;
};

const periodFromStartTime = (startTime: string): number | null => {
  const hour = parseTimeToHour24(startTime);
  if (hour === null) return null;

  const hourToPeriod: Record<number, number> = {
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 6,
    15: 7,
    16: 8,
  };
  if (hourToPeriod[hour]) return hourToPeriod[hour];

  for (const col of TIME_SLOT_COLUMNS) {
    if (col.isBreak || col.isLunch) continue;
    const colHour = parseTimeToHour24(col.start);
    if (colHour === hour) return col.period;
  }
  return null;
};

const periodToTimes = (period: number): { start: string; end: string } => {
  const col = TIME_SLOT_COLUMNS.find((c) => c.period === period);
  return { start: col?.start || "09:00 AM", end: col?.end || "10:00 AM" };
};

const getWeekRange = (weekOffset: number) => {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const from = formatLocalDateKey(monday);
  const to = formatLocalDateKey(sunday);
  const startLabel = monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const endLabel = sunday.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return { from, to, monday, sunday, label: `${startLabel} – ${endLabel}` };
};

const buildDaysConfig = (monday: Date, overrides?: WorkingDayConfig[]): WorkingDayConfig[] => {
  const labels: Record<DayKey, { label: string; fullDay: string }> = {
    MON: { label: "MONDAY", fullDay: "Monday" },
    TUE: { label: "TUESDAY", fullDay: "Tuesday" },
    WED: { label: "WEDNESDAY", fullDay: "Wednesday" },
    THU: { label: "THURSDAY", fullDay: "Thursday" },
    FRI: { label: "FRIDAY", fullDay: "Friday" },
    SAT: { label: "SATURDAY", fullDay: "Saturday" },
    SUN: { label: "SUNDAY", fullDay: "Sunday" },
  };

  return DAY_KEYS.map((key, idx) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + idx);
    const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const override = overrides?.find((d) => d.key === key);
    const isSunday = key === "SUN";
    return {
      key,
      label: labels[key].label,
      fullDay: labels[key].fullDay,
      dateStr,
      isWorking: override?.isWorking ?? !isSunday,
      statusType: override?.statusType ?? (isSunday ? "HOLIDAY" : "WORKING"),
      note: override?.note ?? (isSunday ? "Holiday" : undefined),
    };
  });
};

// Helper to generate a default day schedule for a faculty
const createDefaultDaySlots = (
  customSlots?: Partial<Record<number, Partial<TimetableCellItem>>>
): Record<number, TimetableCellItem> => {
  const slots: Record<number, TimetableCellItem> = {};
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

  if (customSlots) {
    Object.entries(customSlots).forEach(([periodStr, override]) => {
      const p = Number(periodStr);
      if (slots[p] && override) {
        slots[p] = { ...slots[p], ...override } as TimetableCellItem;
      }
    });
  }
  return slots;
};

import { useFacultyList } from "@/hooks/useFaculty";
import { useBatches } from "@/hooks/useBatches";
import { useBranches } from "@/hooks/useBranches";
import { useCourses } from "@/hooks/useCourses";
import {
  batchIncludesFaculty,
  formatBatchSubjectNames,
  getBatchCourseRows,
  getCourseNameInBatch,
  getFacultyForCourseInBatch,
  getSessionSubjectLabel,
} from "@/utils/batch.utils";

export const Timetable: React.FC = () => {
  const { user } = useAuthStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const facultyMembers = facultyResponse?.data ?? [];
  const { batches } = useBatches();
  const { courses: allCourses } = useCourses();

  const createSession = useCreateClassSession();
  const updateSession = useUpdateClassSession();
  const deleteSession = useDeleteClassSession();

  // Role detection
  const userRoles = user?.roles || (user?.role ? [user.role] : ["ADMIN"]);
  const isAdmin = userRoles.includes("ADMIN");
  const isCenterManager = userRoles.includes("CENTER_MANAGER") && !isAdmin;

  // Determine Assigned Center
  const userCenterId = useMemo(() => {
    if (isAdmin) return "ALL";
    return user?.branchId || branches[0]?.id || "ALL";
  }, [isAdmin, user?.branchId, branches]);

  const userCenterName = useMemo(() => {
    if (userCenterId === "ALL") return "All Branches";
    const found = branches.find((b: { id: string }) => b.id === userCenterId);
    return found?.name || "Assigned Center";
  }, [userCenterId, branches]);

  const [showFilters, setShowFilters] = useState(false);

  // Selected Day & Week Navigation
  const [selectedDayKey, setSelectedDayKey] = useState<DayKey>("MON");
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>(isAdmin ? "ALL" : userCenterId);
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const branchLabel = useMemo(() => {
    if (isAdmin && selectedBranch === "ALL") return "All branches";
    if (isAdmin && selectedBranch !== "ALL") {
      const found = branches.find((b: { id: string }) => b.id === selectedBranch);
      return found?.name || userCenterName;
    }
    return userCenterName;
  }, [isAdmin, selectedBranch, userCenterName, branches]);

  const sessionQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      startDate: weekRange.from,
      endDate: weekRange.to,
      limit: 500,
    };
    if (isAdmin && selectedBranch !== "ALL") {
      params.branchId = selectedBranch;
    } else if (!isAdmin && userCenterId !== "ALL") {
      params.branchId = userCenterId;
    }
    return params;
  }, [weekRange.from, weekRange.to, isAdmin, selectedBranch, userCenterId]);

  const { data: sessionsResponse, isLoading: sessionsLoading } = useClassSessions(sessionQueryParams);
  const classSessions = sessionsResponse?.data ?? [];

  // Working Days Configuration (UI-only holiday toggles)
  const [workingDayOverrides, setWorkingDayOverrides] = useState<WorkingDayConfig[]>([]);
  const [isWorkingDaysModalOpen, setIsWorkingDaysModalOpen] = useState(false);

  const daysConfig = useMemo(
    () => buildDaysConfig(weekRange.monday, workingDayOverrides),
    [weekRange.monday, workingDayOverrides]
  );

  const mapSessionToCell = (raw: BackendClassSession, period: number): TimetableCellItem => {
    const col = TIME_SLOT_COLUMNS.find((c) => c.period === period);
    return {
      id: raw.id,
      sessionId: raw.id,
      period,
      timeRange: col?.label || `${raw.startTime} – ${raw.endTime}`,
      type: "CLASS",
      courseName: getSessionSubjectLabel({ title: raw.title, batch: raw.batch }),
      batchCode: raw.batch?.code || raw.batch?.name || "",
      batchId: raw.batchId,
      roomNo: raw.roomNo || "TBD",
      classroomMasterId: raw.classroomMasterId || undefined,
      studentCount: raw.enrolledStudentsCount ?? (raw.batch as { _count?: { enrollments?: number } })?._count?.enrollments,
      status:
        raw.sessionStatus === "COMPLETED"
          ? "COMPLETED"
          : raw.sessionStatus === "LIVE"
          ? "ONGOING"
          : raw.sessionStatus === "CANCELLED"
          ? "CANCELLED"
          : "UPCOMING",
      attendanceStatus:
        raw.sessionStatus === "COMPLETED"
          ? "COMPLETED"
          : raw.sessionStatus === "LIVE"
          ? "IN_PROGRESS"
          : "PENDING",
    };
  };

  const facultyRoster = useMemo((): FacultyRosterItem[] => {
    const facultyById = new Map(facultyMembers.map((f) => [f.id, f]));

    classSessions.forEach((raw: BackendClassSession) => {
      if (raw.facultyId && raw.faculty && !facultyById.has(raw.facultyId)) {
        facultyById.set(raw.facultyId, {
          id: raw.faculty.id,
          employeeCode: raw.faculty.employeeCode,
          branchId: raw.branchId,
          specialization: "Instruction",
          user: raw.faculty.user,
          branch: undefined,
        } as (typeof facultyMembers)[0]);
      }
    });

    return Array.from(facultyById.values()).map((f, fIdx) => {
      const weeklySchedule = {} as Record<DayKey, Record<number, TimetableCellItem>>;

      DAY_KEYS.forEach((dayKey, idx) => {
        const date = new Date(weekRange.monday);
        date.setDate(weekRange.monday.getDate() + idx);
        const dayKeyStr = formatLocalDateKey(date);
        const slots = createDefaultDaySlots();

        classSessions.forEach((raw: BackendClassSession) => {
          if (raw.facultyId !== f.id) return;
          if (sessionDateKey(raw.scheduledDate) !== dayKeyStr) return;

          const period = periodFromStartTime(raw.startTime);
          if (!period) return;
          slots[period] = mapSessionToCell(raw, period);
        });

        weeklySchedule[dayKey] = slots;
      });

      return {
        id: f.id,
        name: f.user?.name || `Faculty Member ${fIdx + 1}`,
        employeeCode: f.employeeCode || `FA-00${fIdx + 1}`,
        department: f.specialization || "Instruction",
        specialization: f.specialization || "Technical Instructor",
        branchId: f.branchId || branches[0]?.id || "",
        branchName: f.branch?.name || branches.find((b: { id: string }) => b.id === f.branchId)?.name || "—",
        avatar: "",
        liveStatus: "Available" as const,
        weeklySchedule,
      };
    });
  }, [facultyMembers, classSessions, weekRange.monday, branches]);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Add / Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalFacultyId, setModalFacultyId] = useState<string>("");
  const [modalDayKey, setModalDayKey] = useState<DayKey>("MON");
  const [modalPeriod, setModalPeriod] = useState<number>(1);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalBatchId, setModalBatchId] = useState<string>("");
  const [modalSubjectCourseId, setModalSubjectCourseId] = useState<string>("");
  const [modalClassroomMasterId, setModalClassroomMasterId] = useState<string>("");
  const [modalSlotType, setModalSlotType] = useState<SlotType>("CLASS");

  // Move Slot Modal State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveSource, setMoveSource] = useState<{ facultyId: string; dayKey: DayKey; period: number } | null>(null);
  const [targetPeriod, setTargetPeriod] = useState<number>(1);

  // Keep branch filter locked for non-admins
  useEffect(() => {
    if (!isAdmin) {
      setSelectedBranch(userCenterId);
    }
  }, [isAdmin, userCenterId]);

  // Week Date Label
  const weekDateLabel = weekRange.label;

  const getDateForDayKey = (dayKey: DayKey): string => {
    const idx = DAY_KEYS.indexOf(dayKey);
    const date = new Date(weekRange.monday);
    date.setDate(weekRange.monday.getDate() + idx);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const facultyBatches = useMemo(() => {
    if (!modalFacultyId) return batches;
    return batches.filter((b) => batchIncludesFaculty(b, modalFacultyId));
  }, [batches, modalFacultyId]);

  const modalBatch = useMemo(
    () => batches.find((b) => b.id === modalBatchId),
    [batches, modalBatchId]
  );

  const modalSubjectOptions = useMemo(() => {
    if (!modalBatch || !modalFacultyId) return getBatchCourseRows(modalBatch ?? { courseId: "" });
    return getBatchCourseRows(modalBatch).filter(
      (row) => row.facultyId === modalFacultyId || row.faculty?.id === modalFacultyId
    );
  }, [modalBatch, modalFacultyId]);

  useEffect(() => {
    if (!modalBatchId) {
      setModalSubjectCourseId("");
      return;
    }
    const options = modalSubjectOptions;
    if (options.length === 1) {
      setModalSubjectCourseId(options[0].courseId);
    } else if (!options.some((o) => o.courseId === modalSubjectCourseId)) {
      setModalSubjectCourseId(options[0]?.courseId || "");
    }
  }, [modalBatchId, modalSubjectOptions, modalSubjectCourseId]);

  // Current Selected Day Config
  const currentDayConfig = useMemo(() => {
    return daysConfig.find((d) => d.key === selectedDayKey) || daysConfig[0];
  }, [daysConfig, selectedDayKey]);

  // Filtered Faculty Roster according to role & UI filters
  const filteredFaculty = useMemo(() => {
    return facultyRoster.filter((fac) => {
      // 1. Role Branch Isolation
      if (isAdmin) {
        if (selectedBranch !== "ALL" && fac.branchId !== selectedBranch) return false;
      } else {
        if (fac.branchId !== userCenterId) return false;
      }

      // 2. Course Filter
      if (selectedCourse !== "ALL") {
        const daySchedule = fac.weeklySchedule[selectedDayKey] || {};
        const matchesCourse = Object.values(daySchedule).some(
          (s) => s.type === "CLASS" && (s.courseName === selectedCourse || s.category === selectedCourse)
        );
        if (!matchesCourse) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = fac.name.toLowerCase().includes(q);
        const matchCode = fac.employeeCode.toLowerCase().includes(q);
        const matchDept = fac.department.toLowerCase().includes(q);
        const matchBranch = fac.branchName.toLowerCase().includes(q);
        const daySchedule = fac.weeklySchedule[selectedDayKey] || {};
        const matchSlot = Object.values(daySchedule).some(
          (s) => s.type === "CLASS" && (
            (s.courseName && s.courseName.toLowerCase().includes(q)) ||
            (s.batchCode && s.batchCode.toLowerCase().includes(q)) ||
            (s.roomNo && s.roomNo.toLowerCase().includes(q))
          )
        );
        if (!matchName && !matchCode && !matchDept && !matchBranch && !matchSlot) return false;
      }

      return true;
    });
  }, [facultyRoster, isAdmin, selectedBranch, userCenterId, selectedCourse, selectedDayKey, searchQuery]);

  // Pagination Slice
  const totalFacultyCount = filteredFaculty.length;
  const totalPages = Math.ceil(totalFacultyCount / rowsPerPage) || 1;
  const paginatedFaculty = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredFaculty.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredFaculty, currentPage, rowsPerPage]);

  // Calculate Class Counts per Day for Top Day Cards
  const dayClassCounts = useMemo(() => {
    const counts: Record<DayKey, number> = { MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0, SAT: 0, SUN: 0 };
    facultyRoster.forEach((fac) => {
      // Respect branch scope for counts
      if (!isAdmin && fac.branchId !== userCenterId) return;
      if (isAdmin && selectedBranch !== "ALL" && fac.branchId !== selectedBranch) return;

      Object.entries(fac.weeklySchedule).forEach(([day, slots]) => {
        Object.values(slots).forEach((s) => {
          if (s.type === "CLASS") {
            counts[day as DayKey] = (counts[day as DayKey] || 0) + 1;
          }
        });
      });
    });
    return counts;
  }, [facultyRoster, isAdmin, selectedBranch, userCenterId]);

  // ─── ACTIONS: OPEN ADD/EDIT MODAL ──────────────────────────────────────────

  const handleOpenAddOrEditModal = (
    facultyId: string,
    dayKey: DayKey,
    period: number,
    existingSlot?: TimetableCellItem
  ) => {
    const fac = facultyRoster.find((f) => f.id === facultyId);
    if (!fac) return;

    setModalFacultyId(facultyId);
    setModalDayKey(dayKey);
    setModalPeriod(period);

    if (existingSlot && existingSlot.type === "CLASS") {
      setModalSlotType("CLASS");
      setModalSessionId(existingSlot.sessionId || existingSlot.id);
      setModalTitle(existingSlot.courseName || "");
      setModalBatchId(existingSlot.batchId || "");
      setModalClassroomMasterId(existingSlot.classroomMasterId || "");
    } else if (existingSlot) {
      setModalSlotType(existingSlot.type);
      setModalSessionId(null);
      setModalTitle("");
      setModalBatchId("");
      setModalClassroomMasterId("");
    } else {
      setModalSlotType("CLASS");
      setModalSessionId(null);
      setModalTitle("");
      setModalBatchId("");
      setModalClassroomMasterId("");
    }

    setIsEditModalOpen(true);
  };

  const handleSaveSlot = async () => {
    if (!modalFacultyId) return;

    if (modalSlotType !== "CLASS") {
      if (modalSessionId) {
        try {
          await deleteSession.mutateAsync(modalSessionId);
          setNotificationMsg(`✓ Class removed from ${modalDayKey} Period ${modalPeriod}.`);
        } catch {
          setNotificationMsg("Failed to update slot. Please try again.");
        }
      }
      setIsEditModalOpen(false);
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    const fac = facultyMembers.find((f: { id: string; branchId?: string }) => f.id === modalFacultyId);
    const batch = batches.find((b) => b.id === modalBatchId);

    if (!fac) {
      setNotificationMsg("Please select a faculty instructor.");
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }
    if (!batch) {
      setNotificationMsg("Please select a valid batch.");
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    const subjectCourseId =
      modalSubjectCourseId || modalSubjectOptions[0]?.courseId || batch.courseId;
    if (!subjectCourseId) {
      setNotificationMsg("Select a subject for this class session.");
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    const subjectFaculty = getFacultyForCourseInBatch(batch, subjectCourseId);
    const sessionFacultyId = subjectFaculty?.id || fac.id;
    const subjectName = getCourseNameInBatch(batch, subjectCourseId) || batch.name;

    const { start, end } = periodToTimes(modalPeriod);
    const payload = {
      title: modalTitle || subjectName || batch.name || "Class Session",
      batchId: batch.id,
      facultyId: sessionFacultyId,
      branchId: fac.branchId || batch.branchId,
      scheduledDate: getDateForDayKey(modalDayKey),
      startTime: start,
      endTime: end,
      classroomMasterId: modalClassroomMasterId || undefined,
      mode: "OFFLINE" as const,
    };

    try {
      if (modalSessionId) {
        await updateSession.mutateAsync({ id: modalSessionId, payload });
        setNotificationMsg(`✓ Schedule updated for ${modalDayKey} Period ${modalPeriod}.`);
      } else {
        await createSession.mutateAsync(payload);
        setNotificationMsg(`✓ Class scheduled for ${modalDayKey} Period ${modalPeriod}.`);
      }
      setIsEditModalOpen(false);
    } catch {
      setNotificationMsg("Failed to save class session. Please check the form and try again.");
    }
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleDeleteSlot = async (facultyId: string, dayKey: DayKey, period: number) => {
    const fac = facultyRoster.find((f) => f.id === facultyId);
    const cell = fac?.weeklySchedule[dayKey]?.[period];
    if (!cell?.sessionId) {
      setNotificationMsg("No class session to remove for this slot.");
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    try {
      await deleteSession.mutateAsync(cell.sessionId);
      setNotificationMsg(`✓ Schedule deleted for period ${period}. Slot is now Free.`);
    } catch {
      setNotificationMsg("Failed to delete class session. Please try again.");
    }
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleOpenMoveModal = (facultyId: string, dayKey: DayKey, period: number) => {
    setMoveSource({ facultyId, dayKey, period });
    setTargetPeriod(period === 8 ? 1 : period + 1);
    setIsMoveModalOpen(true);
  };

  const handleExecuteMoveSlot = async () => {
    if (!moveSource) return;
    const { facultyId, dayKey, period } = moveSource;
    const fac = facultyRoster.find((f) => f.id === facultyId);
    const sourceSlot = fac?.weeklySchedule[dayKey]?.[period];

    if (!sourceSlot?.sessionId) {
      setNotificationMsg("No class session found to move.");
      setTimeout(() => setNotificationMsg(null), 3000);
      setIsMoveModalOpen(false);
      return;
    }

    const { start, end } = periodToTimes(targetPeriod);

    try {
      await updateSession.mutateAsync({
        id: sourceSlot.sessionId,
        payload: {
          startTime: start,
          endTime: end,
          scheduledDate: getDateForDayKey(dayKey),
        },
      });
      setNotificationMsg(`✓ Class moved from Period ${period} to Period ${targetPeriod}.`);
    } catch {
      setNotificationMsg("Failed to move class session. Please try again.");
    }

    setIsMoveModalOpen(false);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = "Faculty,Employee Code,Department,Center,Day,09-10 AM,10-11 AM,11-12 PM,12-01 PM,01-02 PM,02-03 PM,03-04 PM,04-05 PM\n";
    const rows = filteredFaculty
      .map((fac) => {
        const daySlots = fac.weeklySchedule[selectedDayKey] || {};
        const slotValues = TIME_SLOT_COLUMNS.map((col) => {
          const s = daySlots[col.period];
          if (!s) return "Not Assigned";
          if (s.type === "CLASS") return `${s.courseName} (${s.batchCode}) [${s.roomNo}]`;
          return s.type;
        });
        return `"${fac.name}","${fac.employeeCode}","${fac.department}","${fac.branchName}","${selectedDayKey}",${slotValues.map((v) => `"${v}"`).join(",")}`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Aadya_Timetable_${selectedDayKey}_${weekDateLabel.replace(/[^A-Za-z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 text-slate-800 font-sans w-full max-w-[1720px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Timetable</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {branchLabel} · {weekDateLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const defaultFac = filteredFaculty[0] || facultyRoster[0];
              if (defaultFac) handleOpenAddOrEditModal(defaultFac.id, selectedDayKey, 1);
            }}
            className="text-xs h-9 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add class
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Single toolbar: week nav, view, day, search */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setWeekOffset((p) => p - 1)}
              className="p-1.5 rounded-md hover:bg-slate-200/60 text-slate-600"
              title="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-700 whitespace-nowrap">{weekDateLabel}</span>
            <button
              type="button"
              onClick={() => setWeekOffset((p) => p + 1)}
              className="p-1.5 rounded-md hover:bg-slate-200/60 text-slate-600"
              title="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search faculty or batch..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 pl-8 text-xs rounded-lg border-slate-200"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="text-xs h-9 gap-1.5 shrink-0"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            {isAdmin ? (
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50"
              >
                <option value="ALL">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-600 flex items-center gap-1 px-2">
                <Lock className="h-3 w-3" /> {userCenterName}
              </span>
            )}
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50"
            >
              <option value="ALL">All courses</option>
              {allCourses.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isAdmin) setSelectedBranch("ALL");
                setSelectedCourse("ALL");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="text-xs h-9 text-slate-500"
            >
              Clear filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsWorkingDaysModalOpen(true)}
              className="text-xs h-9 text-slate-600 ml-auto"
            >
              <Calendar className="h-3.5 w-3.5 mr-1" /> Working days
            </Button>
          </div>
        )}

        {/* Compact day picker */}
        <div className="flex flex-wrap gap-1.5">
          {daysConfig.map((d) => {
            const isSelected = selectedDayKey === d.key;
            const classCount = dayClassCounts[d.key] || 0;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setSelectedDayKey(d.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isSelected
                    ? "bg-[#1769AA] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {d.fullDay.slice(0, 3)}
                {!d.isWorking ? " · Off" : classCount > 0 ? ` · ${classCount}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications Alert */}
      {notificationMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notificationMsg}
        </div>
      )}

      {/* Timetable grid */}
      <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{currentDayConfig.fullDay}</strong>
            {" · "}{totalFacultyCount} faculty
          </span>
          <span className="hidden sm:inline">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1" /> Class
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mx-1 ml-3" /> Free
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mx-1 ml-3" /> Break
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[980px] border-collapse text-left table-fixed">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider">
                <th className="py-2 px-3 pl-4 w-[160px] border-r border-border sticky left-0 bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] text-foreground">
                  FACULTY <span className="text-[9px] font-normal text-muted-foreground">({totalFacultyCount})</span>
                </th>
                <th className="py-2 px-1.5 text-center w-[72px] border-r border-border font-bold text-foreground sticky left-[160px] bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                  BRANCH
                </th>
                {TIME_SLOT_COLUMNS.map((col) => (
                  <th
                    key={col.period}
                    className="py-2 px-1 text-center w-[96px] border-r border-border last:border-r-0 font-bold text-foreground whitespace-nowrap"
                  >
                    <div className="text-[10px] font-bold text-foreground tracking-tight whitespace-nowrap">
                      {col.timeTitle}
                    </div>
                    <div className="text-[8px] text-muted-foreground font-semibold tracking-wider uppercase">
                      {col.subTitle}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border bg-card">
              {sessionsLoading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-muted-foreground text-sm font-medium">
                    Loading timetable sessions...
                  </td>
                </tr>
              ) : paginatedFaculty.length > 0 ? (
                paginatedFaculty.map((fac) => {
                  const daySlots = fac.weeklySchedule[selectedDayKey] || {};

                  return (
                    <tr key={fac.id} className="hover:bg-muted/40 transition-colors">
                      {/* Column 1: Faculty Card (Sticky) */}
                      <td className="py-1.5 px-3 pl-4 border-r border-border align-middle bg-card sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7 border border-border shrink-0">
                            <AvatarImage src={fac.avatar} alt={fac.name} />
                            <AvatarFallback className="bg-gradient-to-br from-[#1769AA] to-indigo-600 text-white font-bold text-[10px]">
                              {fac.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground text-[11px] truncate leading-tight">{fac.name}</h4>
                            <p className="text-[9px] text-muted-foreground truncate leading-tight">{fac.department}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`h-1 w-1 rounded-full shrink-0 ${
                                fac.liveStatus === "Available" ? "bg-emerald-500" : "bg-blue-600"
                              }`} />
                              <span className={`text-[8px] font-medium ${
                                fac.liveStatus === "Available" ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                              }`}>
                                {fac.liveStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Branch Location (Sticky) */}
                      <td className="py-1.5 px-1 text-center border-r border-border align-middle bg-card sticky left-[160px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                        <span className="text-[10px] font-semibold text-primary dark:text-blue-400 block truncate leading-tight">
                          {fac.branchName.split(" ")[0]}
                        </span>
                      </td>

                      {/* Columns 3..10: Time Slots */}
                      {TIME_SLOT_COLUMNS.map((col) => {
                        const cell = daySlots[col.period] || {
                          id: `slot-free-${col.period}`,
                          period: col.period,
                          timeRange: col.label,
                          type: col.isBreak ? "BREAK" : col.isLunch ? "LUNCH" : "FREE",
                        };

                        // 1. CLASS SLOT
                        if (cell.type === "CLASS") {
                          return (
                            <td key={col.period} className="p-1 border-r border-border last:border-r-0 align-middle">
                              <div className="h-[52px] px-1.5 py-1 rounded-md border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all text-left flex flex-col justify-between group">
                                <div className="flex items-center justify-between gap-0.5">
                                  <span className="text-[9px] font-semibold text-blue-900 dark:text-blue-200 truncate block leading-tight">
                                    {cell.courseName}
                                  </span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="p-0.5 hover:bg-blue-500/20 rounded text-blue-600 dark:text-blue-400 transition-opacity cursor-pointer shrink-0">
                                        <MoreVertical className="h-2.5 w-2.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 rounded-lg bg-popover border border-border shadow-xl p-1 text-xs">
                                      <DropdownMenuItem
                                        onClick={() => handleOpenAddOrEditModal(fac.id, selectedDayKey, col.period, cell)}
                                        className="gap-2 cursor-pointer text-xs py-1.5"
                                      >
                                        <Edit3 className="h-3 w-3 text-blue-500" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleOpenMoveModal(fac.id, selectedDayKey, col.period)}
                                        className="gap-2 cursor-pointer text-xs py-1.5"
                                      >
                                        <MoveHorizontal className="h-3 w-3 text-indigo-400" /> Move
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="bg-border" />
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteSlot(fac.id, selectedDayKey, col.period)}
                                        className="gap-2 text-rose-500 cursor-pointer text-xs py-1.5"
                                      >
                                        <Trash2 className="h-3 w-3" /> Remove
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="text-[8px] font-medium text-foreground/90 truncate leading-tight">
                                  {cell.batchCode}
                                </div>
                                <div className="flex items-center justify-between text-[8px] text-muted-foreground leading-tight">
                                  <span className="truncate">{cell.roomNo}</span>
                                  <span className="flex items-center gap-0.5 shrink-0">
                                    <Users className="h-2 w-2 text-muted-foreground" />
                                    {cell.studentCount || 20}
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        // 2. FREE SLOT
                        if (cell.type === "FREE") {
                          return (
                            <td key={col.period} className="p-1 border-r border-border last:border-r-0 align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenAddOrEditModal(fac.id, selectedDayKey, col.period, cell)}
                                className="h-[52px] w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all flex flex-col items-center justify-center cursor-pointer group"
                              >
                                <span className="text-[8px] font-semibold text-emerald-600 dark:text-emerald-300 uppercase">Free</span>
                                <span className="mt-0.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 group-hover:bg-emerald-500/25">
                                  <Plus className="h-2 w-2" /> Add
                                </span>
                              </button>
                            </td>
                          );
                        }

                        // 3. BREAK SLOT
                        if (cell.type === "BREAK") {
                          return (
                            <td key={col.period} className="p-1 border-r border-border last:border-r-0 align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenAddOrEditModal(fac.id, selectedDayKey, col.period, cell)}
                                className="h-[52px] w-full rounded-md border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex flex-col items-center justify-center cursor-pointer text-amber-600 dark:text-amber-300"
                              >
                                <span className="text-[8px] font-semibold uppercase">Break</span>
                                <Coffee className="h-2.5 w-2.5 mt-0.5 text-amber-500 dark:text-amber-400" />
                              </button>
                            </td>
                          );
                        }

                        // 4. LUNCH SLOT
                        if (cell.type === "LUNCH") {
                          return (
                            <td key={col.period} className="p-1 border-r border-border last:border-r-0 align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenAddOrEditModal(fac.id, selectedDayKey, col.period, cell)}
                                className="h-[52px] w-full rounded-md border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-colors flex flex-col items-center justify-center cursor-pointer text-orange-600 dark:text-orange-300"
                              >
                                <span className="text-[8px] font-semibold uppercase">Lunch</span>
                                <UtensilsCrossed className="h-2.5 w-2.5 mt-0.5 text-orange-500 dark:text-orange-400" />
                              </button>
                            </td>
                          );
                        }

                        // 5. LEAVE SLOT
                        if (cell.type === "LEAVE") {
                          return (
                            <td key={col.period} className="p-1 border-r border-border last:border-r-0 align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenAddOrEditModal(fac.id, selectedDayKey, col.period, cell)}
                                className="h-[52px] w-full rounded-md border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex flex-col items-center justify-center cursor-pointer text-rose-600 dark:text-rose-300"
                              >
                                <span className="text-[8px] font-semibold uppercase">Leave</span>
                                <span className="text-[7px] text-rose-500 dark:text-rose-400 mt-0.5">Off</span>
                              </button>
                            </td>
                          );
                        }

                        // 6. MEETING SLOT
                        if (cell.type === "MEETING") {
                          return (
                            <td key={col.period} className="p-1 border-r border-border last:border-r-0 align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenAddOrEditModal(fac.id, selectedDayKey, col.period, cell)}
                                className="h-[52px] w-full rounded-md border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors flex flex-col items-center justify-center cursor-pointer text-purple-600 dark:text-purple-300"
                              >
                                <span className="text-[8px] font-semibold uppercase">Meeting</span>
                                <span className="text-[7px] text-purple-500 dark:text-purple-400 mt-0.5">Sync</span>
                              </button>
                            </td>
                          );
                        }

                        // 7. NOT ASSIGNED SLOT
                        return (
                          <td key={col.period} className="p-1 border-r border-border last:border-r-0 align-middle">
                            <button
                              type="button"
                              onClick={() => handleOpenAddOrEditModal(fac.id, selectedDayKey, col.period, cell)}
                              className="h-[52px] w-full rounded-md border border-border bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center cursor-pointer group"
                            >
                              <span className="text-[8px] font-medium text-muted-foreground">Empty</span>
                              <span className="mt-0.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-medium text-muted-foreground bg-muted/40 group-hover:bg-muted/60">
                                <Plus className="h-2 w-2" /> Add
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-muted-foreground text-sm font-medium">
                    No faculty found matching the selected branch/filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {filteredFaculty.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}–
            {Math.min(currentPage * rowsPerPage, totalFacultyCount)} of {totalFacultyCount}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-foreground font-medium">Page {currentPage} / {totalPages}</span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── MODAL 1: ADD / EDIT CLASS SCHEDULE ─────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-[#1769AA] border border-blue-200 uppercase">
                {modalDayKey} • Period {modalPeriod} ({TIME_SLOT_COLUMNS.find((c) => c.period === modalPeriod)?.label})
              </span>
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">
              Manage Faculty Schedule
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Create, edit, or configure status for the selected faculty timetable slot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            {/* Faculty Selection */}
            <div>
              <Label className="text-[11px] font-bold text-slate-700">Faculty Instructor *</Label>
              <select
                value={modalFacultyId}
                onChange={(e) => setModalFacultyId(e.target.value)}
                className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
              >
                {facultyRoster.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.department}) – {f.branchName}
                  </option>
                ))}
              </select>
            </div>

            {/* Day & Slot Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-slate-700">Day of Week</Label>
                <select
                  value={modalDayKey}
                  onChange={(e) => setModalDayKey(e.target.value as DayKey)}
                  className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                >
                  {daysConfig.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.fullDay} ({d.dateStr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700">Slot Status *</Label>
                <select
                  value={modalSlotType}
                  onChange={(e) => setModalSlotType(e.target.value as SlotType)}
                  className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#1769AA] outline-none"
                >
                  <option value="CLASS">Class Scheduled</option>
                  <option value="FREE">Free</option>
                  <option value="BREAK">Break</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="MEETING">Meeting</option>
                  <option value="LEAVE">Leave</option>
                  <option value="NOT_ASSIGNED">Not Assigned</option>
                </select>
              </div>
            </div>

            {/* Course & Batch (If Class) */}
            {modalSlotType === "CLASS" && (
              <>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Session Title</Label>
                  <Input
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    placeholder="e.g. Module topic or class title"
                    className="h-9 mt-1 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Batch *</Label>
                  <select
                    value={modalBatchId}
                    onChange={(e) => setModalBatchId(e.target.value)}
                    className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                  >
                    <option value="">Select batch</option>
                    {facultyBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.code} — {batch.name}
                        {` (${formatBatchSubjectNames(batch)})`}
                      </option>
                    ))}
                  </select>
                </div>

                {modalBatch && modalSubjectOptions.length > 0 && (
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Subject *</Label>
                    <select
                      value={modalSubjectCourseId}
                      onChange={(e) => setModalSubjectCourseId(e.target.value)}
                      className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                    >
                      {modalSubjectOptions.map((row) => (
                        <option key={row.courseId} value={row.courseId}>
                          {row.course?.name || "Subject"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Classroom / Lab</Label>
                  <ClassroomDropdown value={modalClassroomMasterId} onChange={setModalClassroomMasterId} />
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
              onClick={handleSaveSlot}
              disabled={createSession.isPending || updateSession.isPending}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold h-9 rounded-xl"
            >
              <Save className="h-3.5 w-3.5 mr-1" /> Save Schedule Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: MOVE TIME SLOT ────────────────────────────────────── */}
      <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Move Class Time Slot
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Select a new time slot to relocate this scheduled session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-3 text-xs">
            <div>
              <Label className="text-[11px] font-bold text-slate-700">Target Time Slot</Label>
              <select
                value={targetPeriod}
                onChange={(e) => setTargetPeriod(Number(e.target.value))}
                className="w-full h-10 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#1769AA] outline-none"
              >
                {TIME_SLOT_COLUMNS.map((col) => (
                  <option key={col.period} value={col.period}>
                    Period {col.period} ({col.label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsMoveModalOpen(false)} className="text-xs font-bold rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleExecuteMoveSlot} className="bg-[#1769AA] text-white text-xs font-bold rounded-xl">
              Confirm Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: MANAGE WORKING DAYS & HOLIDAYS ───────────────────── */}
      <Dialog open={isWorkingDaysModalOpen} onOpenChange={setIsWorkingDaysModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white rounded-3xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-[#1769AA] border border-blue-200 uppercase">
                Academy Schedule Config
              </span>
            </div>
            <DialogTitle className="text-xl font-black text-slate-900 mt-1">
              Manage Working Days & Holidays
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Configure working days, Sunday class operations, and holidays for your center.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
            {daysConfig.map((d) => (
              <div key={d.key} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{d.fullDay}</span>
                    <span className="text-[11px] text-slate-400 font-medium">({d.dateStr})</span>
                  </div>
                  <span className={`text-[10px] font-semibold block mt-0.5 ${d.isWorking ? "text-emerald-700" : "text-rose-600"}`}>
                    {d.isWorking ? "● Scheduled Working Day" : `● ${d.note || "Holiday / Off"}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {d.key === "SUN" ? (
                    <select
                      value={d.statusType}
                      onChange={(e) => {
                        const val = e.target.value as "WORKING" | "HOLIDAY" | "CUSTOM";
                        setWorkingDayOverrides((prev) => {
                          const base = buildDaysConfig(weekRange.monday, prev);
                          return base.map((item) =>
                            item.key === "SUN"
                              ? {
                                  ...item,
                                  statusType: val,
                                  isWorking: val !== "HOLIDAY",
                                  note: val === "HOLIDAY" ? "Holiday" : val === "CUSTOM" ? "Custom Classes" : "Working Day",
                                }
                              : item
                          );
                        });
                      }}
                      className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#1769AA] outline-none cursor-pointer"
                    >
                      <option value="HOLIDAY">Holiday</option>
                      <option value="WORKING">Working Day</option>
                      <option value="CUSTOM">Custom Classes</option>
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setWorkingDayOverrides((prev) => {
                          const base = buildDaysConfig(weekRange.monday, prev);
                          return base.map((item) =>
                            item.key === d.key
                              ? {
                                  ...item,
                                  isWorking: !item.isWorking,
                                  statusType: !item.isWorking ? "WORKING" : "HOLIDAY",
                                }
                              : item
                          );
                        });
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        d.isWorking
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {d.isWorking ? "Working" : "Holiday"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setIsWorkingDaysModalOpen(false);
                setNotificationMsg("✓ Working days and holiday configuration updated successfully.");
                setTimeout(() => setNotificationMsg(null), 3000);
              }}
              className="w-full bg-[#1769AA] hover:bg-[#125890] text-white font-bold rounded-xl"
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
