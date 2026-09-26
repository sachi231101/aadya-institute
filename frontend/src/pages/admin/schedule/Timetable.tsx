import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  CheckCircle2,
  Save,
  Edit3,
  Pencil,
  Loader2,
  Lock,
  Plus,
  MoreVertical,
  Coffee,
  UtensilsCrossed,
  Trash2,
  MoveHorizontal,
  Video,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageContainer, PageHeader, FilterToolbar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth.store";
import { ClassroomDropdown } from "@/components/common/ClassroomDropdown";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useClassSessions,
  useCreateClassSession,
  useUpdateClassSession,
  useDeleteClassSession,
} from "@/hooks/useClassSessions";
import {
  useFacultyScheduleBlocks,
  useUpsertFacultyScheduleBlock,
  useDeleteFacultyScheduleBlockByKey,
} from "@/hooks/useFacultyScheduleBlocks";
import type { BackendClassSession } from "@/services/class-sessions.api";
import { classSessionsApi } from "@/services/class-sessions.api";
import type { BackendFacultyScheduleBlock } from "@/services/faculty-schedule-blocks.api";
import {
  periodFromStartTime,
  periodToTimes,
  findSlotByMasterId,
  toDateKey,
  addDaysToDateKey,
  formatDateKeyLabel,
  getWeekRangeFromOffset,
  isMasterHolidayDate,
  getMasterHolidayLabel,
  type TimetablePeriodSlot,
} from "@/constants/timetable-slots";
import { useTimetableSlotColumns } from "@/hooks/useTimetableSlotColumns";
import { getApiErrorMessage } from "@/utils/api-error";
import { formatTimeRange12h } from "@/utils/format";

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
  /** Persisted faculty Break/Lunch override (FacultyScheduleBlock). */
  blockId?: string;
  period: number;
  timeRange: string;
  type: SlotType;
  title?: string;
  courseName?: string;
  courseId?: string;
  batchCourseId?: string;
  batchCode?: string;
  batchId?: string;
  roomNo?: string;
  classroomMasterId?: string;
  mode?: "OFFLINE" | "ONLINE" | "HYBRID";
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
  dateKey: string;
  dateStr: string;
  isWorking: boolean;
  note?: string;
}

const DAY_KEYS: DayKey[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type TimetableViewMode = "OVERALL_WEEK" | "FACULTY_WEEK";

type OverallClassChip = {
  cell: TimetableCellItem;
  facultyId: string;
  facultyName: string;
};

type OverallClassListRow = OverallClassChip & { period: number };

const CLASS_STATUS_BADGE: Record<
  NonNullable<TimetableCellItem["status"]>,
  { label: string; variant: "secondary" | "success" | "warning" | "destructive" }
> = {
  UPCOMING: { label: "Upcoming", variant: "secondary" },
  ONGOING: { label: "Live", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

const todayDayKey = (): DayKey => DAY_KEYS[(new Date().getDay() + 6) % 7];

const dayKeyForDateKey = (mondayKey: string, dateKey: string): DayKey | null => {
  for (let i = 0; i < DAY_KEYS.length; i++) {
    if (addDaysToDateKey(mondayKey, i) === dateKey) return DAY_KEYS[i];
  }
  return null;
};

interface HolidayOption {
  label: string;
  data?: Record<string, unknown> | null;
}

const buildDaysConfig = (
  mondayKey: string,
  holidays: HolidayOption[] = []
): WorkingDayConfig[] => {
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
    const isHoliday = isMasterHolidayDate(dateKey, holidays);
    const holidayLabel = getMasterHolidayLabel(dateKey, holidays);
    return {
      key,
      label: labels[key].label,
      fullDay: labels[key].fullDay,
      dateKey,
      dateStr,
      isWorking: !isHoliday,
      note: holidayLabel,
    };
  });
};

// Helper to generate a default day schedule for a faculty from master time slots
const createDefaultDaySlots = (
  columns: TimetablePeriodSlot[],
  customSlots?: Partial<Record<number, Partial<TimetableCellItem>>>
): Record<number, TimetableCellItem> => {
  const slots: Record<number, TimetableCellItem> = {};
  columns.forEach((col) => {
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
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import {
  batchIncludesFaculty,
  formatBatchSubjectNames,
  getBatchCourseRows,
  getCourseNameInBatch,
  getSessionSubjectLabel,
} from "@/utils/batch.utils";

export const Timetable: React.FC = () => {
  const { user } = useAuthStore();
  const { canEditItem, hasPermission } = usePermissions();
  const canEditTimetable = canEditItem("schedule.timetable");
  // DELETE /class-sessions/:id requires schedule.delete, which Timetable write alone doesn't grant CMs.
  const canDeleteTimetableClass = canEditTimetable && hasPermission("schedule.delete");
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const facultyMembers = facultyResponse?.data ?? [];
  const { batches } = useBatches();
  const { courses: allCourses } = useCourses();

  const createSession = useCreateClassSession();
  const updateSession = useUpdateClassSession();
  const deleteSession = useDeleteClassSession();
  const upsertScheduleBlock = useUpsertFacultyScheduleBlock();
  const deleteScheduleBlockByKey = useDeleteFacultyScheduleBlockByKey();

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


  // Preferred day for Add class (defaults to today) & week navigation
  const [selectedDayKey, setSelectedDayKey] = useState<DayKey>(todayDayKey);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const weekRange = useMemo(() => getWeekRangeFromOffset(weekOffset), [weekOffset]);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>(isAdmin ? "ALL" : userCenterId);
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const isAdminBranchResolved =
    !isAdmin || branches.some((b: { id: string }) => b.id === selectedBranch);

  useEffect(() => {
    if (!isAdmin || isAdminBranchResolved || branches.length === 0) return;
    const ownBranch = branches.find((b: { id: string }) => b.id === user?.branchId);
    setSelectedBranch(ownBranch?.id ?? branches[0].id);
  }, [isAdmin, isAdminBranchResolved, branches, user?.branchId]);
  /** Admin/Center: Overall week (default) or one faculty's Mon–Sun week */
  const [viewMode, setViewMode] = useState<TimetableViewMode>("OVERALL_WEEK");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const isOverallWeekView = viewMode === "OVERALL_WEEK";
  const isFacultyWeekView = viewMode === "FACULTY_WEEK";
  const { options: holidayOptions } = useMasterDropdown(
    "holiday",
    selectedBranch !== "ALL" ? selectedBranch : undefined
  );
  const {
    slots: timeSlotColumns,
    bookableSlots,
    isLoading: slotsLoading,
    isEmpty: slotsEmpty,
  } = useTimetableSlotColumns(selectedBranch !== "ALL" ? selectedBranch : undefined);

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

  const { data: sessionsResponse, isLoading: sessionsLoading } = useClassSessions(
    sessionQueryParams,
    { enabled: isAdminBranchResolved }
  );
  const classSessions = sessionsResponse?.data ?? [];

  const { data: blocksResponse } = useFacultyScheduleBlocks(sessionQueryParams, {
    enabled: isAdminBranchResolved,
  });
  const scheduleBlocks = blocksResponse?.data ?? [];

  // Day config from master holidays (all weekdays working unless marked holiday)
  const daysConfig = useMemo(
    () => buildDaysConfig(weekRange.mondayKey, holidayOptions),
    [weekRange.mondayKey, holidayOptions]
  );

  const mapSessionToCell = (raw: BackendClassSession, period: number): TimetableCellItem => {
    const col = timeSlotColumns.find((c) => c.period === period);
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
      timeRange: col?.label || formatTimeRange12h(raw.startTime, raw.endTime),
      type: "CLASS",
      title: raw.title || undefined,
      courseName,
      courseId,
      batchCourseId: raw.batchCourseId || undefined,
      batchCode: raw.batch?.code || raw.batch?.name || "",
      batchId: raw.batchId,
      roomNo: raw.roomNo || "TBD",
      classroomMasterId: raw.classroomMasterId || undefined,
      mode: (raw.mode as "OFFLINE" | "ONLINE" | "HYBRID") || "OFFLINE",
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

  const mapBlockToCell = (
    raw: BackendFacultyScheduleBlock,
    period: number,
    base: TimetableCellItem
  ): TimetableCellItem => {
    const col = timeSlotColumns.find((c) => c.period === period);
    return {
      ...base,
      id: raw.id,
      blockId: raw.id,
      sessionId: undefined,
      period,
      timeRange: col?.label || formatTimeRange12h(raw.startTime, raw.endTime),
      type: raw.blockType === "LUNCH" ? "LUNCH" : "BREAK",
      title: undefined,
      courseName: undefined,
      courseId: undefined,
      batchCourseId: undefined,
      batchCode: undefined,
      batchId: undefined,
      roomNo: undefined,
      classroomMasterId: undefined,
      mode: undefined,
      studentCount: undefined,
      status: undefined,
      attendanceStatus: undefined,
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
        } as unknown as (typeof facultyMembers)[0]);
      }
    });

    scheduleBlocks.forEach((raw: BackendFacultyScheduleBlock) => {
      if (raw.facultyId && raw.faculty && !facultyById.has(raw.facultyId)) {
        facultyById.set(raw.facultyId, {
          id: raw.faculty.id,
          employeeCode: raw.faculty.employeeCode,
          branchId: raw.branchId || raw.faculty.branchId,
          specialization: "Instruction",
          user: raw.faculty.user,
          branch: undefined,
        } as unknown as (typeof facultyMembers)[0]);
      }
    });

    return Array.from(facultyById.values()).map((f, fIdx) => {
      const weeklySchedule = {} as Record<DayKey, Record<number, TimetableCellItem>>;

      DAY_KEYS.forEach((dayKey, idx) => {
        const dayKeyStr = addDaysToDateKey(weekRange.mondayKey, idx);
        const slots = createDefaultDaySlots(timeSlotColumns);

        // 1. Class sessions win
        classSessions.forEach((raw: BackendClassSession) => {
          if (raw.facultyId !== f.id) return;
          if (toDateKey(raw.scheduledDate) !== dayKeyStr) return;
          if (raw.sessionStatus === "CANCELLED") return;

          const masterSlot = findSlotByMasterId(
            (raw as BackendClassSession & { timeslotMasterId?: string | null }).timeslotMasterId,
            timeSlotColumns
          );
          const period =
            masterSlot?.period ??
            periodFromStartTime(raw.startTime, timeSlotColumns);
          if (!period || !slots[period]) return;
          slots[period] = mapSessionToCell(raw, period);
        });

        // 2. Faculty Break/Lunch blocks over Free / master defaults (not over CLASS)
        scheduleBlocks.forEach((raw: BackendFacultyScheduleBlock) => {
          if (raw.facultyId !== f.id) return;
          if (toDateKey(raw.scheduledDate) !== dayKeyStr) return;

          const masterSlot = findSlotByMasterId(raw.timeslotMasterId, timeSlotColumns);
          const period =
            masterSlot?.period ??
            periodFromStartTime(raw.startTime, timeSlotColumns);
          if (!period || !slots[period]) return;
          if (slots[period].type === "CLASS") return;
          slots[period] = mapBlockToCell(raw, period, slots[period]);
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
  }, [facultyMembers, classSessions, scheduleBlocks, weekRange.mondayKey, branches, timeSlotColumns]);

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
  const [modalMode, setModalMode] = useState<"OFFLINE" | "ONLINE" | "HYBRID">("OFFLINE");
  const [modalFormErrors, setModalFormErrors] = useState<Record<string, string>>({});

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

  const courseFilterBranchId = isAdmin ? selectedBranch : userCenterId;
  const branchCourses = useMemo(() => {
    if (!courseFilterBranchId || courseFilterBranchId === "ALL") return allCourses;
    return allCourses.filter((c) => c.branchIds?.includes(courseFilterBranchId));
  }, [allCourses, courseFilterBranchId]);

  useEffect(() => {
    if (selectedCourse === "ALL" || allCourses.length === 0) return;
    if (!branchCourses.some((c) => c.id === selectedCourse)) {
      setSelectedCourse("ALL");
    }
  }, [selectedCourse, branchCourses, allCourses.length]);

  // Week Date Label
  const weekDateLabel = weekRange.label;

  const getDateForDayKey = (dayKey: DayKey): string => {
    const idx = DAY_KEYS.indexOf(dayKey);
    return addDaysToDateKey(weekRange.mondayKey, idx);
  };

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

  /** Branch-scoped faculty options for the week-view selector (ignores search/day filters). */
  const facultySelectOptions = useMemo(() => {
    return facultyRoster.filter((fac) => {
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
      return true;
    });
  }, [facultyRoster, isAdmin, selectedBranch, userCenterId, classSessions]);

  /** Faculty list for CSV export — branch scope + optional search / course filters (whole week). */
  const filteredFaculty = useMemo(() => {
    return facultySelectOptions.filter((fac) => {
      if (selectedCourse !== "ALL") {
        const courseMeta = allCourses.find((c) => c.id === selectedCourse || c.name === selectedCourse);
        const targetId = courseMeta?.id || selectedCourse;
        const targetName = (courseMeta?.name || selectedCourse).toLowerCase();
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
        if (!teachesCourse) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = fac.name.toLowerCase().includes(q);
        const matchCode = fac.employeeCode.toLowerCase().includes(q);
        const matchDept = fac.department.toLowerCase().includes(q);
        const matchBranch = fac.branchName.toLowerCase().includes(q);
        const matchSlot = DAY_KEYS.some((dayKey) => {
          const daySchedule = fac.weeklySchedule[dayKey] || {};
          return Object.values(daySchedule).some(
            (s) =>
              s.type === "CLASS" &&
              ((s.courseName && s.courseName.toLowerCase().includes(q)) ||
                (s.batchCode && s.batchCode.toLowerCase().includes(q)) ||
                (s.roomNo && s.roomNo.toLowerCase().includes(q)))
          );
        });
        if (!matchName && !matchCode && !matchDept && !matchBranch && !matchSlot) return false;
      }

      return true;
    });
  }, [
    facultySelectOptions,
    selectedCourse,
    searchQuery,
    classSessions,
    allCourses,
  ]);

  const selectedWeekFaculty = useMemo(() => {
    if (!isFacultyWeekView || !selectedFacultyId) return null;
    return (
      facultySelectOptions.find((f) => f.id === selectedFacultyId) ||
      facultyRoster.find((f) => f.id === selectedFacultyId) ||
      null
    );
  }, [isFacultyWeekView, selectedFacultyId, facultySelectOptions, facultyRoster]);

  // Drop week selection if faculty no longer in branch scope
  useEffect(() => {
    if (!isFacultyWeekView) return;
    if (!selectedFacultyId) {
      const first = facultySelectOptions[0];
      if (first) setSelectedFacultyId(first.id);
      else setViewMode("OVERALL_WEEK");
      return;
    }
    const stillVisible = facultySelectOptions.some((f) => f.id === selectedFacultyId);
    if (!stillVisible) {
      const first = facultySelectOptions[0];
      if (first) setSelectedFacultyId(first.id);
      else setViewMode("OVERALL_WEEK");
    }
  }, [isFacultyWeekView, selectedFacultyId, facultySelectOptions]);

  /** Overall week: day × period → stacked class chips (parallel rooms/batches). */
  const overallWeekGrid = useMemo(() => {
    const emptyDay = (): Record<number, OverallClassChip[]> => {
      const slots: Record<number, OverallClassChip[]> = {};
      timeSlotColumns.forEach((col) => {
        slots[col.period] = [];
      });
      return slots;
    };
    const grid = {} as Record<DayKey, Record<number, OverallClassChip[]>>;
    DAY_KEYS.forEach((k) => {
      grid[k] = emptyDay();
    });

    const courseMeta =
      selectedCourse !== "ALL"
        ? allCourses.find((c) => c.id === selectedCourse || c.name === selectedCourse)
        : undefined;
    const targetId = courseMeta?.id || selectedCourse;
    const targetName = (courseMeta?.name || selectedCourse).toLowerCase();
    const q = searchQuery.trim().toLowerCase();

    classSessions.forEach((raw: BackendClassSession) => {
      if (raw.sessionStatus === "CANCELLED") return;
      if (!raw.facultyId) return;

      if (isAdmin) {
        if (selectedBranch !== "ALL" && raw.branchId !== selectedBranch) return;
      } else if (userCenterId !== "ALL" && raw.branchId !== userCenterId) {
        return;
      }

      const day = dayKeyForDateKey(weekRange.mondayKey, toDateKey(raw.scheduledDate));
      if (!day || !grid[day]) return;

      const masterSlot = findSlotByMasterId(
        (raw as BackendClassSession & { timeslotMasterId?: string | null }).timeslotMasterId,
        timeSlotColumns
      );
      const period =
        masterSlot?.period ?? periodFromStartTime(raw.startTime, timeSlotColumns);
      if (!period || !grid[day][period]) return;

      if (selectedCourse !== "ALL") {
        const bc = raw.batchCourseId
          ? raw.batch?.batchCourses?.find((row) => row.id === raw.batchCourseId)
          : undefined;
        const courseId = bc?.courseId || raw.batch?.courseId;
        const courseName = (
          bc?.course?.name ||
          raw.batch?.course?.name ||
          raw.title ||
          ""
        ).toLowerCase();
        const matches =
          courseId === targetId ||
          courseId === selectedCourse ||
          courseName === targetName ||
          courseName.includes(targetName) ||
          (raw.title || "").toLowerCase().includes(targetName);
        if (!matches) return;
      }

      const facultyName =
        raw.faculty?.user?.name ||
        facultyRoster.find((f) => f.id === raw.facultyId)?.name ||
        "Faculty";
      const mapped = mapSessionToCell(raw, period);

      if (q) {
        const hay = [
          facultyName,
          mapped.courseName,
          mapped.batchCode,
          mapped.roomNo,
          mapped.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return;
      }

      grid[day][period].push({
        cell: mapped,
        facultyId: raw.facultyId,
        facultyName,
      });
    });

    // Stable order within a slot (by faculty name, then batch)
    DAY_KEYS.forEach((day) => {
      timeSlotColumns.forEach((col) => {
        grid[day][col.period].sort((a, b) => {
          const byFac = a.facultyName.localeCompare(b.facultyName);
          if (byFac !== 0) return byFac;
          return (a.cell.batchCode || "").localeCompare(b.cell.batchCode || "");
        });
      });
    });

    return grid;
  }, [
    classSessions,
    timeSlotColumns,
    weekRange.mondayKey,
    isAdmin,
    selectedBranch,
    userCenterId,
    selectedCourse,
    searchQuery,
    allCourses,
    facultyRoster,
  ]);

  const overallWeekClassCount = useMemo(() => {
    let n = 0;
    DAY_KEYS.forEach((day) => {
      timeSlotColumns.forEach((col) => {
        n += overallWeekGrid[day]?.[col.period]?.length ?? 0;
      });
    });
    return n;
  }, [overallWeekGrid, timeSlotColumns]);

  /** Overall week: day label → full-day list; crowded cell → that slot's list. */
  const [dayListKey, setDayListKey] = useState<DayKey | null>(null);
  const [slotListTarget, setSlotListTarget] = useState<{ dayKey: DayKey; period: number } | null>(
    null
  );
  const [listDeleteTarget, setListDeleteTarget] = useState<{
    dayKey: DayKey;
    row: OverallClassListRow;
  } | null>(null);
  const [isDeletingFromList, setIsDeletingFromList] = useState(false);

  const dayListConfig = dayListKey ? daysConfig.find((d) => d.key === dayListKey) : undefined;
  const dayListRows = useMemo<OverallClassListRow[]>(() => {
    if (!dayListKey) return [];
    const dayGrid = overallWeekGrid[dayListKey];
    if (!dayGrid) return [];
    return timeSlotColumns.flatMap((col) =>
      (dayGrid[col.period] ?? []).map((chip) => ({ ...chip, period: col.period }))
    );
  }, [dayListKey, overallWeekGrid, timeSlotColumns]);

  const slotListConfig = slotListTarget
    ? daysConfig.find((d) => d.key === slotListTarget.dayKey)
    : undefined;
  const slotListColumn = slotListTarget
    ? timeSlotColumns.find((c) => c.period === slotListTarget.period)
    : undefined;
  const slotListRows = useMemo<OverallClassListRow[]>(() => {
    if (!slotListTarget) return [];
    return (overallWeekGrid[slotListTarget.dayKey]?.[slotListTarget.period] ?? []).map((chip) => ({
      ...chip,
      period: slotListTarget.period,
    }));
  }, [slotListTarget, overallWeekGrid]);

  // ─── ACTIONS: OPEN ADD/EDIT MODAL ──────────────────────────────────────────

  const handleOpenAddOrEditModal = (
    facultyId: string,
    dayKey: DayKey,
    period: number,
    existingSlot?: TimetableCellItem
  ) => {
    const dayConfig = daysConfig.find((d) => d.key === dayKey);
    if (dayConfig && !dayConfig.isWorking) {
      setNotificationMsg(
        `${dayConfig.note || "Holiday"} — scheduling is closed for this day. Manage holidays in Master Setup.`
      );
      setTimeout(() => setNotificationMsg(null), 4000);
      return;
    }

    const fac = facultyRoster.find((f) => f.id === facultyId);
    if (!fac) return;

    setModalFacultyId(facultyId);
    setModalDayKey(dayKey);
    setModalPeriod(period);

    if (existingSlot && existingSlot.type === "CLASS") {
      setModalSlotType("CLASS");
      setModalSessionId(existingSlot.sessionId || existingSlot.id);
      setModalTitle(existingSlot.title || existingSlot.courseName || "");
      setModalBatchId(existingSlot.batchId || "");
      setModalClassroomMasterId(existingSlot.classroomMasterId || "");
      setModalSubjectCourseId(existingSlot.courseId || "");
      setModalMode(existingSlot.mode || "OFFLINE");
    } else if (existingSlot && (existingSlot.type === "BREAK" || existingSlot.type === "LUNCH")) {
      // Prefill from block override or master column default
      setModalSlotType(existingSlot.type);
      setModalSessionId(null);
      setModalTitle("");
      setModalBatchId("");
      setModalClassroomMasterId("");
      setModalSubjectCourseId("");
      setModalMode("OFFLINE");
    } else {
      setModalSlotType("CLASS");
      setModalSessionId(null);
      setModalTitle("");
      setModalBatchId("");
      setModalClassroomMasterId("");
      setModalSubjectCourseId("");
      setModalMode("OFFLINE");
    }

    setModalMode(existingSlot?.type === "CLASS" ? existingSlot.mode || "OFFLINE" : "OFFLINE");
    setModalFormErrors({});
    setIsEditModalOpen(true);
  };

  const getListRowLockReason = (dayKey: DayKey, row: OverallClassListRow): string | null => {
    const dayConfig = daysConfig.find((d) => d.key === dayKey);
    if (dayConfig && !dayConfig.isWorking) {
      return `${dayConfig.note || "Holiday"} — scheduling is closed for this day.`;
    }
    if (row.cell.status === "COMPLETED") return "Completed classes can't be edited or deleted.";
    if (row.cell.status === "CANCELLED") return "Cancelled classes can't be edited or deleted.";
    return null;
  };

  const handleOpenClassFromList = (dayKey: DayKey, row: OverallClassListRow) => {
    if (!canEditTimetable || getListRowLockReason(dayKey, row)) return;
    setDayListKey(null);
    setSlotListTarget(null);
    handleOpenAddOrEditModal(row.facultyId, dayKey, row.period, row.cell);
  };

  const renderClassListRows = (
    dayKey: DayKey,
    rows: OverallClassListRow[],
    options: { showTime: boolean }
  ) => (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {rows.map((row) => {
        const col = timeSlotColumns.find((c) => c.period === row.period);
        const status = row.cell.status ? CLASS_STATUS_BADGE[row.cell.status] : undefined;
        const courseLabel = row.cell.courseName || row.cell.title || "Class";
        const lockReason = getListRowLockReason(dayKey, row);
        const canActOnRow = canEditTimetable && !lockReason;
        const isDeletingRow =
          isDeletingFromList && listDeleteTarget?.row.cell.sessionId === row.cell.sessionId;
        return (
          <li key={row.cell.sessionId || row.cell.id} className="flex items-stretch">
            <button
              type="button"
              disabled={!canActOnRow}
              onClick={() => handleOpenClassFromList(dayKey, row)}
              className={`min-w-0 flex-1 text-left px-3 py-2.5 flex items-start gap-3 transition-colors ${
                canActOnRow
                  ? "hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:bg-muted/50"
                  : "cursor-default"
              }`}
            >
              {options.showTime && (
                <div className="w-[88px] shrink-0 text-[11px] font-semibold text-foreground leading-tight">
                  {col?.timeTitle || row.cell.timeRange}
                  {col?.subTitle ? (
                    <div className="text-[10px] font-medium text-muted-foreground">{col.subTitle}</div>
                  ) : null}
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{courseLabel}</span>
                  {status && (
                    <Badge variant={status.variant} className="shrink-0 px-1.5 py-0 text-[10px]">
                      {status.label}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[row.cell.batchCode, row.cell.roomNo ? `Room ${row.cell.roomNo}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div className="text-xs text-muted-foreground truncate">{row.facultyName}</div>
              </div>
            </button>
            {canEditTimetable && (
              <span
                className="flex shrink-0 flex-col justify-center gap-1 pr-2 py-2"
                title={lockReason ?? undefined}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canActOnRow || isDeletingFromList}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenClassFromList(dayKey, row);
                  }}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
                {canDeleteTimetableClass && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canActOnRow || isDeletingFromList}
                    onClick={(e) => {
                      e.stopPropagation();
                      setListDeleteTarget({ dayKey, row });
                    }}
                    className="h-7 gap-1 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    {isDeletingRow ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Delete
                  </Button>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );

  const handleSaveSlot = async () => {
    if (!modalFacultyId) {
      setModalFormErrors({ faculty: "Faculty instructor is required." });
      setNotificationMsg("Faculty instructor is required.");
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    const dayConfig = daysConfig.find((d) => d.key === modalDayKey);
    if (dayConfig && !dayConfig.isWorking) {
      setModalFormErrors({ day: `${dayConfig.note || "Holiday"} — scheduling is closed for this day.` });
      setNotificationMsg(`${dayConfig.note || "Holiday"} — scheduling is closed for this day.`);
      setTimeout(() => setNotificationMsg(null), 4500);
      return;
    }

    const { start, end, timeslotMasterId } = periodToTimes(modalPeriod, timeSlotColumns);
    const scheduledDate = getDateForDayKey(modalDayKey);
    const fac =
      facultyMembers.find((f: { id: string; branchId?: string }) => f.id === modalFacultyId) ||
      facultyRoster.find((f) => f.id === modalFacultyId);
    const branchId =
      (fac && "branchId" in fac ? fac.branchId : undefined) ||
      facultyRoster.find((f) => f.id === modalFacultyId)?.branchId;

    const clearBlockForSlot = async () => {
      await deleteScheduleBlockByKey.mutateAsync({
        facultyId: modalFacultyId,
        scheduledDate,
        startTime: start,
      });
    };

    // FREE → delete session + block; cell falls back to master column default
    if (modalSlotType === "FREE") {
      try {
        if (modalSessionId) {
          await deleteSession.mutateAsync(modalSessionId);
        }
        await clearBlockForSlot();
        setNotificationMsg(`✓ Slot cleared for ${modalDayKey} Period ${modalPeriod}.`);
        setIsEditModalOpen(false);
      } catch (err: unknown) {
        setNotificationMsg(getApiErrorMessage(err, "Failed to clear slot. Please try again."));
      }
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    // BREAK / LUNCH → delete overlapping class + upsert faculty block
    if (modalSlotType === "BREAK" || modalSlotType === "LUNCH") {
      try {
        if (modalSessionId) {
          await deleteSession.mutateAsync(modalSessionId);
        }
        await upsertScheduleBlock.mutateAsync({
          facultyId: modalFacultyId,
          branchId: branchId || undefined,
          scheduledDate,
          startTime: start,
          endTime: end,
          timeslotMasterId: timeslotMasterId || undefined,
          blockType: modalSlotType,
        });
        setNotificationMsg(
          `✓ ${modalSlotType === "LUNCH" ? "Lunch" : "Break"} set for ${modalDayKey} Period ${modalPeriod}.`
        );
        setSelectedDayKey(modalDayKey);
        setIsEditModalOpen(false);
      } catch (err: unknown) {
        setNotificationMsg(getApiErrorMessage(err, "Failed to save slot status. Please try again."));
      }
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    // CLASS → create/update session; delete any block for this slot
    const errors: Record<string, string> = {};
    const batch = batches.find((b) => b.id === modalBatchId);

    if (!fac) errors.faculty = "Faculty instructor is required.";
    if (!batch) {
      errors.batch =
        batches.length === 0
          ? "No batches available. Create a batch first."
          : "Batch is required.";
    } else if (!batchIncludesFaculty(batch, modalFacultyId) && facultyBatches.length > 0) {
      errors.batch = "Selected batch is not assigned to this faculty.";
    }

    const subjectRows = batch ? getBatchCourseRows(batch) : [];
    const subjectCourseId =
      modalSubjectCourseId ||
      modalSubjectOptions[0]?.courseId ||
      subjectRows[0]?.courseId ||
      batch?.courseId;
    if (!subjectCourseId) errors.subject = "Subject is required.";

    if (!timeslotMasterId && bookableSlots.length > 0) {
      errors.period = "Time slot is required. Configure Time Slots in Master Setup.";
    }

    // Client-side: slot already occupied by another class for this faculty/day/period
    if (!modalSessionId) {
      const facRow = facultyRoster.find((f) => f.id === modalFacultyId);
      const existingCell = facRow?.weeklySchedule?.[modalDayKey]?.[modalPeriod];
      if (existingCell?.type === "CLASS" && existingCell.sessionId) {
        errors.period = `This time slot is already assigned${
          existingCell.title || existingCell.courseName
            ? ` (${existingCell.title || existingCell.courseName})`
            : ""
        }. Choose another slot.`;
      }
    }

    setModalFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setNotificationMsg(Object.values(errors)[0]);
      setTimeout(() => setNotificationMsg(null), 4500);
      return;
    }

    const sessionFacultyId = modalFacultyId;
    const subjectName = getCourseNameInBatch(batch!, subjectCourseId!) || batch!.name;
    const subjectRow = subjectRows.find((r) => r.courseId === subjectCourseId);

    const payload = {
      title: modalTitle.trim() || subjectName || batch!.name || "Class Session",
      batchId: batch!.id,
      batchCourseId: subjectRow?.id || undefined,
      facultyId: sessionFacultyId,
      branchId: batch!.branchId || ("branchId" in fac! ? fac!.branchId : undefined),
      scheduledDate,
      startTime: start,
      endTime: end,
      timeslotMasterId: timeslotMasterId || undefined,
      classroomMasterId: modalMode !== "ONLINE" ? modalClassroomMasterId || undefined : undefined,
      mode: modalMode,
    };

    try {
      await clearBlockForSlot();
      let savedId = modalSessionId;
      if (modalSessionId) {
        await updateSession.mutateAsync({ id: modalSessionId, payload });
        setNotificationMsg(`✓ Schedule updated for ${modalDayKey} Period ${modalPeriod}.`);
      } else {
        const created = await createSession.mutateAsync(payload);
        savedId = created.data?.id || null;
        setNotificationMsg(`✓ Class scheduled for ${modalDayKey} Period ${modalPeriod}.`);
      }
      if (modalMode === "ONLINE" && savedId) {
        try {
          await classSessionsApi.createGoogleMeet(savedId);
          setNotificationMsg(
            `✓ Class scheduled for ${modalDayKey} Period ${modalPeriod} with Google Meet.`
          );
        } catch {
          setNotificationMsg(
            `✓ Class saved, but Google Meet creation failed for ${modalDayKey} Period ${modalPeriod}.`
          );
        }
      }
      setModalFormErrors({});
      setSelectedDayKey(modalDayKey);
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      const apiMessage = getApiErrorMessage(
        err,
        "Failed to save class session. Please check the form and try again."
      );
      setNotificationMsg(apiMessage);
      if (/time slot|already assign|already has a class|conflict/i.test(apiMessage)) {
        setModalFormErrors({ period: apiMessage });
      }
    }
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleDeleteSlot = async (facultyId: string, dayKey: DayKey, period: number) => {
    const fac = facultyRoster.find((f) => f.id === facultyId);
    const cell = fac?.weeklySchedule[dayKey]?.[period];

    if (!cell?.sessionId && !cell?.blockId) {
      setNotificationMsg("No class or block to remove for this slot.");
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    const label = cell.sessionId
      ? `class "${cell.courseName || "session"}" (${cell.batchCode || ""})`
      : cell.type === "LUNCH"
      ? "Lunch block"
      : "Break block";
    const confirmed = window.confirm(`Remove ${label} from this slot?`);
    if (!confirmed) return;

    await clearSlotItems(facultyId, dayKey, period, cell);
  };

  /** Deletes the class session and/or faculty block backing a slot. Returns true on success. */
  const clearSlotItems = async (
    facultyId: string,
    dayKey: DayKey,
    period: number,
    cell: TimetableCellItem
  ): Promise<boolean> => {
    const { start } = periodToTimes(period, timeSlotColumns);
    const scheduledDate = getDateForDayKey(dayKey);
    let ok = false;
    try {
      if (cell.sessionId) {
        await deleteSession.mutateAsync(cell.sessionId);
      }
      if (cell.blockId || cell.type === "BREAK" || cell.type === "LUNCH") {
        await deleteScheduleBlockByKey.mutateAsync({
          facultyId,
          scheduledDate,
          startTime: start,
        });
      }
      setNotificationMsg(`✓ Slot cleared for period ${period}.`);
      ok = true;
    } catch (err: unknown) {
      setNotificationMsg(getApiErrorMessage(err, "Failed to clear slot. Please try again."));
    }
    setTimeout(() => setNotificationMsg(null), 3000);
    return ok;
  };

  const handleConfirmDeleteFromList = async () => {
    if (!listDeleteTarget) return;
    const { dayKey, row } = listDeleteTarget;
    setIsDeletingFromList(true);
    const ok = await clearSlotItems(row.facultyId, dayKey, row.period, row.cell);
    setIsDeletingFromList(false);
    if (ok) setListDeleteTarget(null);
  };

  const handleOpenMoveModal = (facultyId: string, dayKey: DayKey, period: number) => {
    setMoveSource({ facultyId, dayKey, period });
    const nextPeriod =
      timeSlotColumns.find((s) => s.period > period)?.period ||
      timeSlotColumns.find((s) => s.period !== period)?.period ||
      period;
    setTargetPeriod(nextPeriod);
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

    const { start, end, timeslotMasterId } = periodToTimes(targetPeriod, timeSlotColumns);

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
          timeslotMasterId: timeslotMasterId || undefined,
          scheduledDate: getDateForDayKey(dayKey),
        },
      });
      setNotificationMsg(`✓ Class moved from Period ${period} to Period ${targetPeriod}.`);
      setIsMoveModalOpen(false);
    } catch (err: unknown) {
      setNotificationMsg(getApiErrorMessage(err, "Failed to move class session. Please try again."));
    }

    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = "Faculty,Employee Code,Department,Center,Day,09-10 AM,10-11 AM,11-12 PM,12-01 PM,01-02 PM,02-03 PM,03-04 PM,04-05 PM\n";
    const rows = filteredFaculty
      .map((fac) => {
        const daySlots = fac.weeklySchedule[selectedDayKey] || {};
        const slotValues = timeSlotColumns.map((col) => {
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

  /** Shared period cell for day-grid and faculty-week grid. */
  const renderPeriodCell = (
    facultyId: string,
    dayKey: DayKey,
    col: TimetablePeriodSlot,
    cell: TimetableCellItem,
    dayOff = false
  ) => {
    const openModal = () => {
      if (dayOff) {
        const dayConfig = daysConfig.find((d) => d.key === dayKey);
        setNotificationMsg(
          `${dayConfig?.note || "Holiday"} — scheduling is closed for this day. Manage holidays in Master Setup.`
        );
        setTimeout(() => setNotificationMsg(null), 4000);
        return;
      }
      handleOpenAddOrEditModal(facultyId, dayKey, col.period, cell);
    };

    if (cell.type === "CLASS") {
      return (
        <td key={`${dayKey}-${col.period}`} className="p-1 border-r border-border last:border-r-0 align-middle">
          <div
            className={`h-[52px] px-1.5 py-1 rounded-md border border-blue-500/30 bg-blue-500/10 text-left flex flex-col justify-between group ${
              dayOff ? "opacity-50" : "hover:bg-blue-500/20 hover:border-blue-500/50 transition-all"
            }`}
          >
            <div className="flex items-center justify-between gap-0.5">
              <span className="text-[9px] font-semibold text-blue-900 dark:text-blue-200 truncate block leading-tight">
                {cell.courseName}
              </span>
              {canEditTimetable && !dayOff && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-0.5 hover:bg-blue-500/20 rounded text-blue-600 dark:text-blue-400 transition-opacity cursor-pointer shrink-0">
                      <MoreVertical className="h-2.5 w-2.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-lg bg-popover border border-border shadow-xl p-1 text-xs">
                    <DropdownMenuItem
                      onClick={() => handleOpenAddOrEditModal(facultyId, dayKey, col.period, cell)}
                      className="gap-2 cursor-pointer text-xs py-1.5"
                    >
                      <Edit3 className="h-3 w-3 text-blue-500" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleOpenMoveModal(facultyId, dayKey, col.period)}
                      className="gap-2 cursor-pointer text-xs py-1.5"
                    >
                      <MoveHorizontal className="h-3 w-3 text-indigo-400" /> Move
                    </DropdownMenuItem>
                    {canDeleteTimetableClass && (
                      <>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem
                          onClick={() => handleDeleteSlot(facultyId, dayKey, col.period)}
                          className="gap-2 text-rose-500 cursor-pointer text-xs py-1.5"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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

    if (cell.type === "FREE") {
      return (
        <td key={`${dayKey}-${col.period}`} className="p-1 border-r border-border last:border-r-0 align-middle">
          {canEditTimetable && !dayOff ? (
            <button
              type="button"
              onClick={openModal}
              className="h-[52px] w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all flex flex-col items-center justify-center cursor-pointer group"
            >
              <span className="text-[8px] font-semibold text-emerald-600 dark:text-emerald-300 uppercase">Free</span>
              <span className="mt-0.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 group-hover:bg-emerald-500/25">
                <Plus className="h-2 w-2" /> Add
              </span>
            </button>
          ) : (
            <div className={`h-[52px] w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 flex flex-col items-center justify-center ${dayOff ? "opacity-50" : ""}`}>
              <span className="text-[8px] font-semibold text-emerald-600 dark:text-emerald-300 uppercase">Free</span>
            </div>
          )}
        </td>
      );
    }

    if (cell.type === "BREAK") {
      return (
        <td key={`${dayKey}-${col.period}`} className="p-1 border-r border-border last:border-r-0 align-middle">
          {canEditTimetable && !dayOff ? (
            <button
              type="button"
              onClick={openModal}
              className="h-[52px] w-full rounded-md border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all flex flex-col items-center justify-center cursor-pointer group text-amber-600 dark:text-amber-300"
            >
              <span className="text-[8px] font-semibold uppercase">Break</span>
              <span className="mt-0.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/15 group-hover:bg-amber-500/25">
                {cell.blockId ? (
                  <><Edit3 className="h-2 w-2" /> Edit</>
                ) : (
                  <><Plus className="h-2 w-2" /> Add</>
                )}
              </span>
            </button>
          ) : (
            <div className={`h-[52px] w-full rounded-md border border-amber-500/30 bg-amber-500/10 flex flex-col items-center justify-center text-amber-600 dark:text-amber-300 ${dayOff ? "opacity-50" : ""}`}>
              <span className="text-[8px] font-semibold uppercase">Break</span>
              <Coffee className="h-2.5 w-2.5 mt-0.5 text-amber-500 dark:text-amber-400" />
            </div>
          )}
        </td>
      );
    }

    if (cell.type === "LUNCH") {
      return (
        <td key={`${dayKey}-${col.period}`} className="p-1 border-r border-border last:border-r-0 align-middle">
          {canEditTimetable && !dayOff ? (
            <button
              type="button"
              onClick={openModal}
              className="h-[52px] w-full rounded-md border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all flex flex-col items-center justify-center cursor-pointer group text-orange-600 dark:text-orange-300"
            >
              <span className="text-[8px] font-semibold uppercase">Lunch</span>
              <span className="mt-0.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-medium text-orange-700 dark:text-orange-300 bg-orange-500/15 group-hover:bg-orange-500/25">
                {cell.blockId ? (
                  <><Edit3 className="h-2 w-2" /> Edit</>
                ) : (
                  <><Plus className="h-2 w-2" /> Add</>
                )}
              </span>
            </button>
          ) : (
            <div className={`h-[52px] w-full rounded-md border border-orange-500/30 bg-orange-500/10 flex flex-col items-center justify-center text-orange-600 dark:text-orange-300 ${dayOff ? "opacity-50" : ""}`}>
              <span className="text-[8px] font-semibold uppercase">Lunch</span>
              <UtensilsCrossed className="h-2.5 w-2.5 mt-0.5 text-orange-500 dark:text-orange-400" />
            </div>
          )}
        </td>
      );
    }

    if (cell.type === "LEAVE") {
      return (
        <td key={`${dayKey}-${col.period}`} className="p-1 border-r border-border last:border-r-0 align-middle">
          {canEditTimetable && !dayOff ? (
            <button
              type="button"
              onClick={openModal}
              className="h-[52px] w-full rounded-md border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex flex-col items-center justify-center cursor-pointer text-rose-600 dark:text-rose-300"
            >
              <span className="text-[8px] font-semibold uppercase">Leave</span>
              <span className="text-[7px] text-rose-500 dark:text-rose-400 mt-0.5">Off</span>
            </button>
          ) : (
            <div className={`h-[52px] w-full rounded-md border border-rose-500/30 bg-rose-500/10 flex flex-col items-center justify-center text-rose-600 dark:text-rose-300 ${dayOff ? "opacity-50" : ""}`}>
              <span className="text-[8px] font-semibold uppercase">Leave</span>
              <span className="text-[7px] text-rose-500 dark:text-rose-400 mt-0.5">Off</span>
            </div>
          )}
        </td>
      );
    }

    if (cell.type === "MEETING") {
      return (
        <td key={`${dayKey}-${col.period}`} className="p-1 border-r border-border last:border-r-0 align-middle">
          {canEditTimetable && !dayOff ? (
            <button
              type="button"
              onClick={openModal}
              className="h-[52px] w-full rounded-md border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors flex flex-col items-center justify-center cursor-pointer text-purple-600 dark:text-purple-300"
            >
              <span className="text-[8px] font-semibold uppercase">Meeting</span>
              <span className="text-[7px] text-purple-500 dark:text-purple-400 mt-0.5">Sync</span>
            </button>
          ) : (
            <div className={`h-[52px] w-full rounded-md border border-purple-500/30 bg-purple-500/10 flex flex-col items-center justify-center text-purple-600 dark:text-purple-300 ${dayOff ? "opacity-50" : ""}`}>
              <span className="text-[8px] font-semibold uppercase">Meeting</span>
              <span className="text-[7px] text-purple-500 dark:text-purple-400 mt-0.5">Sync</span>
            </div>
          )}
        </td>
      );
    }

    return (
      <td key={`${dayKey}-${col.period}`} className="p-1 border-r border-border last:border-r-0 align-middle">
        {canEditTimetable && !dayOff ? (
          <button
            type="button"
            onClick={openModal}
            className="h-[52px] w-full rounded-md border border-border bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center cursor-pointer group"
          >
            <span className="text-[8px] font-medium text-muted-foreground">Empty</span>
            <span className="mt-0.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-medium text-muted-foreground bg-muted/40 group-hover:bg-muted/60">
              <Plus className="h-2 w-2" /> Add
            </span>
          </button>
        ) : (
          <div className={`h-[52px] w-full rounded-md border border-border bg-muted/20 flex flex-col items-center justify-center ${dayOff ? "opacity-50" : ""}`}>
            <span className="text-[8px] font-medium text-muted-foreground">Empty</span>
          </div>
        )}
      </td>
    );
  };

  return (
    <PageContainer density="compact">
      <PageHeader
        title="Timetable"
        description={branchLabel}
        actions={
          <>
            <PermissionGate itemKey="schedule.timetable" mode="write">
              <Button
                size="sm"
                onClick={() => {
                  if (isFacultyWeekView) {
                    const fac = selectedWeekFaculty || facultyRoster.find((f) => f.id === selectedFacultyId);
                    if (!fac) return;
                    const preferredDay =
                      daysConfig.find((d) => d.key === selectedDayKey && d.isWorking) ||
                      daysConfig.find((d) => d.isWorking) ||
                      daysConfig[0];
                    handleOpenAddOrEditModal(fac.id, preferredDay.key, 1);
                    return;
                  }
                  const preferredDay =
                    daysConfig.find((d) => d.key === selectedDayKey && d.isWorking) ||
                    daysConfig.find((d) => d.isWorking) ||
                    daysConfig[0];
                  const defaultFac = facultySelectOptions[0] || facultyRoster[0];
                  if (!defaultFac) {
                    setNotificationMsg("No faculty available. Add faculty first.");
                    setTimeout(() => setNotificationMsg(null), 3000);
                    return;
                  }
                  const firstBookable = bookableSlots[0]?.period ?? 1;
                  handleOpenAddOrEditModal(defaultFac.id, preferredDay.key, firstBookable);
                }}
                className="h-9 gap-1.5 font-semibold shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Add class
              </Button>
            </PermissionGate>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </>
        }
      />

      <FilterToolbar className="flex flex-col gap-2.5 !items-stretch !py-0">
        {/* Row 1: week + search + branch/course filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center h-9 rounded-lg border border-border bg-background shrink-0">
            <button
              type="button"
              onClick={() => setWeekOffset((p) => p - 1)}
              className="h-full px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-l-lg transition-colors"
              title="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2.5 text-xs font-semibold text-foreground whitespace-nowrap tabular-nums min-w-[9.5rem] text-center">
              {weekDateLabel}
            </span>
            <button
              type="button"
              onClick={() => setWeekOffset((p) => p + 1)}
              className="h-full px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-r-lg transition-colors"
              title="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search faculty or batch..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="h-9 pl-8 text-sm border-border"
            />
          </div>

          {isAdmin ? (
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                if (viewMode === "FACULTY_WEEK") {
                  setSelectedFacultyId("");
                }
              }}
              className="h-9 min-w-[140px] px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              aria-label="Branch"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          ) : (
            <span className="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs text-muted-foreground border border-border rounded-lg bg-muted/30">
              <Lock className="h-3 w-3" /> {userCenterName}
            </span>
          )}

          <select
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
            }}
            className="h-9 min-w-[140px] px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            aria-label="Course"
          >
            <option value="ALL">All courses</option>
            {branchCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {(selectedCourse !== "ALL" || searchQuery.trim().length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCourse("ALL");
                setSearchQuery("");
              }}
              className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Row 2: view mode — Overall week | Faculty week */}
        <div
          className={`flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2 ${
            isFacultyWeekView
              ? "border-primary/25 bg-primary/5"
              : "border-border bg-muted/30"
          }`}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <Label
              htmlFor="timetable-view-mode"
              className="text-[11px] font-semibold text-foreground whitespace-nowrap"
            >
              View
            </Label>
          </div>
          <select
            id="timetable-view-mode"
            value={viewMode}
            onChange={(e) => {
              const next = e.target.value as TimetableViewMode;
              setViewMode(next);
              if (next === "FACULTY_WEEK" && !selectedFacultyId) {
                const first = facultySelectOptions[0];
                if (first) setSelectedFacultyId(first.id);
              }
            }}
            className="h-9 min-w-[200px] max-w-[280px] px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            title="Overall week shows all classes Mon–Sun. Faculty week is one teacher’s Mon–Sun schedule."
          >
            <option value="OVERALL_WEEK">Overall week</option>
            <option value="FACULTY_WEEK">Faculty week</option>
          </select>
          {isFacultyWeekView ? (
            <>
              <select
                id="timetable-faculty-week"
                value={selectedFacultyId}
                onChange={(e) => {
                  setSelectedFacultyId(e.target.value);
                }}
                className="h-9 min-w-[180px] max-w-[260px] px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                aria-label="Faculty for week view"
              >
                {facultySelectOptions.length === 0 ? (
                  <option value="">No faculty in scope</option>
                ) : (
                  facultySelectOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))
                )}
              </select>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Mon–Sun for{" "}
                <strong className="text-foreground font-semibold">
                  {selectedWeekFaculty?.name || "faculty"}
                </strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setViewMode("OVERALL_WEEK");
                }}
                className="h-9 px-2.5 gap-1.5 border-border"
              >
                <Calendar className="h-3.5 w-3.5" />
                Back to overall week
              </Button>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Full week · all classes · Break/Lunch columns can still hold a class when needed
            </span>
          )}
        </div>
      </FilterToolbar>

      {notificationMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notificationMsg}
        </div>
      )}

      {/* Timetable grid */}
      <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 text-muted-foreground text-xs">
          <span className="flex items-center gap-2 min-w-0">
            <span>
              {isOverallWeekView ? (
                <>
                  <strong className="text-foreground">Overall week</strong>
                  {" · "}
                  {weekDateLabel}
                  {" · "}
                  {overallWeekClassCount} class{overallWeekClassCount === 1 ? "" : "es"}
                </>
              ) : (
                <>
                  <strong className="text-foreground">
                    {selectedWeekFaculty?.name || "Faculty"}
                  </strong>
                  {" · "}Week schedule · {weekDateLabel}
                </>
              )}
            </span>
          </span>
          <span className="hidden sm:inline">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1" /> Class
            {!isOverallWeekView && (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mx-1 ml-3" /> Free
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mx-1 ml-3" /> Break
              </>
            )}
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          {slotsLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading time slots from Master Setup…</div>
          ) : slotsEmpty ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-bold text-foreground">No time slots configured</p>
              <p className="text-xs text-muted-foreground">
                Configure Time Slots in Admin Master Setup. This timetable uses those slots as its columns.
              </p>
            </div>
          ) : isOverallWeekView ? (
          <table className="w-full min-w-[980px] border-collapse text-left table-fixed">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider">
                <th className="py-2 px-3 pl-4 w-[140px] border-r border-border sticky left-0 bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] text-foreground">
                  DAY
                </th>
                {timeSlotColumns.map((col) => (
                  <th
                    key={col.period}
                    className="py-2 px-1 text-center w-[96px] border-r border-border last:border-r-0 font-bold text-foreground whitespace-nowrap"
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
              {sessionsLoading ? (
                <tr>
                  <td colSpan={1 + timeSlotColumns.length} className="p-12 text-center text-muted-foreground text-sm font-medium">
                    Loading timetable sessions...
                  </td>
                </tr>
              ) : (
                daysConfig.map((d, dayIdx) => {
                  const dayOff = !d.isWorking;
                  const bandBg = dayIdx % 2 === 0 ? "bg-muted/15" : "bg-card";
                  const dayClassCount = timeSlotColumns.reduce(
                    (n, col) => n + (overallWeekGrid[d.key]?.[col.period]?.length ?? 0),
                    0
                  );
                  return (
                    <tr
                      key={d.key}
                      className={`hover:bg-muted/30 transition-colors ${
                        dayOff ? "bg-rose-50/40 dark:bg-rose-950/10" : bandBg
                      }`}
                    >
                      <td
                        className={`p-1 border-r border-border align-middle sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] ${
                          dayOff ? "bg-rose-50/60 dark:bg-rose-950/20" : bandBg
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setDayListKey(d.key)}
                          title={`View all classes on ${d.fullDay}`}
                          className="w-full min-w-0 text-left rounded-md py-0.5 px-2 pl-3 cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                        >
                          <h4
                            className={`font-semibold text-[11px] truncate leading-tight ${
                              dayOff ? "text-rose-700 dark:text-rose-300" : "text-foreground"
                            }`}
                          >
                            {d.fullDay}
                          </h4>
                          <p className="text-[9px] text-muted-foreground truncate leading-tight">
                            {d.dateStr}
                            {dayClassCount > 0
                              ? ` · ${dayClassCount} ${dayClassCount === 1 ? "class" : "classes"}`
                              : ""}
                          </p>
                          {dayOff && (
                            <p className="text-[8px] font-medium text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                              {d.note || "Holiday"}
                            </p>
                          )}
                        </button>
                      </td>
                      {timeSlotColumns.map((col, colIdx) => {
                        const chips = overallWeekGrid[d.key]?.[col.period] ?? [];

                        if (dayOff) {
                          return (
                            <td
                              key={`${d.key}-${col.period}`}
                              className="p-1 border-r border-border last:border-r-0 align-middle bg-rose-50/50 dark:bg-rose-950/15"
                            >
                              {colIdx === 0 ? (
                                <div className="min-h-[52px] rounded-md border border-rose-500/20 bg-rose-500/10 flex flex-col items-center justify-center px-1 text-center">
                                  <Calendar className="h-3 w-3 text-rose-500 mb-0.5" />
                                  <span className="text-[8px] font-semibold text-rose-700 dark:text-rose-300 leading-tight">
                                    {d.note || "Holiday"}
                                  </span>
                                </div>
                              ) : (
                                <div className="min-h-[28px]" />
                              )}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={`${d.key}-${col.period}`}
                            className="p-1 border-r border-border last:border-r-0 align-top"
                          >
                            <div className="flex flex-col gap-1 min-h-[52px]">
                              {chips.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSlotListTarget({ dayKey: d.key, period: col.period })
                                  }
                                  className="min-h-[52px] w-full text-left px-1.5 py-1 rounded-md border border-blue-500/40 bg-blue-500/15 hover:bg-blue-500/25 hover:border-blue-500/60 cursor-pointer transition-all flex flex-col justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  title={chips
                                    .map(
                                      (chip) =>
                                        `${chip.cell.courseName || chip.cell.title || "Class"} · ${chip.cell.batchCode || ""} · ${chip.facultyName}`
                                    )
                                    .join("\n")}
                                >
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 dark:text-blue-200 leading-tight">
                                    <Users className="h-2.5 w-2.5 shrink-0" />
                                    {chips.length} classes
                                  </span>
                                  <span className="text-[8px] text-muted-foreground truncate leading-tight mt-0.5">
                                    {chips[0].cell.courseName || chips[0].cell.title || "Class"}
                                    {` +${chips.length - 1}`}
                                  </span>
                                </button>
                              )}
                              {chips.length === 1 && chips.map((chip) => (
                                <button
                                  key={chip.cell.sessionId || chip.cell.id}
                                  type="button"
                                  disabled={!canEditTimetable}
                                  onClick={() => {
                                    if (!canEditTimetable) return;
                                    handleOpenAddOrEditModal(
                                      chip.facultyId,
                                      d.key,
                                      col.period,
                                      chip.cell
                                    );
                                  }}
                                  className={`w-full text-left px-1.5 py-1 rounded-md border border-blue-500/30 bg-blue-500/10 transition-all ${
                                    canEditTimetable
                                      ? "hover:bg-blue-500/20 hover:border-blue-500/50 cursor-pointer"
                                      : "cursor-default opacity-90"
                                  }`}
                                  title={`${chip.cell.courseName || chip.cell.title || "Class"} · ${chip.facultyName}`}
                                >
                                  <div className="text-[9px] font-semibold text-blue-900 dark:text-blue-200 truncate leading-tight">
                                    {chip.cell.courseName || chip.cell.title || "Class"}
                                  </div>
                                  <div className="text-[8px] font-medium text-foreground/90 truncate leading-tight">
                                    {chip.cell.batchCode}
                                    {chip.cell.roomNo ? ` · ${chip.cell.roomNo}` : ""}
                                  </div>
                                  <div className="text-[8px] text-muted-foreground truncate leading-tight">
                                    {chip.facultyName}
                                  </div>
                                </button>
                              ))}
                              {chips.length === 0 && canEditTimetable && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const defaultFac =
                                      facultySelectOptions[0] || facultyRoster[0];
                                    if (!defaultFac) {
                                      setNotificationMsg(
                                        "No faculty available. Add faculty first."
                                      );
                                      setTimeout(() => setNotificationMsg(null), 3000);
                                      return;
                                    }
                                    handleOpenAddOrEditModal(
                                      defaultFac.id,
                                      d.key,
                                      col.period
                                    );
                                  }}
                                  className={`min-h-[52px] w-full rounded-md border transition-all flex flex-col items-center justify-center cursor-pointer group ${
                                    col.isLunch
                                      ? "border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-500/50 text-orange-600 dark:text-orange-300"
                                      : col.isBreak
                                        ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/50 text-amber-600 dark:text-amber-300"
                                        : "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/50"
                                  }`}
                                >
                                  <span
                                    className={`text-[8px] font-semibold uppercase ${
                                      col.isLunch
                                        ? ""
                                        : col.isBreak
                                          ? ""
                                          : "text-emerald-600 dark:text-emerald-300"
                                    }`}
                                  >
                                    {col.isLunch ? "Lunch" : col.isBreak ? "Break" : "Free"}
                                  </span>
                                  <span
                                    className={`mt-0.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-medium ${
                                      col.isLunch
                                        ? "text-orange-700 dark:text-orange-300 bg-orange-500/15 group-hover:bg-orange-500/25"
                                        : col.isBreak
                                          ? "text-amber-700 dark:text-amber-300 bg-amber-500/15 group-hover:bg-amber-500/25"
                                          : "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 group-hover:bg-emerald-500/25"
                                    }`}
                                  >
                                    <Plus className="h-2 w-2" /> Add
                                  </span>
                                </button>
                              )}
                              {chips.length === 0 && !canEditTimetable && (
                                <div
                                  className={`min-h-[52px] w-full rounded-md border flex flex-col items-center justify-center ${
                                    col.isLunch
                                      ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300"
                                      : col.isBreak
                                        ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                                        : "border-emerald-500/30 bg-emerald-500/10"
                                  }`}
                                >
                                  <span
                                    className={`text-[8px] font-semibold uppercase ${
                                      col.isLunch || col.isBreak
                                        ? ""
                                        : "text-emerald-600 dark:text-emerald-300"
                                    }`}
                                  >
                                    {col.isLunch ? "Lunch" : col.isBreak ? "Break" : "Free"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          ) : (
          <table className="w-full min-w-[980px] border-collapse text-left table-fixed">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider">
                <th className="py-2 px-3 pl-4 w-[140px] border-r border-border sticky left-0 bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] text-foreground">
                  DAY
                </th>
                {timeSlotColumns.map((col) => (
                  <th
                    key={col.period}
                    className="py-2 px-1 text-center w-[96px] border-r border-border last:border-r-0 font-bold text-foreground whitespace-nowrap"
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
              {sessionsLoading ? (
                <tr>
                  <td colSpan={1 + timeSlotColumns.length} className="p-12 text-center text-muted-foreground text-sm font-medium">
                    Loading timetable sessions...
                  </td>
                </tr>
              ) : !selectedWeekFaculty ? (
                <tr>
                  <td colSpan={1 + timeSlotColumns.length} className="p-12 text-center text-muted-foreground text-sm font-medium">
                    Faculty not found for the selected filters.
                  </td>
                </tr>
              ) : (
                daysConfig.map((d, dayIdx) => {
                  const daySlots = selectedWeekFaculty.weeklySchedule[d.key] || {};
                  const dayOff = !d.isWorking;
                  const bandBg = dayIdx % 2 === 0 ? "bg-muted/15" : "bg-card";
                  return (
                    <tr
                      key={d.key}
                      className={`hover:bg-muted/30 transition-colors ${
                        dayOff ? "bg-rose-50/40 dark:bg-rose-950/10" : bandBg
                      }`}
                    >
                      <td
                        className={`py-1.5 px-3 pl-4 border-r border-border align-middle sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] ${
                          dayOff ? "bg-rose-50/60 dark:bg-rose-950/20" : bandBg
                        }`}
                      >
                        <div className="min-w-0">
                          <h4
                            className={`font-semibold text-[11px] truncate leading-tight ${
                              dayOff ? "text-rose-700 dark:text-rose-300" : "text-foreground"
                            }`}
                          >
                            {d.fullDay}
                          </h4>
                          <p className="text-[9px] text-muted-foreground truncate leading-tight">
                            {d.dateStr}
                          </p>
                          {dayOff && (
                            <p className="text-[8px] font-medium text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                              {d.note || "Holiday"}
                            </p>
                          )}
                        </div>
                      </td>
                      {timeSlotColumns.map((col) => {
                        const cell = daySlots[col.period] || {
                          id: `slot-free-${d.key}-${col.period}`,
                          period: col.period,
                          timeRange: col.label,
                          type: col.isBreak ? "BREAK" : col.isLunch ? "LUNCH" : "FREE",
                        } as TimetableCellItem;
                        return renderPeriodCell(selectedWeekFaculty.id, d.key, col, cell, dayOff);
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          )}
        </div>
      </Card>

      {/* ─── OVERALL WEEK: ALL CLASSES FOR A DAY ─────────────────────────── */}
      <Sheet open={dayListKey !== null} onOpenChange={(open) => !open && setDayListKey(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-4 overflow-hidden">
          <SheetHeader className="pr-6">
            <SheetTitle>
              {dayListConfig ? `${dayListConfig.fullDay} · ${dayListConfig.dateStr}` : "Classes"}
            </SheetTitle>
            <SheetDescription>
              {dayListConfig && !dayListConfig.isWorking
                ? `${dayListConfig.note || "Holiday"} — scheduling is closed for this day.`
                : `${dayListRows.length} ${dayListRows.length === 1 ? "class" : "classes"} · ${branchLabel}${
                    canEditTimetable ? " · Edit or delete a class" : ""
                  }`}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {dayListKey && dayListRows.length > 0 ? (
              renderClassListRows(dayListKey, dayListRows, { showTime: true })
            ) : (
              <div className="py-12 text-center space-y-1">
                <Calendar className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">No classes scheduled</p>
                <p className="text-xs text-muted-foreground">
                  Nothing matches the current filters for this day.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── OVERALL WEEK: CLASSES IN ONE SLOT ──────────────────────────── */}
      <Dialog open={slotListTarget !== null} onOpenChange={(open) => !open && setSlotListTarget(null)}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {slotListConfig ? `${slotListConfig.fullDay} · ${slotListConfig.dateStr}` : "Classes"}
            </DialogTitle>
            <DialogDescription>
              {slotListColumn
                ? `${slotListColumn.timeTitle}${slotListColumn.subTitle ? ` (${slotListColumn.subTitle})` : ""}`
                : ""}
              {` · ${slotListRows.length} ${slotListRows.length === 1 ? "class" : "classes"}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {slotListTarget && slotListRows.length > 0 ? (
              renderClassListRows(slotListTarget.dayKey, slotListRows, { showTime: false })
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No classes in this time slot.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── OVERALL WEEK: CONFIRM DELETE FROM LIST ─────────────────────── */}
      <Dialog
        open={listDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingFromList) setListDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete class?</DialogTitle>
            <DialogDescription>
              {listDeleteTarget
                ? `"${
                    listDeleteTarget.row.cell.courseName || listDeleteTarget.row.cell.title || "Class"
                  }"${
                    listDeleteTarget.row.cell.batchCode ? ` (${listDeleteTarget.row.cell.batchCode})` : ""
                  } with ${listDeleteTarget.row.facultyName} will be removed from the timetable. This can't be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={isDeletingFromList}
              onClick={() => setListDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeletingFromList}
              onClick={handleConfirmDeleteFromList}
              className="gap-1.5"
            >
              {isDeletingFromList ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 1: ADD / EDIT CLASS SCHEDULE ─────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-primary border border-blue-200 uppercase">
                {modalDayKey} • Period {modalPeriod} ({timeSlotColumns.find((c) => c.period === modalPeriod)?.label})
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Manage Faculty Schedule
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Create, edit, or configure status for the selected faculty timetable slot.
              {(() => {
                const meta = timeSlotColumns.find((c) => c.period === modalPeriod);
                if (meta?.isBreak) return <> This period is a Break in Master Setup.</>;
                if (meta?.isLunch) return <> This period is a Lunch in Master Setup.</>;
                return null;
              })()}
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
                  setModalBatchId("");
                  setModalSubjectCourseId("");
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
                  onChange={(e) => {
                    setModalDayKey(e.target.value as DayKey);
                    setModalFormErrors((prev) => ({ ...prev, day: "" }));
                  }}
                  className={`w-full h-9 px-3 mt-1 bg-slate-50 border rounded-xl font-medium outline-none ${
                    modalFormErrors.day ? "border-rose-400" : "border-slate-200"
                  }`}
                >
                  {daysConfig.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.fullDay} ({d.dateStr})
                    </option>
                  ))}
                </select>
                {modalFormErrors.day && (
                  <p className="text-[10px] text-rose-600 mt-1 font-medium">{modalFormErrors.day}</p>
                )}
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700">Time Period *</Label>
                <select
                  value={modalPeriod}
                  onChange={(e) => {
                    setModalPeriod(Number(e.target.value));
                    setModalFormErrors((prev) => ({ ...prev, period: "" }));
                  }}
                  className={`w-full h-9 px-3 mt-1 bg-slate-50 border rounded-xl font-medium outline-none ${
                    modalFormErrors.period ? "border-rose-400" : "border-slate-200"
                  }`}
                >
                  {timeSlotColumns.map((col) => (
                    <option key={col.period} value={col.period}>
                      Period {col.period} ({col.label})
                      {col.isBreak ? " · Break" : col.isLunch ? " · Lunch" : ""}
                    </option>
                  ))}
                </select>
                {modalFormErrors.period && (
                  <p className="text-[10px] text-rose-600 mt-1 font-medium">{modalFormErrors.period}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-slate-700">Slot Status *</Label>
                <select
                  value={modalSlotType}
                  onChange={(e) => setModalSlotType(e.target.value as SlotType)}
                  className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-bold text-primary outline-none"
                >
                  <option value="CLASS">Class Scheduled</option>
                  <option value="FREE">Free (clear class / block)</option>
                  <option value="BREAK">Break</option>
                  <option value="LUNCH">Lunch</option>
                </select>
              </div>
              <div className="flex items-end">
                <p className="text-[10px] text-slate-500 pb-2">
                  {timeSlotColumns.find((c) => c.period === modalPeriod)?.label}
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
                    onChange={(e) => {
                      setModalBatchId(e.target.value);
                      setModalFormErrors((prev) => ({ ...prev, batch: "", subject: "" }));
                    }}
                    className={`w-full h-9 px-3 mt-1 bg-slate-50 border rounded-xl font-medium outline-none ${
                      modalFormErrors.batch ? "border-rose-400" : "border-slate-200"
                    }`}
                  >
                    <option value="">Select batch</option>
                    {facultyBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.code} — {batch.name}
                        {` (${formatBatchSubjectNames(batch)})`}
                      </option>
                    ))}
                  </select>
                  {modalFormErrors.batch ? (
                    <p className="text-[10px] text-rose-600 mt-1 font-medium">{modalFormErrors.batch}</p>
                  ) : (
                    facultyBatches.length === 0 && (
                      <p className="text-[10px] text-rose-500 mt-1">
                        No batches found. Create a batch and assign this faculty first.
                      </p>
                    )
                  )}
                </div>

                {modalBatch && (
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Subject *</Label>
                    <select
                      value={modalSubjectCourseId}
                      onChange={(e) => {
                        setModalSubjectCourseId(e.target.value);
                        setModalFormErrors((prev) => ({ ...prev, subject: "" }));
                      }}
                      className={`w-full h-9 px-3 mt-1 bg-slate-50 border rounded-xl font-medium outline-none ${
                        modalFormErrors.subject ? "border-rose-400" : "border-slate-200"
                      }`}
                      disabled={modalSubjectOptions.length === 0}
                    >
                      {modalSubjectOptions.length === 0 ? (
                        <option value="">No subjects on this batch</option>
                      ) : (
                        modalSubjectOptions.map((row) => (
                          <option key={row.courseId} value={row.courseId}>
                            {row.course?.name || "Subject"}
                          </option>
                        ))
                      )}
                    </select>
                    {modalFormErrors.subject && (
                      <p className="text-[10px] text-rose-600 mt-1 font-medium">
                        {modalFormErrors.subject}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Class Mode</Label>
                  <select
                    value={modalMode}
                    onChange={(e) =>
                      setModalMode(e.target.value as "OFFLINE" | "ONLINE" | "HYBRID")
                    }
                    className="w-full h-9 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                  >
                    <option value="OFFLINE">Offline (In-Person)</option>
                    <option value="ONLINE">Online (Virtual Meeting)</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">
                    {modalMode === "ONLINE" ? "Meeting Type" : "Classroom / Lab"}
                  </Label>
                  {modalMode === "ONLINE" ? (
                    <div className="h-9 mt-1 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-2 font-bold">
                      <Video className="h-4 w-4" />
                      Google Meet (auto-created)
                    </div>
                  ) : (
                    <ClassroomDropdown
                      value={modalClassroomMasterId}
                      onChange={setModalClassroomMasterId}
                      branchId={
                        facultyRoster.find((f) => f.id === modalFacultyId)?.branchId ||
                        modalBatch?.branchId
                      }
                    />
                  )}
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
              className="bg-primary hover:bg-primary text-white text-xs font-bold h-9 rounded-xl"
            >
              <Save className="h-3.5 w-3.5 mr-1" /> Save Schedule Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: MOVE TIME SLOT ────────────────────────────────────── */}
      <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-xl p-6 border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
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
                className="w-full h-10 px-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-bold text-primary outline-none"
              >
                {timeSlotColumns.map((col) => (
                  <option key={col.period} value={col.period}>
                    Period {col.period} ({col.label})
                    {col.isBreak ? " · Break" : col.isLunch ? " · Lunch" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsMoveModalOpen(false)} className="text-xs font-bold rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleExecuteMoveSlot} className="bg-primary text-white text-xs font-bold rounded-xl">
              Confirm Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
