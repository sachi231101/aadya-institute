import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  GraduationCap,
  Search,
  UserPlus,
  UserCheck,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Clock,
  Filter,
  X,
  ArrowRight,
  Trash2,
  Calendar,
  AlertTriangle,
  Users,
  Plus,
  RefreshCw,
  MoreVertical,
  ChevronRight,
  Info,
  Building2,
  BookOpen
} from "lucide-react";
import { useBranches } from "@/hooks/useBranches";
import { useStudentAllocation } from "@/hooks/useStudentAllocation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CourseChips } from "@/components/common/CourseChips";
import { coursesFromStudent, formatPackageCourseLabel } from "@/utils/admission-package.utils";
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
import { formatBatchSubjectNames, getBatchCourseRows } from "@/utils/batch.utils";

export const StudentAllocation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialBatchId = searchParams.get("batchId") ?? "";

  const {
    batches,
    students,
    enrolledMap,
    loadingBatches,
    loadingStudents,
    invalidateAllocation,
    assignStudentsToBatch,
    transferStudent,
    removeStudentFromBatch,
  } = useStudentAllocation();

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "UNASSIGNED" | "ASSIGNED">("ALL");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("ALL");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("ALL");

  // Selected Target Batch for the assignment workspace (inside right panel)
  const [selectedTargetBatchId, setSelectedTargetBatchId] = useState<string>("");

  // Staged / Selected Students for Batch Assignment (Checkboxes in Left Panel)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Action Loading & Notifications
  const [isAssigning, setIsAssigning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [transferModalStudent, setTransferModalStudent] = useState<{
    id: string;
    name: string;
    code: string;
    currentBatchId: string;
    currentBatchCode: string;
  } | null>(null);
  const [transferTargetBatchId, setTransferTargetBatchId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  const [removeModalStudent, setRemoveModalStudent] = useState<{
    id: string;
    name: string;
    batchId: string;
    batchCode: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // 3. Fetch Branches
  const { data: branchesRes } = useBranches({ limit: 50 });
  const branches = branchesRes?.data || [];

  // Pre-select batch from URL deep-link
  useEffect(() => {
    if (initialBatchId && batches.some((b) => b.id === initialBatchId)) {
      setSelectedTargetBatchId(initialBatchId);
    }
  }, [initialBatchId, batches]);

  // Default target batch selection
  const targetBatch = useMemo(() => {
    if (selectedTargetBatchId) {
      return batches.find((b) => b.id === selectedTargetBatchId) || batches[0] || null;
    }
    return batches[0] || null;
  }, [batches, selectedTargetBatchId]);

  // Unique Courses for filter
  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.qualification) set.add(s.qualification);
      if (s.courseName) {
        s.courseName.split(",").forEach((part) => {
          const name = part.replace(/\+\d+\s*$/, "").trim();
          if (name) set.add(name);
        });
      }
      (s.courses || []).forEach((c) => {
        if (c.name) set.add(c.name);
      });
    });
    batches.forEach((b) => {
      getBatchCourseRows(b).forEach((row) => {
        if (row.course?.name) set.add(row.course.name);
      });
    });
    return Array.from(set);
  }, [students, batches]);

  // Counts & KPIs
  const totalStudentsCount = students.length;
  const enrolledStudentsCount = useMemo(() => {
    return students.filter((s) => enrolledMap.has(s.id)).length;
  }, [students, enrolledMap]);
  const unassignedStudentsCount = totalStudentsCount - enrolledStudentsCount;
  const activeBatchesCount = batches.filter((b) => b.status === "ACTIVE" || !b.status || b.status === "UPCOMING").length;

  // Filtered Students List for Left Panel
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const term = searchTerm.toLowerCase();
      const studentName = s.user?.name || "";
      const studentEmail = s.user?.email || "";
      const studentPhone = s.user?.phone || "";
      const isEnrolled = enrolledMap.has(s.id);
      const enrolledBatch = enrolledMap.get(s.id);

      const packageCourses = coursesFromStudent(s);
      const packageLabel = formatPackageCourseLabel(packageCourses, s.courseName || "");

      const matchesSearch =
        !searchTerm ||
        studentName.toLowerCase().includes(term) ||
        s.studentCode.toLowerCase().includes(term) ||
        studentEmail.toLowerCase().includes(term) ||
        studentPhone.toLowerCase().includes(term) ||
        (s.qualification && s.qualification.toLowerCase().includes(term)) ||
        packageLabel.toLowerCase().includes(term) ||
        packageCourses.some((c) => c.name.toLowerCase().includes(term));

      const matchesTab =
        activeTab === "ALL" ||
        (activeTab === "ASSIGNED" && isEnrolled) ||
        (activeTab === "UNASSIGNED" && !isEnrolled);

      const matchesCourse =
        selectedCourseFilter === "ALL" ||
        (s.qualification && s.qualification === selectedCourseFilter) ||
        (enrolledBatch && enrolledBatch.courseName === selectedCourseFilter) ||
        packageCourses.some((c) => c.name === selectedCourseFilter) ||
        (s.courseName && s.courseName.includes(selectedCourseFilter));

      const matchesBranch =
        selectedBranchFilter === "ALL" ||
        s.branchId === selectedBranchFilter ||
        (s.branch?.name && s.branch.name.includes(selectedBranchFilter));

      return matchesSearch && matchesTab && matchesCourse && matchesBranch;
    });
  }, [students, searchTerm, activeTab, selectedCourseFilter, selectedBranchFilter, enrolledMap]);

  // Selected Student Objects for Right Panel Review
  const selectedStudentsList = useMemo(() => {
    return students.filter((s) => selectedStudentIds.has(s.id));
  }, [students, selectedStudentIds]);

  // Target Batch Capacity calculations
  const targetBatchCapacity = targetBatch?.capacity || 30;
  const targetBatchAlreadyAssigned = targetBatch?.enrollments?.length || 0;
  const targetBatchAvailableSeats = Math.max(0, targetBatchCapacity - targetBatchAlreadyAssigned);
  const seatsRemainingAfterAssignment = targetBatchAvailableSeats - selectedStudentIds.size;
  const isCapacityExceeded = selectedStudentIds.size > targetBatchAvailableSeats;

  // ─── HANDLERS ─────────────────────────────────────────────────────────────

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      const next = new Set<string>();
      filteredStudents.forEach((s) => next.add(s.id));
      setSelectedStudentIds(next);
    }
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  // Bulk Assign Confirmation & Execution
  const handleConfirmBulkAssign = async () => {
    if (!targetBatch || selectedStudentIds.size === 0) return;
    setIsAssigning(true);
    setActionError(null);

    try {
      const studentIdsArray = Array.from(selectedStudentIds);
      await assignStudentsToBatch(targetBatch.id, studentIdsArray, enrolledMap);
      await invalidateAllocation();
      setSuccessMsg(`Successfully assigned ${studentIdsArray.length} students to ${targetBatch.code} (${targetBatch.name}).`);
      setTimeout(() => setSuccessMsg(null), 4500);
      setSelectedStudentIds(new Set());
      setShowConfirmModal(false);
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || "Failed to complete batch assignment.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Transfer Student Execution
  const handleExecuteTransfer = async () => {
    if (!transferModalStudent || !transferTargetBatchId) return;
    setIsTransferring(true);
    setActionError(null);

    try {
      await transferStudent(
        transferModalStudent.id,
        transferModalStudent.currentBatchId,
        transferTargetBatchId
      );

      const targetB = batches.find((b) => b.id === transferTargetBatchId);
      await invalidateAllocation();

      setSuccessMsg(`Successfully transferred ${transferModalStudent.name} to ${targetB?.code || "new batch"}.`);
      setTimeout(() => setSuccessMsg(null), 4500);
      setTransferModalStudent(null);
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || "Failed to transfer student.");
    } finally {
      setIsTransferring(false);
    }
  };

  // Remove Student Execution
  const handleExecuteRemove = async () => {
    if (!removeModalStudent) return;
    setIsRemoving(true);
    setActionError(null);

    try {
      await removeStudentFromBatch(removeModalStudent.batchId, removeModalStudent.id);
      await invalidateAllocation();

      setSuccessMsg(`Removed ${removeModalStudent.name} from batch ${removeModalStudent.batchCode}.`);
      setTimeout(() => setSuccessMsg(null), 4500);
      setRemoveModalStudent(null);
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || "Failed to remove student from batch.");
    } finally {
      setIsRemoving(false);
    }
  };

  // Avatar Initials Helper
  const getInitials = (name?: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Color generator for avatars
  const getAvatarColor = (name?: string) => {
    const colors = [
      "bg-indigo-100 text-indigo-700",
      "bg-emerald-100 text-emerald-700",
      "bg-amber-100 text-amber-700",
      "bg-purple-100 text-purple-700",
      "bg-rose-100 text-rose-700",
      "bg-blue-100 text-blue-700",
    ];
    let hash = 0;
    const str = name || "student";
    for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
    return colors[hash % colors.length];
  };

  return (
    <div className="p-6 md:p-8 max-w-[1680px] mx-auto space-y-6 bg-[#f8fafc] min-h-screen">
      {/* ─── BREADCRUMB & HEADER ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Dashboard</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Counsellor</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[#1769AA] font-bold">Assign Students to Batches</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              Assign Students to Batches
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              Assign enrolled students to the correct batch and manage existing batch allocations.
            </p>
          </div>

          <Button
            onClick={() => {
              setActiveTab("UNASSIGNED");
              const el = document.getElementById("student-selection-workspace");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-black h-10 px-5 rounded-xl shadow-md gap-2 shrink-0 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            + Assign Students
          </Button>
        </div>
      </div>

      {/* ─── NOTIFICATIONS ─── */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-bold shadow-2xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs font-bold shadow-2xs animate-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* ─── 4 SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#1769AA] shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">{totalStudentsCount}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Registered students</p>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Students */}
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Students</p>
              <h3 className="text-xl font-black text-emerald-600 mt-0.5">{enrolledStudentsCount}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Currently in batches</p>
            </div>
          </CardContent>
        </Card>

        {/* Unassigned Students */}
        <Card className={`border shadow-xs bg-white rounded-2xl ${unassignedStudentsCount > 0 ? "border-amber-200 ring-1 ring-amber-200" : "border-slate-200/80"}`}>
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Unassigned Students</p>
              <h3 className="text-xl font-black text-amber-600 mt-0.5">{unassignedStudentsCount}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Require batch assignment</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Batches */}
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Batches</p>
              <h3 className="text-xl font-black text-indigo-600 mt-0.5">{activeBatchesCount}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Available for assignment</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── MAIN TWO-PANEL WORKSPACE ─── */}
      <div id="student-selection-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ─── LEFT PANEL: (1) SELECT STUDENTS ─── */}
        <Card className="lg:col-span-7 border border-slate-200/80 shadow-xs bg-white rounded-2xl flex flex-col justify-between overflow-hidden">
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-full bg-[#1769AA] text-white flex items-center justify-center text-xs font-black shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select Students</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Search and select students to assign to this batch</p>
                </div>
              </div>

              {/* Tabs: All / Unassigned / Assigned */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-bold">
                <button
                  onClick={() => setActiveTab("ALL")}
                  className={`px-3 py-1 rounded-lg transition-all ${activeTab === "ALL" ? "bg-white text-[#1769AA] shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  All ({totalStudentsCount})
                </button>
                <button
                  onClick={() => setActiveTab("UNASSIGNED")}
                  className={`px-3 py-1 rounded-lg transition-all ${activeTab === "UNASSIGNED" ? "bg-amber-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Unassigned ({unassignedStudentsCount})
                </button>
                <button
                  onClick={() => setActiveTab("ASSIGNED")}
                  className={`px-3 py-1 rounded-lg transition-all ${activeTab === "ASSIGNED" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Assigned ({enrolledStudentsCount})
                </button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone or student ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9.5 pl-9 bg-muted/30 border-border text-foreground text-xs font-medium rounded-xl focus:bg-background"
                />
              </div>

              <div className="relative min-w-[140px]">
                <select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  className="w-full h-9.5 pl-3 pr-7 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-1 focus:ring-primary focus:bg-background outline-none cursor-pointer"
                >
                  <option value="ALL">All Courses</option>
                  {uniqueCourses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span>{filteredStudents.length} Students found</span>
              {selectedStudentIds.size > 0 && (
                <span className="text-[#1769AA] font-black">{selectedStudentIds.size} Selected</span>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-100">
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                      onChange={handleSelectAllVisible}
                      className="rounded border-slate-300 text-[#1769AA] focus:ring-[#1769AA] h-4 w-4 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="min-w-[180px] text-[10px] font-bold uppercase text-slate-500">Student</TableHead>
                  <TableHead className="min-w-[180px] text-[10px] font-bold uppercase text-slate-500">Contact</TableHead>
                  <TableHead className="min-w-[140px] text-[10px] font-bold uppercase text-slate-500">Course</TableHead>
                  <TableHead className="min-w-[120px] text-[10px] font-bold uppercase text-slate-500 text-center">Status</TableHead>
                  {activeTab === "ASSIGNED" && (
                    <TableHead className="min-w-[120px] text-[10px] font-bold uppercase text-slate-500 text-right pr-4">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {loadingStudents ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1769AA] mb-2" />
                      Loading student directory...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs font-medium">
                      No students found matching current criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const isSelected = selectedStudentIds.has(student.id);
                    const isEnrolled = enrolledMap.has(student.id);
                    const enrolledBatch = enrolledMap.get(student.id);
                    const name = student.user?.name || "Student";
                    const email = student.user?.email || "—";
                    const phone = student.user?.phone || "—";
                    const packageCourses = coursesFromStudent(student);
                    const courseDisplay =
                      formatPackageCourseLabel(packageCourses, student.courseName || "") ||
                      enrolledBatch?.courseName ||
                      student.qualification ||
                      "—";

                    return (
                      <TableRow
                        key={student.id}
                        onClick={() => handleToggleStudent(student.id)}
                        className={`cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? "bg-blue-50/40" : ""
                          }`}
                      >
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleStudent(student.id)}
                            className="rounded border-slate-300 text-[#1769AA] focus:ring-[#1769AA] h-4 w-4 cursor-pointer"
                          />
                        </TableCell>

                        {/* Student with Avatar */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${getAvatarColor(name)}`}>
                              {getInitials(name)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{name}</div>
                              <div className="text-[11px] font-mono text-slate-400">{student.studentCode}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact */}
                        <TableCell className="text-xs">
                          <div className="font-medium text-slate-800 font-mono text-[11px]">{phone}</div>
                          <div className="text-slate-400 text-[11px]">{email}</div>
                        </TableCell>

                        {/* Course */}
                        <TableCell className="text-xs font-bold text-slate-700 max-w-[200px]">
                          <CourseChips
                            courses={packageCourses}
                            fallback={courseDisplay}
                            maxVisible={3}
                          />
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          {isEnrolled && enrolledBatch ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black">
                              Enrolled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black">
                              Admitted
                            </Badge>
                          )}
                        </TableCell>

                        {/* Actions for Assigned Tab */}
                        {activeTab === "ASSIGNED" && (
                          <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-xs font-semibold">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setTransferModalStudent({
                                      id: student.id,
                                      name,
                                      code: student.studentCode,
                                      currentBatchId: enrolledBatch?.batchId || "",
                                      currentBatchCode: enrolledBatch?.batchCode || "—",
                                    });
                                    setTransferTargetBatchId(batches.find((b) => b.id !== enrolledBatch?.batchId)?.id || "");
                                  }}
                                  className="cursor-pointer text-[#1769AA]"
                                >
                                  <RefreshCw className="mr-2 h-3.5 w-3.5" /> Transfer Batch
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setRemoveModalStudent({
                                      id: student.id,
                                      name,
                                      batchId: enrolledBatch?.batchId || "",
                                      batchCode: enrolledBatch?.batchCode || "—",
                                    });
                                  }}
                                  className="cursor-pointer text-rose-600 focus:text-rose-700"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove From Batch
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Bottom Bar */}
          <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-[#1769AA]">
              {selectedStudentIds.size} students selected
            </span>
            {selectedStudentIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                className="text-xs font-bold h-7.5 px-3 rounded-lg border-slate-200 hover:bg-white text-slate-600"
              >
                Clear Selection
              </Button>
            )}
          </div>
        </Card>

        {/* ─── RIGHT PANEL: (2) ASSIGN TO BATCH (WITH PROMINENT BATCH DROPDOWN) ─── */}
        <Card className="lg:col-span-5 border border-slate-200/80 shadow-xs bg-white rounded-2xl flex flex-col justify-between overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-[#1769AA] text-white flex items-center justify-center text-xs font-black shrink-0">
                2
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assign to Batch</h3>
                <p className="text-[11px] text-slate-400 font-medium">Select target batch & review students</p>
              </div>
            </div>

            {selectedStudentIds.size > 0 && (
              <button
                onClick={handleClearSelection}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove All
              </button>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* ─── PROMINENT TARGET BATCH SELECTOR DROPDOWN ─── */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[#1769AA]" />
                  SELECT TARGET BATCH *
                </span>
                <span className="text-[11px] font-bold text-[#1769AA]">
                  {batches.length} Batches Available
                </span>
              </label>

              <div className="relative">
                <select
                  value={selectedTargetBatchId || (targetBatch?.id ?? "")}
                  onChange={(e) => setSelectedTargetBatchId(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-8 text-xs font-black text-slate-900 bg-blue-50/40 border-2 border-[#1769AA]/40 hover:border-[#1769AA] rounded-xl focus:ring-2 focus:ring-[#1769AA]/30 focus:border-[#1769AA] outline-none transition-all cursor-pointer shadow-xs"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id} className="font-medium text-slate-800">
                      {b.code} — {b.name} ({formatBatchSubjectNames(b)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ─── TARGET BATCH SUMMARY CARD ─── */}
            {targetBatch && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-foreground">{targetBatch.name}</h4>
                    <span className="text-[11px] font-bold font-mono text-primary">{targetBatch.code}</span>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                    {formatBatchSubjectNames(targetBatch)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-muted-foreground pt-1 border-t border-border/60">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{targetBatch.branch?.name || "Aadya Central Branch"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{targetBatch.timeSlot || "10:00 AM - 12:00 PM"}</span>
                  </div>
                </div>

                {/* Capacity Visual Progress */}
                <div className="pt-2 border-t border-border/60 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground">
                      Students: <strong className="text-foreground">{targetBatchAlreadyAssigned} / {targetBatchCapacity}</strong>
                    </span>
                    <span className={targetBatchAvailableSeats <= 0 ? "text-rose-500 font-black" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                      {targetBatchAvailableSeats} Seats Available
                    </span>
                  </div>
                  <div className="w-full bg-muted/50 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${targetBatchAlreadyAssigned >= targetBatchCapacity ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                      style={{ width: `${Math.min(100, (targetBatchAlreadyAssigned / (targetBatchCapacity || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Selected Students Preview List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>Selected Students ({selectedStudentsList.length})</span>
                {selectedStudentsList.length > 0 && (
                  <span className="text-primary font-bold">Ready to assign</span>
                )}
              </div>

              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                {selectedStudentsList.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs font-medium space-y-1 bg-muted/20 rounded-xl border border-dashed border-border">
                    <Users className="h-6 w-6 mx-auto text-muted-foreground/60" />
                    <p>No students selected yet.</p>
                    <p className="text-[10px] text-muted-foreground">Select checkboxes from the directory on the left.</p>
                  </div>
                ) : (
                  selectedStudentsList.map((stu) => {
                    const name = stu.user?.name || "Student";
                    const phone = stu.user?.phone || "—";
                    const email = stu.user?.email || "—";
                    const qualification = stu.qualification || "—";

                    return (
                      <div
                        key={stu.id}
                        className="p-2 px-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${getAvatarColor(name)}`}>
                            {getInitials(name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate text-[11px]">{name}</div>
                            <div className="text-[9px] font-mono text-muted-foreground">{stu.studentCode}</div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-[10px] font-bold text-foreground">{phone}</div>
                          <div className="text-[9px] text-muted-foreground truncate max-w-[100px]">{email}</div>
                        </div>

                        <button
                          onClick={() => handleToggleStudent(stu.id)}
                          className="p-1 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-muted/40 transition-colors shrink-0"
                          title="Remove from selection"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Assignment Summary Box */}
          <div className="p-4 bg-muted/30 border-t border-border space-y-3">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Assignment Summary</h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-[10px] text-muted-foreground font-bold block flex items-center gap-1">
                  <Users className="h-3 w-3" /> Selected
                </span>
                <span className="text-base font-black text-foreground">{selectedStudentIds.size}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Capacity
                </span>
                <span className="text-base font-black text-slate-900">{targetBatchCapacity}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                  <Check className="h-3 w-3" /> Assigned
                </span>
                <span className="text-base font-black text-slate-900">{targetBatchAlreadyAssigned}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isCapacityExceeded ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white border-slate-200/80"}`}>
                <span className="text-[10px] font-bold block flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Seats Left
                </span>
                <span className={`text-base font-black ${isCapacityExceeded ? "text-rose-600" : "text-emerald-700"}`}>
                  {seatsRemainingAfterAssignment}
                </span>
              </div>
            </div>

            {isCapacityExceeded && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>⚠ Batch capacity will be exceeded by {selectedStudentIds.size - targetBatchAvailableSeats} students.</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ─── STICKY BOTTOM CONFIRMATION BAR ─── */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Info className="h-4 w-4 text-[#1769AA] shrink-0" />
          <span>Once assigned, students will be added to this batch and will be visible in the batch student list and attendance.</span>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <Button
            variant="outline"
            onClick={handleClearSelection}
            disabled={selectedStudentIds.size === 0 || isAssigning}
            className="text-xs font-bold h-9.5 px-4 rounded-xl border-slate-200"
          >
            Cancel
          </Button>

          <Button
            onClick={() => setShowConfirmModal(true)}
            disabled={selectedStudentIds.size === 0 || isCapacityExceeded || isAssigning || !targetBatch}
            className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-black h-9.5 px-5 rounded-xl shadow-md gap-2 transition-all hover:scale-[1.02]"
          >
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                Assign {selectedStudentIds.size} Students to {targetBatch?.code || "Batch"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── CONFIRM BULK ASSIGN MODAL ─── */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#1769AA]" />
              Confirm Batch Assignment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Assign <strong className="text-slate-900">{selectedStudentIds.size} selected students</strong> to cohort{" "}
              <strong className="text-slate-900">{targetBatch?.code} – {targetBatch?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            {selectedStudentsList.map((s) => (
              <div key={s.id} className="flex justify-between font-medium text-slate-700">
                <span>{s.user?.name || s.studentCode}</span>
                <span className="font-mono text-slate-400">{s.studentCode}</span>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isAssigning}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBulkAssign}
              disabled={isAssigning}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl gap-1.5"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Confirm Assignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── TRANSFER STUDENT MODAL ─── */}
      <Dialog open={!!transferModalStudent} onOpenChange={() => setTransferModalStudent(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-[#1769AA]" />
              Transfer Student Batch
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Move <strong>{transferModalStudent?.name}</strong> ({transferModalStudent?.code}) to another active cohort.
            </DialogDescription>
          </DialogHeader>

          {transferModalStudent && (
            <div className="space-y-4 text-xs pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Batch</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {transferModalStudent.currentBatchCode}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Transfer To:</label>
                <select
                  value={transferTargetBatchId}
                  onChange={(e) => setTransferTargetBatchId(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1769AA]/30"
                >
                  {batches
                    .filter((b) => b.id !== transferModalStudent.currentBatchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} – {b.name} ({formatBatchSubjectNames(b)})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              variant="outline"
              onClick={() => setTransferModalStudent(null)}
              disabled={isTransferring}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteTransfer}
              disabled={isTransferring || !transferTargetBatchId}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl gap-1.5"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                "Confirm Transfer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── REMOVE STUDENT FROM BATCH MODAL ─── */}
      <Dialog open={!!removeModalStudent} onOpenChange={() => setRemoveModalStudent(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Remove Student from Batch
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to remove <strong>{removeModalStudent?.name}</strong> from cohort{" "}
              <strong>{removeModalStudent?.batchCode}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
            <p className="font-bold">⚠️ Important consequences:</p>
            <p>Student will be set to Unassigned and detached from future attendance and schedules for this batch.</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setRemoveModalStudent(null)}
              disabled={isRemoving}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteRemove}
              disabled={isRemoving}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl gap-1.5"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Confirm Removal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
