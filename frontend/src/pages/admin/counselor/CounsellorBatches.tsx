import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Users, 
  GraduationCap,
  UserCheck,
  Loader2,
  AlertCircle,
  Calendar,
  Layers
} from "lucide-react";
import { batchesApi, type CreateBatchPayload } from "../../../services/batches.api";
import { coursesApi } from "../../../services/courses.api";
import { facultyApi } from "../../../services/faculty.api";
import { useTimetableStore } from "@/store/timetable.store";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const CounsellorBatches: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State for New Batch Creation
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [courseId, setCourseId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [startDate, setStartDate] = useState("2026-04-01");
  const [schedulePattern, setSchedulePattern] = useState<"MWF" | "TTS" | "WEEKEND" | "CUSTOM">("MWF");
  const [timeSlot, setTimeSlot] = useState("10:00 AM - 12:00 PM");
  const [capacity, setCapacity] = useState<number>(35);
  const [errorMsg, setErrorMsg] = useState("");

  // Queries for live server state
  const { data: batchesRes, isLoading: loadingBatches, isError: errorBatches } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.getAll(),
  });

  const { data: coursesRes } = useQuery({
    queryKey: ["courses"],
    queryFn: () => coursesApi.getAll(),
  });

  const { data: facultyRes } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => facultyApi.getAll({ limit: 100 }),
  });

  const batches = batchesRes?.data || [];
  const courses = coursesRes?.data || [];
  const facultyList = facultyRes?.data || [];

  // Mutation for creating a batch
  const createBatchMutation = useMutation({
    mutationFn: (payload: CreateBatchPayload) => batchesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setName("");
      setCode("");
      setErrorMsg("");
      setShowModal(false);
    },
    onError: (err: any) => {
      const fieldErrors = err.response?.data?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        setErrorMsg(fieldErrors.map((e: any) => `${e.field}: ${e.message}`).join(" | "));
      } else {
        setErrorMsg(err.response?.data?.message || "Failed to create batch.");
      }
    },
  });

  const filteredBatches = batches.filter((b) => {
    const facultyName = b.faculty?.user?.name || "";
    const courseName = b.course?.name || "";

    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facultyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      courseName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse = courseFilter === "ALL" || b.courseId === courseFilter;
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !courseId) {
      setErrorMsg("Batch name, code, and course selection are required.");
      return;
    }

    const matchedCourse = courses.find((c) => c.id === courseId);
    const matchedFaculty = facultyList.find((f) => f.id === facultyId);

    const facName = matchedFaculty?.user?.name || matchedFaculty?.employeeCode || "Ramesh Kumar";
    const facId = facultyId || "FA-RAMESH";
    const crsName = matchedCourse?.name || "Digital Marketing";

    let category: "Digital Marketing" | "Design" | "Data Analytics" | "Programming" | "Others" = "Digital Marketing";
    if (crsName.includes("Design") || crsName.includes("UI")) category = "Design";
    else if (crsName.includes("Data") || crsName.includes("Excel")) category = "Data Analytics";
    else if (crsName.includes("MERN") || crsName.includes("Full Stack") || crsName.includes("Programming")) category = "Programming";

    const days: Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"> =
      schedulePattern === "TTS" ? ["TUE", "THU", "SAT"] : ["MON", "WED", "FRI"];

    // Publish to Timetable store
    useTimetableStore.getState().createBatchWithSchedule({
      code,
      name,
      courseId,
      courseName: crsName,
      category,
      facultyId: facId,
      facultyName: facName,
      branchId: "b-central",
      branchName: "Aadya Central Branch",
      capacity,
      studentIds: [],
      days,
      period: 1,
      startTime: "09:00 AM",
      endTime: "10:00 AM",
      roomNo: "Room 201",
    });

    createBatchMutation.mutate({
      name,
      code,
      courseId,
      facultyId: facultyId || undefined,
      startDate,
      capacity,
      schedulePattern,
      timeSlot,
    });
  };

  const handleOpenModal = () => {
    if (courses.length > 0 && !courseId) {
      setCourseId(courses[0].id);
    }
    if (facultyList.length > 0 && !facultyId) {
      setFacultyId(facultyList[0].id);
    }
    setErrorMsg("");
    setShowModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-[#1769AA]" />
            Counsellor — Batch Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create new training batches, allocate target courses, and set schedule details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/counselor/timetable")}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-2"
          >
            <Calendar size={16} className="text-[#1769AA]" /> View Faculty Timetable
          </Button>

          <Button 
            onClick={handleOpenModal} 
            className="bg-[#1769AA] hover:bg-[#125890] text-white gap-2 transition-colors"
          >
            <Plus size={16} /> Create New Batch
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search batch name, code, or faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
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
              className="px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-bg-secondary">
              <TableRow>
                <TableHead>Batch Name & Code</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Assigned Faculty</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Enrollment Count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingBatches ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1769AA] mb-2" />
                    Fetching batches from server...
                  </TableCell>
                </TableRow>
              ) : errorBatches ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-red-600">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                    Failed to fetch batches from server.
                  </TableCell>
                </TableRow>
              ) : filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No batches found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBatches.map((batch) => {
                  const enrolledCount = batch._count?.enrollments ?? 0;
                  const facultyName = batch.faculty?.user?.name || "Unassigned";
                  const courseName = batch.course?.name || "General Course";

                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="font-semibold text-text-primary">{batch.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{batch.code}</div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{courseName}</TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium text-text-primary">
                          {facultyName}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold">
                          {enrolledCount} Students Enrolled
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={batch.status === "ACTIVE" ? "default" : "outline"}>
                          {batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => navigate("/admin/counselor/assign-students")}
                          className="text-xs gap-1"
                        >
                          <GraduationCap className="h-3.5 w-3.5" /> Assign Students
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate("/admin/counselor/assign-faculty")}
                          className="text-xs gap-1"
                        >
                          <Users className="h-3.5 w-3.5" /> Assign Faculty
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Batch Modal Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>Fill in the details to create a new batch in the database.</DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Batch Name</label>
              <Input
                placeholder="e.g. FullStack Alpha 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Batch Code</label>
                <Input
                  placeholder="e.g. FS-2026-A1"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Capacity</label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
                required
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Assigned Faculty (Optional)</label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
              >
                <option value="">Unassigned</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.user?.name || f.employeeCode} — {f.specialization || "Faculty"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Schedule Pattern</label>
                <select
                  value={schedulePattern}
                  onChange={(e) => setSchedulePattern(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
                >
                  <option value="MWF">MWF (Mon/Wed/Fri)</option>
                  <option value="TTS">TTS (Tue/Thu/Sat)</option>
                  <option value="WEEKEND">Weekend (Sat/Sun)</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Time Slot</label>
              <Input
                placeholder="e.g. 10:00 AM - 12:00 PM"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createBatchMutation.isPending}
                className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
              >
                {createBatchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Batch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
