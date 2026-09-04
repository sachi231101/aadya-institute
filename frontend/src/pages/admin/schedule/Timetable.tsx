import React, { useState, useMemo, useEffect, useRef } from "react";
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
import {
  TIME_SLOT_COLUMNS,
  BOOKABLE_TIME_SLOTS,
  periodFromStartTime,
  periodToTimes,
  toDateKey,
  addDaysToDateKey,
  formatDateKeyLabel,
  getWeekRangeFromOffset,
  localTodayKey,
} from "@/constants/timetable-slots";

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
  courseId?: string;
  batchCourseId?: string;
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

const DAY_KEYS: DayKey[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const todayDayKey = (): DayKey => DAY_KEYS[(new Date().getDay() + 6) % 7];

const dayKeyForDateKey = (mondayKey: string, dateKey: string): DayKey | null => {
  for (let i = 0; i < DAY_KEYS.length; i++) {
    if (addDaysToDateKey(mondayKey, i) === dateKey) return DAY_KEYS[i];
  }
  return null;
};

const buildDaysConfig = (mondayKey: string, overrides?: WorkingDayConfig[]): WorkingDayConfig[] => {
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
    const dateKey = addDaysToDateKey(mondayKey, idx);
    const dateStr = formatDateKeyLabel(dateKey);
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
  const [selectedDayKey, setSelectedDayKey] = useState<DayKey>(todayDayKey);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [userPickedDay, setUserPickedDay] = useState(false);
  const autoJumpWeekRef = useRef<string | null>(null);

  const weekRange = useMemo(() => getWeekRangeFromOffset(weekOffset), [weekOffset]);

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
    () => buildDaysConfig(weekRange.mondayKey, workingDayOverrides),
    [weekRange.mondayKey, workingDayOverrides]
  );

  const mapSessionToCell = (raw: BackendClassSession, period: number): TimetableCellItem => {
    const col = TIME_SLOT_COLUMNS.find((c) => c.period === period);
    const batchCourse =
      raw.batchCourseId && raw.batch?.batchCourses
        ? raw.batch.batchCourses.find((bc) => bc.id === raw.batchCourseId)
        : undefined;
    const courseId = batchCourse?.courseId || raw.batch?.courseId;
    const courseName =
      batchCourse?.course?.name ||
      getSessionSubjectLabel({ title: raw.title, batch: raw.batch });

    return {
      id: raw.id,
      sessionId: raw.id,
      period,
      timeRange: col?.label || `${raw.startTime} – ${raw.endTime}`,
      type: "CLASS",
      courseName,
      courseId,
      batchCourseId: raw.batchCourseId || undefined,
      batchCode: raw.batch?.code || raw.batch?.name || "",
      batchId: raw.batchId,
      roomNo: raw.roomNo || "TBD",
      classroomMasterId: raw.classroomMasterId || undefined,
      studentCount:
        raw.enrolledStudentsCount ??
        (raw.batch as { _count?: { enrollments?: number } })?._count?.enrollments ??
        0,
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
        const dayKeyStr = addDaysToDateKey(weekRange.mondayKey, idx);
        const slots = createDefaultDaySlots();

        classSessions.forEach((raw: BackendClassSession) => {
          if (raw.facultyId !== f.id) return;
          if (toDateKey(raw.scheduledDate) !== dayKeyStr) return;
          if (raw.sessionStatus === "CANCELLED") return;

          const period = periodFromStartTime(raw.startTime) ?? 2;
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
  }, [facultyMembers, classSessions, weekRange.mondayKey, branches]);

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
    return addDaysToDateKey(weekRange.mondayKey, idx);
  };

  // Auto-jump to a day with classes once per week load (don't fight manual day picks).
  useEffect(() => {
    if (userPickedDay) return;
    if (autoJumpWeekRef.current === weekRange.mondayKey) return;
    if (!classSessions.length) {
      autoJumpWeekRef.current = weekRange.mondayKey;
      return;
    }

    const selectedDate = getDateForDayKey(selectedDayKey);
    const hasOnSelected = classSessions.some(
      (s) => toDateKey(s.scheduledDate) === selectedDate && s.sessionStatus !== "CANCELLED"
    );
    if (hasOnSelected) {
      autoJumpWeekRef.current = weekRange.mondayKey;
      return;
    }

    const todayKey = localTodayKey();
    const todayDay = dayKeyForDateKey(weekRange.mondayKey, todayKey);
    const todayHas = classSessions.some(
      (s) => toDateKey(s.scheduledDate) === todayKey && s.sessionStatus !== "CANCELLED"
    );
    if (todayHas && todayDay) {
      setSelectedDayKey(todayDay);
      autoJumpWeekRef.current = weekRange.mondayKey;
      return;
    }

    const sorted = [...classSessions]
      .filter((s) => s.sessionStatus !== "CANCELLED")
      .sort((a, b) => toDateKey(a.scheduledDate).localeCompare(toDateKey(b.scheduledDate)));
    for (const session of sorted) {
      const day = dayKeyForDateKey(weekRange.mondayKey, toDateKey(session.scheduledDate));
      if (day) {
        setSelectedDayKey(day);
        break;
      }
    }
    autoJumpWeekRef.current = weekRange.mondayKey;
  }, [classSessions, weekRange.mondayKey, userPickedDay, selectedDayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset auto-jump lock when week changes
  useEffect(() => {
    setUserPickedDay(false);
    autoJumpWeekRef.current = null;
  }, [weekOffset]);

  const facultyBatches = useMemo(() => {
    if (!modalFacultyId) return batches;
    const linked = batches.filter((b) => batchIncludesFaculty(b, modalFacultyId));
    // Admin can assign any batch; still prefer faculty-linked batches first.
    if (isAdmin) {
      if (linked.length === 0) return batches;
      const linkedIds = new Set(linked.map((b) => b.id));
      return [...linked, ...batches.filter((b) => !linkedIds.has(b.id))];
    }
    return linked.length > 0 ? linked : batches;
  }, [batches, modalFacultyId, isAdmin]);

  const modalBatch = useMemo(
    () => batches.find((b) => b.id === modalBatchId),
    [batches, modalBatchId]
  );

  const modalSubjectOptions = useMemo(() => {
    if (!modalBatch) return [];
    const rows = getBatchCourseRows(modalBatch);
    if (!modalFacultyId) return rows;
    const forFaculty = rows.filter(
      (row) => row.facultyId === modalFacultyId || row.faculty?.id === modalFacultyId
    );
    // Fall back to all subjects so schedule save is never blocked by missing course faculty link.
    return forFaculty.length > 0 ? forFaculty : rows;
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

  // Prefill the only (or first linked) batch when opening a new CLASS slot.
  useEffect(() => {
    if (!isEditModalOpen || modalSlotType !== "CLASS" || modalSessionId) return;
    if (modalBatchId) return;
    if (facultyBatches.length === 0) return;
    const preferred =
      facultyBatches.find((b) => batchIncludesFaculty(b, modalFacultyId)) || facultyBatches[0];
    if (preferred) setModalBatchId(preferred.id);
  }, [isEditModalOpen, modalSlotType, modalSessionId, modalBatchId, facultyBatches, modalFacultyId]);

  // Current Selected Day Config
  const currentDayConfig = useMemo(() => {
    return daysConfig.find((d) => d.key === selectedDayKey) || daysConfig[0];
  }, [daysConfig, selectedDayKey]);

  // Filtered Faculty Roster according to role & UI filters
  const filteredFaculty = useMemo(() => {
    return facultyRoster.filter((fac) => {
      // 1. Role Branch Isolation — include faculty who teach sessions in the selected branch
      if (isAdmin) {
        if (selectedBranch !== "ALL") {
          const teachesInBranch = classSessions.some(
            (s) => s.facultyId === fac.id && s.branchId === selectedBranch
          );
          if (fac.branchId !== selectedBranch && !teachesInBranch) return false;
        }
      } else {
        const teachesInCenter = classSessions.some(
          (s) => s.facultyId === fac.id && s.branchId === userCenterId
        );
        if (fac.branchId !== userCenterId && !teachesInCenter) return false;
      }

      // 2. Course Filter — match courseId or subject/course name on sessions that day
      if (selectedCourse !== "ALL") {
        const daySchedule = fac.weeklySchedule[selectedDayKey] || {};
        const courseMeta = allCourses.find((c) => c.id === selectedCourse || c.name === selectedCourse);
        const targetId = courseMeta?.id || selectedCourse;
        const targetName = (courseMeta?.name || selectedCourse).toLowerCase();
        const matchesCourse = Object.values(daySchedule).some((s) => {
          if (s.type !== "CLASS") return false;
          if (s.courseId && (s.courseId === targetId || s.courseId === selectedCourse)) return true;
          if (s.courseName?.toLowerCase() === targetName) return true;
          if (s.courseName?.toLowerCase().includes(targetName)) return true;
          return false;
        });
        // Also match faculty who teach that course in any session this week
        const teachesCourse = classSessions.some((raw) => {
          if (raw.facultyId !== fac.id || raw.sessionStatus === "CANCELLED") return false;
          const bc = raw.batchCourseId
            ? raw.batch?.batchCourses?.find((row) => row.id === raw.batchCourseId)
            : undefined;
          const courseId = bc?.courseId || raw.batch?.courseId;
          const courseName = bc?.course?.name || raw.batch?.course?.name || "";
          return (
            courseId === targetId ||
            courseId === selectedCourse ||
            courseName.toLowerCase() === targetName ||
            (raw.title || "").toLowerCase().includes(targetName)
          );
        });
        if (!matchesCourse && !teachesCourse) return false;
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
  }, [
    facultyRoster,
    isAdmin,
    selectedBranch,
    userCenterId,
    selectedCourse,
    selectedDayKey,
    searchQuery,
    classSessions,
    allCourses,
  ]);

  // Pagination Slice
  const totalFacultyCount = filteredFaculty.length;
  const totalPages = Math.ceil(totalFacultyCount / rowsPerPage) || 1;
  const paginatedFaculty = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredFaculty.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredFaculty, currentPage, rowsPerPage]);

  // Calculate Class Counts per Day for Top Day Cards (from sessions, not faculty.branchId)
  const dayClassCounts = useMemo(() => {
    const counts: Record<DayKey, number> = { MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0, SAT: 0, SUN: 0 };
    classSessions.forEach((raw) => {
      if (raw.sessionStatus === "CANCELLED") return;
      if (isAdmin) {
        if (selectedBranch !== "ALL" && raw.branchId !== selectedBranch) return;
      } else if (userCenterId !== "ALL" && raw.branchId !== userCenterId) {
        return;
      }
      const day = dayKeyForDateKey(weekRange.mondayKey, toDateKey(raw.scheduledDate));
      if (day) counts[day] += 1;
    });
    return counts;
  }, [classSessions, isAdmin, selectedBranch, userCenterId, weekRange.mondayKey]);

  // ─── ACTIONS: OPEN ADD/EDIT MODAL ──────────────────────────────────────────

  const handleOpenAddOrEditModal = (
    facultyId: string,
    dayKey: DayKey,
    period: number,
    existingSlot?: TimetableCellItem
  ) => {
    const fac = facultyRoster.find((f) => f.id === facultyId);
    if (!fac) return;

    const periodMeta = TIME_SLOT_COLUMNS.find((c) => c.period === period);
    // Break / lunch are structural — do not open CLASS scheduler on them unless editing an existing class.
    if (
      (periodMeta?.isBreak || periodMeta?.isLunch) &&
      !(existingSlot && existingSlot.type === "CLASS")
    ) {
      setNotificationMsg("Break and Lunch slots cannot be scheduled. Pick a free teaching period.");
      setTimeout(() => setNotificationMsg(null), 3500);
      return;
    }

    setModalFacultyId(facultyId);
    setModalDayKey(dayKey);
    setModalPeriod(period);

    if (existingSlot && existingSlot.type === "CLASS") {
      setModalSlotType("CLASS");
      setModalSessionId(existingSlot.sessionId || existingSlot.id);
      setModalTitle(existingSlot.courseName || "");
      setModalBatchId(existingSlot.batchId || "");
      setModalClassroomMasterId(existingSlot.classroomMasterId || "");
      setModalSubjectCourseId(existingSlot.courseId || "");
    } else if (existingSlot && existingSlot.type !== "FREE") {
      // FREE / structural only → schedule a class
      setModalSlotType("CLASS");
      setModalSessionId(null);
      setModalTitle("");
      setModalBatchId("");
      setModalClassroomMasterId("");
      setModalSubjectCourseId("");
    } else {
      setModalSlotType("CLASS");
      setModalSessionId(null);
      setModalTitle("");
      setModalBatchId("");
      setModalClassroomMasterId("");
      setModalSubjectCourseId("");
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
        } catch (err: unknown) {
          const apiMessage =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            (err as { message?: string })?.message;
          setNotificationMsg(apiMessage || "Failed to update slot. Please try again.");
        }
      }
      setIsEditModalOpen(false);
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    const fac =
      facultyMembers.find((f: { id: string; branchId?: string }) => f.id === modalFacultyId) ||
      facultyRoster.find((f) => f.id === modalFacultyId);
    const batch = batches.find((b) => b.id === modalBatchId);

    if (!fac) {
      setNotificationMsg("Please select a faculty instructor.");
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }
    if (!batch) {
      setNotificationMsg(
        batches.length === 0
          ? "No batches available. Create a batch first."
          : "Please select a valid batch."
      );
      setTimeout(() => setNotificationMsg(null), 3500);
      return;
    }

    const subjectRows = getBatchCourseRows(batch);
    const subjectCourseId =
      modalSubjectCourseId ||
      modalSubjectOptions[0]?.courseId ||
      subjectRows[0]?.courseId ||
      batch.courseId;
    if (!subjectCourseId) {
      setNotificationMsg("Select a subject for this class session.");
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    // Keep the session on the faculty row being edited — never reassign to another instructor.
    const sessionFacultyId = modalFacultyId;
    const subjectName = getCourseNameInBatch(batch, subjectCourseId) || batch.name;
    const subjectRow = subjectRows.find((r) => r.courseId === subjectCourseId);

    const periodMeta = TIME_SLOT_COLUMNS.find((c) => c.period === modalPeriod);
    if (periodMeta?.isBreak || periodMeta?.isLunch) {
      setNotificationMsg("Cannot schedule a class during Break or Lunch.");
      setTimeout(() => setNotificationMsg(null), 3500);
      return;
    }

    const { start, end } = periodToTimes(modalPeriod);
    const payload = {
      title: modalTitle.trim() || subjectName || batch.name || "Class Session",
      batchId: batch.id,
      batchCourseId: subjectRow?.id || undefined,
      facultyId: sessionFacultyId,
      branchId: ("branchId" in fac ? fac.branchId : undefined) || batch.branchId,
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
      setSelectedDayKey(modalDayKey);
      setUserPickedDay(true);
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as { message?: string })?.message;
      setNotificationMsg(apiMessage || "Failed to save class session. Please check the form and try again.");
    }
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleDeleteSlot = async (facultyId: string, dayKey: DayKey, period: number) => {
    const fac = facultyRoster.find((f) => f.id === facultyId);
    const cell = fac?.weeklySchedule[dayKey]?.[period];
    if (!cell?.sessionId) {
      setNotificationMsg("No class session to remove for this slot.");
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    const confirmed = window.confirm(
      `Remove class "${cell.courseName || "session"}" (${cell.batchCode || ""}) from this slot?`
    );
    if (!confirmed) return;

    try {
      await deleteSession.mutateAsync(cell.sessionId);
      setNotificationMsg(`✓ Schedule deleted for period ${period}. Slot is now Free.`);
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as { message?: string })?.message;
      setNotificationMsg(apiMessage || "Failed to delete class session. Please try again.");
    }
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleOpenMoveModal = (facultyId: string, dayKey: DayKey, period: number) => {
    setMoveSource({ facultyId, dayKey, period });
    const nextBookable =
      BOOKABLE_TIME_SLOTS.find((s) => s.period > period)?.period ||
      BOOKABLE_TIME_SLOTS.find((s) => s.period !== period)?.period ||
      period;
    setTargetPeriod(nextBookable);
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
    const targetMeta = TIME_SLOT_COLUMNS.find((c) => c.period === targetPeriod);
    if (targetMeta?.isBreak || targetMeta?.isLunch) {
      setNotificationMsg("Cannot move a class into Break or Lunch.");
      setTimeout(() => setNotificationMsg(null), 3500);
      return;
    }

    const occupied = fac?.weeklySchedule[dayKey]?.[targetPeriod];
    if (occupied?.type === "CLASS" && occupied.sessionId && occupied.sessionId !== sourceSlot.sessionId) {
      setNotificationMsg("Target period already has a class. Choose a free slot.");
      setTimeout(() => setNotificationMsg(null), 3500);
      return;
    }

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
      setIsMoveModalOpen(false);
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as { message?: string })?.message;
      setNotificationMsg(apiMessage || "Failed to move class session. Please try again.");
    }

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
                <option key={c.id} value={c.id}>{c.name}</option>
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
                onClick={() => {
                  setUserPickedDay(true);
                  setSelectedDayKey(d.key);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isSelected
                    ? "bg-[#1769AA] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {d.fullDay.slice(0, 3)} {d.dateStr}
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
                                    {cell.studentCount ?? 0}
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
                              <div className="h-[52px] w-full rounded-md border border-amber-500/30 bg-amber-500/10 flex flex-col items-center justify-center text-amber-600 dark:text-amber-300">
                                <span className="text-[8px] font-semibold uppercase">Break</span>
                                <Coffee className="h-2.5 w-2.5 mt-0.5 text-amber-500 dark:text-amber-400" />
                              </div>
                            </td>
                          );
                        }

                        // 4. LUNCH SLOT
                        if (cell.type === "LUNCH") {
                          return (
                            <td key={col.period} className="p-1 border-r border-border last:border-r-0 align-middle">
                              <div className="h-[52px] w-full rounded-md border border-orange-500/30 bg-orange-500/10 flex flex-col items-center justify-center text-orange-600 dark:text-orange-300">
                                <span className="text-[8px] font-semibold uppercase">Lunch</span>
                                <UtensilsCrossed className="h-2.5 w-2.5 mt-0.5 text-orange-500 dark:text-orange-400" />
                              </div>
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
                onChange={(e) => {
                  setModalFacultyId(e.target.value);
                  if (!modalSessionId) {
                    setModalBatchId("");
                    setModalSubjectCourseId("");
                  }
                }}
                className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
              >
                {facultyRoster.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.department}) – {f.branchName}
                  </option>
                ))}
              </select>
            </div>

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
                <Label className="text-[11px] font-bold text-slate-700">Time Period *</Label>
                <select
                  value={modalPeriod}
                  onChange={(e) => setModalPeriod(Number(e.target.value))}
                  className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                >
                  {BOOKABLE_TIME_SLOTS.map((col) => (
                    <option key={col.period} value={col.period}>
                      Period {col.period} ({col.label})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-slate-700">Slot Status *</Label>
                <select
                  value={modalSlotType}
                  onChange={(e) => setModalSlotType(e.target.value as SlotType)}
                  className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#1769AA] outline-none"
                >
                  <option value="CLASS">Class Scheduled</option>
                  <option value="FREE">Free (clear class)</option>
                </select>
              </div>
              <div className="flex items-end">
                <p className="text-[10px] text-slate-500 pb-2">
                  {TIME_SLOT_COLUMNS.find((c) => c.period === modalPeriod)?.label}
                </p>
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
                  {facultyBatches.length === 0 && (
                    <p className="text-[10px] text-rose-500 mt-1">
                      No batches found. Create a batch and assign this faculty first.
                    </p>
                  )}
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
                  <ClassroomDropdown
                    value={modalClassroomMasterId}
                    onChange={setModalClassroomMasterId}
                    branchId={
                      facultyRoster.find((f) => f.id === modalFacultyId)?.branchId ||
                      modalBatch?.branchId
                    }
                  />
                </div>
              </>
            )}
          </div>

          {notificationMsg && isEditModalOpen && (
            <div
              className={`mb-2 p-2.5 rounded-xl text-[11px] font-medium border ${
                notificationMsg.startsWith("✓")
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              {notificationMsg}
            </div>
          )}

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
                {BOOKABLE_TIME_SLOTS.map((col) => (
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
                          const base = buildDaysConfig(weekRange.mondayKey, prev);
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
                          const base = buildDaysConfig(weekRange.mondayKey, prev);
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
