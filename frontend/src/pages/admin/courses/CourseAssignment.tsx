import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { 
  BookOpen, 
  Users, 
  Clock, 
  Plus, 
  GraduationCap,
  Layers,
  Loader2,
  AlertCircle,
  Building2,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { useFacultyCourses, useAssignFacultyCourse, useFacultyList } from "../../../hooks/useFaculty";
import { useBatches } from "../../../hooks/useBatches";
import { useAuthStore } from "../../../store/auth.store";
import { useBranches } from "@/hooks/useBranches";
import { useCourses } from "@/hooks/useCourses";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBatchSubjectNames, getBatchCourseRows } from "@/utils/batch.utils";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatSchedules = (schedules: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
  if (!schedules || schedules.length === 0) return "";
  return schedules
    .map((s) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}–${s.endTime}`)
    .join(", ");
};

export const CourseAssignment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFacultyId = searchParams.get("facultyId") || "";

  const basePath = location.pathname.startsWith("/center")
    ? "/center"
    : location.pathname.startsWith("/faculty")
    ? "/faculty"
    : "/admin";

  const { user } = useAuthStore();
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isAdmin = userRoles.includes("ADMIN");
  const isBranchManager = userRoles.includes("CENTER_MANAGER");
  const isCounsellor = userRoles.includes("COUNSELLOR");
  const isFacultyOnly = userRoles.includes("FACULTY") && !isAdmin && !isBranchManager && !isCounsellor;

  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(initialFacultyId || "ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const { batches: liveBatches } = useBatches();
  const { courses: allCoursesList } = useCourses();
  const { data: branchesResponse } = useBranches({ limit: 50 });
  const branches = branchesResponse?.data || [];

  useEffect(() => {
    if (initialFacultyId && initialFacultyId !== selectedFacultyId) {
      setSelectedFacultyId(initialFacultyId);
    }
  }, [initialFacultyId]);

  const handleFacultyFilterChange = (value: string) => {
    setSelectedFacultyId(value);
    if (value === "ALL") {
      searchParams.delete("facultyId");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ facultyId: value });
    }
  };

  // Modal Form state (Admin/Manager/Counsellor only)
  const [newFacultyId, setNewFacultyId] = useState<string>("");
  const [newBatchId, setNewBatchId] = useState<string>("");
  const [newCourseId, setNewCourseId] = useState<string>("");

  // Fetch data from backend
  const coursesParams = {
    limit: 100,
    facultyId: isFacultyOnly ? undefined : (selectedFacultyId !== "ALL" ? selectedFacultyId : undefined),
  };

  const { data: coursesResponse, isLoading, isError, refetch } = useFacultyCourses(coursesParams);
  const { data: facultyResponse } = useFacultyList({ limit: 100, status: "ACTIVE" });
  const assignMutation = useAssignFacultyCourse();

  const actualAssignments = coursesResponse?.data ?? [];
  const facultyList = (facultyResponse?.data ?? []).filter((f) => f.status === "ACTIVE");

  // Filter assignments according to role and status
  const assignments = useMemo(() => {
    return actualAssignments.filter((a) => {
      const matchesStatus = selectedStatusFilter === "ALL" || a.status === selectedStatusFilter;
      const matchesCourse = selectedCourseFilter === "ALL" || 
        a.course?.id === selectedCourseFilter || 
        a.course?.name === selectedCourseFilter;
      const matchesBranch = selectedBranchFilter === "ALL" || 
        a.branchId === selectedBranchFilter || 
        a.branch?.id === selectedBranchFilter;

      if (isFacultyOnly && user) {
        const matchesFacultyUser =
          a.faculty?.user?.id === user.id ||
          (a.faculty as { userId?: string } | null)?.userId === user.id;
        return matchesStatus && matchesCourse && matchesBranch && matchesFacultyUser;
      }

      return matchesStatus && matchesCourse && matchesBranch;
    });
  }, [actualAssignments, selectedStatusFilter, selectedCourseFilter, selectedBranchFilter, isFacultyOnly, user]);

  const totalCoursesCount = new Set(assignments.map((a) => a.course?.id || a.courseId)).size;
  const activeBatchesCount = assignments.filter((a) => a.status === "ACTIVE" || !a.status).length;
  const totalStudentsTaught = assignments.reduce((acc, curr) => acc + (curr._count?.enrollments ?? 0), 0);

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
      setAssignError(error?.response?.data?.message || "Failed to assign faculty to batch");
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

  return (
    <div className="p-6 md:p-8 max-w-[1680px] mx-auto space-y-6 min-h-screen relative overflow-x-hidden animate-in fade-in duration-300">
      {/* ─── BREADCRUMB & HEADER ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>Dashboard</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Faculty Portal</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-primary font-bold">
            {isFacultyOnly ? "My Batches & Courses" : "Assign Faculty to Courses"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              {isFacultyOnly ? "My Batches & Courses" : "Assign Faculty to Courses"}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground font-medium mt-0.5">
              {isFacultyOnly
                ? "View and manage the courses and batches assigned to you."
                : "Assign faculty instructors to courses and batches across the institute."}
            </p>
          </div>

          {!isFacultyOnly && (
            <Button
              onClick={() => setShowAssignModal(true)}
              className="bg-primary hover:bg-primary/90 text-white text-xs font-bold h-10 px-4 rounded-xl shadow-md gap-2 shrink-0 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Assign Batch to Faculty
            </Button>
          )}
        </div>
      </div>

      {/* ─── SUMMARY KPI METRICS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/40 text-primary dark:text-sky-400 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {isFacultyOnly ? "My Assigned Courses" : "Assigned Courses"}
              </p>
              <h3 className="text-xl font-black text-foreground mt-0.5">{totalCoursesCount}</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Distinct curricula</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Batches</p>
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{activeBatchesCount}</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Currently running cohorts</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs bg-card rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Students Impacted</p>
              <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{totalStudentsTaught}</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Enrolled in your batches</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── FILTER TOOLBAR ─── */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border overflow-x-auto">
          {["ALL", "ACTIVE", "UPCOMING", "COMPLETED"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatusFilter(status)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                selectedStatusFilter === status
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "ALL" ? "All Courses" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Optional Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Faculty Selector (Visible ONLY to Admin / Center Manager / Counsellor) */}
          {!isFacultyOnly && (
            <div className="relative min-w-[200px]">
              <select
                value={selectedFacultyId}
                onChange={(e) => handleFacultyFilterChange(e.target.value)}
                className="w-full h-9 pl-3 pr-8 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-background outline-none cursor-pointer"
              >
                <option value="ALL">All Faculty Members</option>
                {facultyList.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.user?.name || f.name} ({f.employeeCode || "FA"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Course Filter */}
          <div className="relative min-w-[180px]">
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-background outline-none cursor-pointer"
            >
              <option value="ALL">All Courses</option>
              {allCoursesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="relative min-w-[180px]">
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-xs font-bold text-foreground bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-background outline-none cursor-pointer"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── ASSIGNED COURSES & BATCHES GRID ─── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-border">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-xs font-bold text-muted-foreground">Loading assigned batches and courses...</p>
        </div>
      ) : isError ? (
        <Card className="border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 text-center py-12 rounded-2xl">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500 mb-3" />
          <h3 className="text-sm font-bold text-rose-900 dark:text-rose-300 mb-1">Failed to load course assignments</h3>
          <p className="text-xs text-rose-600 dark:text-rose-400 max-w-sm mx-auto">Please check your network connection or try again.</p>
        </Card>
      ) : assignments.length === 0 ? (
        /* ─── EXACT EMPTY STATE ─── */
        <div className="bg-card rounded-2xl border border-border p-12 text-center max-w-xl mx-auto space-y-3 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/40 text-primary dark:text-sky-400 flex items-center justify-center text-2xl shadow-2xs">
            📚
          </div>
          <h3 className="text-lg font-black text-foreground">No Courses Assigned Yet</h3>
          <p className="text-xs text-muted-foreground font-medium">
            You currently do not have any course or batch assignments.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Please contact your Center Manager or Administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignments.map((item) => {
            const courseName = item.course?.name || "Course";
            const batchName = item.name;
            const batchCode = item.code;
            const branchName = item.branch?.name || "Aadya Central Branch";
            const studentCount = item._count?.enrollments ?? 0;
            const scheduleDisplay = formatSchedules(item.schedules) || (item as any).timeSlot || "Mon–Sat • 10:00 AM – 11:00 AM";
            const facultyName = item.faculty?.user?.name || user?.name || "Faculty Member";

            const statusVariant = 
              item.status === "ACTIVE" 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                : item.status === "COMPLETED" 
                ? "bg-slate-500/10 text-muted-foreground border-border" 
                : "bg-blue-500/10 text-primary dark:text-sky-400 border-blue-500/20";

            return (
              <Card 
                key={item.id} 
                className="border border-border shadow-xs bg-card rounded-2xl hover:border-primary/50 transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="text-sm font-black text-foreground truncate" title={courseName}>
                          {courseName}
                        </h3>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground font-medium">
                        Batch: <strong className="text-foreground">{batchCode}</strong>
                        {batchName && batchName !== batchCode ? (
                          <span className="font-sans font-normal"> · {batchName}</span>
                        ) : null}
                      </p>
                    </div>

                    <Badge className={`text-[10px] font-black shrink-0 ${statusVariant}`}>
                      ● {item.status || "ACTIVE"}
                    </Badge>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-2.5 text-xs pt-3 border-t border-border/70">
                    <div className="flex items-center justify-between text-foreground">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        👨‍🏫 Instructor:
                      </span>
                      <span className="font-bold text-foreground">
                        {isFacultyOnly ? `${facultyName} — You` : facultyName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-foreground">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Location:
                      </span>
                      <span className="font-medium text-foreground truncate max-w-[180px]">{branchName}</span>
                    </div>

                    <div className="flex items-center justify-between text-foreground">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" /> Enrolled:
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">{studentCount} Students</span>
                    </div>

                    <div className="flex items-center justify-between text-foreground">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Schedule:
                      </span>
                      <span className="font-mono text-[11px] font-bold text-foreground text-right truncate max-w-[200px]">
                        {scheduleDisplay}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-muted/30 border-t border-border flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(isFacultyOnly ? `/faculty/batches` : `${basePath}/courses/batches`)}
                    className="flex-1 text-xs font-bold h-8.5 rounded-xl border-border bg-card text-foreground hover:bg-muted/40 cursor-pointer shadow-2xs"
                  >
                    View Batch
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(isFacultyOnly ? `/faculty/schedule/classes` : `${basePath}/schedule/classes`)}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white text-xs font-bold h-8.5 rounded-xl shadow-2xs gap-1 cursor-pointer"
                  >
                    Mark Attendance
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── ASSIGN BATCH TO FACULTY MODAL (Admin / Center Manager / Counsellor only) ─── */}
      {!isFacultyOnly && (
        <div className={showAssignModal ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" : "hidden"}>
          <div className="bg-card rounded-2xl border border-border max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Assign Batch to Faculty</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              {assignError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {assignError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Select Faculty Member *</label>
                <select
                  value={newFacultyId}
                  onChange={(e) => setNewFacultyId(e.target.value)}
                  required
                  className="w-full h-9.5 px-3 rounded-xl border border-border bg-muted/30 font-medium text-foreground focus:bg-background focus:border-primary outline-none cursor-pointer"
                >
                  <option value="">-- Choose Faculty --</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user?.name || "Faculty"} ({f.employeeCode || "FA"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Select Batch *</label>
                <select
                  value={newBatchId}
                  onChange={(e) => {
                    setNewBatchId(e.target.value);
                    setNewCourseId("");
                  }}
                  required
                  className="w-full h-9.5 px-3 rounded-xl border border-border bg-muted/30 font-medium text-foreground focus:bg-background focus:border-primary outline-none cursor-pointer"
                >
                  <option value="">-- Choose Batch --</option>
                  {liveBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} – {b.name} ({formatBatchSubjectNames(b)})
                      {b.facultyId ? " · coordinator set" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Select Subject *</label>
                <select
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  required
                  disabled={!newBatchId || assignSubjectOptions.length === 0}
                  className="w-full h-9.5 px-3 rounded-xl border border-border bg-muted/30 font-medium text-foreground focus:bg-background focus:border-primary outline-none cursor-pointer disabled:opacity-60"
                >
                  <option value="">-- Choose Subject --</option>
                  {assignSubjectOptions.map((row) => (
                    <option key={row.courseId} value={row.courseId}>
                      {row.course?.name || row.courseId}
                      {row.faculty?.user?.name ? ` · ${row.faculty.user.name}` : " · unassigned"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignModal(false)}
                  className="text-xs font-bold rounded-xl border-border bg-card text-foreground hover:bg-muted/40 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={assignMutation.isPending || !newFacultyId || !newBatchId || !newCourseId}
                  className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {assignMutation.isPending ? "Assigning..." : "Assign Faculty"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
