import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  Search,
  Filter,
  Check,
  Plus,
  X,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Calendar,
  Clock,
  Building2,
  Eye,
  Edit3,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  BookOpen,
  Sparkles,
  UserCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { batchesApi, type BatchData, type CreateBatchPayload, type BatchCoursePayload, type ScheduleLinePayload } from "../../../services/batches.api";
import { formatBatchSubjectNames, formatBatchInstructorsSummary } from "@/utils/batch.utils";
import { BatchSubjectChips } from "@/components/batches/BatchSubjectFacultyDisplay";
import {
  BatchCourseSelector,
  createEmptyCourseRow,
  type BatchCourseFormRow,
} from "@/components/batches/BatchCourseSelector";
import { coursesApi } from "../../../services/courses.api";
import { facultyApi } from "../../../services/faculty.api";
import { studentsApi } from "../../../services/students.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { findMasterIdByLabel, getTimeslotTimes } from "@/utils/master.utils";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StudentItem {
  id: string;
  name: string;
  studentId: string;
  course: string;
  initials: string;
  avatarBg: string;
}

interface FacultyItem {
  id: string;
  name: string;
  facultyId: string;
  expertise: string;
  available: boolean;
  avatarUrl?: string;
  initials: string;
  avatarBg: string;
}

const AVATAR_COLORS = [
  "bg-indigo-600 text-white",
  "bg-emerald-600 text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
  "bg-purple-600 text-white",
  "bg-cyan-600 text-white",
  "bg-blue-600 text-white",
  "bg-teal-600 text-white",
];

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

const mapStudentToItem = (student: {
  id: string;
  studentCode: string;
  courseName?: string;
  batchName?: string;
  user?: { name?: string } | null;
}, index: number): StudentItem => {
  const name = student.user?.name || "Unknown Student";
  return {
    id: student.id,
    name,
    studentId: student.studentCode,
    course: student.courseName || student.batchName || "—",
    initials: getInitials(name),
    avatarBg: AVATAR_COLORS[index % AVATAR_COLORS.length],
  };
};

const mapFacultyToItem = (faculty: {
  id: string;
  employeeCode: string;
  specialization?: string | null;
  status?: string;
  user?: { name?: string };
}, index: number): FacultyItem => {
  const name = faculty.user?.name || "Unknown Faculty";
  return {
    id: faculty.id,
    name,
    facultyId: faculty.employeeCode,
    expertise: faculty.specialization || "—",
    available: faculty.status !== "INACTIVE",
    initials: getInitials(name),
    avatarBg: AVATAR_COLORS[index % AVATAR_COLORS.length],
  };
};

const getBatchEnrolledStudentIds = (batch: BatchData): string[] => {
  if (!Array.isArray(batch.enrollments)) return [];
  return batch.enrollments
    .map((e) => e.studentId || e.student?.id)
    .filter((id): id is string => Boolean(id));
};

export const CounsellorBatches: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search & Filter State
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [facultySearch, setFacultySearch] = useState<string>("");
  const [batchSearch, setBatchSearch] = useState<string>("");

  // All Students Directory — sourced from backend API
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyItem | null>(null);

  // Modals & Notifications
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [showNewStudentModal, setShowNewStudentModal] = useState<boolean>(false);
  const [editModalBatch, setEditModalBatch] = useState<BatchData | null>(null);
  const [detailsModalBatch, setDetailsModalBatch] = useState<BatchData | null>(null);
  const [deleteModalBatch, setDeleteModalBatch] = useState<BatchData | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // New Student Registration Form
  const [regStudentName, setRegStudentName] = useState<string>("");
  const [regStudentId, setRegStudentId] = useState<string>("");
  const [regStudentCourse, setRegStudentCourse] = useState<string>("");

  // Edit Batch Form State (Including Enrolled Students & Adding New Students)
  const [editBatchName, setEditBatchName] = useState<string>("");
  const [editFacultyId, setEditFacultyId] = useState<string>("");
  const [editCapacity, setEditCapacity] = useState<number>(30);
  const [editEnrolledStudentIds, setEditEnrolledStudentIds] = useState<string[]>([]);
  const [editSelectedCourses, setEditSelectedCourses] = useState<BatchCourseFormRow[]>([]);
  const { options: timeslotOptions } = useMasterDropdown("timeslot");
  const [selectedNewStudentIdToAdd, setSelectedNewStudentIdToAdd] = useState<string>("");

  const mapCourseRowsToPayload = (rows: BatchCourseFormRow[]): BatchCoursePayload[] =>
    rows.map((r, idx) => {
      const times = getTimeslotTimes(timeslotOptions, r.timeslotMasterId);
      return {
        courseId: r.courseId,
        facultyId: r.facultyId || undefined,
        sequence: idx + 1,
        startDate: r.startDate,
        expectedEndDate: r.expectedEndDate || undefined,
        schedulePattern: r.schedulePattern,
        timeSlot:
          times.startTime && times.endTime
            ? `${times.startTime} - ${times.endTime}`
            : times.label || undefined,
        timeslotMasterId: r.timeslotMasterId || undefined,
        classroomMasterId: r.classroomMasterId || undefined,
      };
    });

  const PATTERN_DAYS: Record<string, number[]> = {
    MWF: [1, 3, 5],
    TTS: [2, 4, 6],
    WEEKEND: [0, 6],
    CUSTOM: [1],
  };

  const mapCourseRowsToScheduleLines = (rows: BatchCourseFormRow[]): ScheduleLinePayload[] =>
    rows.flatMap((r) => {
      const days = PATTERN_DAYS[r.schedulePattern] || PATTERN_DAYS.MWF;
      const times = getTimeslotTimes(timeslotOptions, r.timeslotMasterId);
      const timeSlot =
        times.startTime && times.endTime
          ? `${times.startTime} - ${times.endTime}`
          : times.label || undefined;
      return days.map((dayOfWeek) => ({
        courseId: r.courseId,
        dayOfWeek,
        timeSlot,
        startTime: times.startTime,
        endTime: times.endTime,
        timeslotMasterId: r.timeslotMasterId || undefined,
        classroomMasterId: r.classroomMasterId || undefined,
        facultyId: r.facultyId || undefined,
        status: "ACTIVE" as const,
        attendanceEnabled: true,
      }));
    });

  const handleOpenEditModal = (batch: BatchData) => {
    setEditModalBatch(batch);
    setEditBatchName(batch.name || "");
    setEditFacultyId(batch.facultyId || batch.faculty?.id || "");
    setEditCapacity(batch.capacity || 30);
    setEditEnrolledStudentIds(getBatchEnrolledStudentIds(batch));
    setEditSelectedCourses(
      batch.batchCourses && batch.batchCourses.length > 0
        ? batch.batchCourses.map((bc) => ({
            courseId: bc.courseId,
            facultyId: bc.facultyId || bc.faculty?.id || "",
            startDate: bc.startDate
              ? bc.startDate.split("T")[0]
              : batch.startDate
                ? batch.startDate.split("T")[0]
                : new Date().toISOString().slice(0, 10),
            expectedEndDate: bc.expectedEndDate
              ? bc.expectedEndDate.split("T")[0]
              : batch.expectedEndDate
                ? batch.expectedEndDate.split("T")[0]
                : "",
            schedulePattern:
              (bc.schedulePattern as BatchCourseFormRow["schedulePattern"]) ||
              (batch.schedulePattern as BatchCourseFormRow["schedulePattern"]) ||
              "MWF",
            timeslotMasterId:
              bc.timeslotMasterId ||
              findMasterIdByLabel(timeslotOptions, bc.timeSlot || batch.timeSlot) ||
              batch.timeslotMasterId ||
              "",
            classroomMasterId: bc.classroomMasterId || batch.classroomMasterId || "",
          }))
        : batch.courseId
          ? [
              {
                ...createEmptyCourseRow(batch.courseId, {
                  facultyId: batch.facultyId || batch.faculty?.id || "",
                  startDate: batch.startDate ? batch.startDate.split("T")[0] : undefined,
                  schedulePattern:
                    (batch.schedulePattern as BatchCourseFormRow["schedulePattern"]) || "MWF",
                }),
                expectedEndDate: batch.expectedEndDate
                  ? batch.expectedEndDate.split("T")[0]
                  : "",
                timeslotMasterId:
                  batch.timeslotMasterId ||
                  findMasterIdByLabel(timeslotOptions, batch.timeSlot) ||
                  "",
                classroomMasterId: batch.classroomMasterId || "",
              },
            ]
          : []
    );
    setSelectedNewStudentIdToAdd("");
  };

  const handleAddStudentToEditBatch = () => {
    if (!selectedNewStudentIdToAdd) return;
    if (!editEnrolledStudentIds.includes(selectedNewStudentIdToAdd)) {
      setEditEnrolledStudentIds((prev) => [...prev, selectedNewStudentIdToAdd]);
    }
    setSelectedNewStudentIdToAdd("");
  };

  const handleRemoveStudentFromEditBatch = (studentId: string) => {
    setEditEnrolledStudentIds((prev) => prev.filter((id) => id !== studentId));
  };

  // Form State for Create / Assign Batch
  const [newBatchName, setNewBatchName] = useState<string>("");
  const [newBatchCode, setNewBatchCode] = useState<string>("");
  const [newSelectedCourses, setNewSelectedCourses] = useState<BatchCourseFormRow[]>([]);
  const [newCapacity, setNewCapacity] = useState<number>(35);

  // Queries for real batches, students, courses, faculty
  const { data: batchesRes, isLoading: loadingBatches } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.getAll(),
  });
  const batches: BatchData[] = batchesRes?.data || [];

  const { data: coursesRes } = useQuery({
    queryKey: ["courses"],
    queryFn: () => coursesApi.getAll(),
  });
  const courses = coursesRes?.data || [];

  const { data: facultyRes } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => facultyApi.getAll({ limit: 100 }),
  });
  const facultyList = facultyRes?.data || [];

  const { data: studentsRes, isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.getAll({ limit: 100 }),
  });
  const liveStudents = studentsRes?.data || [];

  const allStudentsList = useMemo(
    () => liveStudents.map((student, index) => mapStudentToItem(student, index)),
    [liveStudents]
  );

  const allFacultyList = useMemo(
    () => facultyList.map((faculty, index) => mapFacultyToItem(faculty, index)),
    [facultyList]
  );

  const handleCreateNewStudent = async () => {
    if (!regStudentName.trim()) return;
    const branchId = liveStudents[0]?.branchId || facultyList[0]?.branchId;
    if (!branchId) {
      setSuccessMsg("Cannot register student: no branch available. Add a branch first.");
      setTimeout(() => setSuccessMsg(null), 3500);
      return;
    }
    const generatedCode = regStudentId.trim() || `STU-${Date.now().toString().slice(-6)}`;
    try {
      await studentsApi.create({
        name: regStudentName.trim(),
        studentCode: generatedCode,
        password: "Aadya@123",
        branchId,
        courseId: courses.find((c) => c.name === regStudentCourse)?.id,
      });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      setSuccessMsg(`New student ${regStudentName.trim()} (${generatedCode}) registered successfully!`);
      setShowNewStudentModal(false);
      setRegStudentName("");
      setRegStudentId("");
    } catch (err: any) {
      setSuccessMsg(err?.response?.data?.message || "Failed to register student.");
    }
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Mutations
  const createBatchMutation = useMutation({
    mutationFn: (payload: CreateBatchPayload) => batchesApi.create(payload),
    onSuccess: async (createdBatch) => {
      if (selectedStudentIds.length > 0 && createdBatch?.data?.id) {
        await Promise.all(
          selectedStudentIds.map((sId) =>
            batchesApi.enrollStudent(createdBatch.data.id, sId).catch(() => { })
          )
        );
      }
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setSuccessMsg("Batch created & students successfully assigned!");
      setShowAssignModal(false);
      setSelectedStudentIds([]);
      setSelectedFaculty(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: (batchId: string) => batchesApi.delete(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setSuccessMsg("Batch successfully removed.");
      setDeleteModalBatch(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  const handleSaveEditBatch = async () => {
    if (!editModalBatch) return;
    if (!editBatchName.trim()) {
      setSuccessMsg("Batch name is required.");
      setTimeout(() => setSuccessMsg(null), 3500);
      return;
    }
    if (editSelectedCourses.length === 0) {
      setSuccessMsg("Select at least one course/subject for this batch.");
      setTimeout(() => setSuccessMsg(null), 3500);
      return;
    }
    const missingFaculty = editSelectedCourses.find((r) => !r.facultyId);
    if (missingFaculty) {
      setSuccessMsg("Assign a faculty member for each selected subject.");
      setTimeout(() => setSuccessMsg(null), 3500);
      return;
    }
    setEditSaving(true);
    try {
      const previousIds = getBatchEnrolledStudentIds(editModalBatch);
      const nextIds = editEnrolledStudentIds;
      const toAdd = nextIds.filter((id) => !previousIds.includes(id));
      const toRemove = previousIds.filter((id) => !nextIds.includes(id));

      const coursesPayload = mapCourseRowsToPayload(editSelectedCourses);
      const scheduleLines = mapCourseRowsToScheduleLines(editSelectedCourses);
      const starts = coursesPayload.map((c) => c.startDate!).filter(Boolean).sort();
      const ends = coursesPayload
        .map((c) => c.expectedEndDate)
        .filter((d): d is string => Boolean(d))
        .sort();

      await batchesApi.update(editModalBatch.id, {
        name: editBatchName.trim(),
        courseId: editSelectedCourses[0].courseId,
        facultyId: editFacultyId || editSelectedCourses[0].facultyId,
        courses: coursesPayload,
        scheduleLines,
        startDate: starts[0],
        expectedEndDate: ends.length > 0 ? ends[ends.length - 1] : undefined,
        capacity: editCapacity,
      });

      await Promise.all([
        ...toAdd.map((studentId) => batchesApi.enrollStudent(editModalBatch.id, studentId)),
        ...toRemove.map((studentId) => batchesApi.removeStudent(editModalBatch.id, studentId)),
      ]);

      await queryClient.invalidateQueries({ queryKey: ["batches"] });
      setSuccessMsg(
        `Batch updated. ${nextIds.length} students enrolled (${toAdd.length} added, ${toRemove.length} removed).`
      );
      setEditModalBatch(null);
    } catch (err: any) {
      setSuccessMsg(err?.response?.data?.message || "Failed to update batch.");
    } finally {
      setEditSaving(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Filtered Students (Using dynamic allStudentsList)
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return allStudentsList;
    const q = studentSearch.toLowerCase();
    return allStudentsList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.course.toLowerCase().includes(q)
    );
  }, [allStudentsList, studentSearch]);

  // Filtered Faculty
  const filteredFaculty = useMemo(() => {
    if (!facultySearch.trim()) return allFacultyList;
    const q = facultySearch.toLowerCase();
    return allFacultyList.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.facultyId.toLowerCase().includes(q) ||
        f.expertise.toLowerCase().includes(q)
    );
  }, [allFacultyList, facultySearch]);

  // Selected Student Objects
  const selectedStudents = useMemo(() => {
    return allStudentsList.filter((s) => selectedStudentIds.includes(s.id));
  }, [allStudentsList, selectedStudentIds]);

  // Toggle Single Student Selection
  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select Faculty (Strict Single Select Rule)
  const handleSelectFaculty = (faculty: FacultyItem) => {
    setSelectedFaculty(faculty);
  };

  // Remove Faculty
  const handleRemoveFaculty = () => {
    setSelectedFaculty(null);
  };

  // Clear All Selections
  const handleClearAll = () => {
    setSelectedStudentIds([]);
    setSelectedFaculty(null);
  };

  // Ready for Assignment Condition
  const canAssign = selectedStudentIds.length > 0 && selectedFaculty !== null;

  // Filtered Batches for Table
  const displayBatches = useMemo(() => {
    let list = batches;
    if (batchSearch.trim()) {
      const q = batchSearch.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          formatBatchSubjectNames(b).toLowerCase().includes(q) ||
          (b.course?.name && b.course.name.toLowerCase().includes(q)) ||
          (b.faculty?.user?.name && b.faculty.user.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [batches, batchSearch]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1560px] mx-auto animate-in fade-in duration-200">
      {/* ─── 1. MAIN PAGE HEADER ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1769AA] shrink-0 shadow-xs">
            <UserCheck className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Counsellor — Batch Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Select multiple students and assign them to one faculty member.
            </p>
          </div>
        </div>

        {/* Dynamic Summary Pill */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-xs self-start sm:self-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1769AA]">
            <Users className="w-3.5 h-3.5" />
            <span>Students: {selectedStudentIds.length}</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
            <span>Faculty: {selectedFaculty ? "1/1" : "0/1"}</span>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 text-xs font-bold shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── 2. UPPER 2-COLUMN SECTION: STUDENT LIST & FACULTY LIST ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── LEFT PANEL: STUDENT LIST (SELECT MULTIPLE) ────────────────────── */}
        <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Student List</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Select one or more students</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-50 text-[#1769AA] hover:bg-blue-50 border-blue-200 font-bold text-xs px-2.5 py-0.5">
                  {allStudentsList.length} Students
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewStudentModal(true)}
                  className="h-7 px-2.5 text-[11px] font-bold text-[#1769AA] border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-xl gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ New Student</span>
                </Button>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students by name, ID, or course..."
                  className="pl-9 h-10 text-xs bg-slate-50 border-slate-200 text-slate-900 rounded-xl placeholder:text-slate-400 focus:bg-white"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-3 text-xs font-bold text-slate-700 bg-white border-slate-200 rounded-xl gap-1.5 hover:bg-slate-50"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter</span>
              </Button>
            </div>

            {/* Students List Items */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {loadingStudents ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#1769AA] mb-2" />
                  Loading students...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No students found. Add students from Admissions or use + New Student.
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                          ? "bg-blue-50/50 border-[#1769AA]/40 shadow-xs"
                          : "bg-white border-slate-200/80 hover:bg-slate-50/70"
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isSelected
                              ? "bg-[#1769AA] border-[#1769AA] text-white"
                              : "border-slate-300 bg-white"
                            }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full ${student.avatarBg} text-xs font-black flex items-center justify-center shrink-0 shadow-2xs`}
                        >
                          {student.initials}
                        </div>

                        {/* Name & Details */}
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate block">
                            {student.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium truncate block">
                            {student.studentId} • {student.course}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStudent(student.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${isSelected
                            ? "bg-[#1769AA] text-white shadow-xs"
                            : "bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#1769AA] border border-slate-200"
                          }`}
                      >
                        {isSelected ? "Selected" : "+ Add"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── RIGHT PANEL: FACULTY LIST (SELECT ONLY ONE) ───────────────────── */}
        <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Faculty List</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Select only one faculty member</p>
                </div>
              </div>
              <Badge className="bg-blue-50 text-[#1769AA] hover:bg-blue-50 border-blue-200 font-bold text-xs px-2.5 py-0.5">
                {allFacultyList.length} Faculty
              </Badge>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={facultySearch}
                  onChange={(e) => setFacultySearch(e.target.value)}
                  placeholder="Search faculty by name or subject..."
                  className="pl-9 h-10 text-xs bg-slate-50 border-slate-200 text-slate-900 rounded-xl placeholder:text-slate-400 focus:bg-white"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-3 text-xs font-bold text-slate-700 bg-white border-slate-200 rounded-xl gap-1.5 hover:bg-slate-50"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter</span>
              </Button>
            </div>

            {/* Faculty List Items */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {filteredFaculty.map((faculty) => {
                const isSelected = selectedFaculty?.id === faculty.id;
                return (
                  <div
                    key={faculty.id}
                    onClick={() => handleSelectFaculty(faculty)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                        ? "bg-blue-50/50 border-[#1769AA]/40 shadow-xs"
                        : "bg-white border-slate-200/80 hover:bg-slate-50/70"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Radio Selector */}
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isSelected
                            ? "border-[#1769AA] bg-[#1769AA]"
                            : "border-slate-300 bg-white"
                          }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>

                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full ${faculty.avatarBg} text-xs font-black flex items-center justify-center shrink-0 shadow-2xs`}
                      >
                        {faculty.initials}
                      </div>

                      {/* Name & Expertise */}
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-900 truncate block">
                          {faculty.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium truncate block">
                          {faculty.expertise}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Availability status */}
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Available
                      </span>

                      {/* Select Action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectFaculty(faculty);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected
                            ? "bg-[#1769AA] text-white shadow-xs"
                            : "bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#1769AA] border border-slate-200"
                          }`}
                      >
                        {isSelected ? "✓ Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. MIDDLE SECTION: COMBINED SELECTED MEMBERS CARD ────────────── */}
      <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-[#1769AA] text-white flex items-center justify-center shadow-xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <h3 className="text-base font-black text-slate-900">Selected Members</h3>
              <Badge className="bg-blue-50 text-[#1769AA] hover:bg-blue-50 border-blue-200 font-bold text-xs px-2.5 py-0.5">
                {selectedStudentIds.length} Students • {selectedFaculty ? "1 Faculty" : "0 Faculty"}
              </Badge>
            </div>

            {(selectedStudentIds.length > 0 || selectedFaculty !== null) && (
              <button
                onClick={handleClearAll}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1.5 cursor-pointer self-start sm:self-center transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Two Split Columns: Students (Multiple) + Faculty (Only One) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
            {/* LEFT COLUMN: Selected Students (Multiple) */}
            <div className="lg:col-span-7 space-y-2.5">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#1769AA]" />
                Selected Students (Multiple)
              </span>

              {selectedStudents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                  {selectedStudents.map((stu) => (
                    <div
                      key={stu.id}
                      className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full ${stu.avatarBg} text-[10px] font-bold flex items-center justify-center shrink-0`}
                        >
                          {stu.initials}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate block">
                            {stu.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 truncate block">
                            {stu.studentId}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleStudent(stu.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        aria-label={`Remove ${stu.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-xs text-slate-400">
                  No students selected yet. Select from the Student List above.
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Selected Faculty (Only One) */}
            <div className="lg:col-span-5 space-y-2.5">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#1769AA]" />
                Selected Faculty (Only One)
              </span>

              {selectedFaculty ? (
                <div className="p-3 bg-blue-50/60 border-2 border-[#1769AA]/30 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full ${selectedFaculty.avatarBg} font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      {selectedFaculty.initials}
                    </div>
                    <div className="min-w-0">
                      <span className="font-black text-xs text-slate-900 truncate block">
                        {selectedFaculty.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium truncate block">
                        {selectedFaculty.expertise}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleRemoveFaculty}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    aria-label={`Remove ${selectedFaculty.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-5 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-xs text-slate-400">
                  No faculty selected yet. Choose one from the Faculty List above.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. LOWER SECTION: PREVIOUS BATCHES TABLE ─────────────────────── */}
      <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#1769AA]" />
              <h3 className="text-base font-black text-slate-900">Previous Batches</h3>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  placeholder="Search batch..."
                  className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-bold text-slate-700 bg-white border-slate-200 rounded-xl gap-1.5"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter</span>
              </Button>
            </div>
          </div>

          {/* Batches Table */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="text-[11px] font-bold text-slate-500 uppercase">
                  <TableHead className="py-3">Batch Code</TableHead>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Assigned Faculty</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Start Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {loadingBatches ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#1769AA] mb-2" />
                      Loading previous batches...
                    </TableCell>
                  </TableRow>
                ) : displayBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-400">
                      No batches found.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayBatches.map((batch) => {
                    const facultyName = formatBatchInstructorsSummary(batch);
                    const facultyInitials = facultyName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    const enrolledStudentIds = getBatchEnrolledStudentIds(batch);
                    const enrolledCount = batch._count?.enrollments ?? enrolledStudentIds.length;
                    const capacityLimit = batch.capacity || 30;

                    return (
                      <TableRow key={batch.id} className="hover:bg-slate-50/60 text-xs transition-colors">
                        {/* Batch Code */}
                        <TableCell className="font-bold py-3.5">
                          <span className="text-[#1769AA] font-mono block">{batch.code}</span>
                          <span className="text-[10px] text-slate-400 font-mono block lowercase">{batch.code}001</span>
                        </TableCell>

                        {/* Batch Name */}
                        <TableCell className="font-bold text-slate-900">
                          {batch.name}
                        </TableCell>

                        {/* Subjects / Courses */}
                        <TableCell className="text-slate-600 font-medium">
                          <BatchSubjectChips batch={batch} maxVisible={2} />
                        </TableCell>

                        {/* Assigned Faculty */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-[#1769AA] text-[10px] font-bold flex items-center justify-center">
                              {facultyInitials}
                            </div>
                            <span className="font-semibold text-slate-800">{facultyName}</span>
                          </div>
                        </TableCell>

                        {/* Students */}
                        <TableCell className="font-mono text-slate-700 font-semibold">
                          {enrolledCount} / {capacityLimit}
                        </TableCell>

                        {/* Start Date & Time */}
                        <TableCell>
                          <span className="font-semibold text-slate-800 block">
                            {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : "—"}
                          </span>
                          <span className="text-[10.5px] text-slate-400 block font-mono">
                            {batch.timeSlot || "—"}
                          </span>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${(batch.status as string) === "ONGOING" || (batch.status as string) === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                          >
                            {batch.status || "UPCOMING"}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDetailsModalBatch(batch)}
                              className="h-7 px-2.5 text-[11px] font-bold text-slate-700 bg-white border-slate-200 rounded-lg gap-1 hover:bg-slate-50 cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>View</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditModal(batch)}
                              className="h-7 px-2.5 text-[11px] font-bold text-slate-700 bg-white border-slate-200 rounded-lg gap-1 hover:bg-slate-50 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" />
                              <span>Edit</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteModalBatch(batch)}
                              className="h-7 px-2 text-[11px] font-bold text-rose-600 bg-white border-slate-200 rounded-lg hover:bg-rose-50 hover:border-rose-200 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 pt-1">
            <span>Showing 1 to {displayBatches.length} of 24 batches</span>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg border-slate-200">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" className="h-7 px-2.5 rounded-lg bg-[#1769AA] text-white text-xs font-bold">
                1
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2.5 rounded-lg border-slate-200 text-xs">
                2
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2.5 rounded-lg border-slate-200 text-xs">
                3
              </Button>
              <span className="px-1 text-slate-400">...</span>
              <Button variant="outline" size="sm" className="h-7 px-2.5 rounded-lg border-slate-200 text-xs">
                8
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg border-slate-200">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>

              <select className="ml-2 h-7 px-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 outline-none">
                <option>10 per page</option>
                <option>20 per page</option>
                <option>50 per page</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 5. STICKY BOTTOM ACTION BAR ─────────────────────────────────── */}
      <div className="sticky bottom-4 z-20 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <Info className="w-4 h-4 text-[#1769AA] shrink-0" />
          <span>Select at least one student and one faculty to enable the assign button.</span>
        </div>

        <Button
          disabled={!canAssign}
          onClick={() => setShowAssignModal(true)}
          className="h-10 px-6 text-xs font-black text-white bg-[#1769AA] hover:bg-[#125890] rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01]"
        >
          <span>Assign Faculty to Selected</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* ─── 6. CREATE / ASSIGN BATCH MODAL ───────────────────────────────── */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white border border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 text-[#1769AA] flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900">
                  Create Batch Assignment
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Assigning {selectedStudents.length} students to {selectedFaculty?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Batch Name *</label>
                <Input
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. Full Stack Morning Batch"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Batch Code *</label>
                <Input
                  value={newBatchCode}
                  onChange={(e) => setNewBatchCode(e.target.value)}
                  placeholder="e.g. FS-2026-M01"
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Courses / Subjects *</label>
              <BatchCourseSelector
                courses={courses}
                facultyList={facultyList}
                selectedCourses={newSelectedCourses}
                onChange={setNewSelectedCourses}
                defaultFacultyId={selectedFaculty?.id || ""}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Batch Capacity</label>
              <Input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value))}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAssignModal(false)}
              className="w-full sm:w-auto text-xs font-bold rounded-xl h-9"
            >
              Cancel
            </Button>
            <Button
              disabled={createBatchMutation.isPending}
              onClick={() => {
                const targetFacultyId = selectedFaculty?.id || facultyList[0]?.id;
                const targetBranchId =
                  facultyList.find((f) => f.id === targetFacultyId)?.branchId ||
                  liveStudents[0]?.branchId;
                if (!newBatchName.trim() || !newBatchCode.trim()) {
                  setSuccessMsg("Batch name and code are required.");
                  setTimeout(() => setSuccessMsg(null), 3500);
                  return;
                }
                if (newSelectedCourses.length === 0) {
                  setSuccessMsg("Select at least one course/subject for this batch.");
                  setTimeout(() => setSuccessMsg(null), 3500);
                  return;
                }
                const missingFaculty = newSelectedCourses.find((r) => !r.facultyId);
                if (missingFaculty) {
                  setSuccessMsg("Assign a faculty member for each selected subject.");
                  setTimeout(() => setSuccessMsg(null), 3500);
                  return;
                }
                const missingSchedule = newSelectedCourses.find((r) => !r.startDate || !r.schedulePattern);
                if (missingSchedule) {
                  setSuccessMsg("Each selected subject needs a start date and schedule pattern.");
                  setTimeout(() => setSuccessMsg(null), 3500);
                  return;
                }
                if (!targetFacultyId || !targetBranchId) {
                  setSuccessMsg("Select a faculty member and ensure a branch exists.");
                  setTimeout(() => setSuccessMsg(null), 3500);
                  return;
                }
                const coursesPayload = mapCourseRowsToPayload(newSelectedCourses);
                const scheduleLines = mapCourseRowsToScheduleLines(newSelectedCourses);
                const starts = coursesPayload.map((c) => c.startDate!).filter(Boolean).sort();
                const ends = coursesPayload
                  .map((c) => c.expectedEndDate)
                  .filter((d): d is string => Boolean(d))
                  .sort();
                createBatchMutation.mutate({
                  name: newBatchName.trim(),
                  code: newBatchCode.trim(),
                  courseId: newSelectedCourses[0].courseId,
                  facultyId: targetFacultyId,
                  courses: coursesPayload,
                  scheduleLines,
                  branchId: targetBranchId,
                  capacity: newCapacity,
                  startDate: starts[0],
                  expectedEndDate: ends.length > 0 ? ends[ends.length - 1] : undefined,
                });
              }}
              className="w-full sm:flex-1 bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl h-9 gap-1.5 cursor-pointer"
            >
              {createBatchMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              <span>Confirm & Create Batch</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 7. EDIT BATCH MODAL ─────────────────────────────────────────── */}
      <Dialog open={!!editModalBatch} onOpenChange={(open) => !open && setEditModalBatch(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white border border-slate-200 text-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900">
                  Edit Batch — {editModalBatch?.code}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Update batch details, change faculty, and add or remove students for this cohort.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editModalBatch && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Batch Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Batch Name *</label>
                <Input
                  value={editBatchName}
                  onChange={(e) => setEditBatchName(e.target.value)}
                  placeholder="Batch Name"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              {/* Subjects & per-subject faculty */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Courses / Subjects *</label>
                <BatchCourseSelector
                  courses={courses}
                  facultyList={facultyList}
                  selectedCourses={editSelectedCourses}
                  onChange={setEditSelectedCourses}
                  defaultFacultyId={editFacultyId}
                />
              </div>

              {/* Batch coordinator (optional) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Batch Coordinator (optional)</label>
                <select
                  value={editFacultyId}
                  onChange={(e) => setEditFacultyId(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs font-semibold outline-none focus:border-[#1769AA]"
                >
                  <option value="">None — use subject instructors only</option>
                  {allFacultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.expertise}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Capacity</label>
                <Input
                  type="number"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              {/* ─── ENROLLED STUDENTS & ADD NEW STUDENTS SECTION ─── */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
                    <Users className="w-3.5 h-3.5 text-[#1769AA]" />
                    Enrolled Students ({editEnrolledStudentIds.length})
                  </span>
                  <span
                    className={`text-[10.5px] font-bold ${editEnrolledStudentIds.length >= editCapacity
                        ? "text-rose-600"
                        : "text-emerald-700"
                      }`}
                  >
                    {Math.max(0, editCapacity - editEnrolledStudentIds.length)} Seats Available
                  </span>
                </div>

                {/* Enrolled Student Chips */}
                {editEnrolledStudentIds.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                    {editEnrolledStudentIds.map((sId) => {
                      const studentObj = allStudentsList.find((s) => s.id === sId) || {
                        id: sId,
                        name: "Student",
                        studentId: sId.toUpperCase(),
                        initials: "ST",
                        avatarBg: "bg-blue-600 text-white",
                      };
                      return (
                        <div
                          key={sId}
                          className="p-2 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-full ${studentObj.avatarBg} text-[9px] font-bold flex items-center justify-center shrink-0`}
                            >
                              {studentObj.initials}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-[11px] text-slate-900 truncate block">
                                {studentObj.name}
                              </span>
                              <span className="font-mono text-[9px] text-slate-400 truncate block">
                                {studentObj.studentId}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveStudentFromEditBatch(sId)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove student from batch"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-center text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200">
                    No students currently in this batch. Add students below.
                  </div>
                )}

                {/* Add New Students Selector */}
                <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Plus className="w-3 h-3 text-[#1769AA]" />
                    Add New Student to Batch
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedNewStudentIdToAdd}
                      onChange={(e) => setSelectedNewStudentIdToAdd(e.target.value)}
                      className="flex-1 h-9 px-3 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs font-semibold outline-none focus:border-[#1769AA]"
                    >
                      <option value="">Choose student to add...</option>
                      {allStudentsList.filter(
                        (s) => !editEnrolledStudentIds.includes(s.id)
                      ).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.studentId}) — {s.course}
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      disabled={!selectedNewStudentIdToAdd}
                      onClick={handleAddStudentToEditBatch}
                      className="h-9 px-3.5 bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditModalBatch(null)}
              className="text-xs font-bold rounded-xl h-9"
            >
              Cancel
            </Button>
            <Button
              disabled={editSaving}
              onClick={handleSaveEditBatch}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl h-9 flex-1 cursor-pointer"
            >
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 8. VIEW BATCH DETAILS MODAL ─────────────────────────────────── */}
      <Dialog open={!!detailsModalBatch} onOpenChange={(open) => !open && setDetailsModalBatch(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border border-slate-200 text-slate-900 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <Eye className="w-5 h-5 text-[#1769AA]" />
              <DialogTitle className="text-base font-black text-slate-900">
                Batch Details — {detailsModalBatch?.name}
              </DialogTitle>
            </div>
          </DialogHeader>

          {detailsModalBatch && (() => {
            const viewEnrolledIds = getBatchEnrolledStudentIds(detailsModalBatch);
            return (
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Batch Code:</span>
                    <span className="font-mono font-bold text-[#1769AA]">{detailsModalBatch.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Course:</span>
                    <span className="font-bold">{detailsModalBatch.course?.name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Faculty:</span>
                    <span className="font-bold">{detailsModalBatch.faculty?.user?.name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Schedule:</span>
                    <span className="font-mono font-semibold">{detailsModalBatch.timeSlot || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Enrolled:</span>
                    <span className="font-bold text-emerald-700">
                      {viewEnrolledIds.length} / {detailsModalBatch.capacity || 30} Students
                    </span>
                  </div>
                </div>

                {/* Enrolled Students List */}
                <div className="space-y-2 pt-1">
                  <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                    Enrolled Students ({viewEnrolledIds.length})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {viewEnrolledIds.map((sId) => {
                      const studentObj = allStudentsList.find((s) => s.id === sId) || {
                        id: sId,
                        name: "Student",
                        studentId: sId.toUpperCase(),
                        initials: "ST",
                        avatarBg: "bg-blue-600 text-white",
                      };
                      return (
                        <div
                          key={sId}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full ${studentObj.avatarBg} text-[9px] font-bold flex items-center justify-center`}
                            >
                              {studentObj.initials}
                            </div>
                            <span className="font-bold text-slate-900">{studentObj.name}</span>
                          </div>
                          <span className="font-mono text-slate-400 text-[10px]">{studentObj.studentId}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="pt-2">
            <Button
              onClick={() => setDetailsModalBatch(null)}
              className="w-full bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl h-9"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 8B. REGISTER / ADD NEW STUDENT MODAL ─────────────────────────── */}
      <Dialog open={showNewStudentModal} onOpenChange={setShowNewStudentModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#1769AA] flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900">
                  Register New Student
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Add a student to the directory and batch selection list.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Full Name *</label>
              <Input
                value={regStudentName}
                onChange={(e) => setRegStudentName(e.target.value)}
                placeholder="e.g. Manjunath Swamy"
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Student ID (Optional)</label>
              <Input
                value={regStudentId}
                onChange={(e) => setRegStudentId(e.target.value)}
                placeholder="e.g. STU-1035"
                className="h-9 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Course *</label>
              <Input
                value={regStudentCourse}
                onChange={(e) => setRegStudentCourse(e.target.value)}
                placeholder="e.g. Full Stack Web Development"
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewStudentModal(false)}
              className="text-xs font-bold rounded-xl h-9"
            >
              Cancel
            </Button>
            <Button
              disabled={!regStudentName.trim()}
              onClick={handleCreateNewStudent}
              className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold rounded-xl h-9 flex-1"
            >
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 9. DELETE CONFIRMATION MODAL ─────────────────────────────────── */}
      <Dialog open={!!deleteModalBatch} onOpenChange={(open) => !open && setDeleteModalBatch(null)}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white border border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <DialogTitle className="text-base font-black text-slate-900">
                Delete Batch?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to remove batch <strong className="text-slate-900">{deleteModalBatch?.code}</strong>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteModalBatch(null)}
              className="text-xs font-bold rounded-xl h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteModalBatch && deleteBatchMutation.mutate(deleteModalBatch.id)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl h-9 flex-1"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CounsellorBatches;
