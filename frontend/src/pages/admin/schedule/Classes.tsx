import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Building2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Link as LinkIcon,
  BookOpen,
  Check,
  Video,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, MetricGrid, FilterToolbar } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ClassroomDropdown } from "@/components/common/ClassroomDropdown";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useBatches } from "../../../hooks/useBatches";
import { useBranches } from "../../../hooks/useBranches";
import { useFacultyList } from "../../../hooks/useFaculty";
import {
  useClassSessions,
  useCreateClassSession,
  useUpdateClassSession,
} from "../../../hooks/useClassSessions";
import { classSessionsApi, type BackendClassSession } from "../../../services/class-sessions.api";
import {
  batchIncludesFaculty,
  formatBatchSubjectNames,
  getBatchCourseRows,
  getCourseNameInBatch,
  type BatchLike,
} from "@/utils/batch.utils";
import {
  periodToTimes,
  toDateKey,
} from "@/constants/timetable-slots";
import { useTimetableSlotColumns } from "@/hooks/useTimetableSlotColumns";
import { getApiErrorMessage } from "@/utils/api-error";
import { formatTimeRange12h } from "@/utils/format";
import {
  getSessionHostPhase,
  resolveDisplaySessionStatus,
  type SessionHostPhase,
} from "@/utils/session-window";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type ClassStatus = "LIVE" | "SCHEDULED" | "UNASSIGNED" | "COMPLETED" | "CANCELLED";
export type ClassMode = "OFFLINE" | "ONLINE" | "HYBRID";

export interface ScheduledClassItem {
  id: string;
  topicName: string;
  courseName: string;
  moduleName: string;
  iconType: "java" | "python" | "marketing" | "excel" | "powerbi" | "web" | "general";
  batchId: string;
  batchCode: string;
  batchName: string;
  branchId: string;
  branchName: string;
  facultyId?: string;
  facultyName?: string;
  facultySpecialization?: string;
  facultyAvatar?: string;
  isFacultyAssigned: boolean;
  date: string; // e.g. "2026-08-24"
  dateLabel: string; // e.g. "24 Aug 2026 (Today)"
  startTime: string; // e.g. "10:00 AM"
  endTime: string; // e.g. "11:30 AM"
  mode: ClassMode;
  locationOrLink: string;
  classroomMasterId?: string;
  isOnlineLink?: boolean;
  status: ClassStatus;
  /** IST host window phase — used to de-emphasize live Join after end. */
  hostPhase: SessionHostPhase;
  enrolledStudentsCount: number;
  attendanceMarked: boolean;
}

const inferIconType = (name: string): ScheduledClassItem["iconType"] => {
  const lower = name.toLowerCase();
  if (lower.includes("java")) return "java";
  if (lower.includes("python")) return "python";
  if (lower.includes("marketing")) return "marketing";
  if (lower.includes("excel")) return "excel";
  if (lower.includes("power")) return "powerbi";
  if (lower.includes("web")) return "web";
  return "general";
};

const mapDisplayStatusToUI = (
  display: ReturnType<typeof resolveDisplaySessionStatus>
): ClassStatus => {
  switch (display) {
    case "LIVE":
      return "LIVE";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "SCHEDULED";
  }
};

const formatDateLabel = (dateStr: string): string => {
  const today = new Date().toISOString().split("T")[0];
  const formatted = new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return dateStr === today ? `${formatted} (Today)` : formatted;
};

const mapSessionToScheduledClassItem = (
  session: BackendClassSession,
  branchesList: Array<{ id: string; name: string }>,
  now: Date = new Date()
): ScheduledClassItem => {
  const branchObj = branchesList.find((b) => b.id === session.branchId);
  const batchSubjects = formatBatchSubjectNames(
    (session.batch ?? { courseId: "" }) as unknown as BatchLike
  );
  const courseName =
    batchSubjects !== "N/A" ? batchSubjects : session.batch?.course?.name || "General Course";
  const topicName = session.title || courseName;
  const dateStr = session.scheduledDate
    ? toDateKey(session.scheduledDate)
    : new Date().toISOString().split("T")[0];
  const mode = (session.mode || "OFFLINE") as ClassMode;
  const facultyName = session.faculty?.user?.name || session.faculty?.employeeCode;
  const isFacultyAssigned = !!session.facultyId && !!facultyName;
  const startTime = session.startTime || "";
  const endTime = session.endTime || "";
  const hostPhase = getSessionHostPhase({
    dateKey: dateStr,
    startTime,
    endTime,
    now,
  });
  // Display overlay: stuck DB LIVE after IST end → Completed (no DB rewrite).
  const displayStatus = resolveDisplaySessionStatus({
    dbStatus: session.sessionStatus,
    dateKey: dateStr,
    startTime,
    endTime,
    now,
  });

  return {
    id: session.id,
    topicName,
    courseName,
    moduleName: session.batchModule?.courseModule?.name || "Core Module",
    iconType: inferIconType(`${topicName} ${courseName}`),
    batchId: session.batchId,
    batchCode: session.batch?.code || "BATCH",
    batchName: session.batch?.name || "Batch",
    branchId: session.branchId,
    branchName: branchObj?.name || "Branch",
    facultyId: session.facultyId,
    facultyName,
    facultySpecialization: undefined,
    facultyAvatar: undefined,
    isFacultyAssigned,
    date: dateStr,
    dateLabel: formatDateLabel(dateStr),
    startTime,
    endTime,
    mode,
    locationOrLink:
      mode === "ONLINE"
        ? session.meetingUrl || "Online"
        : session.roomNo || "TBD",
    classroomMasterId: session.classroomMasterId || undefined,
    isOnlineLink: mode === "ONLINE",
    status: isFacultyAssigned ? mapDisplayStatusToUI(displayStatus) : "UNASSIGNED",
    hostPhase,
    enrolledStudentsCount: (session as BackendClassSession & { enrolledStudentsCount?: number }).enrolledStudentsCount ?? 0,
    attendanceMarked: session.sessionStatus === "COMPLETED",
  };
};

export const Classes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: branchData } = useBranches();
  const branchesList = useMemo(() => branchData?.data ?? [], [branchData]);
  const { batches } = useBatches();
  const { data: facultyData } = useFacultyList({ limit: 100 });
  const facultyMembers = facultyData?.data ?? [];
  const [searchParams] = useSearchParams();

  const isCenterPortal = location.pathname.startsWith("/center");
  const baseClassesRoute = isCenterPortal ? "/center/schedule/classes" : "/admin/schedule/classes";

  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const batchIdFromUrl = searchParams.get("batchId");
  const matchedBatchCodeFromUrl = useMemo(() => {
    if (!batchIdFromUrl || batches.length === 0) return null;
    return batches.find((b) => b.id === batchIdFromUrl)?.code ?? null;
  }, [batchIdFromUrl, batches]);

  const [userSelectedBatch, setUserSelectedBatch] = useState<string | null>(null);
  const selectedBatch = userSelectedBatch ?? matchedBatchCodeFromUrl ?? "ALL";
  const setSelectedBatch = (batchCode: string) => setUserSelectedBatch(batchCode);

  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [notificationTone, setNotificationTone] = useState<"success" | "error">("success");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const sessionQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page: currentPage,
      limit: rowsPerPage,
    };
    if (selectedBranchId && selectedBranchId !== "ALL") {
      params.branchId = selectedBranchId;
    }
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedBatch !== "ALL") {
      const batch = batches.find((b) => b.code === selectedBatch);
      if (batch) params.batchId = batch.id;
    }
    if (selectedStatus !== "ALL") {
      const statusMap: Record<string, string> = {
        LIVE: "LIVE",
        SCHEDULED: "UPCOMING",
        COMPLETED: "COMPLETED",
        CANCELLED: "CANCELLED",
      };
      if (statusMap[selectedStatus]) params.status = statusMap[selectedStatus];
    }
    if (selectedDate) {
      params.startDate = selectedDate;
      params.endDate = selectedDate;
    }
    return params;
  }, [
    selectedBranchId,
    currentPage,
    rowsPerPage,
    searchQuery,
    selectedBatch,
    selectedStatus,
    selectedDate,
    batches,
  ]);

  const { data: sessionsResponse, isLoading: sessionsLoading } = useClassSessions(sessionQueryParams);
  const createSession = useCreateClassSession();
  const updateSession = useUpdateClassSession();

  // Re-evaluate IST windows so past-end LIVE rows flip to Completed without reload.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const classesList = useMemo(() => {
    const sessions = sessionsResponse?.data ?? [];
    const now = new Date(nowMs);
    return sessions.map((session) =>
      mapSessionToScheduledClassItem(session, branchesList, now)
    );
  }, [sessionsResponse, branchesList, nowMs]);

  const uniqueBatches = useMemo(
    () => [...new Set(classesList.map((c) => c.batchCode))].sort(),
    [classesList]
  );

  // Dialogs State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Schedule Modal Form
  const [formBatchCourseId, setFormBatchCourseId] = useState(""); // BatchCourse row id when available
  const [formCourseId, setFormCourseId] = useState(""); // Course.id for subject select
  const [formModule, setFormModule] = useState("");
  const [formBatch, setFormBatch] = useState(""); // batch code
  const [formBranch, setFormBranch] = useState("");
  const [formFacultyId, setFormFacultyId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formPeriod, setFormPeriod] = useState<number>(1);
  const [formMode, setFormMode] = useState<ClassMode>("OFFLINE");
  const [formClassroomMasterId, setFormClassroomMasterId] = useState("");

  const selectedFormBatch = useMemo(
    () =>
      batches.find((b) => b.code === formBatch || b.id === formBatch) as
        | (BatchLike & { id?: string; code?: string; name?: string; branchId?: string })
        | undefined,
    [batches, formBatch]
  );

  const formSubjectOptions = useMemo(() => {
    if (!selectedFormBatch) return [];
    return getBatchCourseRows(selectedFormBatch);
  }, [selectedFormBatch]);

  const batchesForBranch = useMemo(() => {
    if (!formBranch || formBranch === "ALL") return batches;
    return batches.filter((b) => b.branchId === formBranch);
  }, [batches, formBranch]);

  const facultyForForm = useMemo(() => {
    if (!selectedFormBatch) {
      if (!formBranch || formBranch === "ALL") return facultyMembers;
      return facultyMembers.filter((f) => f.branchId === formBranch);
    }
    const assigned = facultyMembers.filter((f) =>
      batchIncludesFaculty(selectedFormBatch, f.id)
    );
    if (assigned.length > 0) return assigned;
    return facultyMembers.filter(
      (f) => !selectedFormBatch.branchId || f.branchId === selectedFormBatch.branchId
    );
  }, [facultyMembers, selectedFormBatch, formBranch]);

  useEffect(() => {
    if (!selectedFormBatch) {
      setFormCourseId("");
      setFormBatchCourseId("");
      return;
    }
    const options = formSubjectOptions;
    if (options.length === 0) {
      setFormCourseId("");
      setFormBatchCourseId("");
      return;
    }
    const stillValid = options.some((o) => o.courseId === formCourseId);
    if (!stillValid) {
      setFormCourseId(options[0].courseId);
      setFormBatchCourseId(options[0].id || "");
    } else {
      const row = options.find((o) => o.courseId === formCourseId);
      setFormBatchCourseId(row?.id || "");
    }
  }, [selectedFormBatch, formSubjectOptions, formCourseId]);

  useEffect(() => {
    if (!formFacultyId) return;
    if (!facultyForForm.some((f) => f.id === formFacultyId)) {
      setFormFacultyId(facultyForForm[0]?.id ?? "");
    }
  }, [facultyForForm, formFacultyId]);

  const slotBranchId =
    formBranch && formBranch !== "ALL"
      ? formBranch
      : selectedFormBatch?.branchId ||
        (selectedBranchId !== "ALL" ? selectedBranchId : undefined);
  const { bookableSlots, isEmpty: slotsEmpty } = useTimetableSlotColumns(slotBranchId);

  useEffect(() => {
    if (bookableSlots.length > 0 && !bookableSlots.some((s) => s.period === formPeriod)) {
      setFormPeriod(bookableSlots[0].period);
    }
  }, [bookableSlots, formPeriod]);

  const formTimes = periodToTimes(formPeriod, bookableSlots);
  const formStartTime = formTimes.start;
  const formEndTime = formTimes.end;

  const branchLabel = useMemo(() => {
    if (selectedBranchId === "ALL") return "All branches";
    return branchesList.find((b) => b.id === selectedBranchId)?.name ?? "All branches";
  }, [branchesList, selectedBranchId]);

  // Dynamic Statistics
  const stats = useMemo(() => {
    const scopeClasses =
      selectedBranchId === "ALL"
        ? classesList
        : classesList.filter((c) => c.branchId === selectedBranchId);

    const today = new Date().toISOString().split("T")[0];
    const activeClasses = scopeClasses.filter((c) => c.status !== "CANCELLED");

    return {
      total: activeClasses.length,
      facultyAssigned: activeClasses.filter((c) => c.isFacultyAssigned).length,
      today: activeClasses.filter((c) => c.date === today).length,
      unassigned: activeClasses.filter((c) => !c.isFacultyAssigned).length,
    };
  }, [classesList, selectedBranchId]);

  const paginatedClasses = classesList;
  const totalPages = sessionsResponse?.meta?.totalPages ?? 1;
  const totalCount = sessionsResponse?.meta?.total ?? classesList.length;

  const hasActiveFilters =
    selectedBranchId !== "ALL" ||
    searchQuery.trim().length > 0 ||
    selectedBatch !== "ALL" ||
    selectedStatus !== "ALL" ||
    selectedDate !== "";

  // Handlers
  const handleResetFilters = () => {
    setSelectedBranchId("ALL");
    setSearchQuery("");
    setSelectedBatch("ALL");
    setSelectedStatus("ALL");
    setSelectedDate("");
    setCurrentPage(1);
  };

  const showNotice = (message: string, tone: "success" | "error" = "success", ms = 4000) => {
    setNotificationTone(tone);
    setNotificationMsg(message);
    setTimeout(() => setNotificationMsg(null), ms);
  };

  const handleSaveClass = async () => {
    const errors: Record<string, string> = {};
    const fac =
      formFacultyId && formFacultyId !== "none"
        ? facultyMembers.find((f) => f.id === formFacultyId)
        : null;
    const batch = batches.find((b) => b.code === formBatch || b.id === formBatch);

    if (!batch) errors.batch = "Batch is required.";
    if (!formCourseId) errors.course = "Course / subject is required.";
    if (!formModule.trim()) errors.module = "Class topic / module is required.";
    if (!fac) errors.faculty = "Faculty is required.";
    if (!formDate) errors.date = "Date is required.";
    if (slotsEmpty || !formTimes.timeslotMasterId) {
      errors.period = "Time slot is required. Configure Time Slots in Master Setup.";
    }
    if (!formBranch) errors.branch = "Branch is required.";

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showNotice(Object.values(errors)[0], "error", 4500);
      return;
    }

    const subjectRow = getBatchCourseRows(batch as BatchLike).find(
      (r) => r.courseId === formCourseId
    );
    const subjectName =
      getCourseNameInBatch(batch as BatchLike, formCourseId) || formModule.trim();

    const payload = {
      title: formModule.trim() || subjectName,
      batchId: batch!.id,
      batchCourseId: formBatchCourseId || subjectRow?.id || undefined,
      facultyId: fac!.id,
      branchId: batch!.branchId || formBranch || undefined,
      scheduledDate: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      timeslotMasterId: formTimes.timeslotMasterId,
      classroomMasterId: formMode !== "ONLINE" ? formClassroomMasterId || undefined : undefined,
      mode: formMode,
    };

    try {
      let savedSession: BackendClassSession;
      if (editingSessionId) {
        const response = await updateSession.mutateAsync({ id: editingSessionId, payload });
        savedSession = response.data;
        showNotice("Class session updated.");
      } else {
        const response = await createSession.mutateAsync(payload);
        savedSession = response.data;
        showNotice(`Scheduled: ${payload.title} (${batch!.code}).`);
      }
      setIsScheduleModalOpen(false);
      setEditingSessionId(null);
      setFormErrors({});
      if (formMode === "ONLINE" && !savedSession.meetingUrl) {
        try {
          await classSessionsApi.createGoogleMeet(savedSession.id);
          showNotice("Class scheduled and Google Meet created.");
        } catch {
          showNotice("Class scheduled, but Google Meet creation failed.", "error", 4500);
        }
      }
    } catch (err: unknown) {
      const apiMessage = getApiErrorMessage(
        err,
        "Failed to save class. Please check the form and try again."
      );
      showNotice(apiMessage, "error", 6000);
      if (/time slot|already assign|already has a class|conflict/i.test(apiMessage)) {
        setFormErrors((prev) => ({ ...prev, period: apiMessage }));
      }
    }
  };

  const resetScheduleForm = () => {
    setEditingSessionId(null);
    setFormErrors({});
    const defaultBatch =
      (selectedBatch !== "ALL"
        ? batches.find((b) => b.code === selectedBatch)
        : undefined) ||
      (selectedBranchId !== "ALL"
        ? batches.find((b) => b.branchId === selectedBranchId)
        : undefined) ||
      batches[0];
    const defaultBranchId =
      defaultBatch?.branchId ||
      (selectedBranchId !== "ALL" ? selectedBranchId : undefined) ||
      branchesList[0]?.id ||
      "";
    const subjects = defaultBatch ? getBatchCourseRows(defaultBatch as BatchLike) : [];
    setFormModule("");
    setFormBatch(defaultBatch?.code ?? "");
    setFormBranch(defaultBranchId);
    setFormCourseId(subjects[0]?.courseId ?? "");
    setFormBatchCourseId(subjects[0]?.id ?? "");
    const defaultFaculty =
      (defaultBatch &&
        facultyMembers.find((f) => batchIncludesFaculty(defaultBatch as BatchLike, f.id))) ||
      facultyMembers.find((f) => f.branchId === defaultBranchId) ||
      facultyMembers[0];
    setFormFacultyId(defaultFaculty?.id ?? "");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormPeriod(bookableSlots[0]?.period ?? 1);
    setFormMode("OFFLINE");
    setFormClassroomMasterId("");
  };

  // Helper Icon Renderer
  const renderTopicIcon = () => (
    <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border text-muted-foreground flex items-center justify-center shrink-0">
      <BookOpen className="w-3.5 h-3.5" />
    </div>
  );

  const metricItems = [
    { label: "Total classes", value: sessionsLoading ? "—" : stats.total },
    { label: "Faculty assigned", value: sessionsLoading ? "—" : stats.facultyAssigned },
    { label: "Today", value: sessionsLoading ? "—" : stats.today },
    { label: "Unassigned", value: sessionsLoading ? "—" : stats.unassigned },
  ];

  return (
    <PageContainer density="compact" className="animate-in fade-in duration-200">
      <PageHeader
        title="Classes"
        description={branchLabel}
        actions={
          <PermissionGate itemKey="schedule.classes" mode="write">
            <Button
              size="sm"
              onClick={() => {
                resetScheduleForm();
                setIsScheduleModalOpen(true);
              }}
              className="h-9 gap-1.5 font-semibold shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Schedule Class
            </Button>
          </PermissionGate>
        }
      />

      {notificationMsg && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 text-xs font-medium border ${
            notificationTone === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300"
              : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
          }`}
        >
          {notificationTone === "error" ? (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{notificationMsg}</span>
        </div>
      )}

      <MetricGrid columns="grid-cols-2 sm:grid-cols-4" density="compact">
        {metricItems.map((kpi) => (
          <Card
            key={kpi.label}
            size="compact"
            className="border border-border bg-card shadow-none rounded-lg"
          >
            <CardContent size="compact">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </p>
              <h3 className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                {kpi.value}
              </h3>
            </CardContent>
          </Card>
        ))}
      </MetricGrid>

      <FilterToolbar className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search class, course, faculty, or room…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 pl-8 text-sm border-border"
          />
        </div>

        <select
          value={selectedBranchId}
          onChange={(e) => {
            setSelectedBranchId(e.target.value);
            setCurrentPage(1);
          }}
          className="h-9 min-w-[140px] px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="ALL">All branches</option>
          {branchesList.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={selectedBatch}
          onChange={(e) => {
            setSelectedBatch(e.target.value);
            setCurrentPage(1);
          }}
          className="h-9 min-w-[130px] px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="ALL">All batches</option>
          {uniqueBatches.map((batchCode) => (
            <option key={batchCode} value={batchCode}>
              {batchCode}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setCurrentPage(1);
          }}
          className="h-9 min-w-[130px] px-2.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="ALL">All statuses</option>
          <option value="LIVE">Live</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="UNASSIGNED">Unassigned</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <div className="inline-flex items-center h-9 gap-1.5 px-2.5 rounded-lg border border-border bg-background text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent text-sm text-foreground outline-none cursor-pointer"
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </FilterToolbar>

      <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4 pl-5">Class topic & course</th>
                <th className="py-3 px-3">Batch</th>
                <th className="py-3 px-4">Faculty</th>
                <th className="py-3 px-4">Date & time</th>
                <th className="py-3 px-3 text-center">Mode</th>
                <th className="py-3 px-4">Location / link</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border text-xs bg-card">
              {sessionsLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading classes…</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedClasses.length > 0 ? (
                paginatedClasses.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`${baseClassesRoute}/${item.id}`)}
                    className="hover:bg-muted/50 transition-colors cursor-pointer group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        navigate(`${baseClassesRoute}/${item.id}`);
                      }
                    }}
                  >
                    <td className="py-2.5 px-4 pl-5 align-middle">
                      <div className="flex items-center gap-3 select-none">
                        {renderTopicIcon()}
                        <div className="min-w-0">
                          <h4 className="font-semibold text-foreground text-xs group-hover:text-primary group-hover:underline transition-colors truncate">
                            {item.topicName}
                          </h4>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {item.moduleName}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 align-middle">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-foreground border border-border inline-block">
                        {item.batchCode}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 align-middle">
                      {item.isFacultyAssigned && item.facultyName ? (
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 rounded-full border border-border shrink-0">
                            <AvatarImage src={item.facultyAvatar} alt={item.facultyName} />
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-[10px]">
                              {item.facultyName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="font-medium text-foreground text-xs block truncate">
                              {item.facultyName}
                            </span>
                            <span className="text-[10px] text-muted-foreground block truncate">
                              {item.facultySpecialization || "Faculty"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] font-medium">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 align-middle">
                      <div className="flex items-center gap-1.5 font-medium text-foreground text-[11px]">
                        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{item.dateLabel}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          {formatTimeRange12h(item.startTime, item.endTime)}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center align-middle">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                          item.mode === "ONLINE"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {item.mode === "ONLINE" ? "Online" : "Offline"}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 align-middle">
                      {item.isOnlineLink ? (
                        item.hostPhase === "after" ? (
                          <span
                            className="inline-flex items-center gap-1 text-muted-foreground font-medium text-xs"
                            title="Scheduled window has ended"
                          >
                            <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Ended</span>
                          </span>
                        ) : item.locationOrLink !== "Online" ? (
                          <a
                            href={item.locationOrLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs"
                          >
                            <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Meeting link</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground font-medium text-xs">
                            <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">No link yet</span>
                          </span>
                        )
                      ) : (
                        <div className="flex items-center gap-1 text-foreground font-medium text-xs">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{item.locationOrLink}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center align-middle">
                      {item.status === "LIVE" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                        </span>
                      )}
                      {item.status === "SCHEDULED" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25 inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Scheduled
                        </span>
                      )}
                      {item.status === "UNASSIGNED" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unassigned
                        </span>
                      )}
                      {item.status === "COMPLETED" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Completed
                        </span>
                      )}
                      {item.status === "CANCELLED" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Cancelled
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Calendar className="w-8 h-8 mx-auto text-muted-foreground/60" />
                      <h3 className="text-sm font-semibold text-foreground">No classes found</h3>
                      <p className="text-xs text-muted-foreground">
                        No sessions match the current filters.
                      </p>
                      <PermissionGate itemKey="schedule.classes" mode="write">
                        <Button
                          size="sm"
                          onClick={() => {
                            resetScheduleForm();
                            setIsScheduleModalOpen(true);
                          }}
                          className="mt-2 h-9 gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" /> Schedule Class
                        </Button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {totalCount > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}–
              {Math.min(currentPage * rowsPerPage, totalCount)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{totalCount}</span>
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 rounded-lg border-border"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    currentPage === pg
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-foreground border border-border hover:bg-muted"
                  }`}
                >
                  {pg}
                </button>
              ))}

              {totalPages > 5 && (
                <>
                  <span className="text-muted-foreground px-1">…</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      currentPage === totalPages
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card text-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 rounded-lg border-border"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-border">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── SCHEDULE CLASS MODAL ────────────────────────────────────────── */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card text-foreground rounded-xl p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingSessionId ? "Edit Class Session" : "Schedule New Class Session"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Create a scheduled classroom session and assign faculty for this batch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-3 text-xs">
            <div>
              <Label className="text-[11px] font-bold text-foreground">Branch Center</Label>
              <select
                value={formBranch}
                onChange={(e) => {
                  const branchId = e.target.value;
                  setFormBranch(branchId);
                  if (formBatch) {
                    const matched = batches.find((b) => b.code === formBatch || b.id === formBatch);
                    if (matched && matched.branchId && matched.branchId !== branchId) {
                      setFormBatch("");
                      setFormCourseId("");
                      setFormBatchCourseId("");
                    }
                  }
                }}
                className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-medium outline-none"
              >
                {branchesList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-foreground">Batch Code *</Label>
                <select
                  value={formBatch}
                  onChange={(e) => {
                    const code = e.target.value;
                    setFormBatch(code);
                    const matched = batches.find((b) => b.code === code || b.id === code);
                    if (matched?.branchId) setFormBranch(matched.branchId);
                    const subjects = matched ? getBatchCourseRows(matched as BatchLike) : [];
                    setFormCourseId(subjects[0]?.courseId ?? "");
                    setFormBatchCourseId(subjects[0]?.id ?? "");
                    const assignedFaculty = matched
                      ? facultyMembers.find((f) =>
                          batchIncludesFaculty(matched as BatchLike, f.id)
                        )
                      : undefined;
                    if (assignedFaculty) setFormFacultyId(assignedFaculty.id);
                    setFormErrors((prev) => ({ ...prev, batch: "", course: "" }));
                  }}
                  className={`w-full h-9 px-3 mt-1 bg-background text-foreground border rounded-xl font-medium outline-none ${
                    formErrors.batch ? "border-rose-400" : "border-border"
                  }`}
                >
                  <option value="">Select batch</option>
                  {batchesForBranch.map((batch) => (
                    <option key={batch.id} value={batch.code}>
                      {batch.code} — {batch.name}
                      {` (${formatBatchSubjectNames(batch as BatchLike)})`}
                    </option>
                  ))}
                </select>
                {formErrors.batch && (
                  <p className="text-[10px] text-rose-600 mt-1 font-medium">{formErrors.batch}</p>
                )}
              </div>

              <div>
                <Label className="text-[11px] font-bold text-foreground">Course / Subject *</Label>
                <select
                  value={formCourseId}
                  onChange={(e) => {
                    const courseId = e.target.value;
                    setFormCourseId(courseId);
                    setFormErrors((prev) => ({ ...prev, course: "" }));
                    const row = formSubjectOptions.find((r) => r.courseId === courseId);
                    setFormBatchCourseId(row?.id || "");
                    if (row?.facultyId) setFormFacultyId(row.facultyId);
                  }}
                  disabled={!selectedFormBatch || formSubjectOptions.length === 0}
                  className={`w-full h-9 px-3 mt-1 bg-background text-foreground border rounded-xl font-medium outline-none ${
                    formErrors.course ? "border-rose-400" : "border-border"
                  }`}
                >
                  <option value="">
                    {!selectedFormBatch
                      ? "Select batch first"
                      : formSubjectOptions.length === 0
                        ? "No subjects on batch"
                        : "Select course"}
                  </option>
                  {formSubjectOptions.map((row) => (
                    <option key={row.id || row.courseId} value={row.courseId}>
                      {row.course?.name || "Subject"}
                    </option>
                  ))}
                </select>
                {formErrors.course && (
                  <p className="text-[10px] text-rose-600 mt-1 font-medium">{formErrors.course}</p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-foreground">Class Topic / Module *</Label>
              <Input
                value={formModule}
                onChange={(e) => {
                  setFormModule(e.target.value);
                  setFormErrors((prev) => ({ ...prev, module: "" }));
                }}
                placeholder="e.g. Arrays & Collections"
                className={`h-9 mt-1 text-xs rounded-xl bg-background border-border text-foreground ${
                  formErrors.module ? "border-rose-400" : ""
                }`}
              />
              {formErrors.module && (
                <p className="text-[10px] text-rose-600 mt-1 font-medium">{formErrors.module}</p>
              )}
            </div>

            <div>
              <Label className="text-[11px] font-bold text-foreground">Assign Faculty *</Label>
              <select
                value={formFacultyId}
                onChange={(e) => {
                  setFormFacultyId(e.target.value);
                  setFormErrors((prev) => ({ ...prev, faculty: "" }));
                }}
                className={`w-full h-9 px-3 mt-1 bg-background text-foreground border rounded-xl font-medium outline-none ${
                  formErrors.faculty ? "border-rose-400" : "border-border"
                }`}
              >
                <option value="">Select faculty</option>
                {facultyForForm.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.user?.name || f.employeeCode} ({f.specialization || "Instruction"})
                  </option>
                ))}
              </select>
              {formErrors.faculty && (
                <p className="text-[10px] text-rose-600 mt-1 font-medium">{formErrors.faculty}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label className="text-[11px] font-bold text-foreground">Date *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => {
                    setFormDate(e.target.value);
                    setFormErrors((prev) => ({ ...prev, date: "" }));
                  }}
                  className={`h-9 mt-1 text-xs rounded-xl bg-background border-border text-foreground ${
                    formErrors.date ? "border-rose-400" : ""
                  }`}
                />
                {formErrors.date && (
                  <p className="text-[10px] text-rose-600 mt-1 font-medium">{formErrors.date}</p>
                )}
              </div>

              <div>
                <Label className="text-[11px] font-bold text-foreground">Time Slot *</Label>
                <select
                  value={formPeriod}
                  onChange={(e) => {
                    setFormPeriod(Number(e.target.value));
                    setFormErrors((prev) => ({ ...prev, period: "" }));
                  }}
                  className={`w-full h-9 px-3 mt-1 bg-background text-foreground border rounded-xl font-medium outline-none text-xs ${
                    formErrors.period ? "border-rose-400" : "border-border"
                  }`}
                  disabled={slotsEmpty}
                >
                  {slotsEmpty ? (
                    <option value={formPeriod}>Configure Time Slots in Master Setup</option>
                  ) : (
                    bookableSlots.map((slot) => (
                      <option key={slot.timeslotMasterId || slot.period} value={slot.period}>
                        {slot.label}
                      </option>
                    ))
                  )}
                </select>
                {formErrors.period ? (
                  <p className="text-[10px] text-rose-600 mt-1 font-medium">{formErrors.period}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    From Time Slot Master (Master Setup)
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-foreground">Class Mode</Label>
                <select
                  value={formMode}
                  onChange={(e) => setFormMode(e.target.value as ClassMode)}
                  className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-medium outline-none"
                >
                  <option value="OFFLINE">Offline (In-Person)</option>
                  <option value="ONLINE">Online (Virtual Meeting)</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-foreground">
                  {formMode === "ONLINE" ? "Meeting Type" : "Classroom / Lab"}
                </Label>
                {formMode === "ONLINE" ? (
                  <div className="h-9 mt-1 px-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center gap-2 font-medium">
                    <Video className="h-4 w-4" />
                    Google Meet (auto-created)
                  </div>
                ) : (
                  <ClassroomDropdown
                    value={formClassroomMasterId}
                    onChange={setFormClassroomMasterId}
                    branchId={formBranch !== "ALL" ? formBranch : undefined}
                    className="mt-0"
                  />
                )}
              </div>
            </div>
          </div>

          {notificationMsg && isScheduleModalOpen && notificationTone === "error" && (
            <div className="mb-2 p-2.5 rounded-xl text-[11px] font-medium border bg-rose-50 border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{notificationMsg}</span>
            </div>
          )}

          <DialogFooter className="flex gap-2 mt-3">
            <Button
              variant="outline"
              onClick={() => setIsScheduleModalOpen(false)}
              className="text-xs font-bold h-9 rounded-xl border-border bg-card text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveClass}
              className="bg-primary hover:bg-primary text-white text-xs font-bold h-9 rounded-xl gap-1.5"
            >
              <Check className="h-3.5 w-3.5" /> Schedule Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
