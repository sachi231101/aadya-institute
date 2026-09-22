import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  CheckCircle2,
  XCircle,
  Download,
  MoreVertical,
  Check,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader, FilterToolbar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

import { useBatches } from "@/hooks/useBatches";
import { useClassSessions } from "@/hooks/useClassSessions";
import { useBranchScopeForLists } from "@/hooks/useBranchScopeForLists";
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
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code?: string }).code || "");
    if (code === "ERR_NETWORK" || code === "ECONNABORTED") {
      return "Cannot reach the server. Check that the backend is running.";
    }
  }
  if (err instanceof Error && err.message) {
    if (err.message.startsWith("Request failed")) {
      return "Cannot reach the server. Check that the backend is running.";
    }
    return err.message;
  }
  return fallback;
}

type CheckInMatchResult =
  | { ok: true; student: StudentAttendanceItem }
  | { ok: false; reason: "empty" | "not_found" | "ambiguous"; matches?: StudentAttendanceItem[] };

/** Match roster by exact student code, then exact name; require unique name match. */
function findCheckInMatch(
  roster: StudentAttendanceItem[],
  rawQuery: string
): CheckInMatchResult {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return { ok: false, reason: "empty" };

  const byCode = roster.find((s) => s.studentCode.toLowerCase() === query);
  if (byCode) return { ok: true, student: byCode };

  const byExactName = roster.filter((s) => s.name.trim().toLowerCase() === query);
  if (byExactName.length === 1) return { ok: true, student: byExactName[0] };
  if (byExactName.length > 1) return { ok: false, reason: "ambiguous", matches: byExactName };

  const byPartialName = roster.filter((s) => s.name.trim().toLowerCase().includes(query));
  if (byPartialName.length === 1) return { ok: true, student: byPartialName[0] };
  if (byPartialName.length > 1) return { ok: false, reason: "ambiguous", matches: byPartialName };

  return { ok: false, reason: "not_found" };
}

function filterCheckInSuggestions(
  roster: StudentAttendanceItem[],
  rawQuery: string,
  limit = 8
): StudentAttendanceItem[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  return roster
    .filter((s) => {
      const name = s.name.trim().toLowerCase();
      const code = s.studentCode.toLowerCase();
      return name.includes(query) || code.includes(query);
    })
    .slice(0, limit);
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
  const {
    branches,
    isBranchLocked,
    allowAllBranches,
    showBranchSelector,
    selectedBranchId,
    branchIdForQuery,
    setSelectedBranchId,
  } = useBranchScopeForLists();
  const { batches } = useBatches();

  // Admin defaults to ALL — a persisted single-branch filter can hide sessions that live on
  // another branch id (e.g. HQ) while the branches list only shows Malleshwaram.
  // CM/Counsellor always use a concrete branch from useBranchScopeForLists.
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
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
  const [checkInSelectedId, setCheckInSelectedId] = useState("");
  const [checkInHighlight, setCheckInHighlight] = useState(0);
  const didSyncMultiBranch = useRef(false);
  const didAutoPickSessionKey = useRef("");
  const [nearestJumpKey, setNearestJumpKey] = useState<string | null>(null);

  const showToast = (message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3500);
  };

  const profileBase = location.pathname.startsWith("/center")
    ? "/center/students"
    : location.pathname.startsWith("/counselor")
      ? "/counselor/students"
      : "/admin/students";

  const effectiveBranch =
    isBranchLocked && branchIdForQuery ? branchIdForQuery : selectedBranch;

  const visibleBatches = batches.filter(
    (batch) =>
      effectiveBranch === "ALL" ||
      batch.branchId === effectiveBranch ||
      batch.branch?.id === effectiveBranch
  );

  // Locked roles: always mirror concrete branch from scope hook.
  useEffect(() => {
    if (!isBranchLocked || !branchIdForQuery) return;
    if (selectedBranch !== branchIdForQuery) {
      setSelectedBranch(branchIdForQuery);
    }
  }, [isBranchLocked, branchIdForQuery, selectedBranch]);

  // Admin: only apply a stored branch when they can switch between multiple branches.
  useEffect(() => {
    if (isBranchLocked) return;
    if (didSyncMultiBranch.current || branches.length === 0) return;
    didSyncMultiBranch.current = true;
    if (
      branches.length > 1 &&
      selectedBranchId !== "ALL" &&
      branches.some((b) => b.id === selectedBranchId)
    ) {
      setSelectedBranch(selectedBranchId);
    }
  }, [branches, selectedBranchId, isBranchLocked]);

  const dayWindowFrom = shiftDateKey(selectedDate, -1);
  const dayWindowTo = shiftDateKey(selectedDate, 1);
  const daySessionParams = {
    ...(effectiveBranch !== "ALL" ? { branchId: effectiveBranch } : {}),
    ...(selectedBatch !== "ALL" ? { batchId: selectedBatch } : {}),
    startDate: dayWindowFrom,
    endDate: dayWindowTo,
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
        (session) =>
          session.sessionStatus !== "CANCELLED" &&
          session.status !== "CANCELLED" &&
          toDateKey(session.scheduledDate) === selectedDate
      ),
    [daySessionsResponse, selectedDate]
  );

  const todayKey = localTodayKey();
  const filterKey = `${effectiveBranch}|${selectedBatch}`;
  const alreadyJumpedForFilters = nearestJumpKey === filterKey;
  const nearbyFrom = shiftDateKey(todayKey, -30);
  const nearbyTo = shiftDateKey(todayKey, 30);
  const shouldSeekNearestDay =
    !sessionsLoading && daySessions.length === 0 && selectedDate === todayKey;
  const { data: nearbySessionsResponse, isLoading: nearbyLoading } = useQuery({
    queryKey: [
      "class-sessions",
      "attendance-nearby",
      effectiveBranch,
      selectedBatch,
      nearbyFrom,
      nearbyTo,
    ],
    queryFn: () =>
      classSessionsApi.getAll({
        ...(effectiveBranch !== "ALL" ? { branchId: effectiveBranch } : {}),
        ...(selectedBatch !== "ALL" ? { batchId: selectedBatch } : {}),
        startDate: nearbyFrom,
        endDate: nearbyTo,
        limit: 100,
      }),
    enabled: shouldSeekNearestDay && !alreadyJumpedForFilters,
  });

  // Today empty → jump once to the nearest scheduled class day.
  useEffect(() => {
    if (alreadyJumpedForFilters || sessionsLoading || nearbyLoading) return;
    if (selectedDate !== todayKey) {
      setNearestJumpKey(filterKey);
      return;
    }
    if (daySessions.length > 0) {
      setNearestJumpKey(filterKey);
      return;
    }
    const nearby = (nearbySessionsResponse?.data ?? [])
      .filter(
        (session) => session.sessionStatus !== "CANCELLED" && session.status !== "CANCELLED"
      )
      .slice()
      .sort((a, b) => toDateKey(a.scheduledDate).localeCompare(toDateKey(b.scheduledDate)));
    if (nearby.length === 0) {
      if (nearbySessionsResponse) setNearestJumpKey(filterKey);
      return;
    }
    const upcoming = nearby.find((session) => toDateKey(session.scheduledDate) >= todayKey);
    const target = upcoming ?? nearby[nearby.length - 1];
    setNearestJumpKey(filterKey);
    setSelectedDate(toDateKey(target.scheduledDate));
    setSessionChoice(target.id);
  }, [
    alreadyJumpedForFilters,
    sessionsLoading,
    nearbyLoading,
    daySessions.length,
    nearbySessionsResponse,
    selectedDate,
    todayKey,
    filterKey,
  ]);

  // Auto-select first class for the current filters when none is chosen.
  useEffect(() => {
    if (sessionsLoading || nearbyLoading) return;
    const pickKey = `${effectiveBranch}|${selectedBatch}|${selectedDate}`;
    if (daySessions.length === 0) {
      if (sessionChoice && !shouldSeekNearestDay) setSessionChoice("");
      didAutoPickSessionKey.current = pickKey;
      return;
    }
    const stillValid = daySessions.some((session) => session.id === sessionChoice);
    if (stillValid) {
      didAutoPickSessionKey.current = pickKey;
      return;
    }
    if (didAutoPickSessionKey.current === pickKey && sessionChoice) return;
    didAutoPickSessionKey.current = pickKey;
    setSessionChoice(daySessions[0].id);
  }, [
    sessionsLoading,
    nearbyLoading,
    shouldSeekNearestDay,
    daySessions,
    effectiveBranch,
    selectedBatch,
    selectedDate,
    sessionChoice,
  ]);

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
    queryKey: ["class-sessions", "attendance-history", effectiveBranch, selectedBatch, historyFrom, selectedDate],
    queryFn: () =>
      classSessionsApi.getAll({
        ...(effectiveBranch !== "ALL" ? { branchId: effectiveBranch } : {}),
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

  const checkInSuggestions = useMemo(
    () => filterCheckInSuggestions(students, manualQrCode),
    [students, manualQrCode]
  );

  const checkInConfirmedStudent = useMemo(() => {
    if (checkInSelectedId) {
      return students.find((s) => s.id === checkInSelectedId) ?? null;
    }
    const result = findCheckInMatch(students, manualQrCode);
    return result.ok ? result.student : null;
  }, [checkInSelectedId, students, manualQrCode]);

  const resetCheckInDialog = () => {
    setManualQrCode("");
    setCheckInSelectedId("");
    setCheckInHighlight(0);
  };

  const selectCheckInSuggestion = (student: StudentAttendanceItem) => {
    setCheckInSelectedId(student.id);
    setManualQrCode(`${student.name} (${student.studentCode})`);
    setCheckInHighlight(0);
  };

  const handleManualCheckIn = () => {
    const selected =
      checkInConfirmedStudent ||
      (checkInSelectedId
        ? students.find((s) => s.id === checkInSelectedId)
        : undefined);

    if (selected) {
      handleStatusChange(selected.id, "PRESENT");
      showToast(`Marked ${selected.name} (${selected.studentCode}) as Present. Save to record it.`);
      resetCheckInDialog();
      setIsScanQrModalOpen(false);
      return;
    }

    const result = findCheckInMatch(students, manualQrCode);
    if (result.ok) {
      handleStatusChange(result.student.id, "PRESENT");
      showToast(
        `Marked ${result.student.name} (${result.student.studentCode}) as Present. Save to record it.`
      );
      resetCheckInDialog();
      setIsScanQrModalOpen(false);
      return;
    }
    if (result.reason === "empty") {
      showToast("Enter a student name or code, then pick from the list.", "error");
      return;
    }
    if (result.reason === "ambiguous") {
      showToast("Multiple students match. Select one from the dropdown.", "error");
      return;
    }
    showToast("No student with that name or code was found in this class roster.", "error");
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

  const statusCards = [
    { value: "ALL" as const, label: "All", count: totalStudents },
    { value: "PRESENT" as const, label: "Present", count: presentCount },
    { value: "ABSENT" as const, label: "Absent", count: absentCount },
    { value: "LEAVE" as const, label: "Leave", count: leaveCount },
  ];

  const tableShell =
    "min-w-0 overflow-x-auto " +
    "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
    "[&_thead]:bg-muted/50 " +
    "[&_th]:h-9 [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:font-semibold " +
    "[&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground " +
    "[&_th]:border [&_th]:border-border [&_th]:whitespace-nowrap " +
    "[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_td]:border [&_td]:border-border " +
    "[&_tbody_tr]:hover:bg-muted/30 [&_tbody_tr]:transition-colors";

  return (
    <PageContainer>
      <PageHeader
        title="Student Attendance"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={handleExportCSV}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
            <PermissionGate itemKey="students.attendance" mode="write">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setIsScanQrModalOpen(true)}
                disabled={!activeSessionId}
              >
                Check in by name / code
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 bg-primary hover:bg-primary/90 text-white"
                onClick={handleSaveAttendance}
                disabled={!activeSessionId || isSaving || markedCount === 0}
              >
                {isSaving ? "Saving…" : hasUnsavedChanges ? "Save changes" : "Save attendance"}
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {toast && (
        <div
          className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
            toast.tone === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-300"
              : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-300"
          }`}
        >
          {toast.tone === "error" ? (
            <XCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {statusCards.map((card) => {
          const selected = statusFilter === card.value;
          return (
            <button
              key={card.value}
              type="button"
              onClick={() => setStatusFilter(card.value)}
              className="text-left"
            >
              <Card
                className={`border shadow-sm transition-colors ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="mt-0.5 text-xl font-semibold text-foreground tabular-nums">
                    {card.count}
                  </p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <FilterToolbar className="flex flex-col lg:flex-row lg:items-center gap-2.5 flex-wrap">
        {(allowAllBranches ? branches.length > 0 : showBranchSelector) && (
          <select
            value={effectiveBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setSelectedBranchId(e.target.value);
              setSelectedBatch("ALL");
              setSessionChoice("");
              setNearestJumpKey(null);
            }}
            className="h-9 text-sm border border-border rounded-lg px-3 text-foreground bg-background focus:outline-none focus:border-primary"
          >
            {allowAllBranches && <option value="ALL">All branches</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={selectedBatch}
          onChange={(e) => {
            setSelectedBatch(e.target.value);
            setSessionChoice("");
            setNearestJumpKey(null);
          }}
          className="h-9 text-sm border border-border rounded-lg px-3 text-foreground bg-background focus:outline-none focus:border-primary min-w-[10rem]"
        >
          <option value="ALL">All batches</option>
          {visibleBatches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSessionChoice("");
          }}
          className="h-9 text-sm border border-border rounded-lg px-3 text-foreground bg-background focus:outline-none focus:border-primary"
        />

        <select
          value={activeSessionId}
          onChange={(e) => setSessionChoice(e.target.value)}
          disabled={sessionsLoading || nearbyLoading || daySessions.length === 0}
          className="h-9 text-sm border border-border rounded-lg px-3 text-foreground bg-background focus:outline-none focus:border-primary min-w-[14rem] disabled:opacity-70"
        >
          {sessionsLoading || nearbyLoading ? (
            <option value="">Loading classes…</option>
          ) : daySessions.length === 0 ? (
            <option value="">No class scheduled</option>
          ) : (
            <>
              {daySessions.length > 1 &&
                !daySessions.some((session) => session.id === sessionChoice) && (
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

        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name or code"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          />
        </div>
      </FilterToolbar>

      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border w-fit">
        {(
          [
            { id: "list" as const, label: "Student list" },
            { id: "summary" as const, label: "Summary" },
            { id: "history" as const, label: "History" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {canEditAttendance && activeTab === "list" && activeSession && (
        <p className="text-xs text-muted-foreground">
          {hasUnsavedChanges
            ? "Unsaved changes — save to record marks for this class."
            : unmarkedCount > 0
              ? `${unmarkedCount} unmarked · ${markedCount}/${totalStudents} marked`
              : totalStudents > 0
                ? `All ${totalStudents} students marked`
                : null}
        </p>
      )}

      {activeTab === "list" && (
        <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
          <div className={tableShell}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        selectedIds.size === filteredStudents.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-border text-primary h-4 w-4 cursor-pointer"
                      disabled={!canEditAttendance}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-12 text-center"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsLoading || nearbyLoading || rosterLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        {nearbyLoading && daySessions.length === 0
                          ? "Finding nearest scheduled class…"
                          : "Loading class roster…"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sessionsError || rosterError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-sm text-rose-600">
                      {apiMessage(
                        sessionsQueryError || rosterQueryError,
                        "Could not load this class roster."
                      )}
                    </TableCell>
                  </TableRow>
                ) : !activeSession ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                      {daySessions.length > 1
                        ? "Select a class session to load its roster."
                        : effectiveBranch !== "ALL"
                          ? allowAllBranches
                            ? "No class is scheduled for this branch on the selected date. Try All branches or another date."
                            : "No class is scheduled for this branch on the selected date. Try another date."
                          : "No class is scheduled for this filter. Pick another date or batch."}
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                      No students match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((stu) => {
                    const isSelected = selectedIds.has(stu.id);
                    return (
                      <TableRow
                        key={stu.id}
                        className={isSelected ? "bg-primary/5" : undefined}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(stu.id)}
                            disabled={!canEditAttendance}
                            className="rounded border-border text-primary h-4 w-4 cursor-pointer disabled:opacity-50"
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-foreground">{stu.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {stu.studentCode}
                          </p>
                        </TableCell>
                        <TableCell>
                          {canEditAttendance ? (
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stu.id, "PRESENT")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                  stu.status === "PRESENT"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-700"
                                }`}
                              >
                                <Check className="h-3 w-3" />
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stu.id, "ABSENT")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                  stu.status === "ABSENT"
                                    ? "bg-rose-600 text-white"
                                    : "bg-muted text-muted-foreground hover:bg-rose-500/10 hover:text-rose-700"
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stu.id, "LEAVE")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                  stu.status === "LEAVE"
                                    ? "bg-amber-500 text-white"
                                    : "bg-muted text-muted-foreground hover:bg-amber-500/10 hover:text-amber-700"
                                }`}
                              >
                                Leave
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <Badge
                                className={`text-xs font-semibold ${
                                  stu.status === "PRESENT"
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                    : stu.status === "ABSENT"
                                      ? "bg-rose-500/10 text-rose-700 border-rose-500/20"
                                      : stu.status === "LEAVE"
                                        ? "bg-amber-500/10 text-amber-800 border-amber-500/20"
                                        : "bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                {stu.status || "Unmarked"}
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="relative flex items-center max-w-xs">
                            <input
                              type="text"
                              value={stu.remarks}
                              onChange={(e) => handleRemarksChange(stu.id, e.target.value)}
                              placeholder="Optional"
                              readOnly={!canEditAttendance}
                              disabled={!canEditAttendance}
                              className="w-full h-8 px-2.5 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-70"
                            />
                            {canEditAttendance && stu.status === "LEAVE" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="absolute right-1 p-1 text-muted-foreground hover:text-foreground"
                                    title="Leave reasons"
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 text-xs">
                                  {LEAVE_REASONS.map((reason) => (
                                    <DropdownMenuItem
                                      key={reason}
                                      onClick={() => handleRemarksChange(stu.id, reason)}
                                    >
                                      {reason}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuItem
                                onClick={() => navigate(`${profileBase}/${stu.id}`)}
                              >
                                View profile
                              </DropdownMenuItem>
                              {canEditAttendance && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(stu.id, "LEAVE")}
                                >
                                  Mark as leave
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  if (stu.email) window.location.href = `mailto:${stu.email}`;
                                  else showToast("This student has no email on file.", "error");
                                }}
                              >
                                Email student
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

          {canEditAttendance && selectedIds.size > 0 && (
            <div className="p-3 border-t border-border bg-muted/40 flex flex-wrap items-center gap-2 justify-between">
              <span className="text-xs font-semibold text-foreground">
                {selectedIds.size} selected
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleBulkStatusChange("PRESENT")}
                >
                  Mark present
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => handleBulkStatusChange("ABSENT")}
                >
                  Mark absent
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => handleBulkStatusChange("LEAVE")}
                >
                  Mark leave
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          <div className="px-3 py-2.5 border-t border-border text-xs text-muted-foreground flex flex-wrap justify-between gap-2">
            <span>
              Showing {filteredStudents.length} of {totalStudents}
            </span>
            <span className="font-medium text-foreground">
              {markedCount} / {totalStudents} marked
            </span>
          </div>
        </Card>
      )}

      {activeTab === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              {
                title: "Present",
                count: presentCount,
                items: students.filter((s) => s.status === "PRESENT"),
                empty: "No present students.",
              },
              {
                title: "Absent",
                count: absentCount,
                items: students.filter((s) => s.status === "ABSENT"),
                empty: "No absences marked.",
              },
              {
                title: "Leave",
                count: leaveCount,
                items: students.filter((s) => s.status === "LEAVE"),
                empty: "No leave marked.",
              },
            ] as const
          ).map((col) => (
            <Card key={col.title} className="border border-border shadow-xs rounded-xl">
              <CardHeader className="p-4 pb-2 border-b border-border">
                <CardTitle className="text-sm font-semibold">
                  {col.title} ({col.count})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5 max-h-[360px] overflow-y-auto">
                {col.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{col.empty}</p>
                ) : (
                  col.items.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{s.name}</p>
                        {s.remarks ? (
                          <p className="text-xs text-muted-foreground truncate">{s.remarks}</p>
                        ) : null}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground shrink-0">
                        {s.studentCode}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "history" && (
        <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Last 30 days</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Open a session to review or correct marks.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleExportHistory}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export history
            </Button>
          </div>
          <div className={tableShell}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead className="text-center">Enrolled</TableHead>
                  <TableHead className="text-center">Marked</TableHead>
                  <TableHead className="text-center">Done</TableHead>
                  <TableHead className="text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Loading…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sessionHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">
                      No classes in the last 30 days for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessionHistory.map((session) => {
                    const enrolled = session.enrolledStudentsCount ?? 0;
                    const marked = session.attendanceMarkedCount ?? 0;
                    const done =
                      session.attendanceDonePercentage ??
                      (enrolled > 0 ? Math.round((marked / enrolled) * 100) : 0);
                    return (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium text-foreground">
                          {toDateKey(session.scheduledDate)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sessionOptionLabel(session)}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{enrolled}</TableCell>
                        <TableCell className="text-center tabular-nums">{marked}</TableCell>
                        <TableCell className="text-center tabular-nums">{done}%</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-primary"
                            onClick={() => openHistorySession(session)}
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog
        open={isScanQrModalOpen}
        onOpenChange={(open) => {
          setIsScanQrModalOpen(open);
          if (!open) resetCheckInDialog();
        }}
      >
        <DialogContent className="sm:max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Check in by name or code</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Type a name or code, pick the student from the list, then mark present.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Student name or code</label>
              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    placeholder="Start typing a name or code…"
                    value={manualQrCode}
                    onChange={(e) => {
                      setManualQrCode(e.target.value);
                      setCheckInSelectedId("");
                      setCheckInHighlight(0);
                    }}
                    className="h-9 text-sm"
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" && checkInSuggestions.length > 0) {
                        e.preventDefault();
                        setCheckInHighlight((i) =>
                          Math.min(i + 1, checkInSuggestions.length - 1)
                        );
                        return;
                      }
                      if (e.key === "ArrowUp" && checkInSuggestions.length > 0) {
                        e.preventDefault();
                        setCheckInHighlight((i) => Math.max(i - 1, 0));
                        return;
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (
                          !checkInSelectedId &&
                          checkInSuggestions.length > 0 &&
                          checkInSuggestions[checkInHighlight]
                        ) {
                          selectCheckInSuggestion(checkInSuggestions[checkInHighlight]);
                          return;
                        }
                        handleManualCheckIn();
                      }
                      if (e.key === "Escape") {
                        setIsScanQrModalOpen(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    className="h-9 bg-primary hover:bg-primary/90 text-white shrink-0"
                    onClick={handleManualCheckIn}
                    disabled={!checkInConfirmedStudent && !manualQrCode.trim()}
                  >
                    Mark present
                  </Button>
                </div>

                {manualQrCode.trim() && !checkInSelectedId && checkInSuggestions.length > 0 && (
                  <ul
                    role="listbox"
                    className="absolute left-0 right-12 z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-background shadow-md"
                  >
                    {checkInSuggestions.map((student, index) => (
                      <li key={student.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={index === checkInHighlight}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                            index === checkInHighlight
                              ? "bg-primary/10 text-foreground"
                              : "hover:bg-muted/60"
                          }`}
                          onMouseEnter={() => setCheckInHighlight(index)}
                          onClick={() => selectCheckInSuggestion(student)}
                        >
                          <span className="font-medium truncate">{student.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                            {student.studentCode}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {manualQrCode.trim() && !checkInSelectedId && checkInSuggestions.length === 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    No matching student in this class roster.
                  </p>
                )}
              </div>
            </div>

            {checkInConfirmedStudent && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Confirm check-in
                </p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {checkInConfirmedStudent.name}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {checkInConfirmedStudent.studentCode}
                  {checkInConfirmedStudent.status === "PRESENT" ? " · already Present" : ""}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
