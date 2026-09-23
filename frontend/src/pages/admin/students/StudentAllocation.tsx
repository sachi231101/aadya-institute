import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Loader2, X, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { useBranchScopeForLists } from "@/hooks/useBranchScopeForLists";
import {
  useStudentAllocation,
  fetchMatchingStudentIds,
  type AllocationEnrollmentTab,
} from "@/hooks/useStudentAllocation";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, FilterToolbar } from "@/components/layout";
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
import { formatBatchSubjectNames, getBatchCourseIds } from "@/utils/batch.utils";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { useCourses } from "@/hooks/useCourses";

const PAGE_SIZE = 50;
const SELECT_ALL_MATCHING_CAP = 200;

export const StudentAllocation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialBatchId = searchParams.get("batchId") ?? "";
  const { canEditItem } = usePermissions();
  const canEditAllocation = canEditItem("students.student_allocation");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<AllocationEnrollmentTab>("UNASSIGNED");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [page, setPage] = useState(1);

  const {
    branches,
    allowAllBranches,
    showBranchSelector,
    selectedBranchId: selectedBranchFilter,
    branchIdForQuery,
    setSelectedBranchId: setSelectedBranchFilter,
  } = useBranchScopeForLists();

  const [selectedTargetBatchId, setSelectedTargetBatchId] = useState<string>("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [matchingTotalHint, setMatchingTotalHint] = useState<number | null>(null);

  const [isAssigning, setIsAssigning] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setSelectedStudentIds(new Set());
    setSelectAllMatching(false);
    setMatchingTotalHint(null);
  }, [activeTab, selectedCourseId, selectedBranchFilter, debouncedSearch]);

  const branchId = branchIdForQuery;
  const courseId = selectedCourseId || undefined;

  const {
    batches,
    students,
    meta,
    counts,
    enrolledMap,
    loadingBatches,
    loadingStudents,
    loadingCounts,
    studentsError,
    invalidateAllocation,
    assignStudentsToBatch,
    transferStudent,
    removeStudentFromBatch,
  } = useStudentAllocation({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    branchId,
    courseId,
    enrollmentStatus: activeTab,
  });

  const { courses } = useCourses({
    status: "ACTIVE",
    branchId: branchId && branchId !== "ALL" ? branchId : undefined,
  });

  useEffect(() => {
    if (initialBatchId && batches.some((b) => b.id === initialBatchId)) {
      setSelectedTargetBatchId(initialBatchId);
      const batch = batches.find((b) => b.id === initialBatchId);
      if (batch && !selectedCourseId) {
        const ids = getBatchCourseIds(batch);
        if (ids[0]) setSelectedCourseId(ids[0]);
      }
    }
  }, [initialBatchId, batches, selectedCourseId]);

  const targetBatch = useMemo(() => {
    if (selectedTargetBatchId) {
      return batches.find((b) => b.id === selectedTargetBatchId) || null;
    }
    return null;
  }, [batches, selectedTargetBatchId]);

  const filteredBatches = useMemo(() => {
    if (!selectedCourseId) return batches;
    return batches.filter((b) => getBatchCourseIds(b).includes(selectedCourseId));
  }, [batches, selectedCourseId]);

  useEffect(() => {
    if (targetBatch && selectedCourseId) {
      const ids = getBatchCourseIds(targetBatch);
      if (!ids.includes(selectedCourseId)) {
        setSelectedTargetBatchId("");
      }
    }
  }, [selectedCourseId, targetBatch]);

  const selectedCourseName = useMemo(() => {
    if (!selectedCourseId) return null;
    return courses.find((c) => c.id === selectedCourseId)?.name ?? null;
  }, [courses, selectedCourseId]);

  const activeBatchesCount = batches.filter(
    (b) => b.status === "ACTIVE" || !b.status || b.status === "UPCOMING"
  ).length;

  const targetBatchCapacity = targetBatch?.capacity || 30;
  const targetBatchAlreadyAssigned =
    targetBatch?._count?.enrollments ?? targetBatch?.enrollments?.length ?? 0;
  const targetBatchAvailableSeats = Math.max(0, targetBatchCapacity - targetBatchAlreadyAssigned);
  const selectedCount = selectedStudentIds.size;
  const seatsRemainingAfterAssignment = targetBatchAvailableSeats - selectedCount;
  const isCapacityExceeded = selectedCount > targetBatchAvailableSeats;

  const canBulkAssign = Boolean(selectedCourseId) && canEditAllocation;
  const rangeStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const rangeEnd = Math.min(meta.page * meta.limit, meta.total);

  const pageAllSelected =
    students.length > 0 && students.every((s) => selectedStudentIds.has(s.id));

  const selectedOnPagePreview = useMemo(() => {
    return students.filter((s) => selectedStudentIds.has(s.id));
  }, [students, selectedStudentIds]);

  const hasOffPageSelection = useMemo(() => {
    if (selectedStudentIds.size === 0) return false;
    const onPage = new Set(students.map((s) => s.id));
    for (const id of selectedStudentIds) {
      if (!onPage.has(id)) return true;
    }
    return false;
  }, [students, selectedStudentIds]);

  const handleToggleStudent = (studentId: string) => {
    setSelectAllMatching(false);
    setMatchingTotalHint(null);
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    setSelectAllMatching(false);
    setMatchingTotalHint(null);
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) {
        students.forEach((s) => next.delete(s.id));
      } else {
        students.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const handleSelectAllMatching = async () => {
    if (!selectedCourseId) {
      setActionError("Select a course before selecting all matching students.");
      return;
    }
    setIsSelectingAll(true);
    setActionError(null);
    try {
      const ids = await fetchMatchingStudentIds(
        {
          search: debouncedSearch || undefined,
          branchId,
          courseId,
          enrollmentStatus: activeTab,
        },
        SELECT_ALL_MATCHING_CAP
      );
      setSelectedStudentIds(new Set(ids));
      setSelectAllMatching(true);
      setMatchingTotalHint(meta.total);
      if (meta.total > SELECT_ALL_MATCHING_CAP) {
        setSuccessMsg(
          `Selected first ${ids.length} of ${meta.total} matching students (bulk limit ${SELECT_ALL_MATCHING_CAP}).`
        );
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        "Failed to select matching students.";
      setActionError(message);
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
    setSelectAllMatching(false);
    setMatchingTotalHint(null);
  };

  const handleConfirmBulkAssign = async () => {
    if (!targetBatch || selectedStudentIds.size === 0) return;
    if (!selectedCourseId) {
      setActionError("Select a course before assigning.");
      return;
    }
    setIsAssigning(true);
    setActionError(null);

    try {
      const studentIdsArray = Array.from(selectedStudentIds);
      const result = await assignStudentsToBatch(targetBatch.id, studentIdsArray);
      await invalidateAllocation();

      if (result.assigned === 0 && result.failures.length > 0) {
        const alreadyOnly = result.failures.every((f) =>
          f.message.toLowerCase().includes("already assigned to this batch")
        );
        if (alreadyOnly) {
          setActionError(
            result.failures.length === 1
              ? "This student is already assigned to this batch."
              : `All ${result.failures.length} selected students are already assigned to this batch.`
          );
        } else {
          const detail = result.failures
            .slice(0, 3)
            .map((f) => f.message)
            .filter(Boolean)
            .join("; ");
          setActionError(detail || "Could not assign any selected students to this batch.");
        }
        return;
      }

      if (result.assigned === 0 && result.skipped > 0) {
        setActionError(
          result.skipped === 1
            ? "This student is already assigned to this batch."
            : `All ${result.skipped} selected students are already assigned to this batch.`
        );
        return;
      }

      const alreadyHint =
        result.skipped > 0
          ? ` · ${result.skipped} already in this batch`
          : "";
      const otherFailures = result.failures.filter(
        (f) => !f.message.toLowerCase().includes("already assigned to this batch")
      );
      const failureHint =
        otherFailures.length > 0
          ? ` · ${otherFailures.length} failed: ${otherFailures[0]?.message || "unknown"}`
          : "";

      setSuccessMsg(
        `Assigned ${result.assigned} → ${targetBatch.code} (${targetBatch.name})${alreadyHint}${failureHint}.`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      handleClearSelection();
      setShowConfirmModal(false);
    } catch (err: unknown) {
      const apiData = (err as { response?: { data?: { message?: string; data?: { failures?: Array<{ message: string }> } } } })
        ?.response?.data;
      const failureMsgs = apiData?.data?.failures?.map((f) => f.message).filter(Boolean) ?? [];
      const message =
        failureMsgs.slice(0, 3).join("; ") ||
        apiData?.message ||
        (err as { message?: string })?.message ||
        "Failed to complete batch assignment.";
      setActionError(message);
    } finally {
      setIsAssigning(false);
    }
  };

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

      setSuccessMsg(
        `Successfully transferred ${transferModalStudent.name} to ${targetB?.code || "new batch"}.`
      );
      setTimeout(() => setSuccessMsg(null), 4500);
      setTransferModalStudent(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        "Failed to transfer student.";
      setActionError(message);
    } finally {
      setIsTransferring(false);
    }
  };

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
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        "Failed to remove student from batch.";
      setActionError(message);
    } finally {
      setIsRemoving(false);
    }
  };

  const statusCards = [
    { value: "ALL" as const, label: "All", count: counts.all },
    { value: "ASSIGNED" as const, label: "Assigned", count: counts.assigned },
    { value: "UNASSIGNED" as const, label: "Unassigned", count: counts.unassigned },
  ];

  const assignDisabled =
    selectedCount === 0 ||
    isCapacityExceeded ||
    isAssigning ||
    !targetBatch ||
    !canBulkAssign;

  return (
    <PageContainer>
      <PageHeader title="Assign Students to Batches" />

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 flex items-center justify-between gap-2 text-sm">
          <span>{successMsg}</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" onClick={() => setSuccessMsg(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {actionError && !showConfirmModal && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 text-sm">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {statusCards.map((card) => {
          const selected = activeTab === card.value;
          return (
            <button
              key={card.value}
              type="button"
              onClick={() => setActiveTab(card.value)}
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
                    {loadingCounts ? "—" : card.count}
                  </p>
                </CardContent>
              </Card>
            </button>
          );
        })}
        <Card className="border border-border bg-card shadow-sm">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Active batches</p>
            <p className="mt-0.5 text-xl font-semibold text-foreground tabular-nums">
              {loadingBatches ? "—" : activeBatchesCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <FilterToolbar className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, code, or phone"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          />
        </div>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="h-9 text-sm border border-border rounded-lg px-3 text-foreground bg-background focus:outline-none focus:border-primary"
        >
          <option value="">Select course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {showBranchSelector && (
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="h-9 text-sm border border-border rounded-lg px-3 text-foreground bg-background focus:outline-none focus:border-primary"
          >
            {allowAllBranches && <option value="ALL">All branches</option>}
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        )}
      </FilterToolbar>

      {!selectedCourseId && (
        <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Select a course to enable bulk assign. Filter to unassigned students for that course, then assign a cohort to a matching batch.
        </p>
      )}

      <div id="student-selection-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <Card className="lg:col-span-7 border border-border shadow-xs bg-card rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {meta.total === 0
                ? "0 students"
                : `Showing ${rangeStart}–${rangeEnd} of ${meta.total}`}
              {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
              {selectAllMatching && matchingTotalHint != null && matchingTotalHint > selectedCount
                ? ` (capped)`
                : ""}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {canEditAllocation && selectedCourseId && meta.total > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllMatching}
                  disabled={isSelectingAll || isAssigning}
                  className="h-8 text-xs"
                >
                  {isSelectingAll ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      Selecting...
                    </>
                  ) : (
                    `Select all matching (${Math.min(meta.total, SELECT_ALL_MATCHING_CAP)})`
                  )}
                </Button>
              )}
              {selectedCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearSelection} className="h-8 text-xs">
                  Clear selection
                </Button>
              )}
            </div>
          </div>

          <div
            className={
              "min-w-0 overflow-x-auto " +
              "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
              "[&_thead]:bg-muted/50 " +
              "[&_th]:h-9 [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:font-semibold " +
              "[&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground " +
              "[&_th]:border [&_th]:border-border [&_th]:whitespace-nowrap " +
              "[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_td]:border [&_td]:border-border " +
              "[&_tbody_tr]:hover:bg-muted/30 [&_tbody_tr]:transition-colors"
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      checked={pageAllSelected}
                      onChange={handleSelectAllOnPage}
                      disabled={students.length === 0 || !canEditAllocation}
                      className="rounded border-border h-4 w-4 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  {activeTab === "ASSIGNED" && canEditAllocation && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStudents ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : studentsError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-sm text-red-600">
                      Unable to load students.
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => {
                    const isSelected = selectedStudentIds.has(student.id);
                    const isEnrolled = enrolledMap.has(student.id) || Boolean(student.batchId);
                    const enrolledBatch = enrolledMap.get(student.id);
                    const name = student.user?.name || "Student";
                    const phone = student.user?.phone || "—";
                    const packageCourses = coursesFromStudent(student);
                    const courseDisplay =
                      formatPackageCourseLabel(packageCourses, student.courseName || "") ||
                      enrolledBatch?.courseName ||
                      "—";

                    return (
                      <TableRow
                        key={student.id}
                        onClick={() => canEditAllocation && handleToggleStudent(student.id)}
                        className={`cursor-pointer ${isSelected ? "bg-primary/5" : ""}`}
                      >
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleStudent(student.id)}
                            disabled={!canEditAllocation}
                            className="rounded border-border h-4 w-4 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{student.studentCode}</p>
                        </TableCell>
                        <TableCell className="text-foreground">{phone}</TableCell>
                        <TableCell>
                          <CourseChips
                            courses={packageCourses}
                            fallback={courseDisplay}
                            maxVisible={2}
                          />
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-md border ${
                              isEnrolled
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-800 border-amber-500/20"
                            }`}
                          >
                            {isEnrolled
                              ? enrolledBatch?.batchCode || student.batchCode || "Enrolled"
                              : "Unassigned"}
                          </span>
                        </TableCell>
                        {activeTab === "ASSIGNED" && canEditAllocation && (
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setTransferModalStudent({
                                      id: student.id,
                                      name,
                                      code: student.studentCode,
                                      currentBatchId: enrolledBatch?.batchId || student.batchId || "",
                                      currentBatchCode:
                                        enrolledBatch?.batchCode || student.batchCode || "—",
                                    });
                                    setTransferTargetBatchId(
                                      batches.find(
                                        (b) =>
                                          b.id !== (enrolledBatch?.batchId || student.batchId)
                                      )?.id || ""
                                    );
                                  }}
                                  className="cursor-pointer"
                                >
                                  Transfer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setRemoveModalStudent({
                                      id: student.id,
                                      name,
                                      batchId: enrolledBatch?.batchId || student.batchId || "",
                                      batchCode: enrolledBatch?.batchCode || student.batchCode || "—",
                                    });
                                  }}
                                  className="cursor-pointer text-rose-600 focus:text-rose-700"
                                >
                                  Remove
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

          {meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5 border border-border shadow-xs bg-card rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Assign to batch</h3>
            {selectedCount > 0 && canEditAllocation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-8 text-xs text-muted-foreground"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="p-4 space-y-4 flex-1">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Target batch</span>
                <span>{filteredBatches.length} available</span>
              </label>
              <select
                value={selectedTargetBatchId}
                onChange={(e) => setSelectedTargetBatchId(e.target.value)}
                disabled={!selectedCourseId}
                className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
              >
                <option value="">
                  {selectedCourseId ? "Select batch" : "Select a course first"}
                </option>
                {filteredBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name} ({formatBatchSubjectNames(b)})
                  </option>
                ))}
              </select>
            </div>

            {targetBatch && (
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{targetBatch.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{targetBatch.code}</p>
                  </div>
                  <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-md border border-border bg-card shrink-0">
                    {formatBatchSubjectNames(targetBatch)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>{targetBatch.branch?.name || "—"}</span>
                  <span>{targetBatch.timeSlot || "—"}</span>
                </div>
                <div className="pt-1 border-t border-border space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Seats:{" "}
                      <span className="font-semibold text-foreground">
                        {targetBatchAlreadyAssigned}/{targetBatchCapacity}
                      </span>
                    </span>
                    <span
                      className={
                        targetBatchAvailableSeats <= 0 ? "text-rose-600" : "text-emerald-700"
                      }
                    >
                      {targetBatchAvailableSeats} left
                    </span>
                  </div>
                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        targetBatchAlreadyAssigned >= targetBatchCapacity
                          ? "bg-rose-500"
                          : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (targetBatchAlreadyAssigned / (targetBatchCapacity || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Selected ({selectedCount})</p>
              <div className="space-y-1.5 max-h-[190px] overflow-y-auto">
                {selectedCount === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    Select students from the table, or select all matching filters.
                  </div>
                ) : hasOffPageSelection || selectAllMatching ? (
                  <div className="p-3 rounded-lg border border-border bg-card text-sm space-y-1">
                    <p className="font-semibold text-foreground">
                      {selectedCount} student{selectedCount === 1 ? "" : "s"} selected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCourseName ? `Course: ${selectedCourseName}` : "Filters applied"}
                      {debouncedSearch ? ` · Search: “${debouncedSearch}”` : ""}
                    </p>
                    {selectedOnPagePreview.length > 0 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        On this page:{" "}
                        {selectedOnPagePreview
                          .slice(0, 3)
                          .map((s) => s.user?.name || s.studentCode)
                          .join(", ")}
                        {selectedOnPagePreview.length > 3 ? "…" : ""}
                      </p>
                    )}
                  </div>
                ) : (
                  selectedOnPagePreview.map((stu) => {
                    const name = stu.user?.name || "Student";
                    const phone = stu.user?.phone || "—";
                    return (
                      <div
                        key={stu.id}
                        className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{stu.studentCode}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{phone}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleStudent(stu.id)}
                          className="p-1 text-muted-foreground hover:text-rose-600 shrink-0"
                          title="Remove"
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

          <div className="p-4 border-t border-border bg-muted/20 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Selected", value: selectedCount },
                { label: "Capacity", value: targetBatchCapacity },
                { label: "In batch", value: targetBatchAlreadyAssigned },
                { label: "After", value: seatsRemainingAfterAssignment, warn: isCapacityExceeded },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`p-2 rounded-lg border ${
                    item.warn ? "border-rose-500/30 bg-rose-500/5" : "border-border bg-card"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p
                    className={`text-base font-semibold tabular-nums ${
                      item.warn ? "text-rose-600" : "text-foreground"
                    }`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            {isCapacityExceeded && (
              <p className="text-xs text-rose-700">
                Capacity exceeded by {selectedCount - targetBatchAvailableSeats}.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="border border-border shadow-xs bg-card rounded-xl">
        <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {!selectedCourseId
              ? "Select a course, then filter and assign students to a batch."
              : selectedCount === 0
                ? "Select students (page or all matching), choose a batch, then assign."
                : `Assign ${selectedCount} to ${targetBatch?.code || "batch"}`}
          </p>
          <PermissionGate itemKey="students.student_allocation" mode="write">
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleClearSelection}
                disabled={selectedCount === 0 || isAssigning}
              >
                Clear
              </Button>
              <Button
                size="sm"
                className="h-9 bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
                onClick={() => setShowConfirmModal(true)}
                disabled={assignDisabled}
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Assigning...
                  </>
                ) : (
                  `Assign${selectedCount ? ` ${selectedCount}` : ""} to batch`
                )}
              </Button>
            </div>
          </PermissionGate>
        </CardContent>
      </Card>

      <Dialog
        open={showConfirmModal}
        onOpenChange={(open) => {
          setShowConfirmModal(open);
          if (!open) setActionError(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Confirm assignment</DialogTitle>
            <DialogDescription className="text-sm">
              Assign {selectedCount} student{selectedCount === 1 ? "" : "s"}
              {selectedCourseName ? ` (${selectedCourseName})` : ""} to {targetBatch?.code} –{" "}
              {targetBatch?.name}?
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 text-xs">
              {actionError}
            </div>
          )}

          <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Students</span>
              <span className="font-semibold">{selectedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Batch seats after</span>
              <span className="font-semibold">
                {targetBatchAlreadyAssigned + selectedCount}/{targetBatchCapacity}
              </span>
            </div>
            {selectedCourseName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course</span>
                <span className="font-semibold">{selectedCourseName}</span>
              </div>
            )}
          </div>

          {selectedOnPagePreview.length > 0 && selectedCount <= 20 && (
            <div className="max-h-40 overflow-y-auto space-y-1 p-3 bg-muted/40 rounded-lg border border-border text-xs">
              {selectedOnPagePreview.map((s) => (
                <div key={s.id} className="flex justify-between">
                  <span>{s.user?.name || s.studentCode}</span>
                  <span className="font-mono text-muted-foreground">{s.studentCode}</span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isAssigning}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmBulkAssign}
              disabled={isAssigning}
              size="sm"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Assigning...
                </>
              ) : (
                `Confirm assign ${selectedCount}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!transferModalStudent} onOpenChange={() => setTransferModalStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Transfer student</DialogTitle>
            <DialogDescription className="text-sm">
              Move {transferModalStudent?.name} ({transferModalStudent?.code}) to another batch.
            </DialogDescription>
          </DialogHeader>

          {transferModalStudent && (
            <div className="space-y-3 text-sm pt-1">
              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Current batch</p>
                <p className="font-medium mt-0.5">{transferModalStudent.currentBatchCode}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Transfer to</label>
                <select
                  value={transferTargetBatchId}
                  onChange={(e) => setTransferTargetBatchId(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background"
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTransferModalStudent(null)}
              disabled={isTransferring}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteTransfer}
              disabled={isTransferring || !transferTargetBatchId}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Transferring...
                </>
              ) : (
                "Transfer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeModalStudent} onOpenChange={() => setRemoveModalStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Remove from batch</DialogTitle>
            <DialogDescription className="text-sm">
              Remove {removeModalStudent?.name} from {removeModalStudent?.batchCode}?
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Student will become unassigned and leave this batch’s schedule and attendance.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemoveModalStudent(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteRemove}
              disabled={isRemoving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
