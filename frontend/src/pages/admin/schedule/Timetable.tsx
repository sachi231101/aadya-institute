import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
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
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useClassSessions,
  useCreateClassSession,
  useUpdateClassSession,
  useDeleteClassSession,
} from "@/hooks/useClassSessions";
import type { BackendClassSession } from "@/services/class-sessions.api";
import { classSessionsApi } from "@/services/class-sessions.api";
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
  localTodayKey,
  type TimetablePeriodSlot,
} from "@/constants/timetable-slots";
import { useTimetableSlotColumns } from "@/hooks/useTimetableSlotColumns";
import { getApiErrorMessage } from "@/utils/api-error";

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
import { ROUTES } from "@/constants/routes";
import {
  batchIncludesFaculty,
  formatBatchSubjectNames,
  getBatchCourseRows,
  getCourseNameInBatch,
  getSessionSubjectLabel,
} from "@/utils/batch.utils";

export const Timetable: React.FC = () => {
  const { user } = useAuthStore();
  const { canEditItem } = usePermissions();
  const canEditTimetable = canEditItem("schedule.timetable");
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

  const { data: sessionsResponse, isLoading: sessionsLoading } = useClassSessions(sessionQueryParams);
  const classSessions = sessionsResponse?.data ?? [];

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
      timeRange: col?.label || `${raw.startTime} – ${raw.endTime}`,
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
        const slots = createDefaultDaySlots(timeSlotColumns);

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
  }, [facultyMembers, classSessions, weekRange.mondayKey, branches, timeSlotColumns]);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Add / Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalFacultyId, setModalFacultyId] = useState<string>("");
  /** When true (opened from a faculty row/cell), faculty is fixed and shown read-only. */
  const [modalFacultyLocked, setModalFacultyLocked] = useState(false);
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
    // Wait for faculty before offering batches (header "Add class" searchable path).
    if (!modalFacultyId) return [];

    const fac =
      facultyMembers.find((f: { id: string; branchId?: string }) => f.id === modalFacultyId) ||
      facultyRoster.find((f) => f.id === modalFacultyId);
    const facultyBranchId =
      fac && "branchId" in fac ? (fac as { branchId?: string }).branchId : undefined;

    // Page/center branch wins; when Timetable is "All branches", fall back to faculty home branch.
    const pageBranchId =
      selectedBranch !== "ALL"
        ? selectedBranch
        : !isAdmin && userCenterId !== "ALL"
          ? userCenterId
          : undefined;

    const preferLinked = (scoped: typeof batches) => {
      const linked = scoped.filter((b) => batchIncludesFaculty(b, modalFacultyId));
      if (!isAdmin) return linked;
      if (linked.length === 0) return scoped;
      const linkedIds = new Set(linked.map((b) => b.id));
      return [...linked, ...scoped.filter((b) => !linkedIds.has(b.id))];
    };

    // Specific branch (or locked center): only batches for that branchId.
    if (pageBranchId) {
      return preferLinked(batches.filter((b) => b.branchId === pageBranchId));
    }

    // All branches + faculty: faculty home branch ∪ any batch they teach on (no institute-wide dump).
    const linkedAnywhere = batches.filter((b) => batchIncludesFaculty(b, modalFacultyId));
    if (!facultyBranchId) return linkedAnywhere;

    const sameBranch = batches.filter((b) => b.branchId === facultyBranchId);
    if (!isAdmin) {
      // Non-admin: assigned batches only (may include teach-on batches outside home branch).
      return linkedAnywhere;
    }

    const seen = new Set<string>();
    const merged: typeof batches = [];
    for (const b of [...linkedAnywhere, ...sameBranch]) {
      if (seen.has(b.id)) continue;
      seen.add(b.id);
      merged.push(b);
    }
    return merged;
  }, [
    batches,
    modalFacultyId,
    isAdmin,
    selectedBranch,
    userCenterId,
    facultyMembers,
    facultyRoster,
  ]);

  const modalBatch = useMemo(
    () => batches.find((b) => b.id === modalBatchId),
    [batches, modalBatchId]
  );

  /** Scoped list for the Batch select; keep an in-edit selection visible if it falls outside scope. */
  const batchSelectOptions = useMemo(() => {
    if (!modalBatchId || facultyBatches.some((b) => b.id === modalBatchId)) return facultyBatches;
    const current = batches.find((b) => b.id === modalBatchId);
    return current ? [current, ...facultyBatches] : facultyBatches;
  }, [facultyBatches, modalBatchId, batches]);

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

  // Prefill the only (or first linked) batch once faculty is known on a new CLASS slot.
  useEffect(() => {
    if (!isEditModalOpen || modalSlotType !== "CLASS" || modalSessionId) return;
    if (!modalFacultyId || modalBatchId) return;
    if (facultyBatches.length === 0) return;
    const preferred =
      facultyBatches.find((b) => batchIncludesFaculty(b, modalFacultyId)) || facultyBatches[0];
    if (preferred) setModalBatchId(preferred.id);
  }, [isEditModalOpen, modalSlotType, modalSessionId, modalBatchId, facultyBatches, modalFacultyId]);

  // Drop batch when it falls outside branch/faculty scope (e.g. faculty or page branch changed).
  // Keep selection while editing an existing session so the current batch stays visible.
  useEffect(() => {
    if (!isEditModalOpen || !modalBatchId) return;
    if (facultyBatches.some((b) => b.id === modalBatchId)) return;
    if (modalSessionId) return;
    setModalBatchId("");
    setModalSubjectCourseId("");
  }, [isEditModalOpen, modalBatchId, facultyBatches, modalSessionId]);

  // Current Selected Day Config
  const currentDayConfig = useMemo(() => {
    return daysConfig.find((d) => d.key === selectedDayKey) || daysConfig[0];
  }, [daysConfig, selectedDayKey]);
  const isSelectedDayOff = !currentDayConfig.isWorking;
  const selectedDayHolidayNote = currentDayConfig.note || "Holiday / Off";

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

  /** Faculty picker options for header "Add class" — branch-scoped when a branch is selected. */
  const modalFacultyPickerOptions = useMemo(() => {
    const branchScoped = facultyRoster.filter((fac) => {
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

    // Keep current selection visible even if it falls outside branch filter
    const list =
      modalFacultyId && !branchScoped.some((f) => f.id === modalFacultyId)
        ? [
            ...branchScoped,
            ...(facultyRoster.filter((f) => f.id === modalFacultyId)),
          ]
        : branchScoped;

    return list.map((f) => ({
      value: f.id,
      label: `${f.name} (${f.department}) – ${f.branchName}`,
    }));
  }, [
    facultyRoster,
    isAdmin,
    selectedBranch,
    userCenterId,
    classSessions,
    modalFacultyId,
  ]);

  const modalFacultyDisplay = useMemo(() => {
    return facultyRoster.find((f) => f.id === modalFacultyId) || null;
  }, [facultyRoster, modalFacultyId]);

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

  const resetModalFormFields = () => {
    setModalSessionId(null);
    setModalTitle("");
    setModalBatchId("");
    setModalClassroomMasterId("");
    setModalSubjectCourseId("");
    setModalSlotType("CLASS");
    setModalMode("OFFLINE");
    setModalFormErrors({});
  };

  /** Header "Add class" — faculty must be chosen via searchable picker. */
  const handleOpenHeaderAddClass = () => {
    if (isSelectedDayOff) return;
    const dayConfig = daysConfig.find((d) => d.key === selectedDayKey);
    if (dayConfig && !dayConfig.isWorking) {
      setNotificationMsg(
        `${dayConfig.note || "Holiday"} — scheduling is closed for this day. Manage holidays in Master Setup.`
      );
      setTimeout(() => setNotificationMsg(null), 4000);
      return;
    }

    const defaultPeriod = bookableSlots[0]?.period ?? 1;
    setModalFacultyLocked(false);
    setModalFacultyId("");
    setModalDayKey(selectedDayKey);
    setModalPeriod(defaultPeriod);
    resetModalFormFields();
    setIsEditModalOpen(true);
  };

  /** Grid cell / faculty row — faculty is already known (locked read-only). */
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

    const periodMeta = timeSlotColumns.find((c) => c.period === period);
    // Break / lunch are structural — do not open CLASS scheduler on them unless editing an existing class.
    if (
      (periodMeta?.isBreak || periodMeta?.isLunch) &&
      !(existingSlot && existingSlot.type === "CLASS")
    ) {
      setNotificationMsg("Break and Lunch slots cannot be scheduled. Pick a free teaching period.");
      setTimeout(() => setNotificationMsg(null), 3500);
      return;
    }

    setModalFacultyLocked(true);
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
      setModalFormErrors({});
    } else {
      resetModalFormFields();
    }

    setIsEditModalOpen(true);
  };

  const handleSaveSlot = async () => {
    if (!modalFacultyId) {
      setModalFormErrors({ faculty: "Faculty instructor is required." });
      setNotificationMsg("Faculty instructor is required.");
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    if (modalSlotType !== "CLASS") {
      if (modalSessionId) {
        try {
          await deleteSession.mutateAsync(modalSessionId);
          setNotificationMsg(`✓ Class removed from ${modalDayKey} Period ${modalPeriod}.`);
        } catch (err: unknown) {
          setNotificationMsg(getApiErrorMessage(err, "Failed to update slot. Please try again."));
        }
      } else {
        setNotificationMsg("No class session to clear in this slot.");
      }
      setIsEditModalOpen(false);
      setTimeout(() => setNotificationMsg(null), 3000);
      return;
    }

    const errors: Record<string, string> = {};
    const dayConfig = daysConfig.find((d) => d.key === modalDayKey);
    if (dayConfig && !dayConfig.isWorking) {
      errors.day = `${dayConfig.note || "Holiday"} — scheduling is closed for this day.`;
    }

    const fac =
      facultyMembers.find((f: { id: string; branchId?: string }) => f.id === modalFacultyId) ||
      facultyRoster.find((f) => f.id === modalFacultyId);
    const batch = batches.find((b) => b.id === modalBatchId);

    if (!fac) errors.faculty = "Faculty instructor is required.";
    if (!batch) {
      errors.batch =
        batches.length === 0
          ? "No batches available. Create a batch first."
          : facultyBatches.length === 0
            ? selectedBranch !== "ALL" || (!isAdmin && userCenterId !== "ALL")
              ? "No batches for this faculty in the selected branch."
              : "No batches assigned to this faculty. Assign them on the batch first."
            : "Batch is required.";
    } else if (!isAdmin && !batchIncludesFaculty(batch, modalFacultyId)) {
      // Admins may schedule any batch (dropdown lists all). Others must use assigned batches only.
      errors.batch = "Selected batch is not assigned to this faculty.";
    }

    const subjectRows = batch ? getBatchCourseRows(batch) : [];
    const subjectCourseId =
      modalSubjectCourseId ||
      modalSubjectOptions[0]?.courseId ||
      subjectRows[0]?.courseId ||
      batch?.courseId;
    if (!subjectCourseId) errors.subject = "Subject is required.";

    const periodMeta = timeSlotColumns.find((c) => c.period === modalPeriod);
    if (periodMeta?.isBreak || periodMeta?.isLunch) {
      errors.period = "Cannot schedule a class during Break or Lunch.";
    }

    const { start, end, timeslotMasterId } = periodToTimes(modalPeriod, timeSlotColumns);
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
      scheduledDate: getDateForDayKey(modalDayKey),
      startTime: start,
      endTime: end,
      timeslotMasterId: timeslotMasterId || undefined,
      classroomMasterId: modalMode !== "ONLINE" ? modalClassroomMasterId || undefined : undefined,
      mode: modalMode,
    };

    try {
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
      setUserPickedDay(true);
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
      setNotificationMsg(getApiErrorMessage(err, "Failed to delete class session. Please try again."));
    }
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleOpenMoveModal = (facultyId: string, dayKey: DayKey, period: number) => {
    setMoveSource({ facultyId, dayKey, period });
    const nextBookable =
      bookableSlots.find((s) => s.period > period)?.period ||
      bookableSlots.find((s) => s.period !== period)?.period ||
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

    const { start, end, timeslotMasterId } = periodToTimes(targetPeriod, timeSlotColumns);
    const targetMeta = timeSlotColumns.find((c) => c.period === targetPeriod);
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
                disabled={isSelectedDayOff}
                onClick={handleOpenHeaderAddClass}
                className="h-9 gap-1.5 font-semibold shadow-sm"
                title={isSelectedDayOff ? selectedDayHolidayNote : undefined}
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
        {/* Row 1: week + search + filters */}
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
                setCurrentPage(1);
              }}
              className="h-9 pl-8 text-sm border-border"
            />
          </div>

          {isAdmin ? (
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 min-w-[140px] px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="ALL">All branches</option>
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
              setCurrentPage(1);
            }}
            className="h-9 min-w-[140px] px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="ALL">All courses</option>
            {allCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {((isAdmin && selectedBranch !== "ALL") ||
            selectedCourse !== "ALL" ||
            searchQuery.trim().length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isAdmin) setSelectedBranch("ALL");
                setSelectedCourse("ALL");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Row 2: day picker */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border border-border bg-muted/30 w-fit max-w-full">
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
                className={`h-8 px-2.5 rounded-lg text-xs transition-colors ${
                  isSelected
                    ? d.isWorking
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "bg-rose-600 text-white font-semibold shadow-sm"
                    : d.isWorking
                      ? "text-muted-foreground hover:bg-background hover:text-foreground font-medium"
                      : "text-rose-600 hover:bg-rose-50 font-medium"
                }`}
                title={d.isWorking ? undefined : d.note || "Holiday / Off"}
              >
                <span className="font-semibold">{d.fullDay.slice(0, 3)}</span>
                <span className="opacity-80"> {d.dateStr}</span>
                {!d.isWorking
                  ? " · Holiday"
                  : classCount > 0
                    ? ` · ${classCount}`
                    : ""}
              </button>
            );
          })}
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
        <div
          className={`flex items-center justify-between px-4 py-2 border-b text-xs ${
            isSelectedDayOff
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-border bg-muted/30 text-muted-foreground"
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            {isSelectedDayOff && <Calendar className="h-3.5 w-3.5 shrink-0" />}
            <span>
              <strong className={isSelectedDayOff ? "text-rose-900" : "text-foreground"}>
                {currentDayConfig.fullDay}
              </strong>
              {isSelectedDayOff ? (
                <>
                  {" · "}
                  <span className="font-semibold">{selectedDayHolidayNote}</span>
                </>
              ) : (
                <>
                  {" · "}
                  {totalFacultyCount} faculty
                </>
              )}
            </span>
          </span>
          {!isSelectedDayOff && (
            <span className="hidden sm:inline">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1" /> Class
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mx-1 ml-3" /> Free
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mx-1 ml-3" /> Break
            </span>
          )}
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
          ) : (
          <table className="w-full min-w-[980px] border-collapse text-left table-fixed">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider">
                <th className="py-2 px-3 pl-4 w-[160px] border-r border-border sticky left-0 bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] text-foreground">
                  FACULTY <span className="text-[9px] font-normal text-muted-foreground">({totalFacultyCount})</span>
                </th>
                <th className="py-2 px-1.5 text-center w-[72px] border-r border-border font-bold text-foreground sticky left-[160px] bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                  BRANCH
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
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border bg-card">
              {isSelectedDayOff ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center">
                    <div className="inline-flex flex-col items-center gap-2 max-w-md mx-auto">
                      <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-100/80 border border-rose-200 text-rose-700 text-xs font-bold tracking-wide uppercase">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{selectedDayHolidayNote}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This date is marked as a holiday in Master Setup. Class scheduling is closed for the day.
                      </p>
                      <Button asChild variant="outline" size="sm" className="mt-1 text-xs h-8">
                        <Link to={ROUTES.ADMIN.ADMINISTRATION.MASTERS}>Open Master Setup</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : sessionsLoading ? (
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
                            <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white font-bold text-[10px]">
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
                      {timeSlotColumns.map((col) => {
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
                                  {canEditTimetable && (
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

                        // 2. FREE SLOT
                        if (cell.type === "FREE") {
                          return (
                            <td key={col.period} className="p-1 border-r border-border last:border-r-0 align-middle">
                              {canEditTimetable ? (
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
                              ) : (
                                <div className="h-[52px] w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 flex flex-col items-center justify-center">
                                  <span className="text-[8px] font-semibold text-emerald-600 dark:text-emerald-300 uppercase">Free</span>
                                </div>
                              )}
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
                              {canEditTimetable ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddOrEditModal(fac.id, selectedDayKey, col.period, cell)}
                                  className="h-[52px] w-full rounded-md border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex flex-col items-center justify-center cursor-pointer text-rose-600 dark:text-rose-300"
                                >
                                  <span className="text-[8px] font-semibold uppercase">Leave</span>
                                  <span className="text-[7px] text-rose-500 dark:text-rose-400 mt-0.5">Off</span>
                                </button>
                              ) : (
                                <div className="h-[52px] w-full rounded-md border border-rose-500/30 bg-rose-500/10 flex flex-col items-center justify-center text-rose-600 dark:text-rose-300">
                                  <span className="text-[8px] font-semibold uppercase">Leave</span>
                                  <span className="text-[7px] text-rose-500 dark:text-rose-400 mt-0.5">Off</span>
                                </div>
                              )}
                            </td>
                          );
                        }

                        // 6. MEETING SLOT
                        if (cell.type === "MEETING") {
                          return (
                            <td key={col.period} className="p-1 border-r border-border last:border-r-0 align-middle">
                              {canEditTimetable ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddOrEditModal(fac.id, selectedDayKey, col.period, cell)}
                                  className="h-[52px] w-full rounded-md border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors flex flex-col items-center justify-center cursor-pointer text-purple-600 dark:text-purple-300"
                                >
                                  <span className="text-[8px] font-semibold uppercase">Meeting</span>
                                  <span className="text-[7px] text-purple-500 dark:text-purple-400 mt-0.5">Sync</span>
                                </button>
                              ) : (
                                <div className="h-[52px] w-full rounded-md border border-purple-500/30 bg-purple-500/10 flex flex-col items-center justify-center text-purple-600 dark:text-purple-300">
                                  <span className="text-[8px] font-semibold uppercase">Meeting</span>
                                  <span className="text-[7px] text-purple-500 dark:text-purple-400 mt-0.5">Sync</span>
                                </div>
                              )}
                            </td>
                          );
                        }

                        // 7. NOT ASSIGNED SLOT
                        return (
                          <td key={col.period} className="p-1 border-r border-border last:border-r-0 align-middle">
                            {canEditTimetable ? (
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
                            ) : (
                              <div className="h-[52px] w-full rounded-md border border-border bg-muted/20 flex flex-col items-center justify-center">
                                <span className="text-[8px] font-medium text-muted-foreground">Empty</span>
                              </div>
                            )}
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
          )}
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
      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) setModalFacultyLocked(false);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border text-foreground rounded-xl p-0 gap-0 shadow-xl">
          <DialogHeader className="space-y-1.5 px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-semibold text-foreground tracking-tight">
              {modalSessionId ? "Edit class" : "Add class"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {`${daysConfig.find((d) => d.key === modalDayKey)?.fullDay ?? modalDayKey} · Period ${modalPeriod}${
                timeSlotColumns.find((c) => c.period === modalPeriod)?.label
                  ? ` (${timeSlotColumns.find((c) => c.period === modalPeriod)?.label})`
                  : ""
              }`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5 text-sm">
            {/* Faculty — locked when opened from a faculty row/cell */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Faculty instructor *</Label>
              {modalFacultyLocked ? (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {modalFacultyDisplay?.name || "Selected faculty"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {[modalFacultyDisplay?.department, modalFacultyDisplay?.branchName]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
              ) : (
                <>
                  <SearchableSelect
                    value={modalFacultyId}
                    onChange={(value) => {
                      setModalFacultyId(value);
                      setModalBatchId("");
                      setModalSubjectCourseId("");
                      setModalFormErrors((prev) => ({ ...prev, faculty: "" }));
                    }}
                    options={modalFacultyPickerOptions}
                    placeholder={
                      selectedBranch !== "ALL"
                        ? "Search faculty in this branch…"
                        : "Search faculty by name or department…"
                    }
                    emptyLabel="No faculty match this branch filter"
                  />
                  {modalFormErrors.faculty && (
                    <p className="text-xs text-destructive">{modalFormErrors.faculty}</p>
                  )}
                  {selectedBranch !== "ALL" && (
                    <p className="text-[11px] text-muted-foreground">
                      Showing faculty for the selected branch. Change the branch filter to see others.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Day</Label>
                <select
                  value={modalDayKey}
                  onChange={(e) => {
                    setModalDayKey(e.target.value as DayKey);
                    setModalFormErrors((prev) => ({ ...prev, day: "" }));
                  }}
                  className={`w-full h-9 px-2.5 text-sm rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border ${
                    modalFormErrors.day ? "border-destructive" : "border-border"
                  }`}
                >
                  {daysConfig.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.fullDay} ({d.dateStr})
                    </option>
                  ))}
                </select>
                {modalFormErrors.day && (
                  <p className="text-xs text-destructive">{modalFormErrors.day}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Period *</Label>
                <select
                  value={modalPeriod}
                  onChange={(e) => {
                    setModalPeriod(Number(e.target.value));
                    setModalFormErrors((prev) => ({ ...prev, period: "" }));
                  }}
                  className={`w-full h-9 px-2.5 text-sm rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border ${
                    modalFormErrors.period ? "border-destructive" : "border-border"
                  }`}
                >
                  {bookableSlots.map((col) => (
                    <option key={col.period} value={col.period}>
                      Period {col.period} ({col.label})
                    </option>
                  ))}
                </select>
                {modalFormErrors.period && (
                  <p className="text-xs text-destructive">{modalFormErrors.period}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Slot status *</Label>
              <select
                value={modalSlotType}
                onChange={(e) => setModalSlotType(e.target.value as SlotType)}
                className="w-full h-9 px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="CLASS">Class scheduled</option>
                <option value="FREE">Free (clear class)</option>
              </select>
            </div>

            {/* Course & Batch (If Class) */}
            {modalSlotType === "CLASS" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Session title</Label>
                  <Input
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    placeholder="e.g. Module topic or class title"
                    className="h-9 text-sm border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Batch *</Label>
                  <select
                    value={modalBatchId}
                    onChange={(e) => {
                      setModalBatchId(e.target.value);
                      setModalFormErrors((prev) => ({ ...prev, batch: "", subject: "" }));
                    }}
                    className={`w-full h-9 px-2.5 text-sm rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border ${
                      modalFormErrors.batch ? "border-destructive" : "border-border"
                    }`}
                  >
                    <option value="">Select batch</option>
                    {batchSelectOptions.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.code} — {batch.name}
                        {` (${formatBatchSubjectNames(batch)})`}
                      </option>
                    ))}
                  </select>
                  {modalFormErrors.batch ? (
                    <p className="text-xs text-destructive">{modalFormErrors.batch}</p>
                  ) : !modalFacultyId ? (
                    <p className="text-[11px] text-muted-foreground">
                      Select a faculty instructor to see available batches.
                    </p>
                  ) : facultyBatches.length === 0 ? (
                    <p className="text-xs text-destructive">
                      {batches.length === 0
                        ? "No batches found. Create a batch first."
                        : selectedBranch !== "ALL" || (!isAdmin && userCenterId !== "ALL")
                          ? "No batches for this faculty in the selected branch. Assign them on a batch for this branch first."
                          : "No batches assigned to this faculty. Assign them on the batch first."}
                    </p>
                  ) : isAdmin && modalBatch && !batchIncludesFaculty(modalBatch, modalFacultyId) ? (
                    <p className="text-[11px] text-muted-foreground">
                      This batch is not linked to the faculty — admin override allowed.
                    </p>
                  ) : null}
                </div>

                {modalBatch && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Subject *</Label>
                    <select
                      value={modalSubjectCourseId}
                      onChange={(e) => {
                        setModalSubjectCourseId(e.target.value);
                        setModalFormErrors((prev) => ({ ...prev, subject: "" }));
                      }}
                      className={`w-full h-9 px-2.5 text-sm rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border ${
                        modalFormErrors.subject ? "border-destructive" : "border-border"
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
                      <p className="text-xs text-destructive">{modalFormErrors.subject}</p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Class mode</Label>
                  <select
                    value={modalMode}
                    onChange={(e) =>
                      setModalMode(e.target.value as "OFFLINE" | "ONLINE" | "HYBRID")
                    }
                    className="w-full h-9 px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="OFFLINE">Offline (in-person)</option>
                    <option value="ONLINE">Online (virtual meeting)</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">
                    {modalMode === "ONLINE" ? "Meeting type" : "Classroom / lab"}
                  </Label>
                  {modalMode === "ONLINE" ? (
                    <div className="h-9 px-2.5 rounded-lg bg-primary/5 border border-primary/20 text-primary flex items-center gap-2 text-sm font-medium">
                      <Video className="h-3.5 w-3.5 shrink-0" />
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
                      className="h-9 rounded-lg border-border"
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {notificationMsg && isEditModalOpen && (
            <div
              className={`mx-6 mb-4 p-2.5 rounded-lg text-xs font-medium border ${
                notificationMsg.startsWith("✓")
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}
            >
              {notificationMsg}
            </div>
          )}

          <DialogFooter className="flex flex-row justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20 sm:space-x-0">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="h-9 px-3 text-sm border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSlot}
              disabled={createSession.isPending || updateSession.isPending}
              className="h-9 gap-1.5 px-3 text-sm font-semibold shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              {createSession.isPending || updateSession.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: MOVE TIME SLOT ────────────────────────────────────── */}
      <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-xl p-0 gap-0 shadow-xl">
          <DialogHeader className="space-y-1.5 px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-semibold text-foreground tracking-tight">
              Move class
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose a free period for this session.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Target period</Label>
              <select
                value={targetPeriod}
                onChange={(e) => setTargetPeriod(Number(e.target.value))}
                className="w-full h-9 px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {bookableSlots.map((col) => (
                  <option key={col.period} value={col.period}>
                    Period {col.period} ({col.label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20 sm:space-x-0">
            <Button
              variant="outline"
              onClick={() => setIsMoveModalOpen(false)}
              className="h-9 px-3 text-sm border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteMoveSlot}
              className="h-9 px-3 text-sm font-semibold shadow-sm"
            >
              Confirm move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
