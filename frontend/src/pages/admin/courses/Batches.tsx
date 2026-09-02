import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  CheckCircle2, 
  MoreVertical, 
  Trash2,
  Pencil,
  UserCheck,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBatches } from "../../../hooks/useBatches";
import type { BatchData, BatchCoursePayload } from "../../../services/batches.api";
import { useCourses } from "../../../hooks/useCourses";
import { useFacultyList } from "../../../hooks/useFaculty";
import { useBranches } from "@/hooks/useBranches";
import { batchesApi } from "@/services/batches.api";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MasterSelect } from "@/components/common/MasterSelect";
import { ClassroomDropdown } from "@/components/common/ClassroomDropdown";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { getMasterLabel, findMasterIdByLabel } from "@/utils/master.utils";
import {
  batchIncludesCourse,
  formatBatchSubjectNames,
  formatBatchInstructorsSummary,
} from "@/utils/batch.utils";
import { BatchSubjectChips } from "@/components/batches/BatchSubjectFacultyDisplay";
import {
  BatchCourseSelector,
  type BatchCourseFormRow,
} from "@/components/batches/BatchCourseSelector";
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

type SelectedCourseRow = BatchCourseFormRow;

export const Batches: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get("courseId") || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState(courseIdFromUrl || "ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    if (courseIdFromUrl && courseIdFromUrl !== courseFilter) {
      setCourseFilter(courseIdFromUrl);
    }
  }, [courseIdFromUrl]);

  const handleCourseFilterChange = (value: string) => {
    setCourseFilter(value);
    if (value === "ALL") {
      searchParams.delete("courseId");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ courseId: value });
    }
  };

  const { courses } = useCourses();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data ?? [];
  const queryClient = useQueryClient();
  const { batches, loading, createBatch, deleteBatch, refetch } = useBatches({
    search: searchTerm,
    courseId: courseFilter !== "ALL" ? courseFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const facultyList = facultyResponse?.data ?? [];

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchData | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourseRow[]>([]);
  const [facultyId, setFacultyId] = useState("");
  const [startDate, setStartDate] = useState("2026-04-01");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [schedulePattern, setSchedulePattern] = useState<"MWF" | "TTS" | "WEEKEND" | "CUSTOM">("MWF");
  const [timeSlotMasterId, setTimeSlotMasterId] = useState("");
  const [classroomMasterId, setClassroomMasterId] = useState("");
  const [batchStatus, setBatchStatus] = useState<BatchData["status"]>("UPCOMING");
  const { options: timeslotOptions } = useMasterDropdown("timeslot");
  const [capacity, setCapacity] = useState<number>(35);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 2-Step Delete Modal State
  const [batchToDelete, setBatchToDelete] = useState<{ id: string; name: string; code: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Generate sessions modal
  const [batchToGenerate, setBatchToGenerate] = useState<{
    id: string;
    name: string;
    code: string;
    facultyId?: string | null;
    startDate: string;
    expectedEndDate?: string | null;
    schedules?: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>;
  } | null>(null);
  const [generateStartDate, setGenerateStartDate] = useState("");
  const [generateEndDate, setGenerateEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const branchFacultyList = useMemo(() => {
    if (!branchId) return facultyList;
    return facultyList.filter((f) => f.branchId === branchId);
  }, [facultyList, branchId]);

  const canGenerateSessions = (batch: typeof batchToGenerate) => {
    if (!batch) return false;
    if (!batch.facultyId) return false;
    if (!batch.schedules || batch.schedules.length === 0) return false;
    return true;
  };

  const openGenerateModal = (batch: (typeof batches)[0]) => {
    const start = batch.startDate ? new Date(batch.startDate).toISOString().split("T")[0] : "";
    const end = batch.expectedEndDate
      ? new Date(batch.expectedEndDate).toISOString().split("T")[0]
      : start
        ? (() => {
            const d = new Date(start);
            d.setDate(d.getDate() + 90);
            return d.toISOString().split("T")[0];
          })()
        : "";
    setBatchToGenerate({
      id: batch.id,
      name: batch.name,
      code: batch.code,
      facultyId: batch.facultyId,
      startDate: batch.startDate,
      expectedEndDate: batch.expectedEndDate,
      schedules: batch.schedules,
    });
    setGenerateStartDate(start);
    setGenerateEndDate(end);
    setGenerateError(null);
  };

  const handleGenerateSessions = async () => {
    if (!batchToGenerate) return;
    try {
      setIsGenerating(true);
      setGenerateError(null);
      const result = await batchesApi.generateSessions(batchToGenerate.id, {
        startDate: generateStartDate || undefined,
        endDate: generateEndDate || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      await refetch();
      setSuccessMsg(
        `Generated ${(result as { data?: { created?: number } }).data?.created ?? 0} class session(s) for "${batchToGenerate.code}".`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      setBatchToGenerate(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to generate class sessions";
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredBatches = batches.filter((b) => {
    const facultyName = b.faculty?.user?.name || "";
    const subjectsLabel = formatBatchSubjectNames(b);

    const matchesSearch =
      !searchTerm ||
      (b.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      facultyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectsLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.course?.name || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse =
      courseFilter === "ALL" || batchIncludesCourse(b, courseFilter);
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const activeCount = batches.filter((b) => b.status === "ACTIVE").length;
  const upcomingCount = batches.filter((b) => b.status === "UPCOMING").length;
  const totalEnrolled = batches.reduce((acc, b) => acc + (b._count?.enrollments || 0), 0);
  const totalCapacity = batches.reduce((acc, b) => acc + (b.capacity || 35), 0);
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  useEffect(() => {
    if (editingBatch || selectedCourses.length === 0 || name.trim()) return;
    const names = selectedCourses
      .map((row) => courses.find((c) => c.id === row.courseId)?.name)
      .filter(Boolean);
    if (names.length === 1) setName(`${names[0]} Batch`);
    else if (names.length > 1) setName(`${names[0]} Full Stack Batch`);
  }, [selectedCourses, courses, editingBatch, name]);

  const resetFormFields = () => {
    setName("");
    setCode("");
    setSelectedCourses([]);
    setFacultyId("");
    setStartDate("2026-04-01");
    setSchedulePattern("MWF");
    setTimeSlotMasterId("");
    setClassroomMasterId("");
    setBatchStatus("UPCOMING");
    setCapacity(35);
    setFormError(null);
  };

  const handleOpenCreateModal = () => {
    setEditingBatch(null);
    resetFormFields();
    setShowModal(true);
  };

  const handleOpenEditModal = (batch: BatchData) => {
    setEditingBatch(batch);
    setName(batch.name || "");
    setCode(batch.code || "");
    setSelectedCourses(
      batch.batchCourses && batch.batchCourses.length > 0
        ? batch.batchCourses.map((bc) => ({
            courseId: bc.courseId,
            facultyId: bc.facultyId || bc.faculty?.id || "",
          }))
        : batch.courseId
          ? [{ courseId: batch.courseId, facultyId: batch.facultyId || batch.faculty?.id || "" }]
          : []
    );
    setFacultyId(batch.facultyId || batch.faculty?.id || "");
    setStartDate(batch.startDate ? batch.startDate.split("T")[0] : "2026-04-01");
    setSchedulePattern((batch.schedulePattern as "MWF" | "TTS" | "WEEKEND" | "CUSTOM") || "MWF");
    setTimeSlotMasterId(
      batch.timeslotMasterId || findMasterIdByLabel(timeslotOptions, batch.timeSlot) || ""
    );
    setClassroomMasterId(batch.classroomMasterId || "");
    setBatchStatus(batch.status || "UPCOMING");
    setCapacity(batch.capacity || 35);
    setFormError(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBatch(null);
    setFormError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || selectedCourses.length === 0) return;

    try {
      setSubmitting(true);
      setFormError(null);

      const coursesPayload: BatchCoursePayload[] = selectedCourses.map((row, idx) => ({
        courseId: row.courseId,
        facultyId: row.facultyId || undefined,
        sequence: idx + 1,
      }));

      const payload = {
        name,
        code,
        courseId: selectedCourses[0].courseId,
        courses: coursesPayload,
        facultyId: facultyId || undefined,
        startDate,
        expectedEndDate: expectedEndDate || undefined,
        schedulePattern,
        timeSlot: getMasterLabel(timeslotOptions, timeSlotMasterId) || undefined,
        timeslotMasterId: timeSlotMasterId || undefined,
        classroomMasterId: classroomMasterId || undefined,
        capacity,
      });

      setName("");
      setCode("");
      setBranchId("");
      setFacultyId("");
      setExpectedEndDate("");
      };

      if (editingBatch) {
        await updateBatch(editingBatch.id, {
          ...payload,
          status: batchStatus,
        });
        setSuccessMsg(`Batch "${code} - ${name}" updated successfully.`);
      } else {
        await createBatch(payload);
        setSuccessMsg(`Batch "${code} - ${name}" created successfully.`);
      }

      resetFormFields();
      setShowModal(false);
      setEditingBatch(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to save batch");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!batchToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteBatch(batchToDelete.id);
      setSuccessMsg(`Batch "${batchToDelete.code} - ${batchToDelete.name}" deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setBatchToDelete(null);
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || err.message || "Failed to delete batch.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">Active</Badge>;
      case "UPCOMING":
        return <Badge variant="warning">Upcoming</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPatternBadge = (pattern?: string) => {
    switch (pattern) {
      case "MWF":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Mon, Wed, Fri</Badge>;
      case "TTS":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Tue, Thu, Sat</Badge>;
      case "WEEKEND":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Weekend</Badge>;
      default:
        return <Badge variant="outline">{pattern || "MWF"}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Batch Management</h2>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Monitor active student cohorts, schedules, faculty allocation, and capacity limits.
          </p>
        </div>

        <Button 
          className="bg-primary hover:bg-primary/90 text-white shadow-xs transition-all text-xs font-bold h-10 px-4 rounded-xl cursor-pointer"
          onClick={() => {
            if (courses.length > 0 && !courseId) setCourseId(courses[0].id);
            if (branches.length > 0 && !branchId) setBranchId(branches[0].id);
            setCreateError(null);
            setShowModal(true);
          }}
          onClick={handleOpenCreateModal}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create New Batch
        </Button>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-xs font-bold shadow-2xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 border border-blue-100 dark:border-sky-900/40">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Batches</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{activeCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Upcoming Batches</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{upcomingCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Batch Enrolled</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{totalEnrolled} / {totalCapacity}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Avg Occupancy</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{avgOccupancy}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table & Filters */}
      <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by batch name, code, course, or instructor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 bg-muted/30 border-border text-foreground rounded-xl placeholder:text-muted-foreground focus:bg-background"
              />
            </div>

            {/* Filter Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={courseFilter}
                onChange={(e) => handleCourseFilterChange(e.target.value)}
                className="h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="ALL">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-2xs">
            {loading ? (
              <div className="py-12 flex justify-center items-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-xs font-bold">Loading batches...</span>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow className="text-xs">
                    <TableHead className="font-bold text-foreground pl-6">Batch Code & Title</TableHead>
                    <TableHead className="font-bold text-foreground">Subjects / Courses</TableHead>
                    <TableHead className="font-bold text-foreground">Instructors</TableHead>
                    <TableHead className="font-bold text-foreground">Schedule Pattern</TableHead>
                    <TableHead className="font-bold text-foreground">Start Date</TableHead>
                    <TableHead className="font-bold text-foreground">Occupancy</TableHead>
                    <TableHead className="font-bold text-foreground">Status</TableHead>
                    <TableHead className="text-right font-bold text-foreground pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.length > 0 ? (
                    filteredBatches.map((batch) => {
                      const enrolledCount = batch._count?.enrollments || 0;
                      const maxCapacity = batch.capacity || 35;
                      const occupancyPercent = Math.round((enrolledCount / maxCapacity) * 100);
                      const formattedDate = batch.startDate ? new Date(batch.startDate).toISOString().split("T")[0] : "-";
                      const instructorSummary = formatBatchInstructorsSummary(batch);

                      return (
                        <TableRow key={batch.id} className="hover:bg-muted/40 transition-colors border-b border-border/70 text-xs">
                          <TableCell className="pl-6 py-3.5">
                            <div>
                              <span className="font-mono text-xs font-bold text-primary block">
                                {batch.code}
                              </span>
                              <span className="font-bold text-foreground text-sm">
                                {batch.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-foreground font-medium py-3.5">
                            <BatchSubjectChips batch={batch} maxVisible={2} />
                            {(batch.batchCourses?.length ?? 0) <= 1 && (
                              <span className="block text-[10px] text-muted-foreground mt-1 truncate">
                                {formatBatchSubjectNames(batch)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-foreground py-3.5">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-semibold">{instructorSummary}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="space-y-1">
                              {getPatternBadge(batch.schedulePattern)}
                              <span className="block text-[11px] font-mono text-muted-foreground">
                                {batch.timeSlot || "10:00 AM - 12:00 PM"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-foreground py-3.5">
                            {formattedDate}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="w-32 space-y-1">
                              <div className="flex justify-between text-[11px] font-bold text-foreground">
                                <span>{enrolledCount} / {maxCapacity}</span>
                                <span>{occupancyPercent}%</span>
                              </div>
                              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${occupancyPercent >= 90 ? "bg-amber-500" : "bg-primary"}`}
                                  style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">{getStatusBadge(batch.status)}</TableCell>
                          <TableCell className="text-right pr-6 py-3.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-card border-border shadow-lg rounded-xl text-foreground">
                                <DropdownMenuLabel className="text-xs font-bold">Batch Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border" />
                                <DropdownMenuItem asChild className="cursor-pointer text-xs font-bold">
                                  <Link to={`${ROUTES.ADMIN.BATCHES.ALL}/${batch.id}`}>View Details</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer text-xs font-bold"
                                  disabled={!canGenerateSessions({
                                    id: batch.id,
                                    name: batch.name,
                                    code: batch.code,
                                    facultyId: batch.facultyId,
                                    startDate: batch.startDate,
                                    expectedEndDate: batch.expectedEndDate,
                                    schedules: batch.schedules,
                                  })}
                                  onClick={() => openGenerateModal(batch)}
                                >
                                  <Sparkles className="mr-2 h-4 w-4" /> Generate Class Sessions
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border" />
                                <DropdownMenuItem
                                  className="cursor-pointer text-xs font-bold"
                                  onClick={() => handleOpenEditModal(batch)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" /> Edit Batch
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-rose-500 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer text-xs font-bold"
                                  onClick={() => {
                                    setDeleteError(null);
                                    setBatchToDelete({
                                      id: batch.id,
                                      name: batch.name,
                                      code: batch.code,
                                    });
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Batch
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-xs font-medium">
                        No batches found matching criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog for Creating / Editing Batch */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl text-foreground overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] my-auto">
            {/* Modal Header */}
            <div className="shrink-0 bg-muted/30 border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {editingBatch ? <Pencil className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {editingBatch ? "Edit Batch" : "Create New Batch"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {editingBatch
                      ? "Update cohort schedule, classroom, faculty, and capacity"
                      : "Set up cohort schedule, allocate classroom, and assign faculty"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Branch / Center *</label>
                <select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setFacultyId("");
                  }}
                  className="w-full h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  required
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Assigned Instructor</label>
                <select
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  disabled={!branchId}
                >
                  <option value="">{branchId ? "Unassigned" : "Select branch first"}</option>
                  {branchFacultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user?.name || (f as any).name} ({f.employeeCode || (f as any).facultyCode})
                    </option>
                  ))}
                </select>
              </div>
            <form onSubmit={handleFormSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <BatchCourseSelector
                  courses={courses}
                  facultyList={facultyList}
                  selectedCourses={selectedCourses}
                  onChange={setSelectedCourses}
                  defaultFacultyId={facultyId}
                />

                {/* Batch Name & Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Batch Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. MERN Cohort 3"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-10 bg-slate-50/80 dark:bg-slate-900/60 border-border text-foreground focus:bg-background rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Batch Code <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. FS-2026-C1"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      className="h-10 bg-slate-50/80 dark:bg-slate-900/60 border-border text-foreground focus:bg-background rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Assigned Instructor & Capacity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Batch Coordinator <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <select
                      value={facultyId}
                      onChange={(e) => setFacultyId(e.target.value)}
                      className="w-full h-10 px-3 py-2 bg-slate-50/80 dark:bg-slate-900/60 border border-border rounded-xl text-xs font-medium text-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {facultyList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.user?.name || (f as any).name} ({f.employeeCode || (f as any).facultyCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Max Capacity
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      className="h-10 bg-slate-50/80 dark:bg-slate-900/60 border-border text-foreground focus:bg-background rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Schedule Pattern & Start Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Schedule Pattern
                    </label>
                    <select
                      value={schedulePattern}
                      onChange={(e) => setSchedulePattern(e.target.value as any)}
                      className="w-full h-10 px-3 py-2 bg-slate-50/80 dark:bg-slate-900/60 border border-border rounded-xl text-xs font-medium text-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="MWF">Mon, Wed, Fri (MWF)</option>
                      <option value="TTS">Tue, Thu, Sat (TTS)</option>
                      <option value="WEEKEND">Weekend (Sat, Sun)</option>
                      <option value="CUSTOM">Custom Schedule</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10 bg-slate-50/80 dark:bg-slate-900/60 border-border text-foreground focus:bg-background rounded-xl text-xs"
                    />
                  </div>
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Start Date *</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Expected End Date</label>
                  <Input
                    type="date"
                    value={expectedEndDate}
                    onChange={(e) => setExpectedEndDate(e.target.value)}
                    min={startDate}
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                {/* Time Slot & Classroom with Master Quick-Add */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Time Slot
                    </label>
                    <MasterSelect
                      entityType="timeslot"
                      value={timeSlotMasterId}
                      onChange={setTimeSlotMasterId}
                      placeholder="Select time slot"
                      className="mt-0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Classroom / Lab
                    </label>
                    <ClassroomDropdown
                      value={classroomMasterId}
                      onChange={setClassroomMasterId}
                      placeholder="Select classroom"
                      className="mt-0"
                    />
                  </div>
                </div>

                {editingBatch && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Batch Status
                    </label>
                    <select
                      value={batchStatus}
                      onChange={(e) => setBatchStatus(e.target.value as BatchData["status"])}
                      className="w-full h-10 px-3 py-2 bg-slate-50/80 dark:bg-slate-900/60 border border-border rounded-xl text-xs font-medium text-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="UPCOMING">Upcoming</option>
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="shrink-0 bg-muted/20 border-t border-border px-6 py-4 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="rounded-xl border-border bg-background text-foreground hover:bg-muted text-xs font-semibold px-4 h-9 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold px-5 h-9 shadow-sm shadow-primary/25 cursor-pointer flex items-center gap-1.5"
                  disabled={submitting || selectedCourses.length === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      Saving...
                    </>
                  ) : editingBatch ? (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Save Batch
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Class Sessions Modal */}
      {batchToGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-foreground">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Class Sessions
            </h3>
            <p className="text-xs text-muted-foreground">
              Create class sessions from the weekly schedule for{" "}
              <span className="font-bold text-foreground">{batchToGenerate.code} – {batchToGenerate.name}</span>.
            </p>

            {!canGenerateSessions(batchToGenerate) && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                {!batchToGenerate.facultyId
                  ? "Assign faculty to this batch before generating sessions."
                  : "No weekly schedule slots found. Create the batch with a schedule pattern first."}
              </div>
            )}

            {generateError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {generateError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">From Date</label>
                <Input
                  type="date"
                  value={generateStartDate}
                  onChange={(e) => setGenerateStartDate(e.target.value)}
                  className="bg-muted/30 border-border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">To Date</label>
                <Input
                  type="date"
                  value={generateEndDate}
                  onChange={(e) => setGenerateEndDate(e.target.value)}
                  min={generateStartDate}
                  className="bg-muted/30 border-border rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBatchToGenerate(null)}
                disabled={isGenerating}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleGenerateSessions}
                disabled={isGenerating || !canGenerateSessions(batchToGenerate)}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Sessions"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2-STEP DELETE CONFIRMATION MODAL ───────────────────────── */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-foreground animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-full bg-rose-500/10 text-rose-500 shrink-0 border border-rose-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                  Delete Batch
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to permanently delete{" "}
                  <span className="font-bold text-foreground">
                    {batchToDelete.code} – {batchToDelete.name}
                  </span>
                  ?
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 space-y-1">
              <p className="font-bold text-amber-600 dark:text-amber-300">⚠️ Consequences of this action:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                <li>Student enrollments linked to this batch will be detached.</li>
                <li>Scheduled classes & timetable sessions will be removed.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!isDeleting) setBatchToDelete(null);
                }}
                disabled={isDeleting}
                className="text-xs font-bold h-9 px-4 rounded-xl border-border bg-card text-foreground hover:bg-muted/40 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 px-4 rounded-xl gap-2 shadow-xs transition-all cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Yes, Delete Batch
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
