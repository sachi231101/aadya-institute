import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  MoreVertical,
  Trash2,
  Pencil,
  Loader2,
  AlertTriangle,
  X,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBatches } from "../../../hooks/useBatches";
import type { BatchData, ScheduleLinePayload, SessionSyncResult } from "../../../services/batches.api";
import { useCourses } from "../../../hooks/useCourses";
import { useFacultyList } from "../../../hooks/useFaculty";
import { useBranchScopeForLists } from "@/hooks/useBranchScopeForLists";
import { batchesApi } from "@/services/batches.api";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, MetricGrid, FilterToolbar } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { getMasterLabel, findMasterIdByLabel, getTimeslotTimes } from "@/utils/master.utils";
import { getPortalBasePath } from "@/utils/portal-path";
import {
  batchIncludesCourse,
  formatBatchSubjectNames,
  formatBatchInstructorsSummary,
} from "@/utils/batch.utils";
import {
  BatchScheduleLinesEditor,
  createEmptyScheduleLine,
  newLineKey,
  type ScheduleLineFormRow,
} from "@/components/batches/BatchScheduleLinesEditor";

const FACULTY_SCHEDULE_CONFLICT_MESSAGE =
  "This faculty member is already assigned to another class at this time. Please select a different time slot or faculty member.";

const scheduleLineConflictKey = (line: {
  facultyId?: string;
  dayOfWeek: number;
  timeslotMasterId?: string;
  startTime?: string;
  endTime?: string;
}) =>
  `${line.facultyId || ""}|${line.dayOfWeek}|${line.timeslotMasterId || ""}|${line.startTime || ""}|${line.endTime || ""}`;import {
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
  const { canEditItem } = usePermissions();
  const canEditBatches = canEditItem("batches.all");
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get("courseId") || "";
  const location = useLocation();
  const batchesBasePath = `${getPortalBasePath(location.pathname)}/batches`;

  const {
    branches,
    allowAllBranches,
    showBranchSelector,
    selectedBranchId,
    branchIdForQuery,
    setSelectedBranchId,
  } = useBranchScopeForLists();

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
  const [isCancelled, setIsCancelled] = useState(false);
  /** Explicit branch for create when list filter is All branches. */
  const [formBranchId, setFormBranchId] = useState("");
  const { options: timeslotOptions } = useMasterDropdown("timeslot");
  const [capacity, setCapacity] = useState<number>(35);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const formScopeBranchId = showModal
    ? editingBatch?.branchId || formBranchId || branchIdForQuery || undefined
    : branchIdForQuery;

  const { courses } = useCourses({
    branchId: formScopeBranchId,
  });
  const queryClient = useQueryClient();
  const { batches, loading, createBatch, updateBatch, deleteBatch, refetch } = useBatches({
    search: searchTerm,
    courseId: courseFilter !== "ALL" ? courseFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    branchId: branchIdForQuery,
  });
  const { data: facultyResponse } = useFacultyList({
    limit: 100,
    branchId: formScopeBranchId,
  });
  const facultyList = facultyResponse?.data ?? [];
  const requireFormBranch = showModal && !editingBatch && branches.length > 0;
  const editBranchName = editingBatch
    ? editingBatch.branch?.name ||
      branches.find((b) => b.id === editingBatch.branchId)?.name ||
      "—"
    : "";

  // 2-Step Delete Modal State
  const [batchToDelete, setBatchToDelete] = useState<{ id: string; name: string; code: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const resetFormFields = () => {
    setName("");
    setCode("");
    setScheduleLines([]);
    setFacultyId("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setExpectedEndDate("");
    setRemark("");
    setIsCancelled(false);
    setCapacity(35);
    setFormBranchId("");
    setFormError(null);
  };

  const handleOpenCreateModal = () => {
    setEditingBatch(null);
    resetFormFields();
    setFormBranchId(branchIdForQuery || "");
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
    setIsCancelled(batch.status === "CANCELLED");
    setCapacity(batch.capacity || 35);
    setFormBranchId(batch.branchId || "");

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
          status: "ACTIVE",
          attendanceEnabled: true,
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
    setFormBranchId("");
    setFormError(null);
  };

  // Deep-link from Batch Details: ?edit=:id or ?create=1
  useEffect(() => {
    const editId = searchParams.get("edit");
    const createFlag = searchParams.get("create");
    if (!editId && createFlag !== "1") return;
    if (loading) return;

    if (!canEditBatches) {
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      next.delete("edit");
      setSearchParams(next, { replace: true });
      return;
    }

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
  }, [loading, batches, canEditBatches]); // intentionally omit searchParams to avoid reopen loops

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
    if (!expectedEndDate) {
      setFormError("Expected end date is required when schedule lines are set.");
      return;
    }

    const createBranchId = formBranchId || branchIdForQuery || undefined;
    if (!editingBatch && !createBranchId) {
      setFormError("Branch is required. Select a branch before creating a batch.");
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
          status: "ACTIVE",
          attendanceEnabled: true,
        };
      });

      const seenSlots = new Set<string>();
      for (const line of scheduleLinesPayload) {
        if (!line.facultyId) continue;
        const key = scheduleLineConflictKey(line);
        if (seenSlots.has(key)) {
          setFormError(FACULTY_SCHEDULE_CONFLICT_MESSAGE);
          return;
        }
        seenSlots.add(key);
      }

      const precheckBranchId = editingBatch?.branchId || createBranchId;
      for (const line of scheduleLinesPayload) {
        if (!line.facultyId || line.dayOfWeek === undefined) continue;
        try {
          const available = await batchesApi.getAvailableFaculty({
            dayOfWeek: line.dayOfWeek,
            timeslotMasterId: line.timeslotMasterId,
            startTime: line.startTime,
            endTime: line.endTime,
            startDate: startDate || undefined,
            endDate: expectedEndDate || undefined,
            branchId: precheckBranchId || undefined,
            excludeBatchId: editingBatch?.id,
          });
          const availableIds = new Set((available.data || []).map((f) => f.id));
          if (!availableIds.has(line.facultyId)) {
            setFormError(FACULTY_SCHEDULE_CONFLICT_MESSAGE);
            return;
          }
        } catch {
          // Backend remains source of truth; continue to save if pre-check fails to load.
        }
      }

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
        ...(isCancelled ? { status: "CANCELLED" as const } : {}),
        ...(editingBatch ? {} : { branchId: createBranchId }),
      };

      const formatSyncToast = (sync?: SessionSyncResult | null) => {
        if (!sync) return null;
        if (sync.error) return sync.message || sync.error;
        const endLabel = expectedEndDate
          ? new Date(`${expectedEndDate}T12:00:00`).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })
          : null;
        const parts = [
          sync.created ? `${sync.created} created` : null,
          sync.updated ? `${sync.updated} updated` : null,
          sync.cancelled ? `${sync.cancelled} cancelled` : null,
          sync.skippedHolidays ? `${sync.skippedHolidays} holiday skips` : null,
          sync.skippedConflicts ? `${sync.skippedConflicts} conflict skips` : null,
        ].filter(Boolean);
        if (parts.length === 0 && sync.message) return sync.message;
        if (parts.length === 0) return null;
        return endLabel
          ? `Timetable filled: ${parts.join(", ")} through ${endLabel}.`
          : `Timetable filled: ${parts.join(", ")}.`;
      };

      if (editingBatch) {
        const updated = await updateBatch(editingBatch.id, payload);
        const syncMsg = formatSyncToast(updated?.sessionSync);
        if (updated?.sessionSync?.error) {
          setSuccessMsg(
            `Batch "${code} - ${name}" updated. Timetable sync failed: ${updated.sessionSync.error}`
          );
        } else {
          setSuccessMsg(
            syncMsg
              ? `Batch "${code} - ${name}" updated. ${syncMsg}`
              : `Batch "${code} - ${name}" updated successfully.`
          );
        }
      } else {
        const created = await createBatch(payload);
        const syncMsg = formatSyncToast(created?.sessionSync);
        if (created?.sessionSync?.error) {
          setSuccessMsg(
            `Batch "${code} - ${name}" created. Timetable sync failed: ${created.sessionSync.error}`
          );
        } else {
          setSuccessMsg(
            syncMsg
              ? `Batch "${code} - ${name}" created. ${syncMsg}`
              : `Batch "${code} - ${name}" created successfully.`
          );
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["schedule-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["faculty-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });

      resetFormFields();
      setShowModal(false);
      setEditingBatch(null);
      setTimeout(() => setSuccessMsg(null), 5000);
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

  const metrics = [
    { label: "Active Batches", value: activeCount },
    { label: "Upcoming Batches", value: upcomingCount },
    { label: "Batch Enrolled", value: `${totalEnrolled} / ${totalCapacity}` },
    { label: "Avg Occupancy", value: `${avgOccupancy}%` },
  ];

  return (
    <PageContainer className="animate-in fade-in duration-300">
      <PageHeader
        title="Batch Schedule"
        description="Batch schedules, enrollment, and session generation."
        actions={
          <>
            <PermissionGate itemKey="batches.all" mode="write">
              <Button size="sm" className="rounded-lg" onClick={handleOpenCreateModal}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add New Batch
              </Button>
            </PermissionGate>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={() => refetch()}
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </>
        }
      />

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-medium text-emerald-600 animate-in slide-in-from-top-2 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      <MetricGrid columns="grid-cols-2 sm:grid-cols-4" density="compact">
        {metrics.map((kpi) => (
          <Card
            key={kpi.label}
            size="compact"
            className="border border-border bg-card shadow-none rounded-lg"
          >
            <CardContent size="compact">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </p>
              <h3 className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                {kpi.value}
              </h3>
            </CardContent>
          </Card>
        ))}
      </MetricGrid>

      <FilterToolbar className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by batch name, code, course, or instructor…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 rounded-lg pl-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showBranchSelector && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-9 cursor-pointer rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {allowAllBranches && <option value="ALL">All branches</option>}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={courseFilter}
            onChange={(e) => handleCourseFilterChange(e.target.value)}
            className="h-9 cursor-pointer rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
            className="h-9 cursor-pointer rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </FilterToolbar>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading batches…</span>
        </div>
      ) : (
        <Card className="border border-border shadow-none rounded-lg overflow-hidden">
          <div
            className={
              "min-w-0 overflow-x-auto " +
              "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
              "[&_thead]:bg-muted/50 " +
              "[&_th]:h-9 [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:font-semibold " +
              "[&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground " +
              "[&_th]:border [&_th]:border-border [&_th]:whitespace-nowrap " +
              "[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_td]:border [&_td]:border-border " +
              "[&_tbody_tr]:hover:bg-muted/30 [&_tbody_tr]:transition-colors " +
              "[&_tr]:border-0"
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Created</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="whitespace-nowrap">Start</TableHead>
                  <TableHead className="whitespace-nowrap">End</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length > 0 ? (
                  filteredBatches.map((batch) => {
                    const enrolledCount = batch._count?.enrollments || 0;
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
                    const facultyLabel = formatBatchInstructorsSummary(batch);

                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {createdDate}
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <div className="min-w-0 space-y-0.5">
                            <p
                              className="truncate text-sm font-semibold leading-snug text-foreground"
                              title={`${batch.name} · ${batch.code}`}
                            >
                              <span className="font-medium">{batch.name}</span>
                              <span className="mx-1.5 font-normal text-muted-foreground">·</span>
                              <span className="font-mono text-[11px] font-normal text-muted-foreground">
                                {batch.code}
                              </span>
                            </p>
                            <p
                              className="truncate text-[11px] text-muted-foreground"
                              title={facultyLabel}
                            >
                              {facultyLabel}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {startDateLabel}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {endDateLabel}
                        </TableCell>
                        <TableCell
                          className="max-w-[140px] text-sm"
                          title={formatBatchSubjectNames(batch)}
                        >
                          <span className="line-clamp-2">{formatBatchSubjectNames(batch)}</span>
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium tabular-nums">
                          {enrolledCount}
                        </TableCell>
                        <TableCell>{getStatusBadge(batch.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-lg">
                              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                                Batch Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs font-medium">
                                <Link to={`${batchesBasePath}/${batch.id}`}>
                                  <Eye className="h-3.5 w-3.5" /> View Details
                                </Link>
                              </DropdownMenuItem>
                              {canEditBatches && (
                                <>
                                  <DropdownMenuItem
                                    className="cursor-pointer gap-2 text-xs font-medium"
                                    onClick={() => handleOpenEditModal(batch)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" /> Edit Batch
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer gap-2 text-xs font-medium text-rose-600 focus:bg-rose-500/10 focus:text-rose-600"
                                    onClick={() => {
                                      setDeleteError(null);
                                      setBatchToDelete({
                                        id: batch.id,
                                        name: batch.name,
                                        code: batch.code,
                                      });
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete Batch
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-28 text-center text-sm text-muted-foreground">
                      No batches found matching criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Modal Dialog for Creating / Editing Batch */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-[calc(100vw-2rem)] text-foreground overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh] my-auto">
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
                  {requireFormBranch && (
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Branch <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formBranchId}
                        onChange={(e) => setFormBranchId(e.target.value)}
                        required
                        className="w-full h-10 px-3 border border-border rounded-xl text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer"
                      >
                        <option value="">Select branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {editingBatch && (
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Branch
                      </label>
                      <Input
                        type="text"
                        value={editBranchName}
                        disabled
                        readOnly
                        className="h-10 rounded-xl text-xs bg-muted/40 text-muted-foreground cursor-not-allowed"
                        aria-label={`Branch: ${editBranchName}`}
                      />
                    </div>
                  )}
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
                      Expected End Date <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={expectedEndDate}
                      min={startDate || undefined}
                      onChange={(e) => setExpectedEndDate(e.target.value)}
                      required
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Batch Status
                    </label>
                    <div className="h-10 px-3 rounded-xl border border-border bg-muted/40 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Status follows start / end dates
                        {editingBatch && !isCancelled
                          ? ` · currently ${editingBatch.status}`
                          : ""}
                      </p>
                      <label className="flex items-center gap-1.5 shrink-0 cursor-pointer text-xs font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={isCancelled}
                          onChange={(e) => setIsCancelled(e.target.checked)}
                          className="rounded border-border"
                        />
                        Cancelled
                      </label>
                    </div>
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
                  branchId={formScopeBranchId}
                  excludeBatchId={editingBatch?.id}
                />
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─── 2-STEP DELETE CONFIRMATION MODAL ───────────────────────── */}
      {batchToDelete && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-foreground animate-in zoom-in-95 duration-150">
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
    </PageContainer>
  );
};
