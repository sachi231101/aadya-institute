import React, { useState, useMemo } from "react";
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
  Laptop,
  Code2,
  Megaphone,
  Table as TableIcon,
  BarChart3,
  Globe,
  BookOpen,
  Layers,
  Sparkles,
  Check,
  GraduationCap,
  ShieldCheck,
  Mail,
  Phone,
  Search,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
  periodToTimes,
  toDateKey,
} from "@/constants/timetable-slots";
import { useTimetableSlotColumns } from "@/hooks/useTimetableSlotColumns";
import type { ClassMode, ClassStatus } from "@/pages/admin/schedule/Classes";

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

  const { bookableSlots, isEmpty: slotsEmpty } = useTimetableSlotColumns(
    editBranch || session?.branchId || undefined
  );

  // Change Faculty State
  const [targetFacultyId, setTargetFacultyId] = useState("");

  // Automatically fetch batch students directly
  const { data: studentsResponse, isLoading: loadingStudents } = useQuery({
    queryKey: ["batch-students", session?.batchId],
    queryFn: () => (session?.batchId ? batchesApi.getStudents(session.batchId) : Promise.resolve({ success: true, data: [] })),
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
  const facultyName = session?.faculty?.user?.name || session?.faculty?.employeeCode || "Unassigned";

  // Map session status
  const currentStatus: ClassStatus = useMemo(() => {
    if (!session) return "SCHEDULED";
    if (!isFacultyAssigned) return "UNASSIGNED";
    switch (session.sessionStatus) {
      case "LIVE":
        return "LIVE";
      case "COMPLETED":
        return "COMPLETED";
      case "CANCELLED":
        return "CANCELLED";
      default:
        return "SCHEDULED";
    }
  }, [session, isFacultyAssigned]);

  // Topic Icon
  const renderTopicIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("java")) {
      return (
        <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
          <Laptop className="w-6 h-6 stroke-[2.2]" />
        </div>
      );
    }
    if (lower.includes("python")) {
      return (
        <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
          <Code2 className="w-6 h-6 stroke-[2.2]" />
        </div>
      );
    }
    if (lower.includes("marketing")) {
      return (
        <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center shrink-0">
          <Megaphone className="w-6 h-6 stroke-[2.2]" />
        </div>
      );
    }
    if (lower.includes("excel")) {
      return (
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
          <TableIcon className="w-6 h-6 stroke-[2.2]" />
        </div>
      );
    }
    if (lower.includes("power")) {
      return (
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
          <BarChart3 className="w-6 h-6 stroke-[2.2]" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
        <Globe className="w-6 h-6 stroke-[2.2]" />
      </div>
    );
  };

  // Status Badge Component
  const renderStatusBadge = (status: ClassStatus) => {
    switch (status) {
      case "LIVE":
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-2 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE CLASS NOW
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            SCHEDULED
          </span>
        );
      case "UNASSIGNED":
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            FACULTY UNASSIGNED
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground" />
            COMPLETED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            CANCELLED
          </span>
        );
    }
  };

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!session) return;
    setEditTopic(session.title || "");
    setEditCourse(session.batch?.course?.name || courseDisplayName);
    setEditModule(session.batchModule?.courseModule?.name || "");
    setEditBatch(session.batch?.code || "");
    setEditBranch(session.branchId || "");
    setEditFacultyId(session.facultyId || "none");
    setEditDate(session.scheduledDate ? toDateKey(session.scheduledDate) : "");
    setEditPeriod(findPeriodByTimes(session.startTime, session.endTime, bookableSlots) ?? bookableSlots[0]?.period ?? 1);
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
    const batch = batches.find((b: any) => b.code === editBatch || b.id === editBatch);

    if (!batch) {
      showNotification("Please select a valid batch.", "error");
      return;
    }

    if (!fac) {
      showNotification("Faculty assignment is required to schedule or update a class.", "error");
      return;
    }

    const formTimes = periodToTimes(editPeriod, bookableSlots);
    const payload = {
      title: editModule || editTopic || editCourse,
      batchId: batch.id,
      facultyId: fac.id,
      branchId: editBranch || batch.branchId || session.branchId,
      scheduledDate: editDate,
      startTime: formTimes.start,
      endTime: formTimes.end,
      timeslotMasterId: formTimes.timeslotMasterId,
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

  // Loading State
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-7 space-y-6 max-w-[1500px] mx-auto animate-pulse">
        <div className="h-6 w-48 bg-muted rounded-lg" />
        <div className="h-28 bg-card border border-border rounded-3xl p-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="h-56 bg-card border border-border rounded-2xl" />
          <div className="h-56 bg-card border border-border rounded-2xl" />
          <div className="h-56 bg-card border border-border rounded-2xl" />
        </div>
      </div>
    );
  }

  // Not Found State
  if (error || !session) {
    return (
      <div className="p-4 sm:p-6 lg:p-7 max-w-[800px] mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Class Session Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          The requested class session could not be located or may have been removed.
        </p>
        <Button
          onClick={() => navigate(backPath)}
          className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold text-xs rounded-xl gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Classes & Sessions
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-7 text-foreground font-sans w-full max-w-[1500px] mx-auto pb-20 animate-in fade-in duration-200">
      {/* ─── 1. TOP NAVIGATION & BREADCRUMB ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={backPath}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group px-3 py-1.5 rounded-xl hover:bg-muted/60 border border-transparent hover:border-border"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Classes & Sessions</span>
        </Link>

        {/* Quick Batch Pill */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Batch:
          </span>
          <span className="px-3 py-1 rounded-xl text-xs font-black bg-muted/80 text-foreground border border-border">
            {session.batch?.code || "BATCH"}
          </span>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold shadow-sm animate-in fade-in duration-150 ${
            notificationMsg.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/15 border-rose-500/30 text-rose-400"
          }`}
        >
          {notificationMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
          )}
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* ─── 2. PAGE HEADER HERO CARD ────────────────────────────────────── */}
      <Card className="border border-border shadow-xs bg-card rounded-3xl p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4 sm:gap-5">
            {renderTopicIcon(topicName)}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {topicName}
                </h1>
                {renderStatusBadge(currentStatus)}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <BookOpen className="w-3.5 h-3.5" />
                  {courseDisplayName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                  {moduleName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  {branchObj?.name || "Center Branch"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Info Summary Tags */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-muted/40 border border-border rounded-2xl flex flex-col justify-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                Mode
              </span>
              <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                {session.mode === "ONLINE" ? (
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {session.mode || "Offline"}
              </span>
            </div>

            <div className="px-4 py-2 bg-muted/40 border border-border rounded-2xl flex flex-col justify-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                Enrolled Students
              </span>
              <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                {batchStudents.length > 0 ? batchStudents.length : (session.enrolledStudentsCount ?? 0)} Students
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── 3. MAIN INFORMATION GRID ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Schedule & Timing */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Schedule & Timing
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {session.sessionType || "THEORY"}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">
                Scheduled Date
              </span>
              <p className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {formatDateLabel(dateStr)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">
                  Start Time
                </span>
                <p className="font-extrabold text-foreground text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  {session.startTime || "09:00 AM"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">
                  End Time
                </span>
                <p className="font-extrabold text-foreground text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  {session.endTime || "10:00 AM"}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">
                Location / Virtual Room
              </span>
              {session.mode === "ONLINE" ? (
                session.meetingUrl ? (
                  <a
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1.5 hover:underline break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>{session.meetingUrl}</span>
                  </a>
                ) : (
                  <div className="space-y-2">
                    <span className="text-muted-foreground font-semibold block">Google Meet pending</span>
                    {canEditClasses && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateGoogleMeet}
                        disabled={isActionLoading}
                        className="h-8 rounded-xl bg-[#2563EB] text-white text-xs font-bold"
                      >
                        {isActionLoading ? "Creating…" : "Create Google Meet"}
                      </Button>
                    )}
                  </div>
                )
              ) : (
                <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>{session.roomNo || "Room / Classroom assigned"}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Card 2: Batch & Curriculum Info */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-500" />
              Batch & Curriculum
            </h3>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-muted text-foreground border border-border">
              {session.batch?.code || "BATCH"}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">
                Batch Name
              </span>
              <p className="font-extrabold text-foreground text-sm">
                {session.batch?.name || "Batch Name"}
              </p>
            </div>

            <div className="pt-2 border-t border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">
                Course Program
              </span>
              <p className="font-bold text-foreground text-xs">
                {session.batch?.course?.name || courseDisplayName}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{moduleName}</p>
            </div>

            <div className="pt-2 border-t border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">
                Assigned Center Branch
              </span>
              <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                {branchObj?.name || "Branch Center"}
              </p>
            </div>
          </div>
        </Card>

        {/* Card 3: Assigned Faculty */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Assigned Faculty
            </h3>
            {isFacultyAssigned && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Assigned
              </span>
            )}
          </div>

          {isFacultyAssigned ? (
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 rounded-2xl border border-border shadow-xs shrink-0">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-[#1769AA] text-white font-black text-sm">
                    {facultyName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-foreground text-sm truncate">{facultyName}</h4>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Code: {session.faculty?.employeeCode || "FAC"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                {session.faculty?.user?.email && (
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                    <span className="truncate">{session.faculty.user.email}</span>
                  </div>
                )}
                {session.faculty?.user?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>{session.faculty.user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>No Faculty Assigned</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                This class session does not currently have an instructor assigned.
              </p>
              {canEditClasses && (
                <Button
                  size="sm"
                  onClick={handleOpenChangeFaculty}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl h-8 w-full mt-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign Faculty Now
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ─── 4. ENROLLED STUDENTS DIRECT DISPLAY ────────────────────────── */}
      <Card className="border border-border shadow-xs bg-card rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Enrolled Students
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/15 text-purple-400 border border-purple-500/30">
                {batchStudents.length} {batchStudents.length === 1 ? "Student" : "Students"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              List of all students registered in Batch {session.batch?.code || ""}.
            </p>
          </div>

          {/* Search Input for Students */}
          {batchStudents.length > 0 && (
            <div className="relative min-w-[240px] max-w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="h-9 pl-9 bg-background border-border text-foreground text-xs font-medium rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Student List / Table */}
        {loadingStudents ? (
          <div className="py-12 text-center text-muted-foreground text-xs font-medium flex flex-col items-center justify-center gap-2">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading enrolled students...</span>
          </div>
        ) : batchStudents.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground">
              <Users className="w-6 h-6" />
            </div>
            <p className="font-bold text-foreground text-sm">No Enrolled Students</p>
            <p className="text-xs max-w-sm mx-auto">
              There are currently no students assigned or enrolled in batch {session.batch?.code || ""}.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-xs font-medium">
            No students match your search &ldquo;{studentSearch}&rdquo;.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-muted/40 dark:bg-slate-900/60 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 pl-5">STUDENT NAME</th>
                  <th className="py-3 px-4">STUDENT ID</th>
                  <th className="py-3 px-4">CONTACT EMAIL</th>
                  <th className="py-3 px-4">PHONE NUMBER</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredStudents.map((item: any) => {
                  const sName =
                    item.student?.user?.name ||
                    item.student?.studentCode ||
                    "Student";
                  const sCode = item.student?.studentCode || "—";
                  const sEmail = item.student?.user?.email || "—";
                  const sPhone = item.student?.user?.phone || "—";

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4 pl-5 align-middle">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-full border border-border shadow-2xs shrink-0">
                            <AvatarFallback className="bg-purple-600/90 text-white font-black text-[11px]">
                              {sName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="font-bold text-foreground block truncate">
                              {sName}
                            </span>
                            {item.student?.qualification && (
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {item.student.qualification}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3 px-4 align-middle font-black text-foreground">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-muted/80 text-foreground border border-border inline-block">
                          {sCode}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 align-middle text-muted-foreground font-medium">
                        {sEmail !== "—" ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate">{sEmail}</span>
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 align-middle text-muted-foreground font-medium">
                        {sPhone !== "—" ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{sPhone}</span>
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center align-middle">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Enrolled
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ─── 5. ACTIONS SECTION ─────────────────────────────────────────── */}
      <Card className="border border-border shadow-xs bg-card rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Class Management Actions
            </h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Perform administrative operations, update schedules, or assign faculty.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          {/* Action 1: Edit Class */}
          <PermissionGate itemKey="schedule.classes" mode="write">
            <Button
              onClick={handleOpenEdit}
              disabled={currentStatus === "CANCELLED" || currentStatus === "COMPLETED"}
              className="h-12 bg-muted/60 hover:bg-muted text-foreground border border-border hover:border-blue-500/50 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4 text-blue-400" />
              <span>Edit Class</span>
            </Button>
          </PermissionGate>

          {/* Action 2: Change Faculty */}
          <PermissionGate itemKey="schedule.classes" mode="write">
            <Button
              onClick={handleOpenChangeFaculty}
              disabled={currentStatus === "CANCELLED" || currentStatus === "COMPLETED"}
              className="h-12 bg-muted/60 hover:bg-muted text-foreground border border-border hover:border-emerald-500/50 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>{isFacultyAssigned ? "Change Faculty" : "Assign Faculty"}</span>
            </Button>
          </PermissionGate>

          {/* Action 3: Cancel Class */}
          <PermissionGate itemKey="schedule.classes" mode="write">
            <Button
              onClick={() => setIsCancelConfirmOpen(true)}
              disabled={currentStatus === "CANCELLED" || currentStatus === "COMPLETED"}
              className="h-12 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <XCircle className="w-4 h-4 text-rose-500" />
              <span>Cancel Class</span>
            </Button>
          </PermissionGate>

          {/* Action 4: Delete Class */}
          <PermissionGate itemKey="schedule.classes" mode="write">
            <Button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="h-12 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Delete Class</span>
            </Button>
          </PermissionGate>
        </div>
      </Card>

      {/* ─── MODAL 1: EDIT CLASS MODAL ─────────────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card text-foreground rounded-3xl p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-black text-foreground">
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
                  {courses.map((course: any) => (
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
                    const matched = batches.find((b: any) => b.code === code || b.id === code);
                    if (matched?.branchId) setEditBranch(matched.branchId);
                  }}
                  className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-medium outline-none"
                >
                  <option value="">Select batch</option>
                  {batches.map((batch: any) => (
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
                  className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-bold text-blue-400 outline-none"
                >
                  <option value="none">⚠ Leave Unassigned for now</option>
                  {facultyMembers.map((f: any) => (
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
                    bookableSlots.map((slot) => (
                      <option key={slot.timeslotMasterId || slot.period} value={slot.period}>
                        {slot.label}
                      </option>
                    ))
                  )}
                </select>
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
                  <div className="h-9 mt-1 px-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-2 font-bold">
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
              disabled={isActionLoading}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold h-9 rounded-xl gap-1.5"
            >
              <Check className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: CHANGE FACULTY MODAL ─────────────────────────────── */}
      <Dialog open={isChangeFacultyModalOpen} onOpenChange={setIsChangeFacultyModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-foreground rounded-3xl p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-black text-foreground">
              Assign / Change Faculty
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Select an instructor for {topicName} ({session.batch?.code || "Batch"}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-3 text-xs">
            <Label className="text-[11px] font-bold text-foreground">Available Faculty Members</Label>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {facultyMembers.map((fac: any) => {
                const isSelected = targetFacultyId === fac.id;
                const name = fac.user?.name || fac.employeeCode || "Faculty Member";
                const specialization = fac.specialization || "Technical Instructor";
                return (
                  <div
                    key={fac.id}
                    onClick={() => setTargetFacultyId(fac.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
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
                  </div>
                );
              })}
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

      {/* ─── MODAL 3: CANCEL CLASS CONFIRMATION ─────────────────────────── */}
      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-card text-foreground rounded-3xl p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <XCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-black text-foreground">
              Cancel Class Session?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium leading-relaxed">
              Are you sure you want to cancel <strong className="text-foreground">{topicName}</strong> scheduled for{" "}
              <strong className="text-foreground">{formatDateLabel(dateStr)}</strong>? This will mark the session as cancelled.
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

      {/* ─── MODAL 4: DELETE CLASS CONFIRMATION ─────────────────────────── */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-card text-foreground rounded-3xl p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-black text-foreground">
              Permanently Delete Class?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium leading-relaxed">
              This action cannot be undone. This will permanently remove <strong className="text-foreground">{topicName}</strong> from the timetable and schedule.
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
    </div>
  );
};
