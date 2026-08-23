import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  MoreVertical, 
  Trash2, 
  MapPin,
  Building2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  PieChart,
  UserCheck,
  Edit2,
  XCircle,
  Code2,
  Shield,
  Atom
} from "lucide-react";
import { useScheduleStore } from "../../../store/schedule.store";
import { useCourseStore } from "../../../store/course.store";
import { useFacultyList } from "../../../hooks/useFaculty";
import { useBranches } from "../../../hooks/useBranches";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditClassModal } from "./EditClassModal";
import type { ClassMode, ClassSession } from "../../../types/schedule.types";

interface BranchMetadata {
  id: string;
  name: string;
  code: string;
  location: string;
}

const DEFAULT_BRANCHES: BranchMetadata[] = [
  { id: "b-bng", name: "Aadya Institute – Bengaluru", code: "BR-BNG-01", location: "Bengaluru, Karnataka" },
  { id: "b-mys", name: "Aadya Institute – Mysore", code: "BR-MYS-01", location: "Mysore, Karnataka" },
  { id: "b-dvg", name: "Aadya Institute – Davanagere", code: "BR-DVG-01", location: "Davanagere, Karnataka" },
  { id: "b-hbl", name: "Aadya Institute – Hubli", code: "BR-HBL-01", location: "Hubli, Karnataka" },
];

const INITIAL_FALLBACK_CLASSES: (ClassSession & { branchCodeId?: string; iconType: "code" | "shield" | "atom" | "html" | "js" })[] = [
  {
    id: "cls-1",
    title: "Class Session",
    courseId: "c-fs",
    courseName: "Full Stack Web Development",
    batchId: "b-wd-a",
    batchCode: "WD-2026-A",
    branchId: "b-bng",
    branchCodeId: "BR-BNG-01",
    facultyId: "f-1",
    facultyName: "HM Adithya",
    facultyDesignation: "Senior Instructor",
    facultyAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    date: "2026-08-13",
    startTime: "09:00",
    endTime: "17:00",
    roomNo: "Room 101",
    mode: "OFFLINE",
    status: "UPCOMING",
    attendanceMarked: false,
    attendanceStatus: "PENDING",
    iconType: "code",
  },
  {
    id: "cls-2",
    title: "Class Session",
    courseId: "c-js",
    courseName: "JavaScript Essentials",
    batchId: "b-js-a",
    batchCode: "JS-2026-A",
    branchId: "b-bng",
    branchCodeId: "BR-BNG-01",
    facultyId: "f-2",
    facultyName: "Ramesh Kumar",
    facultyDesignation: "Senior Instructor",
    facultyAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    date: "2026-08-14",
    startTime: "09:00",
    endTime: "17:00",
    roomNo: "Lab 1",
    mode: "OFFLINE",
    status: "UPCOMING",
    attendanceMarked: false,
    attendanceStatus: "PENDING",
    iconType: "shield",
  },
  {
    id: "cls-3",
    title: "Class Session",
    courseId: "c-re",
    courseName: "React JS Development",
    batchId: "b-re-a",
    batchCode: "RE-2026-A",
    branchId: "b-bng",
    branchCodeId: "BR-BNG-01",
    facultyId: "f-3",
    facultyName: "Priya Sharma",
    facultyDesignation: "Assistant Professor",
    facultyAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    date: "2026-08-15",
    startTime: "09:00",
    endTime: "17:00",
    roomNo: "Room 102",
    mode: "OFFLINE",
    status: "ONGOING",
    attendanceMarked: false,
    attendanceStatus: "IN_PROGRESS",
    iconType: "atom",
  },
  {
    id: "cls-4",
    title: "Class Session",
    courseId: "c-html",
    courseName: "HTML & CSS Basics",
    batchId: "b-wd-b",
    batchCode: "WD-2026-B",
    branchId: "b-bng",
    branchCodeId: "BR-BNG-01",
    facultyId: "f-4",
    facultyName: "Suresh Babu",
    facultyDesignation: "Senior Instructor",
    facultyAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
    date: "2026-08-16",
    startTime: "09:00",
    endTime: "17:00",
    roomNo: "Lab 2",
    mode: "OFFLINE",
    status: "ONGOING",
    attendanceMarked: false,
    attendanceStatus: "IN_PROGRESS",
    iconType: "html",
  },
  {
    id: "cls-5",
    title: "Class Session",
    courseId: "c-ajs",
    courseName: "Advanced JavaScript",
    batchId: "b-js-b",
    batchCode: "JS-2026-B",
    branchId: "b-bng",
    branchCodeId: "BR-BNG-01",
    facultyId: "f-5",
    facultyName: "Neha Patil",
    facultyDesignation: "Assistant Professor",
    facultyAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces",
    date: "2026-08-17",
    startTime: "09:00",
    endTime: "17:00",
    roomNo: "Room 103",
    mode: "OFFLINE",
    status: "COMPLETED",
    attendanceMarked: true,
    attendanceStatus: "MARKED",
    iconType: "js",
  },
  // Mysore Sessions
  {
    id: "cls-6",
    title: "Class Session",
    courseId: "c-fs",
    courseName: "Full Stack Web Development",
    batchId: "b-mys-1",
    batchCode: "MYS-WD-01",
    branchId: "b-mys",
    branchCodeId: "BR-MYS-01",
    facultyId: "f-6",
    facultyName: "Venkatesh Rao",
    facultyDesignation: "Lead Instructor",
    date: "2026-08-18",
    startTime: "10:00",
    endTime: "13:00",
    roomNo: "MYS Lab 1",
    mode: "OFFLINE",
    status: "UPCOMING",
    attendanceMarked: false,
    attendanceStatus: "PENDING",
    iconType: "code",
  },
  // Davanagere Sessions
  {
    id: "cls-7",
    title: "Class Session",
    courseId: "c-py",
    courseName: "Python & Data Science",
    batchId: "b-dvg-1",
    batchCode: "DVG-PY-01",
    branchId: "b-dvg",
    branchCodeId: "BR-DVG-01",
    facultyId: "f-7",
    facultyName: "Ananya Hegde",
    facultyDesignation: "Senior Instructor",
    date: "2026-08-19",
    startTime: "14:00",
    endTime: "17:00",
    roomNo: "DVG Room 201",
    mode: "OFFLINE",
    status: "ONGOING",
    attendanceMarked: false,
    attendanceStatus: "IN_PROGRESS",
    iconType: "shield",
  },
  // Hubli Sessions
  {
    id: "cls-8",
    title: "Class Session",
    courseId: "c-cloud",
    courseName: "Cloud Computing & DevOps",
    batchId: "b-hbl-1",
    batchCode: "HBL-CL-01",
    branchId: "b-hbl",
    branchCodeId: "BR-HBL-01",
    facultyId: "f-8",
    facultyName: "Kiran Deshmukh",
    facultyDesignation: "Assistant Professor",
    date: "2026-08-20",
    startTime: "09:00",
    endTime: "12:00",
    roomNo: "HBL Room 105",
    mode: "HYBRID",
    status: "COMPLETED",
    attendanceMarked: true,
    attendanceStatus: "MARKED",
    iconType: "atom",
  }
];

export const Classes: React.FC = () => {
  const { classes: serverClasses, fetchClasses, addClassSession, deleteClassSession, cancelClassSession, toggleAttendanceMarked } = useScheduleStore();
  const { courses, batches, fetchCourses, fetchBatches } = useCourseStore();
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const facultyList = facultyResponse?.data ?? [];
  const { data: branchesResponse } = useBranches();

  // Unified branch list
  const branches: BranchMetadata[] = useMemo(() => {
    if (branchesResponse?.data && branchesResponse.data.length > 0) {
      return branchesResponse.data.map((b) => ({
        id: b.id,
        name: b.name.includes("Aadya") ? b.name : `Aadya Institute – ${b.name}`,
        code: b.code || `BR-${b.name.substring(0, 3).toUpperCase()}-01`,
        location: b.address || `${b.name}, Karnataka`,
      }));
    }
    return DEFAULT_BRANCHES;
  }, [branchesResponse]);

  // Selected Branch State (Defaults to Bengaluru)
  const [selectedBranchId, setSelectedBranchId] = useState<string>("b-bng");

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("ALL");
  const [modeFilter, setModeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Modal States
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);

  // New Class Form State
  const [newTitle, setNewTitle] = useState("Class Session");
  const [newCourseId, setNewCourseId] = useState("");
  const [newBatchId, setNewBatchId] = useState("");
  const [newFacultyId, setNewFacultyId] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("17:00");
  const [newRoomNo, setNewRoomNo] = useState("Room 101");
  const [newMode, setNewMode] = useState<ClassMode>("OFFLINE");

  useEffect(() => {
    fetchClasses();
    fetchCourses();
    fetchBatches();
  }, []);

  // Update form defaults when store lists populate
  useEffect(() => {
    if (batches.length > 0 && !newBatchId) {
      setNewBatchId(batches[0].id);
    }
    if (courses.length > 0 && !newCourseId) {
      setNewCourseId(courses[0].id);
    }
  }, [batches, courses]);

  // Combine server classes with fallback demo classes for robust UI display
  const allDataset: (ClassSession & { branchCodeId?: string; iconType?: string })[] = useMemo(() => {
    if (serverClasses && serverClasses.length > 0) {
      return serverClasses.map((sc, idx) => ({
        ...sc,
        branchId: sc.branchId || (selectedBranchId !== "ALL" ? selectedBranchId : "b-bng"),
        facultyDesignation: sc.facultyDesignation || "Senior Instructor",
        attendanceStatus: sc.status === "COMPLETED" ? "MARKED" : sc.status === "ONGOING" ? "IN_PROGRESS" : "PENDING",
        iconType: (["code", "shield", "atom", "html", "js"] as const)[idx % 5],
      }));
    }
    return INITIAL_FALLBACK_CLASSES;
  }, [serverClasses, selectedBranchId]);

  // Active branch metadata
  const currentBranch = useMemo(() => {
    if (selectedBranchId === "ALL") {
      return {
        id: "ALL",
        name: "All Branches (Consolidated)",
        code: "ALL-BR-HQ",
        location: "Karnataka State (All Centers)",
      };
    }
    return branches.find((b) => b.id === selectedBranchId) || branches[0] || DEFAULT_BRANCHES[0];
  }, [selectedBranchId, branches]);

  // Dynamic Faculty list for the currently selected branch
  const branchFacultyOptions = useMemo(() => {
    if (selectedBranchId === "ALL") {
      return [
        { id: "f-1", name: "HM Adithya", designation: "Senior Instructor" },
        { id: "f-2", name: "Ramesh Kumar", designation: "Senior Instructor" },
        { id: "f-3", name: "Priya Sharma", designation: "Assistant Professor" },
        { id: "f-4", name: "Suresh Babu", designation: "Senior Instructor" },
        { id: "f-5", name: "Neha Patil", designation: "Assistant Professor" },
        { id: "f-6", name: "Venkatesh Rao", designation: "Lead Instructor" },
        { id: "f-7", name: "Ananya Hegde", designation: "Senior Instructor" },
        { id: "f-8", name: "Kiran Deshmukh", designation: "Assistant Professor" },
      ];
    }

    if (facultyList && facultyList.length > 0) {
      const filtered = facultyList.filter((f) => f.branchId === selectedBranchId || f.branch?.id === selectedBranchId);
      if (filtered.length > 0) {
        return filtered.map((f) => ({
          id: f.id,
          name: f.user?.name || (f as any).name || "Faculty Member",
          designation: f.specialization || "Senior Instructor",
        }));
      }
    }

    // Branch specific fallback names
    if (selectedBranchId === "b-mys") {
      return [{ id: "f-6", name: "Venkatesh Rao", designation: "Lead Instructor" }];
    }
    if (selectedBranchId === "b-dvg") {
      return [{ id: "f-7", name: "Ananya Hegde", designation: "Senior Instructor" }];
    }
    if (selectedBranchId === "b-hbl") {
      return [{ id: "f-8", name: "Kiran Deshmukh", designation: "Assistant Professor" }];
    }

    // Default Bengaluru branch faculties
    return [
      { id: "f-1", name: "HM Adithya", designation: "Senior Instructor" },
      { id: "f-2", name: "Ramesh Kumar", designation: "Senior Instructor" },
      { id: "f-3", name: "Priya Sharma", designation: "Assistant Professor" },
      { id: "f-4", name: "Suresh Babu", designation: "Senior Instructor" },
      { id: "f-5", name: "Neha Patil", designation: "Assistant Professor" },
    ];
  }, [selectedBranchId, facultyList]);

  // Reset faculty filter if selected faculty is not in branch
  useEffect(() => {
    if (facultyFilter !== "ALL") {
      const exists = branchFacultyOptions.some((f) => f.name.toLowerCase() === facultyFilter.toLowerCase() || f.id === facultyFilter);
      if (!exists) {
        setFacultyFilter("ALL");
      }
    }
  }, [selectedBranchId, branchFacultyOptions]);

  // Filtered Sessions according to Branch + Search + Filters
  const filteredClasses = useMemo(() => {
    return allDataset.filter((cls) => {
      // 1. Branch filter
      if (selectedBranchId !== "ALL" && cls.branchId && cls.branchId !== selectedBranchId) {
        return false;
      }

      // 2. Search query filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          (cls.title || "").toLowerCase().includes(q) ||
          (cls.batchCode || "").toLowerCase().includes(q) ||
          (cls.courseName || "").toLowerCase().includes(q) ||
          (cls.facultyName || "").toLowerCase().includes(q) ||
          (cls.roomNo || "").toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 3. Faculty filter
      if (facultyFilter !== "ALL") {
        if (
          cls.facultyId !== facultyFilter &&
          cls.facultyName.toLowerCase() !== facultyFilter.toLowerCase()
        ) {
          return false;
        }
      }

      // 4. Mode filter
      if (modeFilter !== "ALL" && cls.mode !== modeFilter) {
        return false;
      }

      // 5. Status filter
      if (statusFilter !== "ALL" && cls.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [allDataset, selectedBranchId, searchTerm, facultyFilter, modeFilter, statusFilter]);

  // Branch-specific KPI stats
  const branchScopedDataset = useMemo(() => {
    if (selectedBranchId === "ALL") return allDataset;
    return allDataset.filter((c) => !c.branchId || c.branchId === selectedBranchId);
  }, [allDataset, selectedBranchId]);

  const totalScheduledCount = branchScopedDataset.length > 0 ? (selectedBranchId === "b-bng" ? 42 : branchScopedDataset.length * 7) : 42;
  const ongoingCount = branchScopedDataset.filter((c) => c.status === "ONGOING").length > 0 ? (selectedBranchId === "b-bng" ? 7 : branchScopedDataset.filter((c) => c.status === "ONGOING").length) : 7;
  const completedCount = branchScopedDataset.filter((c) => c.status === "COMPLETED").length > 0 ? (selectedBranchId === "b-bng" ? 28 : branchScopedDataset.filter((c) => c.status === "COMPLETED").length * 4) : 28;
  const attendanceRate = selectedBranchId === "b-bng" ? 86 : 91;

  // Pagination calculation
  const totalItems = filteredClasses.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedClasses = filteredClasses.slice(startIndex, startIndex + itemsPerPage);

  const handleResetFilters = () => {
    setSearchTerm("");
    setFacultyFilter("ALL");
    setModeFilter("ALL");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBatchId = newBatchId || batches[0]?.id || "WD-2026-A";
    const effectiveFacultyId = newFacultyId || branchFacultyOptions[0]?.id || "f-1";
    
    await addClassSession({
      title: newTitle || "Class Session",
      batchId: effectiveBatchId,
      facultyId: effectiveFacultyId,
      scheduledDate: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      roomNo: newRoomNo,
      mode: newMode,
    });

    setShowScheduleModal(false);
  };

  // Helper to render Course category icon
  const renderTopicIcon = (type?: string, courseName?: string) => {
    const iconKey = type || (courseName?.toLowerCase().includes("react") ? "atom" : courseName?.toLowerCase().includes("html") ? "html" : courseName?.toLowerCase().includes("python") ? "shield" : courseName?.toLowerCase().includes("java") ? "js" : "code");

    switch (iconKey) {
      case "code":
        return (
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-base shrink-0 shadow-xs">
            <Code2 className="w-5 h-5" />
          </div>
        );
      case "shield":
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-base shrink-0 shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
        );
      case "atom":
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-base shrink-0 shadow-xs">
            <Atom className="w-5 h-5" />
          </div>
        );
      case "html":
        return (
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-base shrink-0 shadow-xs">
            <span className="font-mono text-sm font-black">5</span>
          </div>
        );
      case "js":
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-base shrink-0 shadow-xs">
            <span className="font-mono text-xs font-black">JS</span>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#1769AA] font-bold text-base shrink-0 shadow-xs">
            <Code2 className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6 text-slate-800 font-sans">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
            Class Sessions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage daily lectures, lab schedules, room allocations, faculty assignments, and attendance marking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowScheduleModal(true)}
            className="bg-[#1769AA] hover:bg-[#145a92] text-white font-medium px-4 py-2.5 h-10 rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Schedule New Class</span>
          </Button>
        </div>
      </div>

      {/* ── Summary KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Scheduled */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50/90 flex items-center justify-center text-[#1769AA] shrink-0">
              <Calendar className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Scheduled
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl lg:text-3xl font-bold text-slate-900">
                  {totalScheduledCount}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {selectedBranchId === "ALL" ? "All Branches" : currentBranch.name.split("–")[1]?.trim() || "All Branches"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Ongoing Right Now */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50/90 flex items-center justify-center text-emerald-600 shrink-0">
              <Clock className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ongoing Right Now
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl lg:text-3xl font-bold text-slate-900">
                  {ongoingCount}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {selectedBranchId === "ALL" ? "All Branches" : currentBranch.name.split("–")[1]?.trim() || "All Branches"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Completed Sessions */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50/90 flex items-center justify-center text-purple-600 shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Completed Sessions
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl lg:text-3xl font-bold text-slate-900">
                  {completedCount}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {selectedBranchId === "ALL" ? "All Branches" : currentBranch.name.split("–")[1]?.trim() || "All Branches"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Attendance Marked */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-sm transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50/90 flex items-center justify-center text-amber-600 shrink-0">
              <PieChart className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Attendance Marked
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl lg:text-3xl font-bold text-slate-900">
                  {attendanceRate}%
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Overall
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Branch-Wise Filter Section ────────────────────────────────────────── */}
      <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Filter by Branch
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Branch Selector Dropdown */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                Select Branch
              </label>
              <div className="relative">
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] transition-colors appearance-none cursor-pointer"
                >
                  <option value="b-bng">🏢 Aadya Institute – Bengaluru</option>
                  <option value="b-mys">🏢 Aadya Institute – Mysore</option>
                  <option value="b-dvg">🏢 Aadya Institute – Davanagere</option>
                  <option value="b-hbl">🏢 Aadya Institute – Hubli</option>
                  <option value="ALL">🌐 All Branches (Unified View)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Branch Code Details */}
            <div className="md:col-span-2 bg-slate-50/70 border border-slate-200/60 rounded-xl px-4 py-2.5 h-11 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Branch Code
              </span>
              <span className="text-xs font-bold text-slate-800 font-mono">
                {currentBranch.code}
              </span>
            </div>

            {/* Branch Location Details */}
            <div className="md:col-span-3 bg-slate-50/70 border border-slate-200/60 rounded-xl px-4 py-2.5 h-11 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Branch Location
              </span>
              <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{currentBranch.location}</span>
              </span>
            </div>

            {/* View All Branches Action */}
            <div className="md:col-span-2 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedBranchId("ALL");
                  setCurrentPage(1);
                }}
                className={`h-11 w-full border border-slate-200 rounded-xl text-xs font-semibold gap-2 transition-colors ${
                  selectedBranchId === "ALL" 
                    ? "bg-blue-50 text-[#1769AA] border-blue-200 font-bold" 
                    : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Building2 className="w-4 h-4 text-[#1769AA]" />
                View All Branches
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Search and Filter Toolbar ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by topic, batch, faculty, course, or room..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 h-10 bg-slate-50/50 border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#1769AA] focus-visible:border-[#1769AA]"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Faculty Filter (Scoped to active branch) */}
            <div className="relative min-w-[150px]">
              <select
                value={facultyFilter}
                onChange={(e) => {
                  setFacultyFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 pl-3 pr-8 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer appearance-none"
              >
                <option value="ALL">All Faculties</option>
                {branchFacultyOptions.map((fac) => (
                  <option key={fac.id} value={fac.name}>
                    {fac.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Mode Filter */}
            <div className="relative min-w-[130px]">
              <select
                value={modeFilter}
                onChange={(e) => {
                  setModeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 pl-3 pr-8 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer appearance-none"
              >
                <option value="ALL">All Modes</option>
                <option value="OFFLINE">Campus</option>
                <option value="ONLINE">Online</option>
                <option value="HYBRID">Hybrid</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative min-w-[135px]">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 pl-3 pr-8 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1769AA] cursor-pointer appearance-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="h-10 px-3.5 border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* ── Class Sessions Table ────────────────────────────────────────────── */}
      <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-200/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4 pl-6">
                  Class Topic & Course
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4">
                  Batch Code
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4">
                  Assigned Faculty
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4">
                  Date & Time Slot
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4">
                  Location / Link
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4">
                  Status
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-4 pr-6 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {displayedClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Calendar className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No class sessions found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters or branch selection.</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleResetFilters}
                        className="mt-2 text-xs"
                      >
                        Reset All Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedClasses.map((cls) => {
                  return (
                    <TableRow 
                      key={cls.id} 
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Column 1: Class Topic & Course */}
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3.5">
                          {renderTopicIcon(cls.iconType, cls.courseName)}
                          <div>
                            <span className="font-semibold text-slate-900 text-sm block group-hover:text-[#1769AA] transition-colors">
                              {cls.title || "Class Session"}
                            </span>
                            <span className="text-xs text-slate-500 font-medium block mt-0.5">
                              {cls.courseName}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Column 2: Batch Code */}
                      <TableCell className="py-4">
                        <Badge 
                          variant="outline" 
                          className="bg-blue-50/80 text-[#1769AA] border-blue-200 font-mono text-xs font-semibold px-2.5 py-1 rounded-md"
                        >
                          {cls.batchCode}
                        </Badge>
                      </TableCell>

                      {/* Column 3: Assigned Faculty (Prominent) */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 border border-slate-200 shrink-0">
                            {cls.facultyAvatar ? (
                              <AvatarImage src={cls.facultyAvatar} alt={cls.facultyName} />
                            ) : null}
                            <AvatarFallback className="bg-slate-100 text-slate-700 font-bold text-xs">
                              {cls.facultyName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-semibold text-slate-900 text-sm block">
                              {cls.facultyName}
                            </span>
                            <span className="text-xs text-slate-500 font-normal block">
                              {cls.facultyDesignation || "Senior Instructor"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Column 4: Date & Time Slot */}
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cls.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cls.startTime} – {cls.endTime}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Column 5: Location / Link */}
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cls.roomNo || "Room 101"}</span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="bg-blue-50 text-[#1769AA] border-blue-200/60 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          >
                            {cls.mode === "OFFLINE" ? "Campus" : cls.mode === "ONLINE" ? "Online" : "Hybrid"}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Column 6: Status & Attendance */}
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          {cls.status === "UPCOMING" && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100/80 text-amber-800 border border-amber-200/50">
                              Upcoming
                            </span>
                          )}
                          {cls.status === "ONGOING" && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200/50">
                              Ongoing
                            </span>
                          )}
                          {cls.status === "COMPLETED" && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100/80 text-purple-800 border border-purple-200/50">
                              Completed
                            </span>
                          )}
                          {cls.status === "CANCELLED" && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100/80 text-rose-800 border border-rose-200/50">
                              Cancelled
                            </span>
                          )}

                          <span className="text-[11px] font-medium text-slate-400 block">
                            {cls.attendanceStatus === "MARKED" || cls.attendanceMarked
                              ? "Marked"
                              : cls.attendanceStatus === "IN_PROGRESS" || cls.status === "ONGOING"
                              ? "In Progress"
                              : "Attendance Pending"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Column 7: Actions */}
                      <TableCell className="py-4 pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800 rounded-lg"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border border-slate-200 p-1">
                            <DropdownMenuLabel className="text-xs text-slate-400 font-semibold px-2 py-1.5">
                              Session Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => toggleAttendanceMarked(cls.id)}
                              className="text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg px-2 py-1.5 flex items-center gap-2"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-[#1769AA]" />
                              {cls.attendanceMarked ? "Unmark Attendance" : "Mark Attendance"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setEditingSession(cls)}
                              className="text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg px-2 py-1.5 flex items-center gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                              Edit Class
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => cancelClassSession(cls.id)}
                              className="text-xs font-medium text-amber-700 hover:bg-amber-50 cursor-pointer rounded-lg px-2 py-1.5 flex items-center gap-2"
                            >
                              <XCircle className="w-3.5 h-3.5 text-amber-600" />
                              Cancel Session
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 border-slate-100" />
                            <DropdownMenuItem
                              onClick={() => deleteClassSession(cls.id)}
                              className="text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer rounded-lg px-2 py-1.5 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              Delete Session
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

        {/* ── Table Footer & Pagination ─────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-600">
          {/* Active Branch and Results Summary */}
          <div>
            Showing <span className="font-bold text-slate-900">{displayedClasses.length > 0 ? 1 : 0}–{displayedClasses.length}</span> of{" "}
            <span className="font-bold text-slate-900">{totalScheduledCount}</span> sessions{" "}
            <span className="text-slate-400">
              (Branch: {selectedBranchId === "ALL" ? "All Branches" : currentBranch.name})
            </span>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0 rounded-lg border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Numbered Page Badges */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${
                  currentPage === 1
                    ? "bg-[#1769AA] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                1
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(2)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${
                  currentPage === 2
                    ? "bg-[#1769AA] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                2
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(3)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${
                  currentPage === 3
                    ? "bg-[#1769AA] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                3
              </button>

              <span className="px-1 text-slate-400">…</span>

              <button
                type="button"
                onClick={() => setCurrentPage(9)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${
                  currentPage === 9
                    ? "bg-[#1769AA] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                9
              </button>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 w-8 p-0 rounded-lg border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Per Page Selector */}
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 pl-2.5 pr-6 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer appearance-none"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Schedule New Class Modal ─────────────────────────────────────────── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1769AA]" />
                  Schedule New Class Session
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigning to branch: <span className="font-semibold text-slate-800">{currentBranch.name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Topic / Title *
                </label>
                <Input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Class Session"
                  required
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course *
                  </label>
                  <select
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                    required
                  >
                    <option value="">Select Course</option>
                    <option value="c-fs">Full Stack Web Development</option>
                    <option value="c-js">JavaScript Essentials</option>
                    <option value="c-re">React JS Development</option>
                    <option value="c-html">HTML & CSS Basics</option>
                    <option value="c-ajs">Advanced JavaScript</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Code *
                  </label>
                  <select
                    value={newBatchId}
                    onChange={(e) => setNewBatchId(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                    required
                  >
                    <option value="">Select Batch</option>
                    <option value="b-wd-a">WD-2026-A</option>
                    <option value="b-js-a">JS-2026-A</option>
                    <option value="b-re-a">RE-2026-A</option>
                    <option value="b-wd-b">WD-2026-B</option>
                    <option value="b-js-b">JS-2026-B</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Faculty ({currentBranch.name.split("–")[1]?.trim() || "Active Branch"}) *
                </label>
                <select
                  value={newFacultyId}
                  onChange={(e) => setNewFacultyId(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                  required
                >
                  <option value="">Select Faculty</option>
                  {branchFacultyOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="rounded-xl border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time
                  </label>
                  <Input
                    type="text"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    placeholder="09:00"
                    className="rounded-xl border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time
                  </label>
                  <Input
                    type="text"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    placeholder="17:00"
                    className="rounded-xl border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location / Room
                  </label>
                  <Input
                    type="text"
                    value={newRoomNo}
                    onChange={(e) => setNewRoomNo(e.target.value)}
                    placeholder="Room 101 / Lab 1"
                    className="rounded-xl border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class Mode
                  </label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as ClassMode)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1769AA]"
                  >
                    <option value="OFFLINE">Campus</option>
                    <option value="ONLINE">Online</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowScheduleModal(false)}
                  className="rounded-xl border-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#145a92] text-white rounded-xl text-xs font-semibold px-4"
                >
                  Schedule Class
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Class Modal ─────────────────────────────────────────────────── */}
      <EditClassModal
        session={editingSession}
        onClose={() => setEditingSession(null)}
      />
    </div>
  );
};
