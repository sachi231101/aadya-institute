import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  CheckCircle2, 
  MoreVertical, 
  Trash2,
  UserCheck,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { useBatches } from "../../../hooks/useBatches";
import { useCourses } from "../../../hooks/useCourses";
import { useFacultyList } from "../../../hooks/useFaculty";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MasterSelect } from "@/components/common/MasterSelect";
import { ClassroomDropdown } from "@/components/common/ClassroomDropdown";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { getMasterLabel } from "@/utils/master.utils";
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
  const { batches, loading, createBatch, deleteBatch } = useBatches({
    search: searchTerm,
    courseId: courseFilter !== "ALL" ? courseFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });
  const { data: facultyResponse } = useFacultyList({ limit: 100 });
  const facultyList = facultyResponse?.data ?? [];

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [courseId, setCourseId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [startDate, setStartDate] = useState("2026-04-01");
  const [schedulePattern, setSchedulePattern] = useState<"MWF" | "TTS" | "WEEKEND" | "CUSTOM">("MWF");
  const [timeSlotMasterId, setTimeSlotMasterId] = useState("");
  const [classroomMasterId, setClassroomMasterId] = useState("");
  const { options: timeslotOptions } = useMasterDropdown("timeslot");
  const [capacity, setCapacity] = useState<number>(35);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 2-Step Delete Modal State
  const [batchToDelete, setBatchToDelete] = useState<{ id: string; name: string; code: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredBatches = batches.filter((b) => {
    const facultyName = b.faculty?.user?.name || "";
    const courseName = b.course?.name || "";

    const matchesSearch =
      !searchTerm ||
      (b.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      facultyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      courseName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse = courseFilter === "ALL" || b.courseId === courseFilter;
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const activeCount = batches.filter((b) => b.status === "ACTIVE").length;
  const upcomingCount = batches.filter((b) => b.status === "UPCOMING").length;
  const totalEnrolled = batches.reduce((acc, b) => acc + (b._count?.enrollments || 0), 0);
  const totalCapacity = batches.reduce((acc, b) => acc + (b.capacity || 35), 0);
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !courseId) return;

    try {
      setSubmitting(true);
      setCreateError(null);
      await createBatch({
        name,
        code,
        courseId,
        facultyId: facultyId || undefined,
        startDate,
        schedulePattern,
        timeSlot: getMasterLabel(timeslotOptions, timeSlotMasterId) || undefined,
        capacity,
      });

      setName("");
      setCode("");
      setShowModal(false);
      setSuccessMsg(`Batch "${code} - ${name}" created successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.message || "Failed to create batch");
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
            setCreateError(null);
            setShowModal(true);
          }}
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
                    <TableHead className="font-bold text-foreground">Associated Course</TableHead>
                    <TableHead className="font-bold text-foreground">Instructor</TableHead>
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
                      const instructorName = batch.faculty?.user?.name || "Unassigned";

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
                            {batch.course?.name || "N/A"}
                          </TableCell>
                          <TableCell className="text-xs text-foreground py-3.5">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-semibold">{instructorName}</span>
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

      {/* Modal Dialog for Creating New Batch */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-foreground">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Create New Batch
            </h3>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Select Course *</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Batch Name *</label>
                  <Input
                    type="text"
                    placeholder="e.g. MERN Cohort 3"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Batch Code *</label>
                  <Input
                    type="text"
                    placeholder="e.g. FS-2026-C1"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Assigned Instructor</label>
                <select
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.user?.name || (f as any).name} ({f.employeeCode || (f as any).facultyCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Schedule Pattern</label>
                  <select
                    value={schedulePattern}
                    onChange={(e) => setSchedulePattern(e.target.value as any)}
                    className="w-full h-10 px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs font-bold text-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="MWF">Mon, Wed, Fri (MWF)</option>
                    <option value="TTS">Tue, Thu, Sat (TTS)</option>
                    <option value="WEEKEND">Weekend (Sat, Sun)</option>
                    <option value="CUSTOM">Custom Schedule</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Max Capacity</label>
                  <Input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Time Slot</label>
                  <MasterSelect
                    entityType="timeslot"
                    value={timeSlotMasterId}
                    onChange={setTimeSlotMasterId}
                    placeholder="Select time slot"
                    className="mt-0 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Classroom</label>
                  <ClassroomDropdown
                    value={classroomMasterId}
                    onChange={setClassroomMasterId}
                    className="mt-0 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-muted/30 border-border text-foreground focus:bg-background rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="rounded-xl border-border bg-card text-foreground hover:bg-muted/40 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold cursor-pointer"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Batch"
                  )}
                </Button>
              </div>
            </form>
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
