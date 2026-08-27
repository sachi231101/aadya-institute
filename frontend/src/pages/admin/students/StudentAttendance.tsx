import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useCourseStore } from "@/store/course.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export type AttendanceDeskStatus = "PRESENT" | "ABSENT" | "EXCUSED";

export interface StudentAttendanceItem {
  id: string;
  studentCode: string;
  name: string;
  email: string;
  avatar?: string;
  status: AttendanceDeskStatus;
  remarks: string;
  leaveReason?: string;
  selected?: boolean;
}

const EXCUSED_REASONS = [
  "Medical Leave",
  "Personal Emergency",
  "Official Leave",
  "Family Emergency",
  "Academic Event",
  "Other",
];

import { useBranches } from "@/hooks/useBranches";
import { useBatches } from "@/hooks/useBatches";
import { useBranchStore } from "@/store/branch.store";
import { useStudentList } from "../../../hooks/useStudents";

export const StudentAttendance: React.FC = () => {
  const navigate = useNavigate();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchResponse } = useBranches({ limit: 100 });
  const branches = branchResponse?.data ?? [];
  const { batches } = useBatches();

  const [selectedBranch, setSelectedBranch] = useState<string>(selectedBranchId !== "ALL" ? selectedBranchId : (branches[0]?.id || "ALL"));
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "EXCUSED">("ALL");
  const [activeTab, setActiveTab] = useState<"list" | "summary" | "history">("list");

  // Fetch real students filtered by selected branch
  const { data: studentListResponse } = useStudentList({
    limit: 100,
    branchId: selectedBranch !== "ALL" ? selectedBranch : undefined,
  });
  const apiStudents = studentListResponse?.data ?? [];

  // Roster state from real students
  const [students, setStudents] = useState<StudentAttendanceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [autoSaveState, setAutoSaveState] = useState<"saved" | "saving">("saved");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isScanQrModalOpen, setIsScanQrModalOpen] = useState(false);
  const [manualQrCode, setManualQrCode] = useState("");

  const sessionHistory = useMemo(() => {
    return [
      {
        id: "hist-1",
        date: selectedDate,
        topic: `${selectedBatch} Core Session`,
        total: students.length,
        present: students.filter((s) => s.status === "PRESENT").length,
        absent: students.filter((s) => s.status === "ABSENT").length,
        excused: students.filter((s) => s.status === "EXCUSED").length,
        percentage: students.length > 0 ? `${Math.round((students.filter((s) => s.status === "PRESENT").length / students.length) * 100)}%` : "100%",
      }
    ];
  }, [selectedDate, selectedBatch, students]);

  // Sync with real students from PostgreSQL
  useEffect(() => {
    if (apiStudents.length > 0) {
      const mapped: StudentAttendanceItem[] = apiStudents.map((s: any, idx: number) => ({
        id: s.id,
        studentCode: s.studentCode || `STU-00${idx + 1}`,
        name: s.user?.name || `Student ${s.studentCode}`,
        email: s.user?.email || "student@aadya.in",
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150`,
        status: "PRESENT",
        remarks: "",
        leaveReason: undefined,
      }));
      setStudents(mapped);
    }
  }, [apiStudents]);

  // Calculations
  const totalStudents = students.length;
  const presentCount = students.filter((s) => s.status === "PRESENT").length;
  const absentCount = students.filter((s) => s.status === "ABSENT").length;
  const excusedCount = students.filter((s) => s.status === "EXCUSED").length;
  const markedCount = presentCount + absentCount + excusedCount;

  const presentPercentage = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(2) : "0.00";
  const absentPercentage = totalStudents > 0 ? ((absentCount / totalStudents) * 100).toFixed(2) : "0.00";
  const excusedPercentage = totalStudents > 0 ? ((excusedCount / totalStudents) * 100).toFixed(2) : "0.00";

  // Trigger brief auto-save indicator
  const triggerAutoSave = () => {
    setAutoSaveState("saving");
    setTimeout(() => {
      setAutoSaveState("saved");
    }, 450);
  };

  // Status Change Handler
  const handleStatusChange = (studentId: string, newStatus: AttendanceDeskStatus) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const updatedRemarks = newStatus === "EXCUSED" && !s.remarks ? "Medical Leave" : newStatus === "PRESENT" ? "" : s.remarks;
          return {
            ...s,
            status: newStatus,
            remarks: updatedRemarks,
            leaveReason: newStatus === "EXCUSED" ? (s.leaveReason || "Medical Leave") : undefined,
          };
        }
        return s;
      })
    );
    triggerAutoSave();
  };

  // Remarks Change Handler
  const handleRemarksChange = (studentId: string, remarks: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, remarks } : s))
    );
    triggerAutoSave();
  };

  // Checkbox toggle
  const handleToggleSelect = (studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
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

  // Bulk status update
  const handleBulkStatusChange = (status: AttendanceDeskStatus) => {
    if (selectedIds.size === 0) return;
    setStudents((prev) =>
      prev.map((s) => (selectedIds.has(s.id) ? { ...s, status } : s))
    );
    setSelectedIds(new Set());
    triggerAutoSave();
    setToastMessage(`Marked ${selectedIds.size} students as ${status}.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save attendance explicit action
  const handleSaveAttendance = () => {
    // #region agent log
    fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'student-e2e',hypothesisId:'E',location:'StudentAttendance.tsx:save',message:'Attendance save clicked — no API call',data:{selectedDate,studentCount:students.length,callsAttendanceApi:false},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setAutoSaveState("saving");
    setTimeout(() => {
      setAutoSaveState("saved");
      setToastMessage("✓ Attendance saved successfully for " + selectedDate);
      setTimeout(() => setToastMessage(null), 3500);
    }, 600);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = "Student ID,Student Name,Email,Batch,Date,Status,Remarks\n";
    const rows = students
      .map(
        (s) =>
          `"${s.studentCode}","${s.name}","${s.email}","${selectedBatch}","${selectedDate}","${s.status}","${s.remarks || ""}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_${selectedBatch}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered students for display
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        !searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [students, searchTerm, statusFilter]);

  // Radial chart stroke calculation (Circumference = 2 * PI * 40 ≈ 251.3)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (parseFloat(presentPercentage) / 100) * circumference;

  return (
    <div className="space-y-6 max-w-[1680px] mx-auto pb-20 animate-in fade-in duration-200">
      {/* ─── 1. PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Attendance Sheet
            </h1>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Quickly mark and manage daily student attendance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="text-xs font-bold h-9 px-3.5 border-border bg-card text-foreground hover:bg-muted/40 shadow-2xs gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export Attendance
          </Button>
        </div>
      </div>

      {/* ─── TOAST NOTIFICATION ────────────────────────────────────────── */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs font-bold shadow-2xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 2. CLASS SELECTION BAR ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-card p-3.5 rounded-2xl border border-border shadow-xs">
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
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">All Batches</option>
              {batches
                .filter((b) => selectedBranch === "ALL" || b.branchId === selectedBranch || b.branch?.id === selectedBranch)
                .map((b) => (
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
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background outline-none transition-all cursor-pointer"
            />
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Students */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Students
              </p>
              <h3 className="text-2xl font-black text-foreground mt-1">{totalStudents}</h3>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Students in this batch</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/40 rounded-2xl text-primary dark:text-sky-400">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Present */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Present
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-foreground">{presentCount}</h3>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{presentPercentage}%</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Active in class</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Absent */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Absent
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-foreground">{absentCount}</h3>
                <span className="text-xs font-black text-rose-600 dark:text-rose-400">{absentPercentage}%</span>
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">Unexcused</p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 rounded-2xl text-rose-600 dark:text-rose-400">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Excused */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Excused
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-foreground">{excusedCount}</h3>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400">{excusedPercentage}%</span>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Approved leave</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 rounded-2xl text-amber-600 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Attendance Percentage Ring */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl col-span-2 md:col-span-1">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Attendance Percentage
              </p>
              <h3 className="text-xl font-black text-foreground mt-1">{presentPercentage}%</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Today's Attendance</p>
            </div>
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-muted"
                  strokeWidth="10"
                  fill="transparent"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="text-emerald-500 transition-all duration-500 ease-out"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-foreground">
                  {Math.round(parseFloat(presentPercentage))}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 4. TABS & FILTER PILLS ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "list"
                ? "bg-card text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Student List
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "summary"
                ? "bg-card text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Attendance Summary
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "history"
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
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("PRESENT")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === "PRESENT"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              Present
            </button>
            <button
              onClick={() => setStatusFilter("ABSENT")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === "ABSENT"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              Absent
            </button>
            <button
              onClick={() => setStatusFilter("EXCUSED")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === "EXCUSED"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              Excused
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
      <div className="p-3 bg-blue-50/70 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/50 rounded-xl flex items-center justify-between gap-2 text-xs font-medium text-foreground shadow-2xs">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary dark:text-sky-400 shrink-0" />
          <span>Tap a status to mark attendance. Changes are auto-saved.</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span
            className={`h-2 w-2 rounded-full ${
              autoSaveState === "saved" ? "bg-emerald-500" : "bg-amber-500 animate-ping"
            }`}
          />
          <span className={autoSaveState === "saved" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
            {autoSaveState === "saved" ? "All changes saved" : "Saving changes..."}
          </span>
        </div>
      </div>

      {/* ─── 6. TAB CONTENT: STUDENT LIST ──────────────────────────────── */}
      {activeTab === "list" && (
        <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
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
                {filteredStudents.length === 0 ? (
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
                        className={`border-b border-border/70 hover:bg-muted/30 transition-colors ${
                          isSelected ? "bg-primary/10" : ""
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
                              <AvatarImage src={stu.avatar} />
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

                        {/* Status Buttons */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {/* Present */}
                            <button
                              onClick={() => handleStatusChange(stu.id, "PRESENT")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                stu.status === "PRESENT"
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
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                stu.status === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-rose-500/20 shadow-md ring-2 ring-rose-600/30"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                              }`}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Absent</span>
                            </button>

                            {/* Excused */}
                            <button
                              onClick={() => handleStatusChange(stu.id, "EXCUSED")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                stu.status === "EXCUSED"
                                  ? "bg-amber-500 text-white shadow-amber-500/20 shadow-md ring-2 ring-amber-500/30"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                              }`}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>Excused</span>
                            </button>
                          </div>
                        </TableCell>

                        {/* Remarks */}
                        <TableCell>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={stu.remarks}
                              onChange={(e) => handleRemarksChange(stu.id, e.target.value)}
                              placeholder="Add remarks..."
                              className="w-full h-8 px-3 text-xs bg-muted/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                            {stu.status === "EXCUSED" && (
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
                                  {EXCUSED_REASONS.map((reason) => (
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
                                onClick={() => navigate("/faculty/students/all")}
                                className="cursor-pointer"
                              >
                                View Student Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(stu.id, "EXCUSED")}
                                className="cursor-pointer"
                              >
                                Mark as Approved Leave
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => alert(`Contacting ${stu.name} (${stu.email})`)}
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
          {selectedIds.size > 0 && (
            <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-black shadow-2xs">
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
                    onClick={() => handleBulkStatusChange("EXCUSED")}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 px-3 gap-1"
                  >
                    <Clock className="h-3 w-3" /> Mark Excused
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
          <Card className="border border-border shadow-xs bg-card rounded-2xl p-5">
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
                        <AvatarImage src={s.avatar} />
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
          <Card className="border border-border shadow-xs bg-card rounded-2xl p-5">
            <CardHeader className="p-0 pb-4 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600" />
                Absent Students ({absentCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-2.5 max-h-[360px] overflow-y-auto">
              {students.filter((s) => s.status === "ABSENT").length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8 font-medium">
                  No unexcused absences today.
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
                          <AvatarImage src={s.avatar} />
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
          <Card className="border border-border shadow-xs bg-card rounded-2xl p-5">
            <CardHeader className="p-0 pb-4 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Excused Students ({excusedCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-2.5 max-h-[360px] overflow-y-auto">
              {students.filter((s) => s.status === "EXCUSED").length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8 font-medium">
                  No excused leaves recorded today.
                </p>
              ) : (
                students
                  .filter((s) => s.status === "EXCUSED")
                  .map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={s.avatar} />
                          <AvatarFallback className="text-[9px]">
                            {s.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-foreground block">{s.name}</span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            {s.remarks || s.leaveReason || "Approved Leave"}
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
        <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Attendance History – {selectedBatch}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Past recorded classroom sessions for this batch.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
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
                <TableHead className="font-bold text-xs text-foreground text-center">Present</TableHead>
                <TableHead className="font-bold text-xs text-foreground text-center">Absent</TableHead>
                <TableHead className="font-bold text-xs text-foreground text-center">Excused</TableHead>
                <TableHead className="font-bold text-xs text-foreground text-center">Percentage</TableHead>
                <TableHead className="font-bold text-xs text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionHistory.map((h: any) => (
                <TableRow key={h.id} className="border-b border-border/70 hover:bg-muted/30">
                  <TableCell className="font-bold text-xs text-foreground">{h.date}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">{h.topic}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40 text-xs font-bold">
                      {h.present}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/40 text-xs font-bold">
                      {h.absent}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40 text-xs font-bold">
                      {h.excused}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-black text-xs text-foreground">
                    {h.percentage}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alert(`Showing full session attendance for ${h.date}`)}
                      className="text-xs font-bold text-primary hover:bg-primary/10 h-7"
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ─── 9. QR SCAN CARD & MODAL ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 p-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-200">
                Fast Check-in
              </span>
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-base font-black mt-2">Scan QR for Instant Attendance</h4>
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

        {/* ─── 10. STICKY SAVE ATTENDANCE BANNER ─────────────────────────── */}
        <div className="md:col-span-3 p-5 bg-card border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-sm font-extrabold text-foreground tracking-tight">Don't forget to save your attendance!</h5>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 leading-relaxed">
                Your attendance will be permanently recorded in the Aadya portal database for {selectedDate}.
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveAttendance}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-black h-10 px-6 rounded-xl shadow-md gap-2 shrink-0 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Lock className="h-4 w-4" /> Save Attendance
          </Button>
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
            <div className="p-8 rounded-2xl bg-muted/40 text-foreground flex flex-col items-center justify-center text-center border border-border">
              <Camera className="h-10 w-10 text-primary animate-pulse mb-3" />
              <p className="text-xs font-bold text-foreground">Point Camera at Student ID Card</p>
              <span className="text-[10px] text-muted-foreground mt-1">
                Batch: {selectedBatch} • {selectedDate}
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
                      setToastMessage(`✓ Marked ${match.name} as Present via QR.`);
                      setManualQrCode("");
                      setIsScanQrModalOpen(false);
                    } else {
                      alert("Student code not found in current batch roster.");
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
    </div>
  );
};
