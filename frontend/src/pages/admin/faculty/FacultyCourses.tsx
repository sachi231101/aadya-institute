import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import { useCourseStore } from "../../../store/course.store";
import { useAuthStore } from "../../../store/auth.store";
import { useBranches } from "@/hooks/useBranches";
import { useCourses } from "@/hooks/useCourses";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatSchedules = (schedules: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
  if (!schedules || schedules.length === 0) return "";
  return schedules
    .map((s) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}–${s.endTime}`)
    .join(", ");
};

export const FacultyCourses: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFacultyId = searchParams.get("facultyId") || "";

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

  // Store batches
  const { batches: storeBatches, fetchBatches } = useCourseStore();
  const { courses: allCoursesList } = useCourses();
  const { data: branchesResponse } = useBranches({ limit: 50 });
  const branches = branchesResponse?.data || [];

  React.useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Modal Form state (Admin/Manager/Counsellor only)
  const [newFacultyId, setNewFacultyId] = useState<string>("");
  const [newBatchId, setNewBatchId] = useState<string>("");

  // Fetch data from backend
  const coursesParams = {
    limit: 100,
    facultyId: isFacultyOnly ? undefined : (selectedFacultyId !== "ALL" ? selectedFacultyId : undefined),
  };

  const { data: coursesResponse, isLoading, isError, refetch } = useFacultyCourses(coursesParams);
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const assignMutation = useAssignFacultyCourse();

  const actualAssignments = coursesResponse?.data ?? [];
  const facultyList = facultyResponse?.data ?? [];

  // Filter assignments according to role and status
  const assignments = useMemo(() => {
    return actualAssignments.filter((a) => {
      // 1. Status filter
      const matchesStatus = selectedStatusFilter === "ALL" || a.status === selectedStatusFilter;

      // 2. Course filter
      const matchesCourse = selectedCourseFilter === "ALL" || 
        a.course?.id === selectedCourseFilter || 
        a.course?.name === selectedCourseFilter;

      // 3. Branch filter
      const matchesBranch = selectedBranchFilter === "ALL" || 
        a.branchId === selectedBranchFilter || 
        a.branch?.id === selectedBranchFilter;

      // 4. Faculty isolation: if faculty-only, backend already limits, but double-check locally
      if (isFacultyOnly && user) {
        const userName = (user.name || "").trim().toLowerCase();
        const facultyUserName = (a.faculty?.user?.name || "").trim().toLowerCase();
        const matchesFacultyUser = a.faculty?.user?.id === user.id || 
          (a.faculty as any)?.userId === user.id ||
          facultyUserName === userName ||
          (userName && facultyUserName.includes(userName));
        
        return matchesStatus && matchesCourse && matchesBranch && (matchesFacultyUser || !a.faculty);
      }

      return matchesStatus && matchesCourse && matchesBranch;
    });
  }, [actualAssignments, selectedStatusFilter, selectedCourseFilter, selectedBranchFilter, isFacultyOnly, user]);

  // Key stats
  const totalCoursesCount = new Set(assignments.map((a) => a.course?.id || a.courseId)).size;
  const activeBatchesCount = assignments.filter((a) => a.status === "ACTIVE" || !a.status).length;
  const totalStudentsTaught = assignments.reduce((acc, curr) => acc + (curr._count?.enrollments ?? 0), 0);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacultyId || !newBatchId) return;

    try {
      await assignMutation.mutateAsync({
        batchId: newBatchId,
        facultyId: newFacultyId,
      });
      setNewFacultyId("");
      setNewBatchId("");
      setShowAssignModal(false);
      refetch();
    } catch (error) {
      console.error("Failed to assign faculty to batch:", error);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1680px] mx-auto space-y-6 bg-[#f8fafc] min-h-screen">
      {/* ─── BREADCRUMB & HEADER ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Dashboard</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Faculty Portal</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[#1769AA] font-bold">
            {isFacultyOnly ? "My Batches & Courses" : "Faculty Course Allocations"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              {isFacultyOnly ? "My Batches & Courses" : "Faculty Course Allocations"}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              {isFacultyOnly
                ? "View and manage the courses and batches assigned to you."
                : "Manage faculty assignments across courses, batches, and academic cohorts."}
            </p>
          </div>

          {!isFacultyOnly && (
            <Button
              onClick={() => setShowAssignModal(true)}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold h-10 px-4 rounded-xl shadow-md gap-2 shrink-0 transition-all hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" />
              Assign Batch to Faculty
            </Button>
          )}
        </div>
      </div>

      {/* ─── SUMMARY KPI METRICS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#1769AA] shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {isFacultyOnly ? "My Assigned Courses" : "Assigned Courses"}
              </p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">{totalCoursesCount}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Distinct curricula</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Batches</p>
              <h3 className="text-xl font-black text-emerald-600 mt-0.5">{activeBatchesCount}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Currently running cohorts</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-xs bg-white rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Students Impacted</p>
              <h3 className="text-xl font-black text-indigo-600 mt-0.5">{totalStudentsTaught}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Enrolled in your batches</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── FILTER TOOLBAR ─── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
          {["ALL", "ACTIVE", "UPCOMING", "COMPLETED"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatusFilter(status)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                selectedStatusFilter === status
                  ? "bg-[#1769AA] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
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
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="w-full h-9 pl-3 pr-8 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1769AA]/30 outline-none cursor-pointer"
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
              className="w-full h-9 pl-3 pr-8 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1769AA]/30 outline-none cursor-pointer"
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
              className="w-full h-9 pl-3 pr-8 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1769AA]/30 outline-none cursor-pointer"
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
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="h-8 w-8 animate-spin text-[#1769AA] mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading assigned batches and courses...</p>
        </div>
      ) : isError ? (
        <Card className="border border-rose-200 bg-rose-50/40 text-center py-12 rounded-2xl">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500 mb-3" />
          <h3 className="text-sm font-bold text-rose-900 mb-1">Failed to load course assignments</h3>
          <p className="text-xs text-rose-600 max-w-sm mx-auto">Please check your network connection or try again.</p>
        </Card>
      ) : assignments.length === 0 ? (
        /* ─── EXACT EMPTY STATE ─── */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-xl mx-auto space-y-3 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-[#1769AA] flex items-center justify-center text-2xl shadow-2xs">
            📚
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Courses Assigned Yet</h3>
          <p className="text-xs text-slate-500 font-medium">
            You currently do not have any course or batch assignments.
          </p>
          <p className="text-[11px] text-slate-400">
            Please contact your Center Manager or Administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignments.map((item) => {
            const courseName = item.course?.name || "Course";
            const batchCode = item.code;
            const branchName = item.branch?.name || "Aadya Central Branch";
            const studentCount = item._count?.enrollments ?? 0;
            const scheduleDisplay = formatSchedules(item.schedules) || (item as any).timeSlot || "Mon–Sat • 10:00 AM – 11:00 AM";
            const facultyName = item.faculty?.user?.name || user?.name || "Faculty Member";

            const statusVariant = 
              item.status === "ACTIVE" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : item.status === "COMPLETED" 
                ? "bg-slate-100 text-slate-700 border-slate-200" 
                : "bg-blue-50 text-blue-700 border-blue-200";

            return (
              <Card 
                key={item.id} 
                className="border border-slate-200/90 shadow-xs bg-white rounded-2xl hover:border-[#1769AA]/40 transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#1769AA] shrink-0" />
                        <h3 className="text-sm font-black text-slate-900 truncate" title={courseName}>
                          {courseName}
                        </h3>
                      </div>
                      <p className="text-xs font-mono text-slate-500 font-medium">
                        Batch: <strong className="text-slate-800">{batchCode}</strong>
                      </p>
                    </div>

                    <Badge className={`text-[10px] font-black shrink-0 ${statusVariant}`}>
                      ● {item.status || "ACTIVE"}
                    </Badge>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-2 text-xs pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        👨‍🏫 Instructor:
                      </span>
                      <span className="font-bold text-slate-900">
                        {isFacultyOnly ? `${facultyName} — You` : facultyName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" /> Location:
                      </span>
                      <span className="font-medium text-slate-800 truncate max-w-[180px]">{branchName}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" /> Enrolled:
                      </span>
                      <span className="font-black text-emerald-700">{studentCount} Students</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> Schedule:
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-800 text-right truncate max-w-[200px]">
                        {scheduleDisplay}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(isFacultyOnly ? `/faculty/batches` : `/admin/courses/batches`)}
                    className="flex-1 text-xs font-bold h-8.5 rounded-xl border-slate-200 text-slate-700 hover:bg-white"
                  >
                    View Batch
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(isFacultyOnly ? `/faculty/schedule/classes` : `/admin/schedule/classes`)}
                    className="flex-1 bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold h-8.5 rounded-xl shadow-2xs gap-1"
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
        <div className={showAssignModal ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4" : "hidden"}>
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Assign Batch to Faculty</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Select Faculty Member *</label>
                <select
                  value={newFacultyId}
                  onChange={(e) => setNewFacultyId(e.target.value)}
                  required
                  className="w-full h-9.5 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                >
                  <option value="">-- Choose Faculty --</option>
                  {facultyList.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.user?.name || f.name} ({f.employeeCode || "FA"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Select Batch *</label>
                <select
                  value={newBatchId}
                  onChange={(e) => setNewBatchId(e.target.value)}
                  required
                  className="w-full h-9.5 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                >
                  <option value="">-- Choose Batch --</option>
                  {storeBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} – {b.name} ({b.courseName || "Course"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignModal(false)}
                  className="text-xs font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={assignMutation.isPending || !newFacultyId || !newBatchId}
                  className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl"
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
