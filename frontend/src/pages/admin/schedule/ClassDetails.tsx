import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Users,
  Video,
  ExternalLink,
  Edit3,
  UserPlus,
  XCircle,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Check,
  Mail,
  Phone,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, PageSection } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { usePermissions } from "@/hooks/usePermissions";
import {
  useClassSession,
  useClassSessions,
  useUpdateClassSession,
  useDeleteClassSession,
} from "@/hooks/useClassSessions";
import { useBatches } from "@/hooks/useBatches";
import { useBranches } from "@/hooks/useBranches";
import { useFacultyList } from "@/hooks/useFaculty";
import { useCourses } from "@/hooks/useCourses";
import { classSessionsApi } from "@/services/class-sessions.api";
import { batchesApi } from "@/services/batches.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBatchSubjectNames } from "@/utils/batch.utils";
import {
  findPeriodByTimes,
  findSlotByMasterId,
  periodToTimes,
  toDateKey,
} from "@/constants/timetable-slots";
import { useTimetableSlotColumns } from "@/hooks/useTimetableSlotColumns";
import type { ClassMode, ClassStatus } from "@/pages/admin/schedule/Classes";
import {
  getSessionHostPhase,
  resolveDisplaySessionStatus,
} from "@/utils/session-window";

export const ClassDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { canEditItem } = usePermissions();
  const canEditClasses = canEditItem("schedule.classes");

  // Base path detection (Admin vs Center portal)
  const isCenterPortal = location.pathname.startsWith("/center");
  const backPath = isCenterPortal ? "/center/schedule/classes" : "/admin/schedule/classes";

  // Data fetching
  const { data: sessionResponse, isLoading, error } = useClassSession(id);
  const session = sessionResponse?.data;

  const { data: branchData } = useBranches();
  const branchesList = branchData?.data ?? [];
  const { batches } = useBatches();
  const { courses } = useCourses();
  const { data: facultyData } = useFacultyList({ limit: 100 });
  const facultyMembers = facultyData?.data ?? [];

  // Mutations
  const updateSession = useUpdateClassSession();
  const deleteSession = useDeleteClassSession();

  // Toast / Feedback State
  const [notificationMsg, setNotificationMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotificationMsg({ text, type });
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Dialog States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangeFacultyModalOpen, setIsChangeFacultyModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Student Search filter in details
  const [studentSearch, setStudentSearch] = useState("");

  // Re-evaluate IST window so stuck LIVE flips to Completed without reload.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Edit Form State
  const [editTopic, setEditTopic] = useState("");
  const [editCourse, setEditCourse] = useState("");
  const [editModule, setEditModule] = useState("");
  const [editBatch, setEditBatch] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [editFacultyId, setEditFacultyId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPeriod, setEditPeriod] = useState<number>(1);
  const [editMode, setEditMode] = useState<ClassMode>("OFFLINE");
  const [editClassroomMasterId, setEditClassroomMasterId] = useState("");

  // Use full slot columns (incl. Break/Lunch) so edit works for classes booked on those periods.
  const { slots: timetableSlots, isEmpty: slotsEmpty } = useTimetableSlotColumns(
    editBranch || session?.branchId || undefined
  );

  // Change Faculty State
  const [targetFacultyId, setTargetFacultyId] = useState("");

  const editFacultyForConflict =
    editFacultyId && editFacultyId !== "none" ? editFacultyId : undefined;

  const { data: facultyDaySessionsRes } = useClassSessions(
    {
      facultyId: editFacultyForConflict,
      startDate: editDate,
      endDate: editDate,
      limit: 100,
    },
    {
      enabled: isEditModalOpen && !!editFacultyForConflict && !!editDate,
    }
  );
  const facultyDaySessions = facultyDaySessionsRes?.data ?? [];

  const editFacultyOptions = useMemo(() => {
    const branchFilter = editBranch || session?.branchId;
    const filtered = branchFilter
      ? facultyMembers.filter((f: any) => f.branchId === branchFilter)
      : facultyMembers;
    if (
      editFacultyForConflict &&
      !filtered.some((f: any) => f.id === editFacultyForConflict)
    ) {
      const current = facultyMembers.find((f: any) => f.id === editFacultyForConflict);
      if (current) return [current, ...filtered];
    }
    return filtered;
  }, [facultyMembers, editBranch, session?.branchId, editFacultyForConflict]);

  const courseOptions = useMemo(() => {
    const names = courses.map((c: any) => c.name as string);
    if (editCourse && !names.includes(editCourse)) {
      return [...courses, { id: `__session-course__`, name: editCourse }];
    }
    return courses;
  }, [courses, editCourse]);

  const batchOptions = useMemo(() => {
    const codes = batches.map((b: any) => b.code as string);
    if (editBatch && !codes.includes(editBatch)) {
      const sessionBatch = session?.batch;
      return [
        ...batches,
        {
          id: sessionBatch?.id || session?.batchId || `__session-batch__`,
          code: editBatch,
          name: sessionBatch?.name || editBatch,
          branchId: session?.branchId,
        },
      ];
    }
    return batches;
  }, [batches, editBatch, session?.batch, session?.batchId, session?.branchId]);

  const editSlotConflict = useMemo(() => {
    if (!session || !editFacultyForConflict || !editDate || slotsEmpty) return null;
    const formTimes = periodToTimes(editPeriod, timetableSlots);
    return (
      facultyDaySessions.find((s) => {
        if (s.id === session.id) return false;
        if (s.sessionStatus === "CANCELLED" || s.status === "CANCELLED") return false;
        if (
          formTimes.timeslotMasterId &&
          s.timeslotMasterId &&
          s.timeslotMasterId === formTimes.timeslotMasterId
        ) {
          return true;
        }
        return (
          (s.startTime || "").trim().toLowerCase() === formTimes.start.trim().toLowerCase() &&
          (s.endTime || "").trim().toLowerCase() === formTimes.end.trim().toLowerCase()
        );
      }) ?? null
    );
  }, [
    session,
    editFacultyForConflict,
    editDate,
    editPeriod,
    timetableSlots,
    facultyDaySessions,
    slotsEmpty,
  ]);

  const takenPeriodSet = useMemo(() => {
    if (!session || !editFacultyForConflict || !editDate) return new Set<number>();
    const taken = new Set<number>();
    for (const s of facultyDaySessions) {
      if (s.id === session.id) continue;
      if (s.sessionStatus === "CANCELLED" || s.status === "CANCELLED") continue;
      const byMaster = findSlotByMasterId(s.timeslotMasterId, timetableSlots);
      const period =
        byMaster?.period ??
        findPeriodByTimes(s.startTime || "", s.endTime || "", timetableSlots);
      if (period != null) taken.add(period);
    }
    return taken;
  }, [session, editFacultyForConflict, editDate, facultyDaySessions, timetableSlots]);

  // Automatically fetch batch students directly
  const { data: studentsResponse, isLoading: loadingStudents } = useQuery({
    queryKey: ["batch-students", session?.batchId],
    queryFn: () =>
      session?.batchId
        ? batchesApi.getStudents(session.batchId)
        : Promise.resolve({ success: true, data: [] }),
    enabled: !!session?.batchId,
  });
  const batchStudents = studentsResponse?.data ?? [];

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return batchStudents;
    const q = studentSearch.toLowerCase().trim();
    return batchStudents.filter((item: any) => {
      const name = item.student?.user?.name?.toLowerCase() || "";
      const code = item.student?.studentCode?.toLowerCase() || "";
      const email = item.student?.user?.email?.toLowerCase() || "";
      const phone = item.student?.user?.phone?.toLowerCase() || "";
      return name.includes(q) || code.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [batchStudents, studentSearch]);

  // Derived Session Fields
  const branchObj = useMemo(() => {
    if (!session?.branchId) return null;
    return branchesList.find((b) => b.id === session.branchId);
  }, [session?.branchId, branchesList]);

  const batchSubjects = useMemo(() => {
    if (!session?.batch) return "N/A";
    return formatBatchSubjectNames(session.batch as any);
  }, [session?.batch]);

  const courseDisplayName = useMemo(() => {
    if (batchSubjects !== "N/A") return batchSubjects;
    return session?.batch?.course?.name || "General Course";
  }, [batchSubjects, session?.batch?.course?.name]);

  const topicName = session?.title || courseDisplayName;
  const moduleName = session?.batchModule?.courseModule?.name || "Core Module";
  const dateStr = session?.scheduledDate
    ? toDateKey(session.scheduledDate)
    : new Date().toISOString().split("T")[0];

  const formatDateLabel = (dStr: string): string => {
    const today = new Date().toISOString().split("T")[0];
    const formatted = new Date(`${dStr}T00:00:00`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return dStr === today ? `${formatted} (Today)` : formatted;
  };

  const isFacultyAssigned = !!session?.facultyId && !!session?.faculty?.user?.name;
  const facultyName =
    session?.faculty?.user?.name || session?.faculty?.employeeCode || "Unassigned";

  const hostPhase = useMemo(() => {
    if (!session?.startTime || !session?.endTime) return "before" as const;
    return getSessionHostPhase({
      dateKey: dateStr,
      startTime: session.startTime,
      endTime: session.endTime,
      now: new Date(nowMs),
    });
  }, [session?.startTime, session?.endTime, dateStr, nowMs]);

  // Display overlay: stuck DB LIVE after IST end → Completed (no DB rewrite).
  const currentStatus: ClassStatus = useMemo(() => {
    if (!session) return "SCHEDULED";
    if (!isFacultyAssigned) return "UNASSIGNED";
    const display = resolveDisplaySessionStatus({
      dbStatus: session.sessionStatus,
      dateKey: dateStr,
      startTime: session.startTime || "",
      endTime: session.endTime || "",
      now: new Date(nowMs),
    });
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
  }, [session, isFacultyAssigned, dateStr, nowMs]);

  // Lock edit/cancel from DB only — display Completed after end must not block admin fixes.
  const dbSessionStatus = String(session?.sessionStatus || "").toUpperCase();
  const isSessionLocked =
    dbSessionStatus === "CANCELLED" || dbSessionStatus === "COMPLETED";
  const lockedActionTitle =
    dbSessionStatus === "CANCELLED"
      ? "This class is cancelled"
      : dbSessionStatus === "COMPLETED"
        ? "This class is completed"
        : undefined;

  const renderStatusBadge = (status: ClassStatus) => {
    switch (status) {
      case "LIVE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1 align-middle">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25 inline-flex items-center gap-1 align-middle">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Scheduled
          </span>
        );
      case "UNASSIGNED":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 inline-flex items-center gap-1 align-middle">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unassigned
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border inline-flex items-center gap-1 align-middle">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 inline-flex items-center gap-1 align-middle">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Cancelled
          </span>
        );
    }
  };

  const enrolledCount =
    batchStudents.length > 0
      ? batchStudents.length
      : (session?.enrolledStudentsCount ?? 0);

  const headerDescription = [
    session?.batch?.code,
    courseDisplayName,
    moduleName,
    branchObj?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!session) return;
    // Class Topic / Module input binds to editModule; prefer the displayed
    // session title, then batch module name (editTopic is only a save fallback).
    const topicPrefill =
      (session.title || "").trim() ||
      session.batchModule?.courseModule?.name ||
      "";
    setEditTopic(topicPrefill);
    setEditCourse(session.batch?.course?.name || courseDisplayName);
    setEditModule(topicPrefill);
    setEditBatch(session.batch?.code || "");
    setEditBranch(session.branchId || "");
    setEditFacultyId(session.facultyId || "none");
    setEditDate(session.scheduledDate ? toDateKey(session.scheduledDate) : "");
    const masterSlot = findSlotByMasterId(session.timeslotMasterId, timetableSlots);
    setEditPeriod(
      masterSlot?.period ??
        findPeriodByTimes(session.startTime || "", session.endTime || "", timetableSlots) ??
        timetableSlots[0]?.period ??
        1
    );
    setEditMode((session.mode || "OFFLINE") as ClassMode);
    setEditClassroomMasterId(session.classroomMasterId || "");
    setIsEditModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!session) return;
    const fac =
      editFacultyId && editFacultyId !== "none"
        ? facultyMembers.find((f: any) => f.id === editFacultyId)
        : null;
    const batch =
      batches.find((b: any) => b.code === editBatch || b.id === editBatch) ??
      (session.batchId
        ? { id: session.batchId, branchId: session.branchId, code: session.batch?.code }
        : null);

    if (!batch?.id) {
      showNotification("Please select a valid batch.", "error");
      return;
    }

    if (!fac) {
      showNotification("Faculty assignment is required to schedule or update a class.", "error");
      return;
    }

    const matchedSlot = timetableSlots.find((s) => s.period === editPeriod);
    const formTimes = matchedSlot
      ? periodToTimes(editPeriod, timetableSlots)
      : {
          start: session.startTime || "09:00 AM",
          end: session.endTime || "10:00 AM",
          timeslotMasterId: session.timeslotMasterId ?? undefined,
        };
    const payload = {
      title: editModule || editTopic || editCourse || session.title,
      batchId: batch.id,
      facultyId: fac.id,
      branchId: editBranch || batch.branchId || session.branchId,
      scheduledDate: editDate,
      startTime: formTimes.start,
      endTime: formTimes.end,
      timeslotMasterId: formTimes.timeslotMasterId ?? undefined,
      classroomMasterId: editMode !== "ONLINE" ? editClassroomMasterId || undefined : undefined,
      mode: editMode,
    };

    setIsActionLoading(true);
    try {
      await updateSession.mutateAsync({ id: session.id, payload });
      if (editMode === "ONLINE" && !session.meetingUrl) {
        await classSessionsApi.createGoogleMeet(session.id);
      }
      await queryClient.invalidateQueries({ queryKey: ["class-sessions", session.id] });
      setIsEditModalOpen(false);
      showNotification(
        editMode === "ONLINE" && !session.meetingUrl
          ? "Class updated and Google Meet created."
          : "Class details updated successfully."
      );
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as { message?: string })?.message;
      showNotification(apiMessage || "Failed to update class details.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreateGoogleMeet = async () => {
    if (!session) return;
    setIsActionLoading(true);
    try {
      await classSessionsApi.createGoogleMeet(session.id);
      await queryClient.invalidateQueries({ queryKey: ["class-sessions", session.id] });
      showNotification("Google Meet created successfully.");
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message;
      showNotification(
        apiMessage || "Connect Google Workspace in Integrations before creating a Meet.",
        "error"
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Change Faculty Modal
  const handleOpenChangeFaculty = () => {
    if (!session) return;
    setTargetFacultyId(session.facultyId || "");
    setIsChangeFacultyModalOpen(true);
  };

  // Save Changed Faculty
  const handleSaveFacultyAssignment = async () => {
    if (!session || !targetFacultyId) return;
    const fac = facultyMembers.find((f: any) => f.id === targetFacultyId);
    if (!fac) return;
    const fName = fac.user?.name || fac.employeeCode || "Faculty";

    setIsActionLoading(true);
    try {
      await updateSession.mutateAsync({
        id: session.id,
        payload: { facultyId: fac.id },
      });
      await queryClient.invalidateQueries({ queryKey: ["class-sessions", session.id] });
      setIsChangeFacultyModalOpen(false);
      showNotification(`Assigned ${fName} to this class.`);
    } catch {
      showNotification("Failed to assign faculty. Please try again.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Cancel Class
  const handleConfirmCancel = async () => {
    if (!session) return;
    setIsActionLoading(true);
    try {
      await classSessionsApi.cancel(session.id);
      await queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["class-sessions", session.id] });
      setIsCancelConfirmOpen(false);
      showNotification(`Class "${topicName}" marked as Cancelled.`);
    } catch {
      showNotification("Failed to cancel class.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete Class
  const handleConfirmDelete = async () => {
    if (!session) return;
    setIsActionLoading(true);
    try {
      await deleteSession.mutateAsync(session.id);
      setIsDeleteConfirmOpen(false);
      navigate(backPath, { replace: true });
    } catch {
      showNotification("Failed to delete class.", "error");
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer density="compact" className="animate-pulse">
        <div className="h-4 w-36 bg-muted rounded-lg" />
        <div className="h-10 w-72 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-44 bg-card border border-border rounded-xl" />
          <div className="h-44 bg-card border border-border rounded-xl" />
          <div className="h-44 bg-card border border-border rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (error || !session) {
    return (
      <PageContainer maxWidth="narrow" className="text-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Class session not found</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The requested class session could not be located or may have been removed.
        </p>
        <Button onClick={() => navigate(backPath)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Classes
        </Button>
      </PageContainer>
    );
  }

  const modeLabel =
    session.mode === "ONLINE" ? "Online" : session.mode === "HYBRID" ? "Hybrid" : "Offline";

  return (
    <PageContainer density="compact" className="animate-in fade-in duration-200">
      <Link
        to={backPath}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Classes
      </Link>

      {notificationMsg && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 text-xs font-medium border ${
            notificationMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300"
          }`}
        >
          {notificationMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{notificationMsg.text}</span>
        </div>
      )}

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {topicName}
            {renderStatusBadge(currentStatus)}
          </span>
        }
        description={headerDescription}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border border-border shadow-xs bg-card rounded-xl">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Schedule
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[11px] font-medium text-muted-foreground mb-0.5">Date</dt>
                <dd className="font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {formatDateLabel(dateStr)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-muted-foreground mb-0.5">Time</dt>
                <dd className="font-medium text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {session.startTime || "—"} – {session.endTime || "—"}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[11px] font-medium text-muted-foreground mb-0.5">Type</dt>
                  <dd className="font-medium text-foreground">
                    {session.sessionType || "Theory"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-muted-foreground mb-0.5">Mode</dt>
                  <dd className="font-medium text-foreground flex items-center gap-1.5">
                    {session.mode === "ONLINE" ? (
                      <Video className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    {modeLabel}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-muted-foreground mb-0.5">
                  {session.mode === "ONLINE" ? "Meeting" : "Room"}
                </dt>
                <dd className="font-medium text-foreground">
                  {session.mode === "ONLINE" ? (
                    session.meetingUrl ? (
                      hostPhase === "after" ? (
                        <span
                          className="text-muted-foreground inline-flex items-center gap-1.5"
                          title="Scheduled window has ended"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          Meeting ended
                        </span>
                      ) : (
                        <a
                          href={session.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1.5 break-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          Open meeting link
                        </a>
                      )
                    ) : (
                      <div className="space-y-2">
                        <span className="text-muted-foreground">Google Meet pending</span>
                        {canEditClasses && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCreateGoogleMeet}
                            disabled={isActionLoading}
                            className="h-8"
                          >
                            {isActionLoading ? "Creating…" : "Create Google Meet"}
                          </Button>
                        )}
                      </div>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {session.roomNo || "Not assigned"}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-xl">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Batch & curriculum
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[11px] font-medium text-muted-foreground mb-0.5">Batch</dt>
                <dd className="font-medium text-foreground">
                  <span className="font-mono text-xs">{session.batch?.code || "—"}</span>
                  {session.batch?.name ? (
                    <span className="text-muted-foreground"> · {session.batch.name}</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-muted-foreground mb-0.5">Course</dt>
                <dd className="font-medium text-foreground">
                  {session.batch?.course?.name || courseDisplayName}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-muted-foreground mb-0.5">Module</dt>
                <dd className="font-medium text-foreground">{moduleName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-muted-foreground mb-0.5">Branch</dt>
                <dd className="font-medium text-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {branchObj?.name || "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-xl">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Faculty
            </h3>
            {isFacultyAssigned ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 rounded-full border border-border shrink-0">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-muted text-foreground font-semibold text-xs">
                      {facultyName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{facultyName}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {session.faculty?.employeeCode || "—"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-border">
                  {session.faculty?.user?.email && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{session.faculty.user.email}</span>
                    </div>
                  )}
                  {session.faculty?.user?.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{session.faculty.user.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p>No faculty assigned to this session.</p>
                </div>
                {canEditClasses && (
                  <Button size="sm" onClick={handleOpenChangeFaculty} className="h-8 gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" /> Assign faculty
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PageSection
        title={`Enrolled students (${enrolledCount})`}
        description={
          session.batch?.code
            ? `Students in batch ${session.batch.code}`
            : "Students registered for this batch"
        }
        actions={
          batchStudents.length > 0 ? (
            <div className="relative min-w-[200px] max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search students…"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="h-9 pl-8 text-sm border-border"
              />
            </div>
          ) : undefined
        }
      >
        <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
          {loadingStudents ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading students…</span>
            </div>
          ) : batchStudents.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2 px-4">
              <Users className="w-8 h-8 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground text-sm">No enrolled students</p>
              <p className="text-xs max-w-sm mx-auto">
                No students are currently enrolled in this batch.
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No students match &ldquo;{studentSearch}&rdquo;.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-4 pl-5">Student</th>
                    <th className="py-2.5 px-4">ID</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((item: any) => {
                    const sName =
                      item.student?.user?.name || item.student?.studentCode || "Student";
                    const sCode = item.student?.studentCode || "—";
                    const sEmail = item.student?.user?.email || "—";
                    const sPhone = item.student?.user?.phone || "—";

                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 pl-5 align-middle">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 rounded-full border border-border shrink-0">
                              <AvatarFallback className="bg-muted text-foreground font-medium text-[10px]">
                                {sName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground truncate">{sName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 align-middle">
                          <span className="font-mono text-xs text-foreground">{sCode}</span>
                        </td>
                        <td className="py-2.5 px-4 align-middle text-muted-foreground text-xs">
                          {sEmail}
                        </td>
                        <td className="py-2.5 px-4 align-middle text-muted-foreground text-xs">
                          {sPhone}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageSection>

      <PageSection
        title="Actions"
        description={
          isSessionLocked
            ? dbSessionStatus === "CANCELLED"
              ? "This class is cancelled. Edit, change faculty, and cancel are unavailable — you can still delete it."
              : "This class is completed. Edit, change faculty, and cancel are unavailable — you can still delete it."
            : "Update schedule, faculty, or remove this session"
        }
      >
        <div className="flex flex-wrap gap-2">
          <PermissionGate itemKey="schedule.classes" mode="write">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenEdit}
              disabled={isSessionLocked || isActionLoading}
              title={lockedActionTitle}
              className="h-9 gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit class
            </Button>
          </PermissionGate>

          <PermissionGate itemKey="schedule.classes" mode="write">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenChangeFaculty}
              disabled={isSessionLocked || isActionLoading}
              title={lockedActionTitle}
              className="h-9 gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isFacultyAssigned ? "Change faculty" : "Assign faculty"}
            </Button>
          </PermissionGate>

          <PermissionGate itemKey="schedule.classes" mode="write">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(true)}
              disabled={isSessionLocked || isActionLoading}
              title={lockedActionTitle}
              className="h-9 gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950/40"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel class
            </Button>
          </PermissionGate>

          <PermissionGate itemKey="schedule.classes" mode="write">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={isActionLoading}
              className="h-9 gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete class
            </Button>
          </PermissionGate>
        </div>
      </PageSection>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card text-foreground rounded-xl p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-foreground">
              Edit Scheduled Class
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Update timing, batch, faculty assignment, or classroom details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-foreground">Course / Subject *</Label>
                <select
                  value={editCourse}
                  onChange={(e) => {
                    setEditCourse(e.target.value);
                    setEditTopic(e.target.value);
                  }}
                  className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-medium outline-none"
                >
                  <option value="">Select course</option>
                  {courseOptions.map((course: any) => (
                    <option key={course.id} value={course.name}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-foreground">Batch Code *</Label>
                <select
                  value={editBatch}
                  onChange={(e) => {
                    const code = e.target.value;
                    setEditBatch(code);
                    const matched = batchOptions.find((b: any) => b.code === code || b.id === code);
                    if (matched?.branchId) setEditBranch(matched.branchId);
                  }}
                  className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-medium outline-none"
                >
                  <option value="">Select batch</option>
                  {batchOptions.map((batch: any) => (
                    <option key={batch.id} value={batch.code}>
                      {batch.code} — {batch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-foreground">Class Topic / Module *</Label>
              <Input
                value={editModule}
                onChange={(e) => setEditModule(e.target.value)}
                placeholder="e.g. Arrays & Collections"
                className="h-9 mt-1 text-xs rounded-xl bg-background border-border text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-foreground">Branch Center</Label>
                <select
                  value={editBranch}
                  onChange={(e) => setEditBranch(e.target.value)}
                  className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-medium outline-none"
                >
                  {branchesList.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-foreground">Assign Faculty</Label>
                <select
                  value={editFacultyId}
                  onChange={(e) => setEditFacultyId(e.target.value)}
                  className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-medium outline-none"
                >
                  <option value="none">Leave unassigned</option>
                  {editFacultyOptions.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.user?.name || f.employeeCode} ({f.specialization || "Instruction"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label className="text-[11px] font-bold text-foreground">Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="h-9 mt-1 text-xs rounded-xl bg-background border-border text-foreground"
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold text-foreground">Time Slot</Label>
                <select
                  value={editPeriod}
                  onChange={(e) => setEditPeriod(Number(e.target.value))}
                  className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-medium outline-none text-xs"
                  disabled={slotsEmpty}
                >
                  {slotsEmpty ? (
                    <option value={editPeriod}>Configure Time Slots in Master Setup</option>
                  ) : (
                    timetableSlots.map((slot) => (
                      <option key={slot.timeslotMasterId || slot.period} value={slot.period}>
                        {slot.label}
                        {slot.isBreak ? " · Break" : slot.isLunch ? " · Lunch" : ""}
                        {takenPeriodSet.has(slot.period) ? " · Taken" : ""}
                      </option>
                    ))
                  )}
                </select>
                {editSlotConflict && (
                  <p className="mt-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      This time slot is already assigned (
                      {editSlotConflict.title || "Class"} at {editSlotConflict.startTime}–
                      {editSlotConflict.endTime}). Choose another slot or faculty.
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-foreground">Class Mode</Label>
                <select
                  value={editMode}
                  onChange={(e) => setEditMode(e.target.value as ClassMode)}
                  className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-medium outline-none"
                >
                  <option value="OFFLINE">Offline (In-Person)</option>
                  <option value="ONLINE">Online (Virtual Meeting)</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-foreground">
                  {editMode === "ONLINE" ? "Meeting Type" : "Classroom / Lab"}
                </Label>
                {editMode === "ONLINE" ? (
                  <div className="h-9 mt-1 px-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center gap-2 font-medium">
                    <Video className="h-4 w-4" />
                    Google Meet {session.meetingUrl ? "(connected)" : "(auto-created on save)"}
                  </div>
                ) : (
                  <ClassroomDropdown
                    value={editClassroomMasterId}
                    onChange={setEditClassroomMasterId}
                    branchId={editBranch !== "ALL" ? editBranch : undefined}
                    className="mt-0"
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-3">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="text-xs font-bold h-9 rounded-xl border-border bg-card text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isActionLoading || !!editSlotConflict}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold h-9 rounded-xl gap-1.5"
            >
              <Check className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangeFacultyModalOpen} onOpenChange={setIsChangeFacultyModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-foreground rounded-xl p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-foreground">
              Assign / Change Faculty
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Select an instructor for {topicName} ({session.batch?.code || "Batch"}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-3 text-xs">
            <Label className="text-[11px] font-bold text-foreground">Available Faculty Members</Label>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {facultyMembers.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center">
                  No faculty members available to assign.
                </p>
              ) : (
                facultyMembers.map((fac: any) => {
                  const isSelected = targetFacultyId === fac.id;
                  const name = fac.user?.name || fac.employeeCode || "Faculty Member";
                  const specialization = fac.specialization || "Technical Instructor";
                  return (
                    <button
                      type="button"
                      key={fac.id}
                      onClick={() => setTargetFacultyId(fac.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-blue-500/15 border-blue-500 ring-2 ring-blue-500/20"
                          : "bg-background border-border hover:border-border/80 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarFallback className="bg-[#1769AA] text-white font-bold text-xs">
                            {name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-foreground text-xs block">{name}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {specialization}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-[#1769AA] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsChangeFacultyModalOpen(false)}
              className="text-xs font-bold rounded-xl border-border bg-card text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFacultyAssignment}
              disabled={isActionLoading || !targetFacultyId}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl gap-1.5"
            >
              <Check className="h-3.5 w-3.5" /> Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-card text-foreground rounded-xl p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <XCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Cancel Class Session?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium leading-relaxed">
              Are you sure you want to cancel{" "}
              <strong className="text-foreground">{topicName}</strong> scheduled for{" "}
              <strong className="text-foreground">{formatDateLabel(dateStr)}</strong>? This will
              mark the session as cancelled.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsCancelConfirmOpen(false)}
              className="text-xs font-bold rounded-xl border-border bg-card text-foreground hover:bg-muted"
            >
              Keep Class
            </Button>
            <Button
              onClick={handleConfirmCancel}
              disabled={isActionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl gap-1.5"
            >
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-card text-foreground rounded-xl p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Permanently Delete Class?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium leading-relaxed">
              This action cannot be undone. This will permanently remove{" "}
              <strong className="text-foreground">{topicName}</strong> from the timetable and
              schedule.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="text-xs font-bold rounded-xl border-border bg-card text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isActionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl gap-1.5"
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
