import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Clock,
  Calendar,
  Plus,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Building2,
  Users,
  Search,
  SlidersHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  BookOpen,
  Check,
  X,
  FileText,
  User
} from "lucide-react";
import { useBranches } from "@/hooks/useBranches";
import { useBranchStore } from "@/store/branch.store";
import { useFacultyAttendance, useMarkFacultyAttendance, useFacultyList } from "../../../hooks/useFaculty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── BRANCHES MASTER ────────────────────────────────────────────────────────
export interface BranchItem {
  id: string;
  name: string;
  code: string;
  colorBg: string;
  colorText: string;
  colorBorder: string;
}

export const BRANCH_LIST: BranchItem[] = [
  {
    id: "b-central",
    name: "Aadya Central Branch",
    code: "Central Branch",
    colorBg: "bg-emerald-50",
    colorText: "text-emerald-700",
    colorBorder: "border-emerald-200",
  },
  {
    id: "b-hsr",
    name: "Aadya HSR Layout",
    code: "HSR Layout",
    colorBg: "bg-blue-50",
    colorText: "text-[#1769AA]",
    colorBorder: "border-blue-200",
  },
  {
    id: "b-jayanagar",
    name: "Aadya Jayanagar",
    code: "Jayanagar",
    colorBg: "bg-purple-50",
    colorText: "text-purple-700",
    colorBorder: "border-purple-200",
  },
  {
    id: "b-marathahalli",
    name: "Aadya Marathahalli",
    code: "Marathahalli",
    colorBg: "bg-amber-50",
    colorText: "text-amber-700",
    colorBorder: "border-amber-200",
  },
  {
    id: "b-btm",
    name: "Aadya BTM Layout",
    code: "BTM Layout",
    colorBg: "bg-pink-50",
    colorText: "text-pink-700",
    colorBorder: "border-pink-200",
  },
  {
    id: "b-rajajinagar",
    name: "Aadya Rajajinagar",
    code: "Rajajinagar",
    colorBg: "bg-indigo-50",
    colorText: "text-indigo-700",
    colorBorder: "border-indigo-200",
  },
];

// ─── FACULTY DIRECTORY (BRANCH CONNECTED) ──────────────────────────────────
export interface FacultyMemberItem {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  branchId: string;
  branchName: string;
  specialization: string;
  avatar: string;
}

export const FACULTY_DIRECTORY: FacultyMemberItem[] = [
  {
    id: "fac-101",
    employeeCode: "FAC-001",
    name: "Ramesh Kumar",
    email: "ramesh.kumar@aadya.in",
    phone: "9888888881",
    branchId: "b-hsr",
    branchName: "Aadya HSR Layout",
    specialization: "Full Stack Web Development",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "fac-102",
    employeeCode: "FAC-002",
    name: "Anjali Sharma",
    email: "anjali.sharma@aadya.in",
    phone: "9888888882",
    branchId: "b-jayanagar",
    branchName: "Aadya Jayanagar",
    specialization: "Data Science & AI",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "fac-103",
    employeeCode: "FAC-003",
    name: "Vikram Singh",
    email: "vikram.singh@aadya.in",
    phone: "9888888883",
    branchId: "b-marathahalli",
    branchName: "Aadya Marathahalli",
    specialization: "Cloud & DevOps",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "fac-104",
    employeeCode: "FAC-004",
    name: "Pooja Nair",
    email: "pooja.nair@aadya.in",
    phone: "9888888884",
    branchId: "b-hsr",
    branchName: "Aadya HSR Layout",
    specialization: "MERN Stack Development",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "fac-105",
    employeeCode: "FAC-005",
    name: "Suresh Babu",
    email: "suresh.babu@aadya.in",
    phone: "9888888885",
    branchId: "b-btm",
    branchName: "Aadya BTM Layout",
    specialization: "Python & Machine Learning",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "fac-106",
    employeeCode: "FAC-006",
    name: "HM Adithya",
    email: "adithyahm0@gmail.com",
    phone: "8217312051",
    branchId: "b-central",
    branchName: "Aadya Central Branch",
    specialization: "MERN Full Stack Architecture",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "fac-107",
    employeeCode: "FAC-007",
    name: "Sneha Reddy",
    email: "sneha.reddy@aadya.in",
    phone: "9123456780",
    branchId: "b-rajajinagar",
    branchName: "Aadya Rajajinagar",
    specialization: "UI/UX Product Design",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "fac-108",
    employeeCode: "FAC-008",
    name: "Megha Prasad",
    email: "megha.prasad@aadya.in",
    phone: "9876501234",
    branchId: "b-central",
    branchName: "Aadya Central Branch",
    specialization: "Advanced Excel & Financial Modeling",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  },
];

// ─── BATCHES & SESSIONS PER FACULTY / BRANCH ──────────────────────────────
export interface BatchSessionOption {
  id: string;
  batchName: string;
  batchCode: string;
  branchId: string;
  facultyId: string;
  timeSlot: string;
  courseName: string;
}

export const BATCH_SESSIONS: BatchSessionOption[] = [
  {
    id: "cs-101",
    batchName: "Web Dev Batch A",
    batchCode: "WD-2026-A",
    branchId: "b-hsr",
    facultyId: "fac-101",
    timeSlot: "09:00 AM – 11:00 AM",
    courseName: "Full Stack Web Development",
  },
  {
    id: "cs-102",
    batchName: "Data Science Weekend",
    batchCode: "DS-2026-W",
    branchId: "b-jayanagar",
    facultyId: "fac-102",
    timeSlot: "02:00 PM – 04:00 PM",
    courseName: "Data Science with Python",
  },
  {
    id: "cs-103",
    batchName: "Cloud Computing Basics",
    batchCode: "CC-2026-B",
    branchId: "b-marathahalli",
    facultyId: "fac-103",
    timeSlot: "10:00 AM – 12:00 PM",
    courseName: "Cloud & DevOps",
  },
  {
    id: "cs-104",
    batchName: "Full Stack Development",
    batchCode: "FS-2026-A",
    branchId: "b-hsr",
    facultyId: "fac-104",
    timeSlot: "09:00 AM – 12:00 PM",
    courseName: "MERN Stack Development",
  },
  {
    id: "cs-105",
    batchName: "Python Programming",
    batchCode: "PY-2026-A",
    branchId: "b-btm",
    facultyId: "fac-105",
    timeSlot: "02:00 PM – 04:00 PM",
    courseName: "Python Programming",
  },
  {
    id: "cs-106",
    batchName: "MERN Enterprise Suite",
    batchCode: "MERN-2026-E",
    branchId: "b-central",
    facultyId: "fac-106",
    timeSlot: "10:00 AM – 01:00 PM",
    courseName: "MERN Architecture",
  },
  {
    id: "cs-107",
    batchName: "Product UI/UX Sprint",
    batchCode: "UX-2026-S",
    branchId: "b-rajajinagar",
    facultyId: "fac-107",
    timeSlot: "11:00 AM – 01:00 PM",
    courseName: "UI/UX Product Design",
  },
  {
    id: "cs-108",
    batchName: "Financial Modeling & Excel",
    batchCode: "FM-2026-M",
    branchId: "b-central",
    facultyId: "fac-108",
    timeSlot: "02:30 PM – 04:30 PM",
    courseName: "Advanced Excel",
  },
];

// ─── ATTENDANCE RECORD MODEL ───────────────────────────────────────────────
export interface AttendanceLogRecord {
  id: string;
  facultyId: string;
  facultyName: string;
  facultyCode: string;
  facultyAvatar: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  date: string;
  batchName: string;
  batchCode: string;
  courseName: string;
  loginTime: string | null;
  logoutTime: string | null;
  sessionTime: string;
  status: "Present" | "Late" | "Absent" | "Half Day" | "On Leave";
  remarks?: string;
  roomNo?: string;
}

export const INITIAL_ATTENDANCE_RECORDS: AttendanceLogRecord[] = [
  {
    id: "att-001",
    facultyId: "fac-101",
    facultyName: "Ramesh Kumar",
    facultyCode: "F001",
    facultyAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    branchId: "b-hsr",
    branchName: "Aadya HSR Layout",
    branchCode: "HSR Layout",
    date: "2026-08-22",
    batchName: "Web Dev Batch A",
    batchCode: "WD-2026-A",
    courseName: "Full Stack Web Development",
    loginTime: "08:50 am",
    logoutTime: "11:10 am",
    sessionTime: "09:00 AM – 11:00 AM",
    status: "Present",
    remarks: "Regular session conducted on React Hooks and State Management.",
    roomNo: "Lab 2",
  },
  {
    id: "att-002",
    facultyId: "fac-102",
    facultyName: "Anjali Sharma",
    facultyCode: "F002",
    facultyAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    branchId: "b-jayanagar",
    branchName: "Aadya Jayanagar",
    branchCode: "Jayanagar",
    date: "2026-08-22",
    batchName: "Data Science Weekend",
    batchCode: "DS-2026-W",
    courseName: "Data Science with Python",
    loginTime: "01:55 pm",
    logoutTime: null,
    sessionTime: "02:00 PM – 04:00 PM",
    status: "Present",
    remarks: "Session in progress: Pandas DataFrame manipulation and data cleaning.",
    roomNo: "Hall A",
  },
  {
    id: "att-003",
    facultyId: "fac-103",
    facultyName: "Vikram Singh",
    facultyCode: "F003",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    branchId: "b-marathahalli",
    branchName: "Aadya Marathahalli",
    branchCode: "Marathahalli",
    date: "2026-08-22",
    batchName: "Cloud Computing Basics",
    batchCode: "CC-2026-B",
    courseName: "Cloud & DevOps",
    loginTime: null,
    logoutTime: null,
    sessionTime: "10:00 AM – 12:00 PM",
    status: "Absent",
    remarks: "Uninformed absence. Substitute session arranged.",
    roomNo: "Lab 4",
  },
  {
    id: "att-004",
    facultyId: "fac-104",
    facultyName: "Pooja Nair",
    facultyCode: "F004",
    facultyAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    branchId: "b-hsr",
    branchName: "Aadya HSR Layout",
    branchCode: "HSR Layout",
    date: "2026-08-22",
    batchName: "Full Stack Development",
    batchCode: "FS-2026-A",
    courseName: "MERN Stack Development",
    loginTime: "09:15 am",
    logoutTime: "11:45 am",
    sessionTime: "09:00 AM – 12:00 PM",
    status: "Present",
    remarks: "Backend REST API with Express and PostgreSQL.",
    roomNo: "Lab 1",
  },
  {
    id: "att-005",
    facultyId: "fac-105",
    facultyName: "Suresh Babu",
    facultyCode: "F005",
    facultyAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    branchId: "b-btm",
    branchName: "Aadya BTM Layout",
    branchCode: "BTM Layout",
    date: "2026-08-22",
    batchName: "Python Programming",
    batchCode: "PY-2026-A",
    courseName: "Python Programming",
    loginTime: null,
    logoutTime: null,
    sessionTime: "02:00 PM – 04:00 PM",
    status: "On Leave",
    remarks: "Approved medical leave until Monday.",
    roomNo: "Room 102",
  },
  {
    id: "att-006",
    facultyId: "fac-106",
    facultyName: "HM Adithya",
    facultyCode: "F006",
    facultyAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    branchId: "b-central",
    branchName: "Aadya Central Branch",
    branchCode: "Central Branch",
    date: "2026-08-22",
    batchName: "MERN Enterprise Suite",
    batchCode: "MERN-2026-E",
    courseName: "MERN Architecture",
    loginTime: "09:45 am",
    logoutTime: "01:05 pm",
    sessionTime: "10:00 AM – 01:00 PM",
    status: "Present",
    remarks: "Full-stack project review and code architecture walkthrough.",
    roomNo: "Auditorium",
  },
  {
    id: "att-007",
    facultyId: "fac-107",
    facultyName: "Sneha Reddy",
    facultyCode: "F007",
    facultyAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    branchId: "b-rajajinagar",
    branchName: "Aadya Rajajinagar",
    branchCode: "Rajajinagar",
    date: "2026-08-22",
    batchName: "Product UI/UX Sprint",
    batchCode: "UX-2026-S",
    courseName: "UI/UX Product Design",
    loginTime: "11:02 am",
    logoutTime: "01:30 pm",
    sessionTime: "11:00 AM – 01:00 PM",
    status: "Present",
    remarks: "Design system tokens and responsive UI mockups in Figma.",
    roomNo: "Design Studio",
  },
  {
    id: "att-008",
    facultyId: "fac-108",
    facultyName: "Megha Prasad",
    facultyCode: "F008",
    facultyAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    branchId: "b-central",
    branchName: "Aadya Central Branch",
    branchCode: "Central Branch",
    date: "2026-08-22",
    batchName: "Financial Modeling & Excel",
    batchCode: "FM-2026-M",
    courseName: "Advanced Excel",
    loginTime: "02:30 pm",
    logoutTime: null,
    sessionTime: "02:30 PM – 04:30 PM",
    status: "Present",
    remarks: "DCF modeling & sensitivity analysis formulas.",
    roomNo: "Lab 3",
  },
];

export const FacultyAttendance: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialFacultyId = searchParams.get("facultyId") || "ALL";

  // ─── 1. BRANCH-WISE FILTER STATE ──────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string>("2026-08-22");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(initialFacultyId);

  // In-table search and secondary filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");

  // Attendance Records State
  const [recordsList, setRecordsList] = useState<AttendanceLogRecord[]>(INITIAL_ATTENDANCE_RECORDS);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // View Details Modal
  const [selectedRecordForView, setSelectedRecordForView] = useState<AttendanceLogRecord | null>(null);

  // ─── 3. DYNAMIC FACULTY FILTER BASED ON SELECTED BRANCH ─────────────────
  // When a branch is selected, show only faculty belonging to that branch
  const availableFacultyForBranch = useMemo(() => {
    if (selectedBranchId === "ALL") {
      return FACULTY_DIRECTORY;
    }
    return FACULTY_DIRECTORY.filter((f) => f.branchId === selectedBranchId);
  }, [selectedBranchId]);

  // Handle Branch Change: Automatically reset Faculty filter if previously selected faculty is not in new branch
  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    setCurrentPage(1);
    if (newBranchId !== "ALL" && selectedFacultyId !== "ALL") {
      const isFacultyInNewBranch = FACULTY_DIRECTORY.some(
        (f) => f.id === selectedFacultyId && f.branchId === newBranchId
      );
      if (!isFacultyInNewBranch) {
        setSelectedFacultyId("ALL");
      }
    }
  };

  // ─── 4. FILTERED ATTENDANCE RECORDS ──────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return recordsList.filter((record) => {
      // 1. Date filter (if selected)
      if (selectedDate && record.date !== selectedDate) {
        return false;
      }

      // 2. Branch filter
      if (selectedBranchId !== "ALL" && record.branchId !== selectedBranchId) {
        return false;
      }

      // 3. Faculty filter
      if (selectedFacultyId !== "ALL" && record.facultyId !== selectedFacultyId) {
        return false;
      }

      // 4. Course filter
      if (selectedCourseFilter !== "ALL" && record.courseName !== selectedCourseFilter) {
        return false;
      }

      // 5. Search query (faculty name, batch name, batch code, or branch)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = record.facultyName.toLowerCase().includes(q);
        const matchBatch = record.batchName.toLowerCase().includes(q) || record.batchCode.toLowerCase().includes(q);
        const matchBranch = record.branchName.toLowerCase().includes(q);
        const matchCode = record.facultyCode.toLowerCase().includes(q);
        if (!matchName && !matchBatch && !matchBranch && !matchCode) {
          return false;
        }
      }

      return true;
    });
  }, [recordsList, selectedDate, selectedBranchId, selectedFacultyId, selectedCourseFilter, searchQuery]);

  // ─── 5. SUMMARY KPI CALCULATIONS (BRANCH-AWARE) ──────────────────────────
  const kpis = useMemo(() => {
    // Records matching the branch + date criteria
    const branchDateRecords = recordsList.filter((r) => {
      const dateMatch = !selectedDate || r.date === selectedDate;
      const branchMatch = selectedBranchId === "ALL" || r.branchId === selectedBranchId;
      return dateMatch && branchMatch;
    });

    const totalRecords = branchDateRecords.length;
    const loggedIn = branchDateRecords.filter((r) => r.loginTime !== null).length;
    const loggedOut = branchDateRecords.filter((r) => r.logoutTime !== null).length;

    // Faculty count for selected branch
    const branchFacultyCount =
      selectedBranchId === "ALL"
        ? FACULTY_DIRECTORY.length
        : FACULTY_DIRECTORY.filter((f) => f.branchId === selectedBranchId).length;

    const loggedInPct = totalRecords > 0 ? Math.round((loggedIn / totalRecords) * 100) : 0;
    const loggedOutPct = totalRecords > 0 ? Math.round((loggedOut / totalRecords) * 100) : 0;

    return {
      totalRecords,
      loggedIn,
      loggedInPct,
      loggedOut,
      loggedOutPct,
      facultyCount: branchFacultyCount,
    };
  }, [recordsList, selectedDate, selectedBranchId]);

  // ─── 6. PAGINATION SLICE ─────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  // Distinct courses for table filter
  const distinctCourses = useMemo(() => {
    const set = new Set<string>();
    BATCH_SESSIONS.forEach((s) => set.add(s.courseName));
    return Array.from(set);
  }, []);

  const getBranchBadge = (branchId: string, branchCode: string) => {
    const branchObj = BRANCH_LIST.find((b) => b.id === branchId);
    const bg = branchObj?.colorBg || "bg-slate-100";
    const text = branchObj?.colorText || "text-slate-700";
    const border = branchObj?.colorBorder || "border-slate-200";

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg} ${text} ${border}`}
      >
        <Building2 className="h-3 w-3 shrink-0" />
        <span>{branchCode}</span>
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Present":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Present</span>;
      case "Absent":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Absent</span>;
      case "On Leave":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">On Leave</span>;
      case "Late":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">Late</span>;
      case "Half Day":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Half Day</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "—";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── BREADCRUMB & HEADER (VIEW-ONLY AUDIT & MONITORING) ─────────────── */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span>Faculty</span>
          <span>›</span>
          <span className="text-slate-900 font-semibold">Attendance</span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Faculty Attendance</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Monitor daily check-ins, check-outs, and attendance history for faculty across institute branches and class sessions.
            </p>
          </div>
        </div>
      </div>

      {/* ─── TOP PRIMARY FILTER CARDS: DATE | BRANCH / CENTER | FACULTY ───── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Date Picker */}
        <Card className="border border-slate-200/90 shadow-2xs bg-white rounded-2xl p-4 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center shrink-0 border border-blue-100/80">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                Date
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 text-xs sm:text-sm font-semibold text-slate-900 bg-white border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#1769AA]"
              />
            </div>
          </div>
        </Card>

        {/* Card 2: Branch / Center Selector */}
        <Card className="border border-slate-200/90 shadow-2xs bg-white rounded-2xl p-4 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center shrink-0 border border-blue-100/80">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                Branch / Center
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="w-full h-9 px-3 text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="ALL">All Branches</option>
                {BRANCH_LIST.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Card 3: Faculty Selector (Dynamic by Branch) */}
        <Card className="border border-slate-200/90 shadow-2xs bg-white rounded-2xl p-4 hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center shrink-0 border border-blue-100/80">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Faculty
                </label>
                {selectedBranchId !== "ALL" && (
                  <span className="text-[10px] text-[#1769AA] font-bold">
                    {availableFacultyForBranch.length} in Branch
                  </span>
                )}
              </div>
              <select
                value={selectedFacultyId}
                onChange={(e) => {
                  setSelectedFacultyId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 px-3 text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer"
              >
                <option value="ALL">All Faculty</option>
                {availableFacultyForBranch.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── SUMMARY KPI CARDS (BRANCH-AWARE) ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <Card className="border border-slate-200/90 shadow-2xs bg-white rounded-2xl p-4 hover:shadow-xs transition-all">
          <CardContent className="p-0 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-50 text-[#1769AA] border border-blue-100/80">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Records</p>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{kpis.totalRecords}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Today's Attendance</p>
            </div>
          </CardContent>
        </Card>

        {/* Logged In */}
        <Card className="border border-slate-200/90 shadow-2xs bg-white rounded-2xl p-4 hover:shadow-xs transition-all">
          <CardContent className="p-0 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Logged In</p>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{kpis.loggedIn}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{kpis.loggedInPct}% Attendance</p>
            </div>
          </CardContent>
        </Card>

        {/* Logged Out */}
        <Card className="border border-slate-200/90 shadow-2xs bg-white rounded-2xl p-4 hover:shadow-xs transition-all">
          <CardContent className="p-0 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/80">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Logged Out</p>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{kpis.loggedOut}</h3>
              <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                {kpis.totalRecords - kpis.loggedOut} Still In Session
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Faculty Count */}
        <Card className="border border-slate-200/90 shadow-2xs bg-white rounded-2xl p-4 hover:shadow-xs transition-all">
          <CardContent className="p-0 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100/80">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Faculty Count</p>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{kpis.facultyCount}</h3>
              <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Active Faculty</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── MAIN ATTENDANCE LOG TABLE CARD ─────────────────────────────────── */}
      <Card className="border border-slate-200/90 shadow-2xs bg-white rounded-2xl overflow-hidden">
        {/* Search & In-Table Filters Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by faculty name, batch, or session..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs sm:text-sm bg-white border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Quick In-Table Branch Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
              <Building2 className="h-3.5 w-3.5 text-[#1769AA]" />
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL">All Branches</option>
                {BRANCH_LIST.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick In-Table Course Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
              <BookOpen className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={selectedCourseFilter}
                onChange={(e) => {
                  setSelectedCourseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL">All Courses</option>
                {distinctCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {(selectedBranchId !== "ALL" || selectedFacultyId !== "ALL" || selectedCourseFilter !== "ALL" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedBranchId("ALL");
                  setSelectedFacultyId("ALL");
                  setSelectedCourseFilter("ALL");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="h-8 text-xs text-slate-500 hover:text-slate-800 px-2"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Attendance Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-200/80">
              <TableRow className="text-xs">
                <TableHead className="font-bold text-slate-700 pl-6">Faculty Name</TableHead>
                {/* CONDITIONAL BRANCH COLUMN: ONLY SHOWN WHEN "ALL BRANCHES" IS SELECTED */}
                {selectedBranchId === "ALL" && (
                  <TableHead className="font-bold text-slate-700">Branch</TableHead>
                )}
                <TableHead className="font-bold text-slate-700">Date</TableHead>
                <TableHead className="font-bold text-slate-700">Batch / Session</TableHead>
                <TableHead className="font-bold text-slate-700 text-center">Login</TableHead>
                <TableHead className="font-bold text-slate-700 text-center">Logout</TableHead>
                <TableHead className="font-bold text-slate-700">Session Time</TableHead>
                <TableHead className="font-bold text-slate-700">Status</TableHead>
                <TableHead className="font-bold text-slate-700 text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={selectedBranchId === "ALL" ? 9 : 8}
                    className="h-48 text-center py-10"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Clock className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No attendance logs found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        No faculty attendance logs match your active date, branch, or faculty filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((record) => (
                  <TableRow
                    key={record.id}
                    className="hover:bg-slate-50/80 transition-colors text-xs border-b border-slate-100"
                  >
                    {/* Faculty Name + Avatar + ID */}
                    <TableCell className="py-3 pl-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={record.facultyAvatar}
                          alt={record.facultyName}
                          className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
                          onError={(e) => {
                            (e.target as any).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                          }}
                        />
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">
                            {record.facultyName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 block">
                            Faculty ID: {record.facultyCode}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Branch Column (Conditional) */}
                    {selectedBranchId === "ALL" && (
                      <TableCell className="py-3">
                        {getBranchBadge(record.branchId, record.branchCode)}
                      </TableCell>
                    )}

                    {/* Date */}
                    <TableCell className="py-3 font-medium text-slate-600">
                      {formatDateDisplay(record.date)}
                    </TableCell>

                    {/* Batch / Session */}
                    <TableCell className="py-3">
                      <div>
                        <span className="font-bold text-slate-900 block">{record.batchName}</span>
                        <span className="text-[10px] font-mono text-[#1769AA] block">
                          {record.batchCode}
                        </span>
                      </div>
                    </TableCell>

                    {/* Login Time */}
                    <TableCell className="py-3 text-center">
                      {record.loginTime ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono font-bold text-[11px] border border-emerald-200">
                          {record.loginTime}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Logout Time */}
                    <TableCell className="py-3 text-center">
                      {record.logoutTime ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-[#1769AA] font-mono font-bold text-[11px] border border-blue-200">
                          {record.logoutTime}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Session Time */}
                    <TableCell className="py-3 text-slate-600 font-medium">
                      {record.sessionTime}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3">
                      {getStatusBadge(record.status)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRecordForView(record)}
                        className="h-8 text-xs font-semibold text-[#1769AA] hover:bg-blue-50 hover:text-[#125890] gap-1.5 px-2.5 rounded-lg"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Details</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination & Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <strong>
              {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
            </strong>{" "}
            of <strong>{filteredRecords.length}</strong> records
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0 bg-white border-slate-200 text-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={`h-8 w-8 p-0 text-xs font-bold ${
                  currentPage === page
                    ? "bg-[#1769AA] text-white hover:bg-[#125890]"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {page}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0 bg-white border-slate-200 text-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── MODAL: VIEW ATTENDANCE DETAILS ────────────────────────────────── */}
      <Dialog open={!!selectedRecordForView} onOpenChange={() => setSelectedRecordForView(null)}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          {selectedRecordForView && (
            <div className="space-y-4">
              <DialogHeader className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedRecordForView.facultyAvatar}
                    alt={selectedRecordForView.facultyName}
                    className="h-12 w-12 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900">
                      {selectedRecordForView.facultyName}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 font-mono">
                      Faculty Code: {selectedRecordForView.facultyCode} • {selectedRecordForView.branchName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Branch / Center
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedRecordForView.branchName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Date
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatDateDisplay(selectedRecordForView.date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Batch
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedRecordForView.batchName} ({selectedRecordForView.batchCode})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Course
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedRecordForView.courseName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Check-in Login
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      {selectedRecordForView.loginTime || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Check-out Logout
                    </span>
                    <span className="font-mono font-bold text-[#1769AA]">
                      {selectedRecordForView.logoutTime || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Session Schedule
                    </span>
                    <span className="font-medium text-slate-700">
                      {selectedRecordForView.sessionTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Attendance Status
                    </span>
                    {getStatusBadge(selectedRecordForView.status)}
                  </div>
                </div>

                {selectedRecordForView.remarks && (
                  <div className="p-3 border border-slate-200 rounded-xl bg-white">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Faculty / Session Remarks
                    </span>
                    <p className="text-slate-700 text-xs italic">
                      "{selectedRecordForView.remarks}"
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  onClick={() => setSelectedRecordForView(null)}
                  className="w-full bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold"
                >
                  Close Details
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
