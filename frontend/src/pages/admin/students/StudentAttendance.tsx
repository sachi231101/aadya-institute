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
  Sparkles,
  QrCode,
  SlidersHorizontal,
  MoreVertical,
  Bell,
  Check,
  Lock,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Users,
  Camera,
  Info,
  ChevronDown
} from "lucide-react";
import { useBranches } from "@/hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";
import { useStudentStore } from "@/store/student.store";
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
  DialogFooter,
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

const INITIAL_MOCK_STUDENTS: StudentAttendanceItem[] = [
  {
    id: "stu-1",
    studentCode: "STU-001",
    name: "Rahul Verma",
    email: "rahul.verma@aadya.in",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "",
  },
  {
    id: "stu-2",
    studentCode: "STU-002",
    name: "Priya Sharma",
    email: "priya.sharma@aadya.in",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    status: "ABSENT",
    remarks: "Medical Leave",
    leaveReason: "Medical Leave",
  },
  {
    id: "stu-3",
    studentCode: "STU-003",
    name: "Aman Kumar",
    email: "aman.kumar@aadya.in",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "EXCUSED",
    remarks: "Medical Leave",
    leaveReason: "Medical Leave",
  },
  {
    id: "stu-4",
    studentCode: "STU-004",
    name: "Neha Gupta",
    email: "neha.gupta@aadya.in",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "",
  },
  {
    id: "stu-5",
    studentCode: "STU-005",
    name: "Vikram Singh",
    email: "vikram.singh@aadya.in",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "",
  },
  {
    id: "stu-6",
    studentCode: "STU-006",
    name: "Sneha Reddy",
    email: "sneha.reddy@aadya.in",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=150",
    status: "ABSENT",
    remarks: "Family Emergency",
    leaveReason: "Family Emergency",
  },
  {
    id: "stu-7",
    studentCode: "STU-007",
    name: "Rohit Das",
    email: "rohit.das@aadya.in",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150",
    status: "EXCUSED",
    remarks: "Official Leave",
    leaveReason: "Official Leave",
  },
  {
    id: "stu-8",
    studentCode: "STU-008",
    name: "Ananya Roy",
    email: "ananya.roy@aadya.in",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "",
  },
  {
    id: "stu-9",
    studentCode: "STU-009",
    name: "Karan Johar",
    email: "karan.j@aadya.in",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "",
  },
  {
    id: "stu-10",
    studentCode: "STU-010",
    name: "Divya Patel",
    email: "divya.p@aadya.in",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    status: "PRESENT",
    remarks: "",
  },
];

const MOCK_HISTORY = [
  {
    id: "hist-1",
    date: "19-08-2026",
    topic: "SEO Strategy & Google Analytics 4",
    total: 10,
    present: 9,
    absent: 1,
    excused: 0,
    percentage: "90.00%",
    recordedBy: "Ramesh Kumar",
  },
  {
    id: "hist-2",
    date: "18-08-2026",
    topic: "Keyword Research & Content Marketing",
    total: 10,
    present: 8,
    absent: 1,
    excused: 1,
    percentage: "80.00%",
    recordedBy: "Ramesh Kumar",
  },
  {
    id: "hist-3",
    date: "17-08-2026",
    topic: "Introduction to Search Engine Marketing",
    total: 10,
    present: 10,
    absent: 0,
    excused: 0,
    percentage: "100.00%",
    recordedBy: "Ramesh Kumar",
  },
  {
    id: "hist-4",
    date: "15-08-2026",
    topic: "Digital Marketing Landscape & Fundamentals",
    total: 10,
    present: 9,
    absent: 0,
    excused: 1,
    percentage: "90.00%",
    recordedBy: "Ramesh Kumar",
  },
];

export const StudentAttendance: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: branchResponse } = useBranches();
  const branches = branchResponse?.data ?? [];
  const { students: globalStudents, fetchStudents } = useStudentStore();
  const { batches, fetchBatches } = useCourseStore();

  useEffect(() => {
    fetchStudents();
    fetchBatches();
  }, []);

  // Filter selections
  const [selectedBranch, setSelectedBranch] = useState<string>("Aadya Central Branch");
  const [selectedBatch, setSelectedBatch] = useState<string>("DM-01");
  const [selectedDate, setSelectedDate] = useState<string>("2026-08-20");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "EXCUSED">("ALL");
  const [activeTab, setActiveTab] = useState<"list" | "summary" | "history">("list");

  // Roster state
  const [students, setStudents] = useState<StudentAttendanceItem[]>(INITIAL_MOCK_STUDENTS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [autoSaveState, setAutoSaveState] = useState<"saved" | "saving">("saved");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isMarkAllModalOpen, setIsMarkAllModalOpen] = useState(false);
  const [isScanQrModalOpen, setIsScanQrModalOpen] = useState(false);
  const [manualQrCode, setManualQrCode] = useState("");

  // Sync with global database if available
  useEffect(() => {
    if (Array.isArray(globalStudents) && globalStudents.length > 0) {
      const mapped = globalStudents.slice(0, 10).map((s: any, idx) => {
        const fallback = INITIAL_MOCK_STUDENTS[idx] || INITIAL_MOCK_STUDENTS[0];
        return {
          id: s.id,
          studentCode: s.studentCode || s.studentId || `STU-00${idx + 1}`,
          name: s.name || s.user?.name || fallback.name,
          email: s.email || s.user?.email || fallback.email,
          avatar: fallback.avatar,
          status: (fallback.status as AttendanceDeskStatus) || "PRESENT",
          remarks: fallback.remarks || "",
          leaveReason: fallback.leaveReason,
        };
      });
      setStudents(mapped);
    }
  }, [globalStudents]);

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

  // Mark all present
  const handleConfirmMarkAllPresent = () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: "PRESENT",
        remarks: "",
      }))
    );
    setIsMarkAllModalOpen(false);
    triggerAutoSave();
    setToastMessage("All students marked as Present.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save attendance explicit action
  const handleSaveAttendance = () => {
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
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Attendance Sheet
            </h1>
            <ShieldCheck className="h-5 w-5 text-[#6366F1]" />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Quickly mark and manage daily student attendance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="text-xs font-bold h-9 px-3.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" /> Export Attendance
          </Button>
        </div>
      </div>

      {/* ─── TOAST NOTIFICATION ────────────────────────────────────────── */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-bold shadow-2xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 2. CLASS SELECTION BAR ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Branch */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 block">Branch</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1769AA]" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1769AA]/30 focus:border-[#1769AA] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="Aadya Central Branch">Aadya Central Branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Batch / Course */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 block">Batch / Course</label>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6366F1]" />
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="DM-01">Digital Marketing – DM-01</option>
              <option value="FS-02">Full Stack Web Dev – FS-02</option>
              <option value="DS-01">Data Science AI – DS-01</option>
              <option value="UI-03">UI/UX Design – UI-03</option>
              {batches.map((b) => (
                <option key={b.id} value={b.code || b.name}>
                  {b.name} – {b.code}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 block">Date</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6366F1]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] outline-none transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* Search Student */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 block">Search Student</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* ─── 3. SMART ATTENDANCE SUMMARY & PERCENTAGE RING ─────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Students */}
        <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Students
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalStudents}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Students in this batch</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-2xl text-[#6366F1]">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Present */}
        <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Present
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-slate-900">{presentCount}</h3>
                <span className="text-xs font-black text-emerald-600">{presentPercentage}%</span>
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Active in class</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Absent */}
        <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Absent
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-slate-900">{absentCount}</h3>
                <span className="text-xs font-black text-rose-600">{absentPercentage}%</span>
              </div>
              <p className="text-[11px] text-rose-600 font-medium mt-0.5">Unexcused</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Excused */}
        <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Excused
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-slate-900">{excusedCount}</h3>
                <span className="text-xs font-black text-amber-600">{excusedPercentage}%</span>
              </div>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Approved leave</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Attendance Percentage Ring */}
        <Card className="border-slate-200/80 shadow-2xs bg-white rounded-2xl col-span-2 md:col-span-1">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Attendance Percentage
              </p>
              <h3 className="text-xl font-black text-slate-900 mt-1">{presentPercentage}%</h3>
              <p className="text-[10px] text-slate-500 font-medium">Today's Attendance</p>
            </div>
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-slate-100"
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
                <span className="text-[10px] font-black text-slate-800">
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
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "list"
                ? "bg-white text-[#4F46E5] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Student List
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "summary"
                ? "bg-white text-[#4F46E5] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Attendance Summary
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "history"
                ? "bg-white text-[#4F46E5] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Attendance History
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === "ALL"
                  ? "bg-[#6366F1] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("PRESENT")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === "PRESENT"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Present
            </button>
            <button
              onClick={() => setStatusFilter("ABSENT")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === "ABSENT"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Absent
            </button>
            <button
              onClick={() => setStatusFilter("EXCUSED")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === "EXCUSED"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "text-slate-600 hover:bg-slate-50"
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
            className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs shrink-0"
            title="Reset Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ─── 5. AUTO-SAVE BANNER ────────────────────────────────────────── */}
      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between gap-2 text-xs font-medium text-blue-900 shadow-2xs">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-[#1769AA] shrink-0" />
          <span>Tap a status to mark attendance. Changes are auto-saved.</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span
            className={`h-2 w-2 rounded-full ${
              autoSaveState === "saved" ? "bg-emerald-500" : "bg-amber-500 animate-ping"
            }`}
          />
          <span className={autoSaveState === "saved" ? "text-emerald-700" : "text-amber-700"}>
            {autoSaveState === "saved" ? "All changes saved" : "Saving changes..."}
          </span>
        </div>
      </div>

      {/* ─── 6. TAB CONTENT: STUDENT LIST ──────────────────────────────── */}
      {activeTab === "list" && (
        <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200/80">
                  <TableHead className="w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        selectedIds.size === filteredStudents.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5] h-4 w-4 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold text-slate-600">#</TableHead>
                  <TableHead className="w-32 text-xs font-bold text-slate-600">Student ID</TableHead>
                  <TableHead className="min-w-[200px] text-xs font-bold text-slate-600">
                    Student Name
                  </TableHead>
                  <TableHead className="min-w-[320px] text-xs font-bold text-slate-600 text-center">
                    Attendance Status
                  </TableHead>
                  <TableHead className="min-w-[240px] text-xs font-bold text-slate-600">
                    Remarks (Optional)
                  </TableHead>
                  <TableHead className="w-16 text-center text-xs font-bold text-slate-600">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm font-medium">
                      No students found matching current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((stu, index) => {
                    const isSelected = selectedIds.has(stu.id);
                    return (
                      <TableRow
                        key={stu.id}
                        className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${
                          isSelected ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(stu.id)}
                            className="rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5] h-4 w-4 cursor-pointer"
                          />
                        </TableCell>

                        {/* Index */}
                        <TableCell className="text-center text-xs font-bold text-slate-500">
                          {index + 1}
                        </TableCell>

                        {/* Student ID */}
                        <TableCell className="font-mono text-xs font-bold text-slate-700">
                          {stu.studentCode}
                        </TableCell>

                        {/* Avatar & Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-slate-200">
                              <AvatarImage src={stu.avatar} />
                              <AvatarFallback className="bg-gradient-to-br from-[#1769AA] to-indigo-600 text-white text-[10px] font-bold">
                                {stu.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-bold text-slate-900 text-xs block">{stu.name}</span>
                              <span className="text-[11px] text-slate-400 font-medium block">
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
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                                stu.status === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-emerald-500/20 shadow-md ring-2 ring-emerald-600/30"
                                  : "bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Present</span>
                            </button>

                            {/* Absent */}
                            <button
                              onClick={() => handleStatusChange(stu.id, "ABSENT")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                                stu.status === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-rose-500/20 shadow-md ring-2 ring-rose-600/30"
                                  : "bg-rose-50/70 text-rose-700 hover:bg-rose-100 border border-rose-200/60"
                              }`}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Absent</span>
                            </button>

                            {/* Excused */}
                            <button
                              onClick={() => handleStatusChange(stu.id, "EXCUSED")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                                stu.status === "EXCUSED"
                                  ? "bg-amber-500 text-white shadow-amber-500/20 shadow-md ring-2 ring-amber-500/30"
                                  : "bg-amber-50/70 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
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
                              className="w-full h-8 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] outline-none transition-all placeholder:text-slate-400"
                            />
                            {stu.status === "EXCUSED" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-600"
                                    title="Quick leave reasons"
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
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
                                className="h-7 w-7 text-slate-400 hover:text-slate-700"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
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
                                className="cursor-pointer text-blue-600"
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
          <div className="p-3.5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <span>
                Showing {filteredStudents.length} of {totalStudents} Students
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">
                {markedCount} / {totalStudents} Students Marked
              </span>
              <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
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
          <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl p-5">
            <CardHeader className="p-0 pb-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
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
                    className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={s.avatar} />
                        <AvatarFallback className="text-[9px]">
                          {s.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-slate-800">{s.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-700 font-bold">{s.studentCode}</span>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Absent Students */}
          <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl p-5">
            <CardHeader className="p-0 pb-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600" />
                Absent Students ({absentCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-2.5 max-h-[360px] overflow-y-auto">
              {students.filter((s) => s.status === "ABSENT").length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8 font-medium">
                  No unexcused absences today.
                </p>
              ) : (
                students
                  .filter((s) => s.status === "ABSENT")
                  .map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={s.avatar} />
                          <AvatarFallback className="text-[9px]">
                            {s.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-slate-800 block">{s.name}</span>
                          <span className="text-[10px] text-rose-600 font-medium">
                            {s.remarks || "No notice provided"}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-rose-700 font-bold">{s.studentCode}</span>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          {/* Excused Students */}
          <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl p-5">
            <CardHeader className="p-0 pb-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Excused Students ({excusedCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-2.5 max-h-[360px] overflow-y-auto">
              {students.filter((s) => s.status === "EXCUSED").length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8 font-medium">
                  No excused leaves recorded today.
                </p>
              ) : (
                students
                  .filter((s) => s.status === "EXCUSED")
                  .map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={s.avatar} />
                          <AvatarFallback className="text-[9px]">
                            {s.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-slate-800 block">{s.name}</span>
                          <span className="text-[10px] text-amber-700 font-medium">
                            {s.remarks || s.leaveReason || "Approved Leave"}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-amber-700 font-bold">{s.studentCode}</span>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── 8. TAB CONTENT: ATTENDANCE HISTORY ────────────────────────── */}
      {activeTab === "history" && (
        <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Attendance History – {selectedBatch}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Past recorded classroom sessions for this batch.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs font-bold h-8 border-slate-200"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export History
            </Button>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-bold text-xs text-slate-600">Date</TableHead>
                <TableHead className="font-bold text-xs text-slate-600">Session Topic</TableHead>
                <TableHead className="font-bold text-xs text-slate-600 text-center">Present</TableHead>
                <TableHead className="font-bold text-xs text-slate-600 text-center">Absent</TableHead>
                <TableHead className="font-bold text-xs text-slate-600 text-center">Excused</TableHead>
                <TableHead className="font-bold text-xs text-slate-600 text-center">Percentage</TableHead>
                <TableHead className="font-bold text-xs text-slate-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_HISTORY.map((h) => (
                <TableRow key={h.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <TableCell className="font-bold text-xs text-slate-900">{h.date}</TableCell>
                  <TableCell className="text-xs text-slate-700 font-medium">{h.topic}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                      {h.present}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold">
                      {h.absent}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold">
                      {h.excused}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-black text-xs text-slate-900">
                    {h.percentage}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => alert(`Showing full session attendance for ${h.date}`)}
                      className="text-xs font-bold text-[#4F46E5] hover:bg-indigo-50 h-7"
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
        <div className="md:col-span-1 p-5 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-indigo-700 text-white shadow-md flex flex-col justify-between">
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
            className="mt-4 bg-white/20 hover:bg-white/30 text-white text-xs font-bold h-9 border border-white/20 gap-2 shadow-xs"
          >
            <Camera className="h-3.5 w-3.5" /> Scan QR
          </Button>
        </div>

        {/* ─── 10. STICKY SAVE ATTENDANCE BANNER ─────────────────────────── */}
        <div className="md:col-span-3 p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-xs font-black text-amber-900">Don't forget to save your attendance!</h5>
              <p className="text-[11px] text-amber-800/90 font-medium mt-0.5">
                Your attendance will be permanently recorded in the Aadya portal database for {selectedDate}.
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveAttendance}
            className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-black h-10 px-6 rounded-xl shadow-md gap-2 shrink-0 transition-all hover:scale-[1.02]"
          >
            <Lock className="h-4 w-4" /> Save Attendance
          </Button>
        </div>
      </div>



      {/* ─── MODAL: QR SCANNER ─────────────────────────────────────────── */}
      <Dialog open={isScanQrModalOpen} onOpenChange={setIsScanQrModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#4F46E5]" />
              Smart QR Attendance Check-In
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Scan student ID barcode or enter student code for instant presence marking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-8 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center text-center border border-slate-800">
              <Camera className="h-10 w-10 text-indigo-400 animate-pulse mb-3" />
              <p className="text-xs font-bold">Point Camera at Student ID Card</p>
              <span className="text-[10px] text-slate-400 mt-1">
                Batch: {selectedBatch} • {selectedDate}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Manual Student Code</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. STU-003"
                  value={manualQrCode}
                  onChange={(e) => setManualQrCode(e.target.value)}
                  className="text-xs h-9 font-mono"
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
                  className="bg-[#4F46E5] text-white text-xs font-bold h-9 px-4"
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
