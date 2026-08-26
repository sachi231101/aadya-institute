import React, { useState, useMemo, useEffect } from "react";
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
  Users,
  AlertTriangle,
  Link as LinkIcon,
  UserCheck,
  Edit3,
  XCircle,
  Eye,
  UserPlus,
  Laptop,
  Code2,
  Megaphone,
  Table as TableIcon,
  BarChart3,
  Globe,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { ClassroomDropdown } from "@/components/common/ClassroomDropdown";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type ClassStatus = "LIVE" | "SCHEDULED" | "UNASSIGNED" | "COMPLETED" | "CANCELLED";
export type ClassMode = "OFFLINE" | "ONLINE" | "HYBRID";

export interface ScheduledClassItem {
  id: string;
  topicName: string;
  courseName: string;
  moduleName: string;
  iconType: "java" | "python" | "marketing" | "excel" | "powerbi" | "web" | "general";
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
  isOnlineLink?: boolean;
  status: ClassStatus;
  enrolledStudentsCount: number;
  attendanceMarked: boolean;
}

import { useBatches } from "../../../hooks/useBatches";
import { useBranches } from "../../../hooks/useBranches";
import { useFacultyList } from "../../../hooks/useFaculty";

export const Classes: React.FC = () => {
  const { data: branchData } = useBranches();
  const branchesList = branchData?.data ?? [];
  const { batches } = useBatches();
  const { data: facultyData } = useFacultyList({ limit: 50 });
  const facultyMembers = facultyData?.data ?? [];

  // Generate dynamic scheduled class list from active batches
  const realClassesList: ScheduledClassItem[] = useMemo(() => {
    return batches.map((b: any, idx: number) => {
      const branchObj = branchesList.find((br: any) => br.id === b.branchId) || branchesList[0];
      const facultyObj = facultyMembers.find((f: any) => f.id === b.facultyId);

      return {
        id: b.id,
        topicName: b.course?.name || b.name || "Live Lecture",
        courseName: b.course?.name || "Full Stack Web Development",
        moduleName: "Core Concepts & Practical Lab",
        iconType: "web",
        batchCode: b.code || `BATCH-${idx + 1}`,
        batchName: b.name || "Active Batch",
        branchId: b.branchId || branchObj?.id || "main",
        branchName: branchObj?.name || "Aadya Institute",
        facultyId: facultyObj?.id,
        facultyName: facultyObj?.user?.name || "Assigned Faculty",
        facultySpecialization: facultyObj?.specialization || "Technical Instructor",
        facultyAvatar: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150`,
        isFacultyAssigned: !!facultyObj || !!b.facultyId,
        date: new Date().toISOString().split("T")[0],
        dateLabel: "Today",
        startTime: b.schedule?.startTime || "10:00 AM",
        endTime: b.schedule?.endTime || "11:30 AM",
        mode: (b.type === "ONLINE" ? "ONLINE" : b.type === "HYBRID" ? "HYBRID" : "OFFLINE") as ClassMode,
        locationOrLink: b.type === "ONLINE" ? "https://meet.google.com/live" : "Classroom 101",
        isOnlineLink: b.type === "ONLINE",
        status: (b.status === "ACTIVE" ? "LIVE" : b.status === "COMPLETED" ? "COMPLETED" : "SCHEDULED") as ClassStatus,
        enrolledStudentsCount: b._count?.enrollments || b.enrollments?.length || 20,
        attendanceMarked: false,
      };
    });
  }, [batches, branchesList, facultyMembers]);

  // State
  const [classesList, setClassesList] = useState<ScheduledClassItem[]>([]);

  useEffect(() => {
    setClassesList(realClassesList);
  }, [realClassesList]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [isViewAllBranches, setIsViewAllBranches] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFaculty, setSelectedFaculty] = useState<string>("ALL");
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [selectedMode, setSelectedMode] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Dialogs State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAssignFacultyModalOpen, setIsAssignFacultyModalOpen] = useState(false);
  const [selectedClassItem, setSelectedClassItem] = useState<ScheduledClassItem | null>(null);

  // Schedule Modal Form
  const [formTopic, setFormTopic] = useState("Java Full Stack");
  const [formCourse, setFormCourse] = useState("Java Full Stack");
  const [formModule, setFormModule] = useState("Advanced OOP Concepts");
  const [formBatch, setFormBatch] = useState("JFS-B01");
  const [formBranch, setFormBranch] = useState("b-blr");
  const [formFacultyId, setFormFacultyId] = useState("f-1");
  const [formDate, setFormDate] = useState("2026-08-24");
  const [formStartTime, setFormStartTime] = useState("10:00 AM");
  const [formEndTime, setFormEndTime] = useState("11:30 AM");
  const [formMode, setFormMode] = useState<ClassMode>("OFFLINE");
  const [formLocation, setFormLocation] = useState("");
  const [formStudentsCount, setFormStudentsCount] = useState(25);

  // Assign Faculty Target
  const [targetFacultyId, setTargetFacultyId] = useState("f-1");

  const currentBranchInfo = useMemo(() => {
    const found = branchesList.find((b: any) => b.id === selectedBranchId);
    if (found) return { id: found.id, name: found.name, code: found.code, location: found.address || found.name };
    const first = branchesList[0];
    if (first) return { id: first.id, name: first.name, code: first.code, location: first.address || first.name };
    return { id: "ALL", name: "All Branches", code: "ALL", location: "Bengaluru" };
  }, [branchesList, selectedBranchId]);

  // Dynamic Statistics
  const stats = useMemo(() => {
    const scopeClasses = isViewAllBranches || selectedBranchId === "ALL"
      ? classesList
      : classesList.filter((c) => c.branchId === selectedBranchId);

    const totalClasses = scopeClasses.length || 15;
    const facultyAssigned = scopeClasses.filter((c) => c.isFacultyAssigned).length || 10;
    const todayClasses = scopeClasses.length || 5;
    const unassignedClasses = scopeClasses.filter((c) => !c.isFacultyAssigned).length;

    return {
      total: totalClasses,
      facultyAssigned,
      today: todayClasses,
      unassigned: unassignedClasses,
    };
  }, [classesList, selectedBranchId, isViewAllBranches]);

  // Filtered Classes
  const filteredClasses = useMemo(() => {
    return classesList.filter((item) => {
      // Branch filter
      if (!isViewAllBranches && item.branchId !== selectedBranchId) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTopic = item.topicName.toLowerCase().includes(q);
        const matchCourse = item.courseName.toLowerCase().includes(q);
        const matchBatch = item.batchCode.toLowerCase().includes(q);
        const matchFaculty = item.facultyName?.toLowerCase().includes(q);
        const matchRoom = item.locationOrLink.toLowerCase().includes(q);
        if (!matchTopic && !matchCourse && !matchBatch && !matchFaculty && !matchRoom) {
          return false;
        }
      }

      // Faculty filter
      if (selectedFaculty !== "ALL") {
        if (selectedFaculty === "UNASSIGNED") {
          if (item.isFacultyAssigned) return false;
        } else if (item.facultyName !== selectedFaculty) {
          return false;
        }
      }

      // Course filter
      if (selectedCourse !== "ALL" && item.courseName !== selectedCourse) {
        return false;
      }

      // Batch filter
      if (selectedBatch !== "ALL" && item.batchCode !== selectedBatch) {
        return false;
      }

      // Mode filter
      if (selectedMode !== "ALL" && item.mode !== selectedMode) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "ALL" && item.status !== selectedStatus) {
        return false;
      }

      // Date filter
      if (selectedDate && item.date !== selectedDate) {
        return false;
      }

      return true;
    });
  }, [
    classesList,
    selectedBranchId,
    isViewAllBranches,
    searchQuery,
    selectedFaculty,
    selectedCourse,
    selectedBatch,
    selectedMode,
    selectedStatus,
    selectedDate,
  ]);

  // Paginated Classes
  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredClasses.slice(start, start + rowsPerPage);
  }, [filteredClasses, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredClasses.length / rowsPerPage) || 1;

  // Handlers
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedFaculty("ALL");
    setSelectedCourse("ALL");
    setSelectedBatch("ALL");
    setSelectedMode("ALL");
    setSelectedStatus("ALL");
    setSelectedDate("");
    setCurrentPage(1);
  };

  const handleOpenAssignFaculty = (classItem: ScheduledClassItem) => {
    setSelectedClassItem(classItem);
    setTargetFacultyId(classItem.facultyId || "f-1");
    setIsAssignFacultyModalOpen(true);
  };

  const handleSaveAssignFaculty = () => {
    if (!selectedClassItem) return;
    const fac = facultyMembers.find((f: any) => f.id === targetFacultyId);
    if (!fac) return;
    const facName = fac.user?.name || fac.employeeCode || "Faculty";
    const facSpec = fac.specialization || "Technical Instructor";

    setClassesList((prev) =>
      prev.map((c) =>
        c.id === selectedClassItem.id
          ? {
              ...c,
              facultyId: fac.id,
              facultyName: facName,
              facultySpecialization: facSpec,
              facultyAvatar: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150`,
              isFacultyAssigned: true,
              status: c.status === "UNASSIGNED" ? "SCHEDULED" : c.status,
            }
          : c
      )
    );

    setIsAssignFacultyModalOpen(false);
    setNotificationMsg(`✓ Assigned ${facName} to ${selectedClassItem.topicName} (${selectedClassItem.batchCode}).`);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleCreateNewClass = () => {
    const fac = formFacultyId !== "none" ? facultyMembers.find((f: any) => f.id === formFacultyId) : null;
    const br = branchesList.find((b: any) => b.id === formBranch) || branchesList[0];

    const newClass: ScheduledClassItem = {
      id: `cls-${Date.now()}`,
      topicName: formTopic,
      courseName: formCourse,
      moduleName: formModule,
      iconType: formTopic.toLowerCase().includes("python")
        ? "python"
        : formTopic.toLowerCase().includes("excel")
        ? "excel"
        : formTopic.toLowerCase().includes("marketing")
        ? "marketing"
        : formTopic.toLowerCase().includes("power")
        ? "powerbi"
        : "java",
      batchCode: formBatch,
      batchName: `${formCourse} Batch`,
      branchId: br.id,
      branchName: br.name,
      facultyId: fac?.id,
      facultyName: (fac as any)?.user?.name || (fac as any)?.employeeCode || undefined,
      facultySpecialization: fac?.specialization || undefined,
      facultyAvatar: fac ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" : undefined,
      isFacultyAssigned: !!fac,
      date: formDate,
      dateLabel: `${formDate} (Scheduled)`,
      startTime: formStartTime,
      endTime: formEndTime,
      mode: formMode,
      locationOrLink: formLocation,
      isOnlineLink: formMode === "ONLINE",
      status: fac ? "SCHEDULED" : "UNASSIGNED",
      enrolledStudentsCount: formStudentsCount,
      attendanceMarked: false,
    };

    setClassesList((prev) => [newClass, ...prev]);
    setIsScheduleModalOpen(false);
    setNotificationMsg(`✓ Successfully scheduled new class: ${formTopic} (${formBatch}).`);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleCancelClass = (classItem: ScheduledClassItem) => {
    setClassesList((prev) =>
      prev.map((c) => (c.id === classItem.id ? { ...c, status: "CANCELLED" } : c))
    );
    setNotificationMsg(`✓ Class ${classItem.topicName} marked as Cancelled.`);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleDeleteClass = (classItem: ScheduledClassItem) => {
    setClassesList((prev) => prev.filter((c) => c.id !== classItem.id));
    setNotificationMsg(`✓ Removed class ${classItem.topicName} from schedule.`);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // Helper Icon Renderer
  const renderTopicIcon = (iconType: string) => {
    switch (iconType) {
      case "java":
        return (
          <div className="w-8 h-8 rounded-xl bg-purple-100/90 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Laptop className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
      case "python":
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-100/90 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Code2 className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
      case "marketing":
        return (
          <div className="w-8 h-8 rounded-xl bg-pink-100/90 text-pink-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Megaphone className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
      case "excel":
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
            <TableIcon className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
      case "powerbi":
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-100/90 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
            <BarChart3 className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-orange-100/90 text-orange-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Globe className="w-4 h-4 stroke-[2.2]" />
          </div>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-6 text-foreground font-sans w-full max-w-[1720px] mx-auto pb-16 animate-in fade-in duration-200">
      {/* ─── 1. PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Classes Management
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">
            View, manage, and track all scheduled classes and faculty assignments.
          </p>
        </div>

        <Button
          onClick={() => setIsScheduleModalOpen(true)}
          className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold text-xs px-4 py-2.5 h-10 rounded-xl shadow-xs gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Schedule Class</span>
        </Button>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 flex items-center gap-2 text-xs font-bold shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* ─── 2. BRANCH SELECTION BAR ────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
          Select Branch
        </label>
        <Card className="border border-border shadow-xs bg-card rounded-2xl p-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Branch Selector Dropdown */}
              <div className="relative min-w-[280px] sm:min-w-[320px]">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 pointer-events-none" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    setIsViewAllBranches(e.target.value === "ALL");
                    setCurrentPage(1);
                  }}
                  className="w-full h-11 pl-10 pr-9 text-xs font-bold text-foreground bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/30 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">🌐 All Branches</option>
                  {branchesList.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-xs">
                  ▼
                </div>
              </div>

              {/* Branch Code Card */}
              <div className="h-11 px-4 bg-muted/40 border border-border rounded-xl flex flex-col justify-center">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Branch Code</span>
                <span className="text-xs font-black text-foreground">{currentBranchInfo.code}</span>
              </div>

              {/* Branch Location Card */}
              <div className="h-11 px-4 bg-muted/40 border border-border rounded-xl flex flex-col justify-center">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Branch Location</span>
                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                  {currentBranchInfo.location}
                </span>
              </div>
            </div>

            {/* View All Branches Toggle */}
            <Button
              variant={isViewAllBranches ? "default" : "outline"}
              onClick={() => {
                setIsViewAllBranches(!isViewAllBranches);
                setCurrentPage(1);
              }}
              className={`h-11 px-4 text-xs font-bold rounded-xl gap-2 transition-all cursor-pointer ${
                isViewAllBranches
                  ? "bg-[#1769AA] hover:bg-[#125890] text-white shadow-xs"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>{isViewAllBranches ? "Showing All Branches" : "View All Branches"}</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* ─── 3. OVERVIEW METRIC CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Classes */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
            <Calendar className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">{stats.total}</span>
              <span className="text-xs font-semibold text-muted-foreground">Scheduled</span>
            </div>
            <span className="text-xs font-bold text-muted-foreground block mt-0.5">Total Classes</span>
          </div>
        </Card>

        {/* Card 2: Faculty Assigned */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
            <Users className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">{stats.facultyAssigned}</span>
              <span className="text-xs font-semibold text-muted-foreground">Faculty</span>
            </div>
            <span className="text-xs font-bold text-muted-foreground block mt-0.5">Faculty Assigned</span>
          </div>
        </Card>

        {/* Card 3: Today's Classes */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500 shrink-0">
            <Clock className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-foreground">{stats.today}</span>
              <span className="text-xs font-semibold text-muted-foreground">Scheduled Today</span>
            </div>
            <span className="text-xs font-bold text-muted-foreground block mt-0.5">Today's Classes</span>
          </div>
        </Card>

        {/* Card 4: Unassigned Classes */}
        <Card className="border border-amber-500/30 shadow-xs bg-amber-500/10 dark:bg-amber-950/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-300">{stats.unassigned}</span>
              <span className="text-xs font-semibold text-amber-600/80 dark:text-amber-400">Need Faculty</span>
            </div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block mt-0.5">Unassigned Classes</span>
          </div>
        </Card>
      </div>

      {/* ─── 4. FILTER TOOLBAR ──────────────────────────────────────────── */}
      <div className="bg-card p-3.5 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Search Field */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search class, course, batch, faculty or room..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 pl-9 bg-background border-border text-foreground text-xs font-medium rounded-xl"
            />
          </div>

          {/* All Faculties */}
          <select
            value={selectedFaculty}
            onChange={(e) => {
              setSelectedFaculty(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none cursor-pointer"
          >
            <option value="ALL">All Faculties</option>
            <option value="UNASSIGNED">⚠ Faculty Not Assigned</option>
            {facultyMembers.map((f: any) => {
              const name = f.user?.name || f.employeeCode || "Faculty";
              return (
                <option key={f.id} value={name}>
                  {name}
                </option>
              );
            })}
          </select>

          {/* All Courses */}
          <select
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none cursor-pointer"
          >
            <option value="ALL">All Courses</option>
            <option value="Java Full Stack">Java Full Stack</option>
            <option value="Python Programming">Python Programming</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="Advanced Excel">Advanced Excel</option>
            <option value="Power BI">Power BI</option>
            <option value="Web Development">Web Development</option>
            <option value="Database Systems">Database Systems</option>
          </select>

          {/* All Batches */}
          <select
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none cursor-pointer"
          >
            <option value="ALL">All Batches</option>
            <option value="JFS-B01">JFS-B01</option>
            <option value="PY-B02">PY-B02</option>
            <option value="DM-B01">DM-B01</option>
            <option value="EX-B01">EX-B01</option>
            <option value="PBI-B01">PBI-B01</option>
            <option value="WD-B02">WD-B02</option>
            <option value="DB-B01">DB-B01</option>
          </select>

          {/* All Modes */}
          <select
            value={selectedMode}
            onChange={(e) => {
              setSelectedMode(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none cursor-pointer"
          >
            <option value="ALL">All Modes</option>
            <option value="OFFLINE">Offline</option>
            <option value="ONLINE">Online</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>

        {/* Second Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border">
          <div className="flex flex-wrap items-center gap-3">
            {/* All Statuses */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 bg-background border border-border rounded-xl text-xs font-bold text-foreground outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="LIVE">● Live</option>
              <option value="SCHEDULED">● Scheduled</option>
              <option value="UNASSIGNED">● Unassigned</option>
              <option value="COMPLETED">● Completed</option>
              <option value="CANCELLED">● Cancelled</option>
            </select>

            {/* Date Input */}
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-2.5 h-9 text-xs">
              <span className="text-muted-foreground font-medium">Select Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Reset Filters Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 text-xs font-bold text-foreground border-border hover:bg-muted rounded-xl gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Reset Filters</span>
          </Button>
        </div>
      </div>

      {/* ─── 5. CLASSES TABLE ───────────────────────────────────────────── */}
      <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="bg-muted/60 dark:bg-slate-900/90 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider">
                <th className="py-3.5 px-4 pl-5">CLASS TOPIC & COURSE</th>
                <th className="py-3.5 px-3">BATCH CODE</th>
                <th className="py-3.5 px-4">ASSIGNED FACULTY</th>
                <th className="py-3.5 px-4">DATE & TIME SLOT</th>
                <th className="py-3.5 px-3 text-center">MODE</th>
                <th className="py-3.5 px-4">LOCATION / LINK</th>
                <th className="py-3.5 px-3 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border text-xs bg-card">
              {paginatedClasses.length > 0 ? (
                paginatedClasses.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                    {/* Column 1: Class Topic & Course */}
                    <td className="py-3 px-4 pl-5 align-middle">
                      <div className="flex items-center gap-3">
                        {renderTopicIcon(item.iconType)}
                        <div>
                          <h4 className="font-bold text-foreground text-xs">{item.topicName}</h4>
                          <p className="text-[11px] text-muted-foreground font-medium">{item.moduleName}</p>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Batch Code */}
                    <td className="py-3 px-3 align-middle">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-muted text-foreground border border-border inline-block tracking-wide">
                        {item.batchCode}
                      </span>
                    </td>

                    {/* Column 3: Assigned Faculty (Prominent & Clear) */}
                    <td className="py-3 px-4 align-middle">
                      {item.isFacultyAssigned && item.facultyName ? (
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 rounded-full border border-border shadow-2xs shrink-0">
                            <AvatarImage src={item.facultyAvatar} alt={item.facultyName} />
                            <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                              {item.facultyName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="font-bold text-foreground text-xs block truncate">
                              {item.facultyName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium block truncate">
                              {item.facultySpecialization}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-1.5 px-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 inline-flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span>Faculty Not Assigned</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenAssignFaculty(item)}
                            className="text-[10px] font-extrabold text-blue-500 dark:text-blue-400 hover:underline text-left cursor-pointer"
                          >
                            + Assign Faculty
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Column 4: Date & Time Slot */}
                    <td className="py-3 px-4 align-middle">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-foreground text-[11px]">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{item.dateLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium mt-0.5">
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{item.startTime} – {item.endTime}</span>
                        </div>
                      </div>
                    </td>

                    {/* Column 5: Mode */}
                    <td className="py-3 px-3 text-center align-middle">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.mode === "ONLINE"
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {item.mode === "ONLINE" ? "Online" : "Offline"}
                      </span>
                    </td>

                    {/* Column 6: Location / Link */}
                    <td className="py-3 px-4 align-middle">
                      {item.isOnlineLink ? (
                        <a
                          href="#join"
                          onClick={(e) => e.preventDefault()}
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-400 font-bold text-xs hover:underline"
                        >
                          <LinkIcon className="h-3.5 w-3.5 text-blue-500" />
                          <span>Meeting Link</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-1 text-foreground font-semibold text-xs">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{item.locationOrLink}</span>
                        </div>
                      )}
                    </td>

                    {/* Column 7: Status */}
                    <td className="py-3 px-3 text-center align-middle">
                      {item.status === "LIVE" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shadow-2xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                        </span>
                      )}
                      {item.status === "SCHEDULED" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Scheduled
                        </span>
                      )}
                      {item.status === "UNASSIGNED" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unassigned
                        </span>
                      )}
                      {item.status === "COMPLETED" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Completed
                        </span>
                      )}
                      {item.status === "CANCELLED" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Cancelled
                        </span>
                      )}
                    </td>

                    {/* Column 8: Actions */}
                    <td className="py-3 px-4 text-center align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-popover border border-border rounded-xl shadow-xl p-1 text-xs">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedClassItem(item);
                              setIsDetailsModalOpen(true);
                            }}
                            className="gap-2 cursor-pointer font-medium"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-500" /> View Class Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setFormTopic(item.topicName);
                              setFormCourse(item.courseName);
                              setFormModule(item.moduleName);
                              setFormBatch(item.batchCode);
                              setFormFacultyId(item.facultyId || "f-1");
                              setFormDate(item.date);
                              setFormStartTime(item.startTime);
                              setFormEndTime(item.endTime);
                              setFormMode(item.mode);
                              setFormLocation(item.locationOrLink);
                              setIsScheduleModalOpen(true);
                            }}
                            className="gap-2 cursor-pointer font-medium"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-indigo-400" /> Edit Class
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenAssignFaculty(item)}
                            className="gap-2 cursor-pointer font-medium"
                          >
                            <UserPlus className="h-3.5 w-3.5 text-emerald-400" /> Change Faculty
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedClassItem(item);
                              setIsDetailsModalOpen(true);
                            }}
                            className="gap-2 cursor-pointer font-medium"
                          >
                            <Users className="h-3.5 w-3.5 text-muted-foreground" /> View Students
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedClassItem(item);
                              setIsDetailsModalOpen(true);
                            }}
                            className="gap-2 cursor-pointer font-medium"
                          >
                            <UserCheck className="h-3.5 w-3.5 text-muted-foreground" /> View Attendance
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem
                            onClick={() => handleCancelClass(item)}
                            className="gap-2 text-rose-500 font-medium cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancel Class
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClass(item)}
                            className="gap-2 text-rose-500 font-medium cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 mx-auto">
                        <Calendar className="w-8 h-8 stroke-[1.8]" />
                      </div>
                      <h3 className="text-base font-extrabold text-foreground">
                        No classes scheduled for this branch
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                        There are currently no classes scheduled matching the selected filters. Click below to schedule a new class session.
                      </p>
                      <Button
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs gap-1.5 mt-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Schedule Class
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── 6. PAGINATION FOOTER ──────────────────────────────────────── */}
        <div className="p-4 bg-muted/40 dark:bg-slate-900/80 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span className="text-muted-foreground font-medium">
            Showing <strong className="text-foreground">{filteredClasses.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}–{Math.min(currentPage * rowsPerPage, filteredClasses.length)}</strong> of <strong className="text-foreground">{stats.total}</strong> classes
          </span>

          <div className="flex items-center gap-3">
            {/* Numbered Pagination */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 rounded-lg border-border bg-card text-foreground hover:bg-muted"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              {[1, 2, 3, 4, 5].map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === pg
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card text-foreground border border-border hover:bg-muted"
                  }`}
                >
                  {pg}
                </button>
              ))}

              <span className="text-muted-foreground px-1">...</span>
              <button
                onClick={() => setCurrentPage(totalPages)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentPage === totalPages
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card text-foreground border border-border hover:bg-muted"
                }`}
              >
                {totalPages > 5 ? totalPages : 6}
              </button>

              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 rounded-lg border-border bg-card text-foreground hover:bg-muted"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Rows Per Page */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-border">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 bg-background border border-border rounded-lg text-xs font-bold text-foreground outline-none cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── MODAL 1: SCHEDULE CLASS DIALOG ─────────────────────────────── */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card text-foreground rounded-3xl p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-black text-foreground">
              Schedule New Class Session
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium">
              Create a scheduled classroom session and assign faculty for this batch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-foreground">Course / Subject *</Label>
                <select
                  value={formCourse}
                  onChange={(e) => {
                    setFormCourse(e.target.value);
                    setFormTopic(e.target.value);
                  }}
                  className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-medium outline-none"
                >
                  <option value="Java Full Stack">Java Full Stack</option>
                  <option value="Python Programming">Python Programming</option>
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="Advanced Excel">Advanced Excel</option>
                  <option value="Power BI">Power BI</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Database Systems">Database Systems</option>
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-foreground">Batch Code *</Label>
                <Input
                  value={formBatch}
                  onChange={(e) => setFormBatch(e.target.value)}
                  placeholder="e.g. JFS-B01"
                  className="h-9 mt-1 text-xs rounded-xl bg-background border-border text-foreground"
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-foreground">Class Topic / Module *</Label>
              <Input
                value={formModule}
                onChange={(e) => setFormModule(e.target.value)}
                placeholder="e.g. Arrays & Collections"
                className="h-9 mt-1 text-xs rounded-xl bg-background border-border text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold text-foreground">Branch Center</Label>
                <select
                  value={formBranch}
                  onChange={(e) => setFormBranch(e.target.value)}
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
                  value={formFacultyId}
                  onChange={(e) => setFormFacultyId(e.target.value)}
                  className="w-full h-9 px-3 mt-1 bg-background text-foreground border border-border rounded-xl font-bold text-[#1769AA] outline-none"
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

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <Label className="text-[11px] font-bold text-foreground">Date</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-9 mt-1 text-xs rounded-xl bg-background border-border text-foreground"
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold text-foreground">Start Time</Label>
                <Input
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  placeholder="10:00 AM"
                  className="h-9 mt-1 text-xs rounded-xl bg-background border-border text-foreground"
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold text-foreground">End Time</Label>
                <Input
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  placeholder="11:30 AM"
                  className="h-9 mt-1 text-xs rounded-xl bg-background border-border text-foreground"
                />
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
                  {formMode === "ONLINE" ? "Meeting URL Link" : "Room / Lab No"}
                </Label>
                <Input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder={formMode === "ONLINE" ? "https://meet.google.com/..." : "e.g. Room 201"}
                  className="h-9 mt-1 text-xs rounded-xl bg-background border-border text-foreground"
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-foreground">Enrolled Students Count</Label>
              <Input
                type="number"
                value={formStudentsCount}
                onChange={(e) => setFormStudentsCount(Number(e.target.value))}
                placeholder="25"
                className="h-9 mt-1 text-xs rounded-xl bg-background border-border text-foreground"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-3">
            <Button
              variant="outline"
              onClick={() => setIsScheduleModalOpen(false)}
              className="text-xs font-bold h-9 rounded-xl border-border bg-card text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewClass}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold h-9 rounded-xl gap-1.5"
            >
              <Check className="h-3.5 w-3.5" /> Schedule Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: CLASS DETAILS MODAL ───────────────────────────────── */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-foreground rounded-3xl p-6 border-border shadow-2xl">
          {selectedClassItem && (
            <>
              <DialogHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    {selectedClassItem.batchCode}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    selectedClassItem.status === "LIVE"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                  }`}>
                    {selectedClassItem.status}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-foreground">
                  {selectedClassItem.topicName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-medium">
                  {selectedClassItem.moduleName} • {selectedClassItem.branchName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 my-3 text-xs bg-muted/30 p-4 rounded-2xl border border-border">
                {/* Faculty Section */}
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Assigned Faculty Instructor
                  </span>
                  {selectedClassItem.isFacultyAssigned ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 rounded-full border border-border">
                        <AvatarImage src={selectedClassItem.facultyAvatar} />
                        <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                          {selectedClassItem.facultyName?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-bold text-foreground text-xs block">{selectedClassItem.facultyName}</span>
                        <span className="text-[11px] text-muted-foreground font-medium">{selectedClassItem.facultySpecialization}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-amber-600 dark:text-amber-300 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>No faculty assigned yet</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Timing</span>
                    <p className="font-bold text-foreground text-xs mt-0.5">{selectedClassItem.startTime} – {selectedClassItem.endTime}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedClassItem.dateLabel}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Location / Mode</span>
                    <p className="font-bold text-foreground text-xs mt-0.5">{selectedClassItem.locationOrLink}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">{selectedClassItem.mode}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Students Enrolled</span>
                    <p className="font-bold text-foreground text-xs mt-0.5 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {selectedClassItem.enrolledStudentsCount} Students
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Attendance</span>
                    <p className="font-bold text-foreground text-xs mt-0.5">
                      {selectedClassItem.attendanceMarked ? "Marked & Logged" : "Pending Session"}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="text-xs font-bold rounded-xl border-border bg-card text-foreground hover:bg-muted"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenAssignFaculty(selectedClassItem);
                  }}
                  className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Reassign Faculty
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: ASSIGN / CHANGE FACULTY MODAL ─────────────────────── */}
      <Dialog open={isAssignFacultyModalOpen} onOpenChange={setIsAssignFacultyModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-foreground rounded-3xl p-6 border-border shadow-2xl">
          {selectedClassItem && (
            <>
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-xl font-black text-foreground">
                  Assign Faculty Instructor
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-medium">
                  Select a qualified faculty member for {selectedClassItem.topicName} ({selectedClassItem.batchCode}).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 my-3 text-xs">
                <Label className="text-[11px] font-bold text-foreground">Choose Faculty Member</Label>
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {facultyMembers.map((fac: any) => {
                    const isSelected = targetFacultyId === fac.id;
                    const name = fac.user?.name || fac.employeeCode || "Faculty Member";
                    const specialization = fac.specialization || "Technical Instructor";
                    const avatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150";
                    return (
                      <div
                        key={fac.id}
                        onClick={() => setTargetFacultyId(fac.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-blue-500/15 border-[#1769AA] ring-2 ring-[#1769AA]/20"
                            : "bg-background border-border hover:border-border/80 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src={avatar} />
                            <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                              {name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-foreground text-xs block">{name}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">{specialization}</span>
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
                  onClick={() => setIsAssignFacultyModalOpen(false)}
                  className="text-xs font-bold rounded-xl border-border bg-card text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAssignFaculty}
                  className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" /> Confirm Assignment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
