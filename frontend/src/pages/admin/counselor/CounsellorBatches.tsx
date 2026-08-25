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
  MoreHorizontal,
  Edit3,
  Eye,
  CheckCircle2,
  Trash2,
  BookOpen,
  Clock,
  Sparkles,
  Info,
  Check
} from "lucide-react";
import { batchesApi, type BatchData, type CreateBatchPayload } from "../../../services/batches.api";
import { coursesApi } from "../../../services/courses.api";
import { facultyApi } from "../../../services/faculty.api";
import { studentsApi } from "../../../services/students.api";
import { useTimetableStore } from "@/store/timetable.store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const CounsellorBatches: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State for New Batch Creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [courseId, setCourseId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [startDate, setStartDate] = useState("2026-04-01");
  const [schedulePattern, setSchedulePattern] = useState<"MWF" | "TTS" | "WEEKEND" | "CUSTOM">("MWF");
  const [timeSlot, setTimeSlot] = useState("10:00 AM - 12:00 PM");
  const [capacity, setCapacity] = useState<number>(35);
  const [errorMsg, setErrorMsg] = useState("");

  // Contextual Modals State
  const [facultyModalBatch, setFacultyModalBatch] = useState<BatchData | null>(null);
  const [selectedFacultyForBatch, setSelectedFacultyForBatch] = useState<string>("");

  const [studentsModalBatch, setStudentsModalBatch] = useState<BatchData | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentModalTab, setStudentModalTab] = useState<"ENROLL" | "CURRENT">("ENROLL");

  const [editModalBatch, setEditModalBatch] = useState<BatchData | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editCapacity, setEditCapacity] = useState<number>(35);
  const [editSchedulePattern, setEditSchedulePattern] = useState<"MWF" | "TTS" | "WEEKEND" | "CUSTOM">("MWF");
  const [editTimeSlot, setEditTimeSlot] = useState("10:00 AM - 12:00 PM");
  const [editStatus, setEditStatus] = useState<"UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED">("ACTIVE");

  const [detailsModalBatch, setDetailsModalBatch] = useState<BatchData | null>(null);

  // Queries
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

  const { data: studentsRes } = useQuery({
    queryKey: ["students", { limit: 200 }],
    queryFn: () => studentsApi.getAll({ limit: 200 }),
  });

  // Query enrolled students for active batch in student modal or details modal
  const activeBatchForStudentsId = studentsModalBatch?.id || detailsModalBatch?.id;
  const { data: batchStudentsRes, refetch: refetchBatchStudents, isLoading: loadingBatchStudents } = useQuery({
    queryKey: ["batch-students", activeBatchForStudentsId],
    queryFn: () => (activeBatchForStudentsId ? batchesApi.getStudents(activeBatchForStudentsId) : Promise.resolve({ success: true, data: [] })),
    enabled: !!activeBatchForStudentsId,
  });

  const batches = batchesRes?.data || [];
  const courses = coursesRes?.data || [];
  const facultyList = facultyRes?.data || [];
  const allStudents = studentsRes?.data || [];
  const currentBatchStudents: any[] = (batchStudentsRes as any)?.data || [];

  // Mutation for creating a batch
  const createBatchMutation = useMutation({
    mutationFn: (payload: CreateBatchPayload) => batchesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setName("");
      setCode("");
      setErrorMsg("");
      setShowCreateModal(false);
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

  // Mutation for assigning faculty to batch
  const assignFacultyMutation = useMutation({
    mutationFn: ({ batchId, facultyId }: { batchId: string; facultyId: string }) =>
      batchesApi.assignFaculty(batchId, facultyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setFacultyModalBatch(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to assign faculty.");
    },
  });

  // Mutation for editing batch
  const editBatchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBatchPayload> & { status?: string } }) =>
      batchesApi.update(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setEditModalBatch(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to update batch.");
    },
  });

  // Mutation for enrolling a student
  const [isEnrollingStudents, setIsEnrollingStudents] = useState(false);
  const handleEnrollSelectedStudents = async () => {
    if (!studentsModalBatch || selectedStudentIds.size === 0) return;
    setIsEnrollingStudents(true);
    try {
      for (const studentId of Array.from(selectedStudentIds)) {
        await batchesApi.enrollStudent(studentsModalBatch.id, studentId);
      }
      setSelectedStudentIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ["batches"] });
      await refetchBatchStudents();
      setStudentModalTab("CURRENT");
    } catch (err: any) {
      alert(err.response?.data?.message || "Error enrolling students into batch.");
    } finally {
      setIsEnrollingStudents(false);
    }
  };

  // Mutation for removing a student from batch
  const handleRemoveStudent = async (studentId: string) => {
    const targetBatchId = studentsModalBatch?.id || detailsModalBatch?.id;
    if (!targetBatchId) return;
    if (!window.confirm("Are you sure you want to remove this student from the batch?")) return;
    try {
      await batchesApi.removeStudent(targetBatchId, studentId);
      await queryClient.invalidateQueries({ queryKey: ["batches"] });
      await refetchBatchStudents();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to remove student from batch.");
    }
  };

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

  // Handler for creating a new batch
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

  const handleOpenCreateModal = () => {
    if (courses.length > 0 && !courseId) {
      setCourseId(courses[0].id);
    }
    if (facultyList.length > 0 && !facultyId) {
      setFacultyId(facultyList[0].id);
    }
    setErrorMsg("");
    setShowCreateModal(true);
  };

  // Open Faculty Modal for specific batch
  const handleOpenFacultyModal = (batch: BatchData) => {
    setFacultyModalBatch(batch);
    setSelectedFacultyForBatch(batch.facultyId || (facultyList[0]?.id || ""));
  };

  // Open Students Modal for specific batch
  const handleOpenStudentsModal = (batch: BatchData) => {
    setStudentsModalBatch(batch);
    setSelectedStudentIds(new Set());
    setStudentSearchTerm("");
    setStudentModalTab("ENROLL");
  };

  // Open Edit Batch Modal
  const handleOpenEditModal = (batch: BatchData) => {
    setEditModalBatch(batch);
    setEditName(batch.name);
    setEditCode(batch.code);
    setEditStartDate(batch.startDate ? batch.startDate.slice(0, 10) : "");
    setEditCapacity(batch.capacity || 35);
    setEditSchedulePattern((batch.schedulePattern as any) || "MWF");
    setEditTimeSlot(batch.timeSlot || "10:00 AM - 12:00 PM");
    setEditStatus(batch.status || "ACTIVE");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalBatch) return;
    editBatchMutation.mutate({
      id: editModalBatch.id,
      data: {
        name: editName,
        code: editCode,
        startDate: editStartDate,
        capacity: editCapacity,
        schedulePattern: editSchedulePattern,
        timeSlot: editTimeSlot,
        status: editStatus,
      },
    });
  };

  // Eligible students for the batch (excluding already enrolled students)
  const enrolledStudentIdSet = new Set(currentBatchStudents.map((s: any) => s.studentId || s.student?.id));
  const eligibleStudents = allStudents.filter((st) => {
    if (enrolledStudentIdSet.has(st.id)) return false;
    const name = st.user?.name || "";
    const code = st.studentCode || "";
    const email = st.user?.email || "";
    const phone = st.user?.phone || "";
    const matchesSearch =
      name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      code.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      email.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      phone.toLowerCase().includes(studentSearchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-[#1769AA]" />
            Counsellor — Batch Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create training batches, allocate faculty, and assign students directly in one centralized workflow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/counselor/timetable")}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 shadow-xs"
          >
            <Calendar size={16} className="text-[#1769AA]" /> View Faculty Timetable
          </Button>

          <Button 
            onClick={handleOpenCreateModal} 
            className="bg-[#1769AA] hover:bg-[#125890] text-white gap-2 transition-colors shadow-xs font-semibold"
          >
            <Plus size={16} /> Create New Batch
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="border border-border/60 shadow-xs">
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
      <Card className="border border-border/60 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70 border-b border-border/60">
              <TableRow>
                <TableHead className="font-semibold text-slate-800">Batch Name & Code</TableHead>
                <TableHead className="font-semibold text-slate-800">Course</TableHead>
                <TableHead className="font-semibold text-slate-800">Assigned Faculty</TableHead>
                <TableHead className="font-semibold text-slate-800">Schedule & Start</TableHead>
                <TableHead className="font-semibold text-slate-800">Enrolled Students</TableHead>
                <TableHead className="font-semibold text-slate-800">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-800 pr-6">Actions</TableHead>
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
                  const capacityLimit = batch.capacity || 35;
                  const facultyName = batch.faculty?.user?.name || null;
                  const courseName = batch.course?.name || "General Course";

                  return (
                    <TableRow key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="font-semibold text-text-primary">{batch.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{batch.code}</div>
                      </TableCell>
                      
                      <TableCell className="text-sm font-medium">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-[#1769AA]" />
                          <span>{courseName}</span>
                        </div>
                      </TableCell>

                      {/* Assigned Faculty */}
                      <TableCell className="text-sm">
                        {facultyName ? (
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-blue-100 text-[#1769AA] flex items-center justify-center font-bold text-xs">
                              {facultyName.charAt(0)}
                            </div>
                            <span className="font-medium text-text-primary">{facultyName}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 font-medium">
                              Not Assigned
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleOpenFacultyModal(batch)}
                              className="h-6 px-2 text-xs text-[#1769AA] hover:bg-[#F39A16] hover:text-white font-semibold transition-colors rounded"
                            >
                              + Assign
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      {/* Schedule & Start Date */}
                      <TableCell className="text-xs">
                        <div className="font-medium text-text-primary">
                          {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : "—"}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{batch.schedulePattern || "MWF"} • {batch.timeSlot || "10 AM - 12 PM"}</span>
                        </div>
                      </TableCell>

                      {/* Enrolled Students */}
                      <TableCell>
                        {enrolledCount > 0 ? (
                          <div>
                            <div className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{enrolledCount} / {capacityLimit} Enrolled</span>
                            </div>
                            <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                              <div 
                                className="bg-[#1769AA] h-full rounded-full transition-all" 
                                style={{ width: `${Math.min(100, (enrolledCount / capacityLimit) * 100)}%` }} 
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200">
                              0 Enrolled
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleOpenStudentsModal(batch)}
                              className="h-6 px-2 text-xs text-[#1769AA] hover:bg-[#F39A16] hover:text-white font-semibold transition-colors rounded"
                            >
                              + Assign
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            batch.status === "ACTIVE" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                              : batch.status === "UPCOMING"
                              ? "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }
                        >
                          {batch.status}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleOpenStudentsModal(batch)}
                            className="h-8 px-2.5 text-xs gap-1.5 text-[#1769AA] border-blue-200 hover:bg-[#F39A16] hover:text-white hover:border-[#F39A16] font-medium shadow-2xs transition-colors"
                          >
                            <GraduationCap className="h-3.5 w-3.5" /> Assign Students
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOpenFacultyModal(batch)}
                            className="h-8 px-2.5 text-xs gap-1.5 text-slate-700 border-slate-200 hover:bg-[#F39A16] hover:text-white hover:border-[#F39A16] font-medium shadow-2xs transition-colors"
                          >
                            <Users className="h-3.5 w-3.5" /> Assign Faculty
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4 text-slate-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 shadow-lg">
                              <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">Batch Actions</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => setDetailsModalBatch(batch)}
                                className="cursor-pointer text-xs flex items-center gap-2"
                              >
                                <Eye className="h-3.5 w-3.5 text-blue-600" /> View Batch Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleOpenEditModal(batch)}
                                className="cursor-pointer text-xs flex items-center gap-2"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-amber-600" /> Edit Batch Info
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleOpenStudentsModal(batch)}
                                className="cursor-pointer text-xs flex items-center gap-2"
                              >
                                <GraduationCap className="h-3.5 w-3.5 text-[#1769AA]" /> Manage Students
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleOpenFacultyModal(batch)}
                                className="cursor-pointer text-xs flex items-center gap-2"
                              >
                                <Users className="h-3.5 w-3.5 text-indigo-600" /> Change Faculty
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── 1. CONTEXTUAL ASSIGN FACULTY MODAL ───────────────────────── */}
      <Dialog open={!!facultyModalBatch} onOpenChange={(open) => !open && setFacultyModalBatch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-[#1769AA]" />
              Assign Faculty to Batch
            </DialogTitle>
            <DialogDescription>
              Select the primary instructor for <span className="font-semibold text-slate-900">{facultyModalBatch?.name}</span> ({facultyModalBatch?.code}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course:</span>
                <span className="font-semibold text-slate-800">{facultyModalBatch?.course?.name || "General Course"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schedule:</span>
                <span className="font-semibold text-slate-800">{facultyModalBatch?.schedulePattern || "MWF"} ({facultyModalBatch?.timeSlot || "10 AM - 12 PM"})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Faculty:</span>
                <span className="font-semibold text-blue-700">{facultyModalBatch?.faculty?.user?.name || "None Assigned"}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1.5">
                Select Instructor / Faculty
              </label>
              <select
                value={selectedFacultyForBatch}
                onChange={(e) => setSelectedFacultyForBatch(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-primary focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="">-- Remove / Unassigned --</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.user?.name || f.employeeCode} — {f.specialization || "Faculty"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFacultyModalBatch(null)}>
              Cancel
            </Button>
            <Button
              disabled={assignFacultyMutation.isPending}
              onClick={() => {
                if (facultyModalBatch) {
                  assignFacultyMutation.mutate({
                    batchId: facultyModalBatch.id,
                    facultyId: selectedFacultyForBatch,
                  });
                }
              }}
              className="bg-[#1769AA] hover:bg-[#125890] text-white"
            >
              {assignFacultyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Faculty Assignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 2. CONTEXTUAL ASSIGN STUDENTS MODAL ───────────────────────── */}
      <Dialog open={!!studentsModalBatch} onOpenChange={(open) => !open && setStudentsModalBatch(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5 text-[#1769AA]" />
              Manage Students — {studentsModalBatch?.name}
            </DialogTitle>
            <DialogDescription>
              Assign new students or view currently enrolled students in <span className="font-semibold text-slate-900">{studentsModalBatch?.code}</span> ({studentsModalBatch?.course?.name}).
            </DialogDescription>
          </DialogHeader>

          <Tabs value={studentModalTab} onValueChange={(v) => setStudentModalTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-2 w-full mb-3">
              <TabsTrigger value="ENROLL" className="text-xs font-semibold">
                + Enroll Eligible Students ({eligibleStudents.length})
              </TabsTrigger>
              <TabsTrigger value="CURRENT" className="text-xs font-semibold">
                Enrolled in Batch ({currentBatchStudents.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Enroll Eligible Students */}
            <TabsContent value="ENROLL" className="flex-1 flex flex-col space-y-3 overflow-hidden mt-0">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student by name, code, phone, or email..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  Selected: <span className="text-[#1769AA] font-bold">{selectedStudentIds.size}</span> students
                </div>
              </div>

              <div className="flex-1 border border-border/70 rounded-lg overflow-y-auto max-h-[300px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow className="text-xs">
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={eligibleStudents.length > 0 && selectedStudentIds.size === eligibleStudents.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds(new Set(eligibleStudents.map((s) => s.id)));
                            } else {
                              setSelectedStudentIds(new Set());
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                      </TableHead>
                      <TableHead className="text-xs font-bold text-foreground">Student Code & Name</TableHead>
                      <TableHead className="text-xs font-bold text-foreground">Contact Info</TableHead>
                      <TableHead className="text-xs font-bold text-foreground">Qualification / Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                          No eligible unassigned students found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      eligibleStudents.map((st) => {
                        const isSelected = selectedStudentIds.has(st.id);
                        return (
                          <TableRow 
                            key={st.id} 
                            onClick={() => {
                              const next = new Set(selectedStudentIds);
                              if (isSelected) next.delete(st.id);
                              else next.add(st.id);
                              setSelectedStudentIds(next);
                            }}
                            className={`cursor-pointer text-xs ${isSelected ? "bg-primary/10" : "hover:bg-muted/40"}`}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const next = new Set(selectedStudentIds);
                                  if (e.target.checked) next.add(st.id);
                                  else next.delete(st.id);
                                  setSelectedStudentIds(next);
                                }}
                                className="rounded border-border text-primary focus:ring-primary"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-foreground">{st.user?.name || "Student"}</div>
                              <div className="text-[11px] font-mono text-muted-foreground">{st.studentCode}</div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="text-foreground">{st.user?.phone || "—"}</div>
                              <div className="text-[11px] text-muted-foreground">{st.user?.email || "—"}</div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {st.qualification || "Active Student"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Target Batch Capacity: <span className="font-bold text-foreground">{currentBatchStudents.length} / {studentsModalBatch?.capacity || 35}</span>
                </span>
                <Button
                  disabled={selectedStudentIds.size === 0 || isEnrollingStudents}
                  onClick={handleEnrollSelectedStudents}
                  className="bg-primary hover:bg-primary/90 text-white text-xs gap-1.5"
                >
                  {isEnrollingStudents ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enrolling...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Enroll {selectedStudentIds.size} Selected Students
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Tab 2: Currently Enrolled Students */}
            <TabsContent value="CURRENT" className="flex-1 flex flex-col space-y-3 overflow-hidden mt-0">
              <div className="flex-1 border border-border/70 rounded-lg overflow-y-auto max-h-[300px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow className="text-xs">
                      <TableHead className="text-xs font-bold text-foreground">Student Code & Name</TableHead>
                      <TableHead className="text-xs font-bold text-foreground">Contact</TableHead>
                      <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
                      <TableHead className="text-right text-xs pr-4 font-bold text-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBatchStudents ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#1769AA] mb-2" />
                          Loading enrolled students...
                        </TableCell>
                      </TableRow>
                    ) : currentBatchStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                          No students currently enrolled in this batch. Click "Enroll Eligible Students" tab above to add students.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentBatchStudents.map((enr: any) => {
                        const student = enr.student;
                        return (
                          <TableRow key={enr.id} className="text-xs hover:bg-slate-50">
                            <TableCell>
                              <div className="font-semibold text-slate-900">{student?.user?.name || "Student"}</div>
                              <div className="text-[11px] font-mono text-muted-foreground">{student?.studentCode}</div>
                            </TableCell>
                            <TableCell>
                              <div>{student?.user?.phone || "—"}</div>
                              <div className="text-[11px] text-muted-foreground">{student?.user?.email || "—"}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                Enrolled
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveStudent(enr.studentId || student?.id)}
                                className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setStudentsModalBatch(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 3. CONTEXTUAL EDIT BATCH MODAL ───────────────────────── */}
      <Dialog open={!!editModalBatch} onOpenChange={(open) => !open && setEditModalBatch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit3 className="h-5 w-5 text-amber-600" />
              Edit Batch Details
            </DialogTitle>
            <DialogDescription>
              Update name, code, schedule pattern, and capacity for this batch.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Batch Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Batch Code</label>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Capacity</label>
                <Input
                  type="number"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Schedule Pattern</label>
                <select
                  value={editSchedulePattern}
                  onChange={(e) => setEditSchedulePattern(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
                >
                  <option value="MWF">MWF (Mon/Wed/Fri)</option>
                  <option value="TTS">TTS (Tue/Thu/Sat)</option>
                  <option value="WEEKEND">Weekend (Sat/Sun)</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-primary"
                >
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Start Date</label>
                <Input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Time Slot</label>
                <Input
                  placeholder="e.g. 10:00 AM - 12:00 PM"
                  value={editTimeSlot}
                  onChange={(e) => setEditTimeSlot(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditModalBatch(null)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={editBatchMutation.isPending}
                className="bg-[#1769AA] hover:bg-[#125890] text-white"
              >
                {editBatchMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── 4. CONTEXTUAL VIEW BATCH DETAILS MODAL ───────────────────────── */}
      <Dialog open={!!detailsModalBatch} onOpenChange={(open) => !open && setDetailsModalBatch(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5 text-[#1769AA]" />
              Batch Overview — {detailsModalBatch?.name}
            </DialogTitle>
            <DialogDescription>
              Comprehensive information, schedule allocation, and enrolled students list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-muted-foreground block font-medium">Batch Code</span>
                <span className="text-sm font-mono font-bold text-slate-800">{detailsModalBatch?.code}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-muted-foreground block font-medium">Course</span>
                <span className="text-sm font-bold text-slate-800 truncate block">{detailsModalBatch?.course?.name || "General"}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-muted-foreground block font-medium">Assigned Faculty</span>
                <span className="text-sm font-bold text-blue-700 truncate block">{detailsModalBatch?.faculty?.user?.name || "Unassigned"}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-muted-foreground block font-medium">Enrollments</span>
                <span className="text-sm font-bold text-emerald-700">{detailsModalBatch?._count?.enrollments || currentBatchStudents.length} Students</span>
              </div>
            </div>

            <div className="p-4 border border-border/70 rounded-lg space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Schedule & Session Details</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Pattern:</span> <span className="font-semibold text-slate-800">{detailsModalBatch?.schedulePattern || "MWF"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Time Slot:</span> <span className="font-semibold text-slate-800">{detailsModalBatch?.timeSlot || "10:00 AM - 12:00 PM"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date:</span> <span className="font-semibold text-slate-800">{detailsModalBatch?.startDate ? new Date(detailsModalBatch.startDate).toLocaleDateString() : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="ml-1 text-[10px]">{detailsModalBatch?.status}</Badge>
                </div>
              </div>
            </div>

            <div className="border border-border/70 rounded-lg overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-border/70 flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Enrolled Students ({currentBatchStudents.length})
                </h4>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    const b = detailsModalBatch;
                    setDetailsModalBatch(null);
                    if (b) handleOpenStudentsModal(b);
                  }}
                  className="h-7 text-xs text-[#1769AA] border-blue-200 hover:bg-blue-50"
                >
                  <GraduationCap className="h-3.5 w-3.5 mr-1" /> Manage Students
                </Button>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="text-xs">
                      <TableHead className="text-xs">Code & Name</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentBatchStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                          No students currently enrolled in this batch.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentBatchStudents.map((enr: any) => (
                        <TableRow key={enr.id} className="text-xs">
                          <TableCell>
                            <span className="font-semibold text-slate-900">{enr.student?.user?.name || "Student"}</span>
                            <span className="font-mono text-muted-foreground text-[11px] block">{enr.student?.studentCode}</span>
                          </TableCell>
                          <TableCell className="text-xs">{enr.student?.user?.phone || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{enr.student?.user?.email || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalBatch(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 5. CREATE NEW BATCH MODAL ───────────────────────── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>Fill in the details to create a new training batch.</DialogDescription>
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
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createBatchMutation.isPending}
                className="bg-[#1769AA] hover:bg-[#125890] text-white"
              >
                {createBatchMutation.isPending ? "Creating..." : "Create Batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
