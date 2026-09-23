import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Users, Clock, Loader2, AlertCircle, Building2 } from "lucide-react";
import { useFacultyCourses, useAssignFacultyCourse, useFacultyList } from "../../../hooks/useFaculty";
import { useBatches } from "../../../hooks/useBatches";
import { useAuthStore } from "../../../store/auth.store";
import { useCourses } from "@/hooks/useCourses";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, FilterToolbar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBatchSubjectNames, getBatchCourseRows } from "@/utils/batch.utils";
import { PermissionGate } from "@/components/permissions/PermissionGate";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatSchedules = (
  schedules: { dayOfWeek: number; startTime: string; endTime: string }[]
) => {
  if (!schedules || schedules.length === 0) return "";
  return schedules
    .map((s) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}–${s.endTime}`)
    .join(", ");
};

const filterSelectClass =
  "h-[34px] text-xs font-medium border border-border rounded-lg px-3 text-foreground bg-muted/30 focus:outline-none focus:bg-background focus:border-primary cursor-pointer";

const fieldLabel = "block text-xs font-medium text-muted-foreground mb-1.5";
const fieldSelect =
  "w-full h-9 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-60";

export const CourseAssignment: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFacultyId = searchParams.get("facultyId") || "";

  const { user } = useAuthStore();
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isAdmin = userRoles.includes("ADMIN");
  const isBranchManager = userRoles.includes("CENTER_MANAGER");
  const isCounsellor = userRoles.includes("COUNSELLOR");
  const isFacultyOnly =
    userRoles.includes("FACULTY") && !isAdmin && !isBranchManager && !isCounsellor;

  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(
    initialFacultyId || "ALL"
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const { batches: liveBatches } = useBatches();
  const { courses: allCoursesList } = useCourses();

  useEffect(() => {
    if (initialFacultyId && initialFacultyId !== selectedFacultyId) {
      setSelectedFacultyId(initialFacultyId);
    }
  }, [initialFacultyId, selectedFacultyId]);

  const handleFacultyFilterChange = (value: string) => {
    setSelectedFacultyId(value);
    if (value === "ALL") {
      searchParams.delete("facultyId");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ facultyId: value });
    }
  };

  const [newFacultyId, setNewFacultyId] = useState("");
  const [newBatchId, setNewBatchId] = useState("");
  const [newCourseId, setNewCourseId] = useState("");

  const coursesParams = {
    limit: 100,
    facultyId: isFacultyOnly
      ? undefined
      : selectedFacultyId !== "ALL"
        ? selectedFacultyId
        : undefined,
  };

  const { data: coursesResponse, isLoading, isError, refetch } =
    useFacultyCourses(coursesParams);
  const { data: facultyResponse } = useFacultyList(
    { limit: 100, status: "ACTIVE" },
    { enabled: !isFacultyOnly }
  );
  const assignMutation = useAssignFacultyCourse();

  const actualAssignments = coursesResponse?.data ?? [];
  const facultyList = (facultyResponse?.data ?? []).filter((f) => f.status === "ACTIVE");

  const assignments = useMemo(() => {
    return actualAssignments.filter((a) => {
      const matchesStatus =
        selectedStatusFilter === "ALL" || a.status === selectedStatusFilter;
      const matchesCourse =
        selectedCourseFilter === "ALL" ||
        a.course?.id === selectedCourseFilter ||
        a.course?.name === selectedCourseFilter;
      return matchesStatus && matchesCourse;
    });
  }, [actualAssignments, selectedStatusFilter, selectedCourseFilter]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacultyId || !newBatchId || !newCourseId) return;

    try {
      setAssignError(null);
      await assignMutation.mutateAsync({
        batchId: newBatchId,
        facultyId: newFacultyId,
        courseId: newCourseId,
      });
      setNewFacultyId("");
      setNewBatchId("");
      setNewCourseId("");
      setShowAssignModal(false);
      refetch();
    } catch (error: any) {
      setAssignError(
        error?.response?.data?.message || "Failed to assign faculty to batch"
      );
    }
  };

  const assignSubjectOptions = useMemo(() => {
    const batch = liveBatches.find((b) => b.id === newBatchId);
    if (!batch) return [];
    return getBatchCourseRows(batch);
  }, [liveBatches, newBatchId]);

  useEffect(() => {
    if (!newBatchId) {
      setNewCourseId("");
      return;
    }
    const rows = assignSubjectOptions;
    if (rows.length === 0) {
      setNewCourseId("");
      return;
    }
    if (!rows.some((r) => r.courseId === newCourseId)) {
      setNewCourseId(rows[0].courseId);
    }
  }, [newBatchId, assignSubjectOptions, newCourseId]);

  const closeModal = () => {
    setShowAssignModal(false);
    setAssignError(null);
  };

  return (
    <PageContainer className="animate-in fade-in duration-300">
      <PageHeader
        title={isFacultyOnly ? "My courses" : "Faculty assignment"}
        actions={
          !isFacultyOnly ? (
            <PermissionGate itemKey="courses.course_assignment" mode="write">
              <Button
                size="sm"
                onClick={() => setShowAssignModal(true)}
                className="bg-primary hover:bg-primary/90 text-white text-xs font-medium h-9 px-3.5 rounded-lg cursor-pointer"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Assign
              </Button>
            </PermissionGate>
          ) : undefined
        }
      />

      <FilterToolbar className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/80 overflow-x-auto">
          {["ALL", "ACTIVE", "UPCOMING", "COMPLETED"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                selectedStatusFilter === status
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {!isFacultyOnly && (
            <select
              value={selectedFacultyId}
              onChange={(e) => handleFacultyFilterChange(e.target.value)}
              className={`${filterSelectClass} min-w-[160px]`}
            >
              <option value="ALL">All faculty</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.user?.name || (f as { name?: string }).name || "Faculty"}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className={`${filterSelectClass} min-w-[140px]`}
          >
            <option value="ALL">All courses</option>
            {allCoursesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </FilterToolbar>

      {isLoading ? (
        <div className="py-14 flex justify-center items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading…
        </div>
      ) : isError ? (
        <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent className="py-12 text-center space-y-2">
            <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
            <p className="text-sm font-medium text-foreground">Failed to load</p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 rounded-lg cursor-pointer"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : assignments.length === 0 ? (
        <Card className="border border-border/80 shadow-2xs bg-card rounded-xl">
          <CardContent className="py-14 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No assignments yet</p>
            {!isFacultyOnly && (
              <PermissionGate itemKey="courses.course_assignment" mode="write">
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white text-xs font-medium h-9 rounded-lg cursor-pointer"
                  onClick={() => setShowAssignModal(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Assign
                </Button>
              </PermissionGate>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {assignments.map((item) => {
            const courseName = item.course?.name || "Course";
            const batchName = item.name;
            const batchCode = item.code;
            const branchName = item.branch?.name || "—";
            const studentCount = item._count?.enrollments ?? 0;
            const scheduleDisplay =
              formatSchedules(item.schedules) ||
              (item as { timeSlot?: string }).timeSlot ||
              "—";
            const facultyName =
              item.faculty?.user?.name || user?.name || "—";

            const statusClass =
              item.status === "ACTIVE"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : item.status === "COMPLETED"
                  ? "bg-muted text-muted-foreground border-border"
                  : "bg-primary/10 text-primary border-primary/20";

            return (
              <Card
                key={item.id}
                className="border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {courseName}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        <span className="font-mono">{batchCode}</span>
                        {batchName && batchName !== batchCode ? ` · ${batchName}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium shrink-0 ${statusClass}`}
                    >
                      {item.status || "ACTIVE"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs border-t border-border/70 pt-3">
                    {!isFacultyOnly && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Faculty</span>
                        <span className="font-medium text-foreground truncate max-w-[60%] text-right">
                          {facultyName}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Branch
                      </span>
                      <span className="font-medium text-foreground truncate max-w-[60%] text-right">
                        {branchName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Students
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {studentCount}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-muted-foreground inline-flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        Schedule
                      </span>
                      <span className="font-medium text-foreground text-right text-[11px] leading-snug">
                        {scheduleDisplay}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isFacultyOnly && showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Assign faculty</h3>
            <form onSubmit={handleAssignSubmit} className="space-y-3.5">
              {assignError ? (
                <p className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  {assignError}
                </p>
              ) : null}

              <div>
                <label className={fieldLabel}>Faculty *</label>
                <select
                  value={newFacultyId}
                  onChange={(e) => setNewFacultyId(e.target.value)}
                  required
                  className={fieldSelect}
                >
                  <option value="">Select…</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user?.name || "Faculty"}
                      {f.employeeCode ? ` (${f.employeeCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={fieldLabel}>Batch *</label>
                <select
                  value={newBatchId}
                  onChange={(e) => {
                    setNewBatchId(e.target.value);
                    setNewCourseId("");
                  }}
                  required
                  className={fieldSelect}
                >
                  <option value="">Select…</option>
                  {liveBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) · {formatBatchSubjectNames(b)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={fieldLabel}>Subject *</label>
                <select
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  required
                  disabled={!newBatchId || assignSubjectOptions.length === 0}
                  className={fieldSelect}
                >
                  <option value="">Select…</option>
                  {assignSubjectOptions.map((row) => (
                    <option key={row.courseId} value={row.courseId}>
                      {row.course?.name || row.courseId}
                      {row.faculty?.user?.name
                        ? ` · ${row.faculty.user.name}`
                        : " · unassigned"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/70">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  className="rounded-lg text-xs font-medium h-9 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    assignMutation.isPending ||
                    !newFacultyId ||
                    !newBatchId ||
                    !newCourseId
                  }
                  className="bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-medium h-9 cursor-pointer"
                >
                  {assignMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
