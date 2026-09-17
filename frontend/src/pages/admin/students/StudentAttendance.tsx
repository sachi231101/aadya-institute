import React, { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ShieldCheck,
  Building2,
  GraduationCap,
  QrCode,
  SlidersHorizontal,
  MoreVertical,
  Check,
  Lock,
  Lightbulb,
  TrendingUp,
  Users,
  Camera,
  Info,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { METRIC_GRID_COLUMNS, PageContainer, PageHeader, MetricGrid } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AttendanceDeskStatus = "PRESENT" | "ABSENT" | "LEAVE";

export interface StudentAttendanceItem {
  id: string;
  studentCode: string;
  name: string;
  email: string;
  status: AttendanceDeskStatus | null;
  remarks: string;
}

const LEAVE_REASONS = [
  "Medical Leave",
  "Personal Emergency",
  "Official Leave",
  "Family Emergency",
  "Academic Event",
  "Other",
];

import { useBranches } from "@/hooks/useBranches";
import { useBatches } from "@/hooks/useBatches";
import { useClassSessions } from "@/hooks/useClassSessions";
import { useBranchStore } from "@/store/branch.store";
import { classSessionsApi, type BackendClassSession } from "@/services/class-sessions.api";
import { localTodayKey, toDateKey } from "@/constants/timetable-slots";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
}

function normalizeStatus(raw: unknown): AttendanceDeskStatus | null {
  const value = String(raw ?? "").toUpperCase();
  if (value === "PRESENT" || value === "ABSENT" || value === "LEAVE") return value;
  if (value === "EXCUSED") return "LEAVE";
  return null;
}

function apiMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function sessionOptionLabel(session: BackendClassSession): string {
  const time =
    session.startTime && session.endTime ? `${session.startTime}–${session.endTime}` : "";
  const batch = session.batch?.code || session.batch?.name || "";
  return [time, session.title || "Class", batch].filter(Boolean).join(" · ");
}

export const StudentAttendance: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { canEditItem } = usePermissions();
  const canEditAttendance = canEditItem("students.attendance");
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchResponse } = useBranches({ limit: 100 });
  const branches = branchResponse?.data ?? [];
  const { batches } = useBatches();

  const [selectedBranch, setSelectedBranch] = useState<string>(
    selectedBranchId !== "ALL" ? selectedBranchId : "ALL"
  );
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(localTodayKey());
  const [sessionChoice, setSessionChoice] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AttendanceDeskStatus>("ALL");
  const [activeTab, setActiveTab] = useState<"list" | "summary" | "history">("list");
  const [draft, setDraft] = useState<Record<string, { status: AttendanceDeskStatus | null; remarks: string }>>({});
  const [draftSessionId, setDraftSessionId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const [isScanQrModalOpen, setIsScanQrModalOpen] = useState(false);
  const [manualQrCode, setManualQrCode] = useState("");

  const showToast = (message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3500);
  };

  const profileBase = location.pathname.startsWith("/center")
    ? "/center/students"
    : location.pathname.startsWith("/counselor")
      ? "/counselor/students"
      : "/admin/students";

  const visibleBatches = batches.filter(
    (batch) =>
      selectedBranch === "ALL" ||
      batch.branchId === selectedBranch ||
      batch.branch?.id === selectedBranch
  );

  const daySessionParams = {
    ...(selectedBranch !== "ALL" ? { branchId: selectedBranch } : {}),
    ...(selectedBatch !== "ALL" ? { batchId: selectedBatch } : {}),
    startDate: selectedDate,
    endDate: selectedDate,
    limit: 100,
  };
  const {
    data: daySessionsResponse,
    isLoading: sessionsLoading,
    isError: sessionsError,
    error: sessionsQueryError,
  } = useClassSessions(daySessionParams);

  const daySessions = useMemo(
    () =>
      (daySessionsResponse?.data ?? []).filter(
        (session) => session.sessionStatus !== "CANCELLED" && session.status !== "CANCELLED"
      ),
    [daySessionsResponse]
  );

  const activeSession =
    daySessions.find((session) => session.id === sessionChoice) ??
    (daySessions.length === 1 ? daySessions[0] : null);
  const activeSessionId = activeSession?.id ?? "";

  if (activeSessionId !== draftSessionId) {
    setDraftSessionId(activeSessionId);
    setDraft({});
    setSelectedIds(new Set());
  }

  const {
    data: attendanceResponse,
    isLoading: rosterLoading,
    isError: rosterError,
    error: rosterQueryError,
  } = useQuery({
    queryKey: ["class-session-attendance", activeSessionId],
    queryFn: () => classSessionsApi.getAttendance(activeSessionId),
    enabled: Boolean(activeSessionId),
  });

  const serverRoster = useMemo<StudentAttendanceItem[]>(() => {
    const roster = attendanceResponse?.data?.students;
    if (!Array.isArray(roster)) return [];
    return roster.map((student: {
      studentId?: string;
      id?: string;
      studentCode?: string;
      name?: string;
      email?: string | null;
      status?: string | null;
      remarks?: string | null;
    }) => {
      const id = student.studentId || student.id || "";
      const name = student.name || student.studentCode || "Student";
      return {
        id,
        studentCode: student.studentCode || id.slice(0, 8),
        name,
        email: student.email || "",
        status: normalizeStatus(student.status),
        remarks: student.remarks || "",
      };
    });
  }, [attendanceResponse]);

  const students = useMemo(
    () =>
      serverRoster.map((student) => {
        const edit = activeSessionId === draftSessionId ? draft[student.id] : undefined;
        return edit ? { ...student, status: edit.status, remarks: edit.remarks } : student;
      }),
    [serverRoster, draft, activeSessionId, draftSessionId]
  );

  const historyFrom = shiftDateKey(selectedDate, -30);
  const {
    data: historyResponse,
    isLoading: historyLoading,
  } = useQuery({
    queryKey: ["class-sessions", "attendance-history", selectedBranch, selectedBatch, historyFrom, selectedDate],
    queryFn: () =>
      classSessionsApi.getAll({
        ...(selectedBranch !== "ALL" ? { branchId: selectedBranch } : {}),
        ...(selectedBatch !== "ALL" ? { batchId: selectedBatch } : {}),
        startDate: historyFrom,
        endDate: selectedDate,
        limit: 100,
      }),
    enabled: activeTab === "history",
  });

  const sessionHistory = useMemo(() => {
    return (historyResponse?.data ?? [])
      .filter((session) => session.sessionStatus !== "CANCELLED" && session.status !== "CANCELLED")
      .slice()
      .sort((a, b) => toDateKey(b.scheduledDate).localeCompare(toDateKey(a.scheduledDate)));
  }, [historyResponse]);

  const totalStudents = students.length;
  const presentCount = students.filter((s) => s.status === "PRESENT").length;
  const absentCount = students.filter((s) => s.status === "ABSENT").length;
  const leaveCount = students.filter((s) => s.status === "LEAVE").length;
  const unmarkedCount = students.filter((s) => !s.status).length;
  const markedCount = presentCount + absentCount + leaveCount;
  const hasUnsavedChanges = Object.keys(draft).length > 0;

  const presentPercentage = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(2) : "0.00";
  const absentPercentage = totalStudents > 0 ? ((absentCount / totalStudents) * 100).toFixed(2) : "0.00";
  const leavePercentage = totalStudents > 0 ? ((leaveCount / totalStudents) * 100).toFixed(2) : "0.00";

  const updateDraft = (studentId: string, next: { status: AttendanceDeskStatus | null; remarks: string }) => {
    setDraft((prev) => ({ ...prev, [studentId]: next }));
  };

  const handleStatusChange = (studentId: string, newStatus: AttendanceDeskStatus) => {
    const current = students.find((student) => student.id === studentId);
    if (!current) return;
    updateDraft(studentId, {
      status: newStatus,
      remarks: newStatus === "PRESENT" ? "" : current.remarks,
    });
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    const current = students.find((student) => student.id === studentId);
    if (!current) return;
    updateDraft(studentId, { status: current.status, remarks });
  };

  const handleToggleSelect = (studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleBulkStatusChange = (status: AttendanceDeskStatus) => {
    if (selectedIds.size === 0) return;
    setDraft((prev) => {
      const next = { ...prev };
      for (const student of students) {
        if (!selectedIds.has(student.id)) continue;
        next[student.id] = {
          status,
          remarks: status === "PRESENT" ? "" : student.remarks,
        };
      }
      return next;
    });
    const count = selectedIds.size;
    setSelectedIds(new Set());
    showToast(`Marked ${count} students as ${status}. Save to record them.`);
  };

  const handleSaveAttendance = async () => {
    if (!activeSessionId) {
      showToast("Select a scheduled class session before saving.", "error");
      return;
    }
    const entries = students
      .filter((student) => student.status)
      .map((student) => ({
        studentId: student.id,
        status: student.status as AttendanceDeskStatus,
        remarks: student.remarks || undefined,
      }));
    if (entries.length === 0) {
      showToast("Mark at least one student before saving.", "error");
      return;
    }

    setIsSaving(true);
    try {
      await classSessionsApi.saveAttendance(activeSessionId, entries);
      queryClient.setQueryData(
        ["class-session-attendance", activeSessionId],
        (current: { data?: { students?: Array<{ studentId?: string; id?: string }> } } | undefined) => {
          if (!current?.data?.students) return current;
          const byId = new Map(entries.map((entry) => [entry.studentId, entry]));
          return {
            ...current,
            data: {
              ...current.data,
              students: current.data.students.map((student) => {
                const entry = byId.get(student.studentId || student.id || "");
                if (!entry) return student;
                return { ...student, status: entry.status, remarks: entry.remarks ?? null };
              }),
            },
          };
        }
      );
      await queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["class-session-attendance", activeSessionId] });
      setDraft({});
      const unmarked = students.length - entries.length;
      showToast(
        unmarked > 0
          ? `Saved ${entries.length} students. ${unmarked} still unmarked.`
          : `Attendance saved for ${selectedDate}.`
      );
    } catch (err) {
      showToast(apiMessage(err, "Failed to save attendance"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (students.length === 0) {
      showToast("There is no class roster to export.", "error");
      return;
    }
    const batchLabel = activeSession?.batch?.code || selectedBatch;
    const headers = "Student ID,Student Name,Email,Batch,Date,Session,Status,Remarks\n";
    const rows = students
      .map(
        (student) =>
          `"${student.studentCode}","${student.name}","${student.email}","${batchLabel}","${selectedDate}","${activeSession?.title || ""}","${student.status || "UNMARKED"}","${student.remarks || ""}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_${batchLabel}_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportHistory = () => {
    if (sessionHistory.length === 0) {
      showToast("No class history to export.", "error");
      return;
    }
    const headers = "Date,Session,Batch,Enrolled,Marked,Done %\n";
    const rows = sessionHistory
      .map((session) => {
        const enrolled = session.enrolledStudentsCount ?? 0;
        const marked = session.attendanceMarkedCount ?? 0;
        const done = session.attendanceDonePercentage ?? (enrolled > 0 ? Math.round((marked / enrolled) * 100) : 0);
        return `"${toDateKey(session.scheduledDate)}","${sessionOptionLabel(session)}","${session.batch?.code || ""}","${enrolled}","${marked}","${done}"`;
      })
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_History_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openHistorySession = (session: BackendClassSession) => {
    setSelectedDate(toDateKey(session.scheduledDate));
    if (session.batchId) setSelectedBatch(session.batchId);
    if (session.branchId) {
      setSelectedBranch(session.branchId);
      setSelectedBranchId(session.branchId);
    }
    setSessionChoice(session.id);
    setActiveTab("list");
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        !searchTerm ||
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || student.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [students, searchTerm, statusFilter]);

  return (
    <PageContainer className="animate-in fade-in duration-200">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Student Attendance
            <ShieldCheck className="h-5 w-5 text-primary" />
          </span>
        }
        description="Quickly mark and manage daily student attendance."
        actions={
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="text-xs font-bold h-9 px-3.5 border-border bg-card text-foreground hover:bg-muted/40 shadow-2xs gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export Attendance
          </Button>
        }
      />

      {/* ─── TOAST NOTIFICATION ────────────────────────────────────────── */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-2xs animate-in slide-in-from-top-2 ${
            toast.tone === "error"
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300"
              : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300"
          }`}
        >
          {toast.tone === "error" ? (
            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── 2. CLASS SELECTION BAR ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 bg-card p-3.5 rounded-xl border border-border shadow-xs">
        {/* Branch */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-muted-foreground block">Branch</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedBranchId(e.target.value);
                setSelectedBatch("ALL");
                setSessionChoice("");
              }}
              className="w-full h-10 pl-9 pr-8 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">🌐 All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Batch / Course */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-muted-foreground block">Batch / Course</label>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(e.target.value);
                setSessionChoice("");
              }}
              className="w-full h-10 pl-9 pr-8 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">All Batches</option>
              {visibleBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-muted-foreground block">Date</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSessionChoice("");
              }}
              className="w-full h-10 pl-9 pr-3 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background outline-none transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* Class session — attendance is stored against a scheduled class */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-muted-foreground block">Class session</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <select
              value={activeSessionId}
              onChange={(e) => setSessionChoice(e.target.value)}
              disabled={sessionsLoading || daySessions.length === 0}
              className="w-full h-10 pl-9 pr-8 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background outline-none transition-all appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sessionsLoading ? (
                <option value="">Loading classes…</option>
              ) : daySessions.length === 0 ? (
                <option value="">No class scheduled</option>
              ) : (
                <>
                  {daySessions.length > 1 && !daySessions.some((session) => session.id === sessionChoice) && (
                    <option value="">Select a class</option>
                  )}
                  {daySessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {sessionOptionLabel(session)}
                    </option>
                  ))}
                </>
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Search Student */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-muted-foreground block">Search Student</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs font-medium text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background outline-none transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* ─── 3. SMART ATTENDANCE SUMMARY & PERCENTAGE RING ─────────────── */}
      <MetricGrid columns={METRIC_GRID_COLUMNS[4]} density="compact">
        <Card size="compact" className="border border-border shadow-xs bg-card rounded-xl">
          <CardContent size="compact" className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Students
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{totalStudents}</h3>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                {unmarkedCount > 0 ? `${unmarkedCount} still unmarked` : "Enrolled in this class"}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/40 rounded-xl text-primary dark:text-sky-400">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Present */}
        <Card size="compact" className="border border-border shadow-xs bg-card rounded-xl">
          <CardContent size="compact" className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Present
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-foreground">{presentCount}</h3>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{presentPercentage}%</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Active in class</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Absent */}
        <Card size="compact" className="border border-border shadow-xs bg-card rounded-xl">
          <CardContent size="compact" className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Absent
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-foreground">{absentCount}</h3>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{absentPercentage}%</span>
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">Not in class</p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Excused */}
        <Card size="compact" className="border border-border shadow-xs bg-card rounded-xl">
          <CardContent size="compact" className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Leave
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-foreground">{leaveCount}</h3>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{leavePercentage}%</span>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Approved leave</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 rounded-xl text-amber-600 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

      </MetricGrid>

      {/* ─── 4. TABS & FILTER PILLS ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === "list"
                ? "bg-card text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Users className="h-3.5 w-3.5" /> Student List
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === "summary"
                ? "bg-card text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Attendance Summary
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === "history"
                ? "bg-card text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Clock className="h-3.5 w-3.5" /> Attendance History
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border shadow-2xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${statusFilter === "ALL"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("PRESENT")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${statusFilter === "PRESENT"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
            >
              Present
            </button>
            <button
              onClick={() => setStatusFilter("ABSENT")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${statusFilter === "ABSENT"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
            >
              Absent
            </button>
            <button
              onClick={() => setStatusFilter("LEAVE")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${statusFilter === "LEAVE"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
            >
              Leave
            </button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
            }}
            className="h-9 w-9 rounded-xl border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 shadow-2xs shrink-0 cursor-pointer"
            title="Reset Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ─── 5. AUTO-SAVE BANNER ────────────────────────────────────────── */}
      {canEditAttendance && (
      <div className="p-3 bg-blue-50/70 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/50 rounded-xl flex items-center justify-between gap-2 text-xs font-medium text-foreground shadow-2xs">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary dark:text-sky-400 shrink-0" />
          <span>
            {activeSession
              ? `Marking ${activeSession.title || "class"} · ${activeSession.startTime}–${activeSession.endTime}. Unmarked students are not recorded until you save.`
              : daySessions.length > 1
                ? "Select the class session you want to mark."
                : "Choose a branch, batch, and date that has a scheduled class. Attendance is saved against that class session."}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
          <span className={`h-2 w-2 rounded-full ${hasUnsavedChanges ? "bg-amber-500" : "bg-emerald-500"}`} />
          <span className={hasUnsavedChanges ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
            {hasUnsavedChanges ? "Unsaved changes" : "Synced with class session"}
          </span>
        </div>
      </div>
      )}

      {/* ─── 6. TAB CONTENT: STUDENT LIST ──────────────────────────────── */}
      {activeTab === "list" && (
        <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b border-border">
                  <TableHead className="w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        selectedIds.size === filteredStudents.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold text-foreground">#</TableHead>
                  <TableHead className="w-32 text-xs font-bold text-foreground">Student ID</TableHead>
                  <TableHead className="min-w-[200px] text-xs font-bold text-foreground">
                    Student Name
                  </TableHead>
                  <TableHead className="min-w-[320px] text-xs font-bold text-foreground text-center">
                    Attendance Status
                  </TableHead>
                  <TableHead className="min-w-[240px] text-xs font-bold text-foreground">
                    Remarks (Optional)
                  </TableHead>
                  <TableHead className="w-16 text-center text-xs font-bold text-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsLoading || rosterLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm font-medium">
                      Loading class roster…
                    </TableCell>
                  </TableRow>
                ) : sessionsError || rosterError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-rose-600 text-sm font-medium">
                      {apiMessage(sessionsQueryError || rosterQueryError, "Could not load this class roster.")}
                    </TableCell>
                  </TableRow>
                ) : !activeSession ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm font-medium">
                      {daySessions.length > 1
                        ? "Select a class session to load its roster."
                        : "No class is scheduled for this branch, batch, and date. Attendance can only be marked for a scheduled class session."}
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm font-medium">
                      No students found matching current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((stu, index) => {
                    const isSelected = selectedIds.has(stu.id);
                    return (
                      <TableRow
                        key={stu.id}
                        className={`border-b border-border/70 hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/10" : ""
                          }`}
                      >
                        {/* Checkbox */}
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(stu.id)}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          />
                        </TableCell>

                        {/* Index */}
                        <TableCell className="text-center text-xs font-bold text-muted-foreground">
                          {index + 1}
                        </TableCell>

                        {/* Student ID */}
                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          {stu.studentCode}
                        </TableCell>

                        {/* Avatar & Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-border">
                              <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white text-[10px] font-bold">
                                {stu.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-bold text-foreground text-xs block">{stu.name}</span>
                              <span className="text-[11px] text-muted-foreground font-medium block">
                                {stu.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Status Buttons / Read-only badge */}
                        <TableCell>
                          {canEditAttendance ? (
                          <div className="flex items-center justify-center gap-2">
                            {/* Present */}
                            <button
                              onClick={() => handleStatusChange(stu.id, "PRESENT")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${stu.status === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-emerald-500/20 shadow-md ring-2 ring-emerald-600/30"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                                }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Present</span>
                            </button>

                            {/* Absent */}
                            <button
                              onClick={() => handleStatusChange(stu.id, "ABSENT")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${stu.status === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-rose-500/20 shadow-md ring-2 ring-rose-600/30"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                                }`}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Absent</span>
                            </button>

                            {/* Excused */}
                            <button
                              onClick={() => handleStatusChange(stu.id, "LEAVE")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${stu.status === "LEAVE"
                                  ? "bg-amber-500 text-white shadow-amber-500/20 shadow-md ring-2 ring-amber-500/30"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                                }`}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>Leave</span>
                            </button>
                          </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Badge
                                className={`text-xs font-bold ${
                                  stu.status === "PRESENT"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : stu.status === "ABSENT"
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    : stu.status === "LEAVE"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                {stu.status || "UNMARKED"}
                              </Badge>
                            </div>
                          )}
                        </TableCell>

                        {/* Remarks */}
                        <TableCell>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={stu.remarks}
                              onChange={(e) => handleRemarksChange(stu.id, e.target.value)}
                              placeholder="Add remarks..."
                              readOnly={!canEditAttendance}
                              disabled={!canEditAttendance}
                              className="w-full h-8 px-3 text-xs bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-70 disabled:cursor-default"
                            />
                            {canEditAttendance && stu.status === "LEAVE" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="absolute right-1.5 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Quick leave reasons"
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 text-xs font-medium bg-card border-border">
                                  {LEAVE_REASONS.map((reason) => (
                                    <DropdownMenuItem
                                      key={reason}
                                      onClick={() => handleRemarksChange(stu.id, reason)}
                                      className="cursor-pointer"
                                    >
                                      {reason}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>

                        {/* 3-Dots Action Menu */}
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs font-medium bg-card border-border">
                              <DropdownMenuItem
                                onClick={() => navigate(`${profileBase}/${stu.id}`)}
                                className="cursor-pointer"
                              >
                                View Student Profile
                              </DropdownMenuItem>
                              {canEditAttendance && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(stu.id, "LEAVE")}
                                className="cursor-pointer"
                              >
                                Mark as Approved Leave
                              </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  if (stu.email) window.location.href = `mailto:${stu.email}`;
                                  else showToast("This student has no email on file.", "error");
                                }}
                                className="cursor-pointer text-primary"
                              >
                                Contact / Email Student
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ─── FLOATING / STICKY BULK ACTION TOOLBAR ──────────────────── */}
          {canEditAttendance && selectedIds.size > 0 && (
            <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-2xs">
                  {selectedIds.size} Students Selected
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => handleBulkStatusChange("PRESENT")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3 gap-1"
                  >
                    <Check className="h-3 w-3" /> Mark Present
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkStatusChange("ABSENT")}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-8 px-3 gap-1"
                  >
                    <XCircle className="h-3 w-3" /> Mark Absent
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkStatusChange("LEAVE")}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 px-3 gap-1"
                  >
                    <Clock className="h-3 w-3" /> Mark Leave
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* Table Footer Progress */}
          <div className="p-3.5 bg-muted/30 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-2">
              <span>
                Showing {filteredStudents.length} of {totalStudents} Students
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-bold text-foreground">
                {markedCount} / {totalStudents} Students Marked
              </span>
              <div className="w-32 bg-muted h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${totalStudents > 0 ? (markedCount / totalStudents) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── 7. TAB CONTENT: ATTENDANCE SUMMARY ─────────────────────────── */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Breakdown Cards */}
          <Card className="border border-border shadow-xs bg-card rounded-xl p-5">
            <CardHeader className="p-0 pb-4 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Present Students ({presentCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-2.5 max-h-[360px] overflow-y-auto">
              {students
                .filter((s) => s.status === "PRESENT")
                .map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[9px]">
                          {s.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-foreground">{s.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{s.studentCode}</span>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Absent Students */}
          <Card className="border border-border shadow-xs bg-card rounded-xl p-5">
            <CardHeader className="p-0 pb-4 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600" />
                Absent Students ({absentCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-2.5 max-h-[360px] overflow-y-auto">
              {students.filter((s) => s.status === "ABSENT").length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8 font-medium">
                  No absences marked for this class.
                </p>
              ) : (
                students
                  .filter((s) => s.status === "ABSENT")
                  .map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[9px]">
                            {s.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-foreground block">{s.name}</span>
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                            {s.remarks || "No notice provided"}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-rose-600 dark:text-rose-400 font-bold">{s.studentCode}</span>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          {/* Excused Students */}
          <Card className="border border-border shadow-xs bg-card rounded-xl p-5">
            <CardHeader className="p-0 pb-4 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Leave Students ({leaveCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-2.5 max-h-[360px] overflow-y-auto">
              {students.filter((s) => s.status === "LEAVE").length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8 font-medium">
                  No approved leave recorded for this class.
                </p>
              ) : (
                students
                  .filter((s) => s.status === "LEAVE")
                  .map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[9px]">
                            {s.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-foreground block">{s.name}</span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            {s.remarks || "Approved leave"}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">{s.studentCode}</span>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── 8. TAB CONTENT: ATTENDANCE HISTORY ────────────────────────── */}
      {activeTab === "history" && (
        <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
          <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Attendance History – last 30 days
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Scheduled classes for the selected branch and batch. Open a session to review or correct marks.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportHistory}
              className="text-xs font-bold h-8 border-border"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export History
            </Button>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold text-xs text-foreground">Date</TableHead>
                <TableHead className="font-bold text-xs text-foreground">Session Topic</TableHead>
                <TableHead className="font-bold text-xs text-foreground text-center">Enrolled</TableHead>
                <TableHead className="font-bold text-xs text-foreground text-center">Marked</TableHead>
                <TableHead className="font-bold text-xs text-foreground text-center">Done</TableHead>
                <TableHead className="font-bold text-xs text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                    Loading scheduled classes…
                  </TableCell>
                </TableRow>
              ) : sessionHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                    No classes scheduled in the last 30 days for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                sessionHistory.map((session) => {
                  const enrolled = session.enrolledStudentsCount ?? 0;
                  const marked = session.attendanceMarkedCount ?? 0;
                  const done = session.attendanceDonePercentage ?? (enrolled > 0 ? Math.round((marked / enrolled) * 100) : 0);
                  return (
                    <TableRow key={session.id} className="border-b border-border/70 hover:bg-muted/30">
                      <TableCell className="font-bold text-xs text-foreground">{toDateKey(session.scheduledDate)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {sessionOptionLabel(session)}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs text-foreground">{enrolled}</TableCell>
                      <TableCell className="text-center font-bold text-xs text-foreground">{marked}</TableCell>
                      <TableCell className="text-center font-bold text-xs text-foreground">{done}%</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openHistorySession(session)}
                          className="text-xs font-bold text-primary hover:bg-primary/10 h-7"
                        >
                          Open session
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ─── 9. QR SCAN CARD & MODAL ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <PermissionGate itemKey="students.attendance" mode="write">
        <div className="md:col-span-1 p-5 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-200">
                Fast Check-in
              </span>
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-base font-bold mt-2">Scan QR for Instant Attendance</h4>
            <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
              Let students scan your classroom QR or scan student ID badges.
            </p>
          </div>
          <Button
            onClick={() => setIsScanQrModalOpen(true)}
            className="mt-4 bg-white/20 hover:bg-white/30 text-white text-xs font-bold h-9 border border-white/20 gap-2 shadow-xs cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5" /> Scan QR
          </Button>
        </div>
        </PermissionGate>

        {/* ─── 10. STICKY SAVE ATTENDANCE BANNER ─────────────────────────── */}
        <div className={`${canEditAttendance ? "md:col-span-3" : "md:col-span-4"} p-5 bg-card border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden`}>
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-sm font-semibold text-foreground tracking-tight">
                {canEditAttendance ? "Don't forget to save your attendance!" : "Attendance overview"}
              </h5>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 leading-relaxed">
                {canEditAttendance
                  ? hasUnsavedChanges
                    ? "Marks stay on this screen until you save them to the class session."
                    : `Saved marks for ${activeSession?.title || "this class"} are loaded from the database.`
                  : `Viewing attendance for ${selectedDate}.`}
              </p>
            </div>
          </div>

          <PermissionGate itemKey="students.attendance" mode="write">
          <Button
            onClick={handleSaveAttendance}
            disabled={!activeSessionId || isSaving || markedCount === 0}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-bold h-10 px-6 rounded-xl shadow-md gap-2 shrink-0 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Lock className="h-4 w-4" /> {isSaving ? "Saving…" : "Save Attendance"}
          </Button>
          </PermissionGate>
        </div>
      </div>



      {/* ─── MODAL: QR SCANNER ─────────────────────────────────────────── */}
      <Dialog open={isScanQrModalOpen} onOpenChange={setIsScanQrModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Smart QR Attendance Check-In
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Scan student ID barcode or enter student code for instant presence marking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-8 rounded-xl bg-muted/40 text-foreground flex flex-col items-center justify-center text-center border border-border">
              <Camera className="h-10 w-10 text-primary animate-pulse mb-3" />
              <p className="text-xs font-bold text-foreground">Point Camera at Student ID Card</p>
              <span className="text-[10px] text-muted-foreground mt-1">
                Batch: {activeSession?.batch?.code || "—"} • {selectedDate}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Manual Student Code</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. STU-003"
                  value={manualQrCode}
                  onChange={(e) => setManualQrCode(e.target.value)}
                  className="text-xs h-9 font-mono bg-muted/30 border-border text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  onClick={() => {
                    const match = students.find(
                      (s) => s.studentCode.toLowerCase() === manualQrCode.trim().toLowerCase()
                    );
                    if (match) {
                      handleStatusChange(match.id, "PRESENT");
                      showToast(`Marked ${match.name} as Present. Save to record it.`);
                      setManualQrCode("");
                      setIsScanQrModalOpen(false);
                    } else {
                      showToast("Student code was not found in this class roster.", "error");
                    }
                  }}
                  className="bg-primary hover:bg-primary/90 text-white text-xs font-bold h-9 px-4 cursor-pointer"
                >
                  Verify & Mark
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
