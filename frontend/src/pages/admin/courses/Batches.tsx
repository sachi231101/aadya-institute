import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
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
  Loader2,
  AlertTriangle,
  Sparkles,
  X,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBatches } from "../../../hooks/useBatches";
import type { BatchData, ScheduleLinePayload } from "../../../services/batches.api";
import { useCourses } from "../../../hooks/useCourses";
import { useFacultyList } from "../../../hooks/useFaculty";
import { batchesApi } from "@/services/batches.api";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { getMasterLabel, findMasterIdByLabel, getTimeslotTimes } from "@/utils/master.utils";
import {
  batchIncludesCourse,
  formatBatchSubjectNames,
  formatBatchScheduleTitle,
} from "@/utils/batch.utils";
import {
  BatchScheduleLinesEditor,
  createEmptyScheduleLine,
  newLineKey,
  type ScheduleLineFormRow,
} from "@/components/batches/BatchScheduleLinesEditor";
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

export const Batches: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get("courseId") || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState(courseIdFromUrl || "ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
  const queryClient = useQueryClient();
  const { batches, loading, createBatch, updateBatch, deleteBatch, refetch } = useBatches({
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
  const [scheduleLines, setScheduleLines] = useState<ScheduleLineFormRow[]>([]);
  const [facultyId, setFacultyId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [remark, setRemark] = useState("");
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

  const canGenerateSessions = (batch: {
    facultyId?: string | null;
    schedules?: Array<{ id: string }>;
    batchCourses?: Array<{ facultyId?: string | null }>;
  } | null) => {
    if (!batch) return false;
    const hasFaculty =
      Boolean(batch.facultyId) ||
      Boolean(batch.batchCourses?.some((bc) => bc.facultyId));
    if (!hasFaculty) return false;
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
    if (editingBatch || scheduleLines.length === 0 || name.trim()) return;
    const courseIds = [...new Set(scheduleLines.map((l) => l.courseId).filter(Boolean))];
    const names = courseIds
      .map((id) => courses.find((c) => c.id === id)?.name)
      .filter(Boolean);
    if (names.length === 1) setName(`${names[0]} Batch`);
    else if (names.length > 1) setName(`${names[0]} Full Stack Batch`);
  }, [scheduleLines, courses, editingBatch, name]);

  const resetFormFields = () => {
    setName("");
    setCode("");
    setScheduleLines([]);
    setFacultyId("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setExpectedEndDate("");
    setRemark("");
    setBatchStatus("UPCOMING");
    setCapacity(35);
    setFormError(null);
  };

  const handleOpenCreateModal = () => {
    setEditingBatch(null);
    resetFormFields();
    setScheduleLines([createEmptyScheduleLine()]);
    setShowModal(true);
  };

  const handleOpenEditModal = (batch: BatchData) => {
    setEditingBatch(batch);
    setName(batch.name || "");
    setCode(batch.code || "");
    setStartDate(batch.startDate ? batch.startDate.split("T")[0] : new Date().toISOString().slice(0, 10));
    setExpectedEndDate(batch.expectedEndDate ? batch.expectedEndDate.split("T")[0] : "");
    setRemark(batch.remark || "");
    setFacultyId(batch.facultyId || batch.faculty?.id || "");
    setBatchStatus(batch.status || "UPCOMING");
    setCapacity(batch.capacity || 35);

    if (batch.schedules && batch.schedules.length > 0) {
      setScheduleLines(
        batch.schedules.map((s) => ({
          key: newLineKey(),
          courseId:
            s.batchCourse?.courseId ||
            batch.batchCourses?.find((bc) => bc.id === s.batchCourseId)?.courseId ||
            batch.courseId ||
            "",
          dayOfWeek: s.dayOfWeek,
          timeslotMasterId:
            s.timeslotMasterId ||
            findMasterIdByLabel(timeslotOptions, `${s.startTime} - ${s.endTime}`) ||
            "",
          classroomMasterId: s.classroomMasterId || "",
          facultyId: s.facultyId || s.faculty?.id || "",
          status: (s.status === "INACTIVE" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE",
          attendanceEnabled: s.attendanceEnabled !== false,
        }))
      );
    } else if (batch.batchCourses && batch.batchCourses.length > 0) {
      setScheduleLines(
        batch.batchCourses.map((bc) =>
          createEmptyScheduleLine({
            courseId: bc.courseId,
            facultyId: bc.facultyId || bc.faculty?.id || "",
            timeslotMasterId:
              bc.timeslotMasterId ||
              findMasterIdByLabel(timeslotOptions, bc.timeSlot || undefined) ||
              "",
            classroomMasterId: bc.classroomMasterId || "",
          })
        )
      );
    } else {
      setScheduleLines([
        createEmptyScheduleLine({
          courseId: batch.courseId,
          facultyId: batch.facultyId || "",
        }),
      ]);
    }

    setFormError(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBatch(null);
    setFormError(null);
  };

  // Deep-link from Batch Details: ?edit=:id or ?create=1
  useEffect(() => {
    const editId = searchParams.get("edit");
    const createFlag = searchParams.get("create");
    if (!editId && createFlag !== "1") return;
    if (loading) return;

    if (createFlag === "1") {
      handleOpenCreateModal();
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      setSearchParams(next, { replace: true });
      return;
    }

    const batch = batches.find((b) => b.id === editId);
    if (batch) {
      handleOpenEditModal(batch);
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
    }
  }, [loading, batches]); // intentionally omit searchParams to avoid reopen loops

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    const incomplete = scheduleLines.find(
      (l) => !l.courseId || !l.facultyId || !l.timeslotMasterId || l.dayOfWeek === undefined
    );
    if (scheduleLines.length === 0 || incomplete) {
      setFormError("Add at least one complete schedule line (course, day, time slot, faculty).");
      return;
    }
    if (!startDate) {
      setFormError("Start date is required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const scheduleLinesPayload: ScheduleLinePayload[] = scheduleLines.map((l) => {
        const times = getTimeslotTimes(timeslotOptions, l.timeslotMasterId);
        const startTime = times.startTime;
        const endTime = times.endTime;
        return {
          courseId: l.courseId,
          dayOfWeek: l.dayOfWeek,
          startTime,
          endTime,
          timeSlot:
            startTime && endTime
              ? `${startTime} - ${endTime}`
              : times.label || getMasterLabel(timeslotOptions, l.timeslotMasterId) || undefined,
          timeslotMasterId: l.timeslotMasterId || undefined,
          classroomMasterId: l.classroomMasterId || undefined,
          facultyId: l.facultyId || undefined,
          status: l.status,
          attendanceEnabled: l.attendanceEnabled,
        };
      });

      const payload = {
        name,
        code,
        courseId: scheduleLines[0].courseId,
        scheduleLines: scheduleLinesPayload,
        facultyId: facultyId || scheduleLines.find((l) => l.facultyId)?.facultyId || undefined,
        startDate,
        expectedEndDate: expectedEndDate || undefined,
        capacity,
        remark: remark || undefined,
        status: batchStatus,
      };

      if (editingBatch) {
        await updateBatch(editingBatch.id, payload);
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
        return <Badge variant="success" className="text-xs px-3 py-0.5 font-semibold">Active</Badge>;
      case "UPCOMING":
        return <Badge variant="warning" className="text-xs px-3 py-0.5 font-semibold">Upcoming</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary" className="text-xs px-3 py-0.5 font-semibold bg-[#104886] hover:bg-[#0b3869] text-white border-0">Completed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs px-3 py-0.5 font-semibold">{status}</Badge>;
    }
  };

  return (
    <div className="pt-4 space-y-6 animate-in fade-in duration-300">
      {/* Header — Zenox-style action toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black tracking-tight text-foreground">Batch Schedule</h2>
          {selectedIds.length > 0 && (
            <Badge className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0 h-5 min-w-5 justify-center">
              {selectedIds.length}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-lg disabled:opacity-40 transition-all cursor-pointer"
            disabled={selectedIds.length !== 1}
            onClick={() => {
              const id = selectedIds[0];
              if (id) navigate(ROUTES.ADMIN.BATCHES.DETAIL(id));
            }}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View
          </Button>
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs rounded-lg disabled:opacity-40 transition-all cursor-pointer"
            disabled={selectedIds.length !== 1}
            onClick={() => {
              const batch = filteredBatches.find((b) => b.id === selectedIds[0]);
              if (batch) handleOpenEditModal(batch);
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs rounded-lg disabled:opacity-40 transition-all cursor-pointer"
            disabled={selectedIds.length !== 1}
            onClick={() => {
              const batch = filteredBatches.find((b) => b.id === selectedIds[0]);
              if (!batch) return;
              setDeleteError(null);
              setBatchToDelete({ id: batch.id, name: batch.name, code: batch.code });
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-xs rounded-lg transition-all cursor-pointer"
            onClick={handleOpenCreateModal}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add New Batch
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 rounded-lg border-border hover:bg-muted/50 transition-all cursor-pointer"
            onClick={() => refetch()}
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
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
          <div className="rounded-2xl border border-border overflow-x-auto bg-card shadow-2xs">
            {loading ? (
              <div className="py-12 flex justify-center items-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-xs font-bold">Loading batches...</span>
              </div>
            ) : (
              <Table className="w-full border-collapse">
                <TableHeader className="bg-muted/50 border-b border-border">
                  <TableRow className="text-[11px] uppercase tracking-wide border-b border-border">
                    <TableHead className="w-10 pl-4 pr-3 py-3 text-center border-r border-border">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border cursor-pointer align-middle"
                        checked={
                          filteredBatches.length > 0 &&
                          filteredBatches.every((b) => selectedIds.includes(b.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredBatches.map((b) => b.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        aria-label="Select all batches"
                      />
                    </TableHead>
                    <TableHead className="font-bold text-foreground whitespace-nowrap px-3 py-3 text-xs border-r border-border">CREATED DATE</TableHead>
                    <TableHead className="font-bold text-foreground px-3 py-3 text-xs border-r border-border">BATCH SCHEDULE TITLE</TableHead>
                    <TableHead className="font-bold text-foreground whitespace-nowrap px-3 py-3 text-xs border-r border-border">START DATE</TableHead>
                    <TableHead className="font-bold text-foreground whitespace-nowrap px-3 py-3 text-xs border-r border-border">END DATE</TableHead>
                    <TableHead className="font-bold text-foreground px-3 py-3 text-xs border-r border-border">ADMISSION BATCH</TableHead>
                    <TableHead className="font-bold text-foreground px-3 py-3 text-xs border-r border-border">MODULE</TableHead>
                    <TableHead className="font-bold text-foreground text-center whitespace-nowrap px-3 py-3 text-xs border-r border-border">NO. OF STUDENTS</TableHead>
                    <TableHead className="font-bold text-foreground text-center whitespace-nowrap px-3 py-3 text-xs border-r border-border">STATUS</TableHead>
                    <TableHead className="font-bold text-foreground text-center whitespace-nowrap px-2 py-3 text-xs w-12 pr-3">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.length > 0 ? (
                    filteredBatches.map((batch) => {
                      const enrolledCount = batch._count?.enrollments || 0;
                      const isSelected = selectedIds.includes(batch.id);
                      const createdDate = batch.createdAt
                        ? new Date(batch.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })
                        : "—";
                      const startDateLabel = batch.startDate
                        ? new Date(batch.startDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })
                        : "—";
                      const endDateLabel = batch.expectedEndDate
                        ? new Date(batch.expectedEndDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })
                        : "—";
                      const scheduleTitle = formatBatchScheduleTitle(batch);
                      const timeSlot =
                        batch.timeSlot ||
                        batch.schedules?.[0]?.timeslotMaster?.name ||
                        (batch.schedules?.[0]?.startTime
                          ? `${batch.schedules[0].startTime} to ${batch.schedules[0].endTime}`
                          : "—");

                      return (
                        <TableRow
                          key={batch.id}
                          className={`transition-colors border-b border-border text-xs cursor-pointer ${isSelected ? "bg-muted/60" : "hover:bg-muted/40"
                            }`}
                          onClick={() => setSelectedIds([batch.id])}
                        >
                          <TableCell className="w-10 pl-4 pr-3 py-3 text-center align-middle border-r border-border" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border cursor-pointer align-middle"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds([batch.id]);
                                } else {
                                  setSelectedIds((prev) => prev.filter((id) => id !== batch.id));
                                }
                              }}
                              aria-label={`Select ${batch.name}`}
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 whitespace-nowrap text-muted-foreground font-medium text-xs align-middle border-r border-border">
                            {createdDate}
                          </TableCell>
                          <TableCell className="px-3 py-3 align-middle max-w-[260px] border-r border-border">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-foreground text-xs leading-snug break-words" title={scheduleTitle}>
                                {scheduleTitle}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-mono truncate">
                                {batch.code} · {batch.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-3 whitespace-nowrap text-xs font-medium align-middle border-r border-border">{startDateLabel}</TableCell>
                          <TableCell className="px-3 py-3 whitespace-nowrap text-xs font-medium align-middle border-r border-border">{endDateLabel}</TableCell>
                          <TableCell className="px-3 py-3 text-xs font-medium align-middle max-w-[150px] leading-snug border-r border-border" title={timeSlot}>
                            <span className="line-clamp-2">{timeSlot}</span>
                          </TableCell>
                          <TableCell className="px-3 py-3 max-w-[130px] text-xs font-medium align-middle leading-snug border-r border-border" title={formatBatchSubjectNames(batch)}>
                            <span className="line-clamp-2 font-medium">
                              {formatBatchSubjectNames(batch)}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-3 text-center font-bold whitespace-nowrap text-xs align-middle border-r border-border">{enrolledCount}</TableCell>
                          <TableCell className="px-3 py-3 text-center whitespace-nowrap align-middle border-r border-border">{getStatusBadge(batch.status)}</TableCell>
                          <TableCell className="text-center px-2 py-3 align-middle w-12 pr-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer inline-flex items-center justify-center">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-card border-border shadow-lg rounded-xl text-foreground">
                                <DropdownMenuLabel className="text-xs font-bold">Batch Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border" />
                                <DropdownMenuItem asChild className="cursor-pointer text-xs font-bold">
                                  <Link to={ROUTES.ADMIN.BATCHES.DETAIL(batch.id)}>
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer text-xs font-bold"
                                  disabled={!canGenerateSessions(batch)}
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
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground text-xs font-medium">
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
      {showModal && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-[calc(100vw-2rem)] text-foreground overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh] my-auto">
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
                    Batch header plus day / slot / room / faculty schedule lines
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="rounded-xl text-xs font-semibold h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="batch-zenox-form"
                  disabled={submitting || scheduleLines.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-600/90 text-white rounded-xl text-xs font-semibold h-9"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form
              id="batch-zenox-form"
              onSubmit={handleFormSubmit}
              className="flex flex-col min-h-0 flex-1 overflow-hidden"
            >
              <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Batch Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Java Full Stack Morning"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-10 rounded-xl text-xs"
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
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Start Date <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Expected End Date
                    </label>
                    <Input
                      type="date"
                      value={expectedEndDate}
                      min={startDate || undefined}
                      onChange={(e) => setExpectedEndDate(e.target.value)}
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Batch Status
                    </label>
                    <select
                      value={batchStatus}
                      onChange={(e) => setBatchStatus(e.target.value as BatchData["status"])}
                      className="w-full h-10 px-3 border border-border rounded-xl text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="UPCOMING">Upcoming</option>
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
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
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Remark</label>
                    <textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      rows={1}
                      className="w-full h-10 px-3 py-2 border border-border rounded-xl text-xs bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                <BatchScheduleLinesEditor
                  courses={courses}
                  facultyList={facultyList}
                  lines={scheduleLines}
                  onChange={setScheduleLines}
                  startDate={startDate}
                  endDate={expectedEndDate}
                  excludeBatchId={editingBatch?.id}
                />
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Generate Class Sessions Modal */}
      {batchToGenerate && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
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
        </div>,
        document.body
      )}

      {/* ─── 2-STEP DELETE CONFIRMATION MODAL ───────────────────────── */}
      {batchToDelete && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
        </div>,
        document.body
      )}
    </div>
  );
};
