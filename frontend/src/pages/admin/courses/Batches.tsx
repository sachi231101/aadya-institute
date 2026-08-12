import React, { useState } from "react";
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
  Loader2
} from "lucide-react";
import { useBatches } from "../../../hooks/useBatches";
import { useCourses } from "../../../hooks/useCourses";
import { useFacultyList } from "../../../hooks/useFaculty";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

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
  const [timeSlot, setTimeSlot] = useState("10:00 AM - 12:00 PM");
  const [capacity, setCapacity] = useState<number>(35);
  const [submitting, setSubmitting] = useState(false);

  const filteredBatches = batches.filter((b) => {
    const facultyName = b.faculty?.user?.name || "";
    const courseName = b.course?.name || "";

    const matchesSearch =
      !searchTerm ||
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      await createBatch({
        name,
        code,
        courseId,
        facultyId: facultyId || undefined,
        startDate,
        schedulePattern,
        timeSlot,
        capacity,
      });

      setName("");
      setCode("");
      setShowModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to create batch");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this batch?")) {
      await deleteBatch(id);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Batch Management</h2>
          <p className="text-sm text-text-secondary">
            Monitor active student cohorts, schedules, faculty allocation, and capacity limits.
          </p>
        </div>

        <Button 
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm transition-colors"
          onClick={() => {
            if (courses.length > 0 && !courseId) setCourseId(courses[0].id);
            setShowModal(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Batch
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Active Batches</p>
              <h3 className="text-2xl font-bold text-text-primary">{activeCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Upcoming Batches</p>
              <h3 className="text-2xl font-bold text-text-primary">{upcomingCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Batch Enrolled</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalEnrolled} / {totalCapacity}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Avg Occupancy</p>
              <h3 className="text-2xl font-bold text-text-primary">{avgOccupancy}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table & Filters */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by batch name, code, course, or instructor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-bg-secondary border-border/50"
              />
            </div>

            {/* Filter Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
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
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-md border border-border/50 overflow-hidden bg-white">
            {loading ? (
              <div className="py-12 flex justify-center items-center text-text-muted">
                <Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" />
                <span className="ml-2 text-sm font-medium">Loading batches...</span>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-bg-secondary/50">
                  <TableRow>
                    <TableHead className="font-semibold text-text-primary">Batch Code & Title</TableHead>
                    <TableHead className="font-semibold text-text-primary">Associated Course</TableHead>
                    <TableHead className="font-semibold text-text-primary">Instructor</TableHead>
                    <TableHead className="font-semibold text-text-primary">Schedule Pattern</TableHead>
                    <TableHead className="font-semibold text-text-primary">Start Date</TableHead>
                    <TableHead className="font-semibold text-text-primary">Occupancy</TableHead>
                    <TableHead className="font-semibold text-text-primary">Status</TableHead>
                    <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
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
                        <TableRow key={batch.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <div>
                              <span className="font-mono text-xs font-bold text-[#1769AA] block">
                                {batch.code}
                              </span>
                              <span className="font-medium text-text-primary text-sm">
                                {batch.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-text-secondary font-medium">
                            {batch.course?.name || "N/A"}
                          </TableCell>
                          <TableCell className="text-xs text-text-secondary">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-text-muted" />
                              <span>{instructorName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getPatternBadge(batch.schedulePattern)}
                              <span className="block text-[11px] text-text-muted">
                                {batch.timeSlot || "10:00 AM - 12:00 PM"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-text-secondary">
                            {formattedDate}
                          </TableCell>
                          <TableCell>
                            <div className="w-32 space-y-1">
                              <div className="flex justify-between text-[11px] font-medium text-text-secondary">
                                <span>{enrolledCount} / {maxCapacity}</span>
                                <span>{occupancyPercent}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${occupancyPercent >= 90 ? "bg-amber-500" : "bg-[#1769AA]"}`}
                                  style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(batch.status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 text-text-secondary">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border-border shadow-md">
                                <DropdownMenuLabel>Batch Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(batch.id)}
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
                      <TableCell colSpan={8} className="h-32 text-center text-text-muted">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#1769AA]" />
              Create New Batch
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Course *</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Name *</label>
                  <Input
                    type="text"
                    placeholder="e.g. MERN Cohort 3"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Code *</label>
                  <Input
                    type="text"
                    placeholder="e.g. FS-2026-C1"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Instructor</label>
                <select
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule Pattern</label>
                  <select
                    value={schedulePattern}
                    onChange={(e) => setSchedulePattern(e.target.value as any)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="MWF">Mon, Wed, Fri (MWF)</option>
                    <option value="TTS">Tue, Thu, Sat (TTS)</option>
                    <option value="WEEKEND">Weekend (Sat, Sun)</option>
                    <option value="CUSTOM">Custom Schedule</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Capacity</label>
                  <Input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                  <Input
                    type="text"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    placeholder="10:00 AM - 12:00 PM"
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
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
    </div>
  );
};
