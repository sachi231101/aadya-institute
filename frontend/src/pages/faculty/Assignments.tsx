import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Clock,
  Users,
  Upload,
  X,
  Calendar,
  CheckCircle2,
  Paperclip,
  BookOpen,
  FileCheck,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { useAssignments, useCreateAssignment, useGradeSubmission } from "@/hooks/useAssignments";
import { useAuthStore } from "@/store/auth.store";
import { useQuery } from "@tanstack/react-query";
import { batchesApi } from "@/services/batches.api";
import {
  batchIncludesFaculty,
  formatBatchSubjectNames,
  getSessionSubjectLabel,
} from "@/utils/batch.utils";

interface FacultyBatchOption {
  id: string;
  name: string;
  code: string;
  courseName: string;
  studentCount: number;
}

export const FacultyAssignments: React.FC = () => {
  const { user } = useAuthStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeTarget, setGradeTarget] = useState<{
    assignmentTitle: string;
    submission: any;
  } | null>(null);
  const [gradeMarks, setGradeMarks] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const gradeMutation = useGradeSubmission();

  // Create Assignment Form State
  const [title, setTitle] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("23:59");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Success Toast
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Fetch Assignments from API
  const { data: assignmentsResponse, isLoading } = useAssignments({});
  const createMutation = useCreateAssignment();
  const apiAssignments = assignmentsResponse?.data || [];

  // Local state for instant optimistic list display
  const [localAssignments, setLocalAssignments] = useState<any[]>([]);

  // Fetch batches to get assigned batches
  const { data: batchesRes } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.getAll(),
  });

  // Filter batches assigned to this faculty
  const assignedBatches: FacultyBatchOption[] = useMemo(() => {
    const liveBatches = batchesRes?.data;
    const facultyId = user?.facultyId;
    if (Array.isArray(liveBatches) && liveBatches.length > 0) {
      return liveBatches
        .filter((b: any) => !facultyId || batchIncludesFaculty(b, facultyId))
        .map((b: any) => ({
          id: b.id,
          name: b.name,
          code: b.code || "BATCH-01",
          courseName: formatBatchSubjectNames(b),
          studentCount: b._count?.enrollments || b.enrollments?.length || b.capacity || 0,
        }));
    }
    return [];
  }, [batchesRes, user?.facultyId]);
  // Combined assignment list — prefer live API, keep local optimistic creates
  const allAssignments = useMemo(() => {
    const fromApi = (apiAssignments || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      courseName:
        getSessionSubjectLabel({
          title: a.classSession?.title,
          batch: a.classSession?.batch,
        }) || "Course",
      batchName: a.classSession?.batch?.name || "",
      batchCode: a.classSession?.batch?.code || "",
      instructions: a.description || "",
      dueDate: a.dueDate,
      submissionCount: (a.submissions || []).filter((s: any) => s.submittedAt).length,
      totalStudents: (a.submissions || []).length,
      pendingGrade: (a.submissions || []).filter((s: any) => s.submittedAt && s.marks == null).length,
      status: a.status || "ACTIVE",
      hasDocument: false,
      submissions: a.submissions || [],
      raw: a,
    }));
    return [...localAssignments, ...fromApi];
  }, [localAssignments, apiAssignments]);
  const filteredAssignments = useMemo(() => {
    if (!searchTerm.trim()) return allAssignments;
    const q = searchTerm.toLowerCase();
    return allAssignments.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.courseName?.toLowerCase().includes(q) ||
        a.batchName?.toLowerCase().includes(q) ||
        a.batchCode?.toLowerCase().includes(q)
    );
  }, [allAssignments, searchTerm]);

  // Selected Batch Details
  const selectedBatch = assignedBatches.find((b) => b.id === selectedBatchId);

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (validTypes.includes(file.type) || file.name.match(/\.(pdf|doc|docx)$/i)) {
        setUploadedFile(file);
      } else {
        alert("Please upload a valid PDF, DOC, or DOCX document.");
      }
    }
  };

  const handleResetForm = () => {
    setTitle("");
    setSelectedBatchId("");
    setInstructions("");
    setDueDate("");
    setDueTime("23:59");
    setUploadedFile(null);
    setShowCreateDialog(false);
  };

  // Form Validation: Title, Course/Batch, Instructions, Due Date & Time are required
  const isFormValid =
    title.trim().length > 0 &&
    selectedBatchId.length > 0 &&
    instructions.trim().length > 0 &&
    dueDate.length > 0 &&
    dueTime.length > 0;

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedBatch) return;

    const combinedDueDateTime = `${dueDate}T${dueTime}:00`;

    const newAssignment = {
      id: `asg-${Date.now()}`,
      title: title.trim(),
      courseName: selectedBatch.courseName,
      batchName: selectedBatch.name,
      batchCode: selectedBatch.code,
      instructions: instructions.trim(),
      dueDate: combinedDueDateTime,
      submissionCount: 0,
      totalStudents: selectedBatch.studentCount,
      status: "ACTIVE",
      hasDocument: !!uploadedFile,
      documentName: uploadedFile ? uploadedFile.name : undefined,
    };

    // Call API mutation
    createMutation.mutate(
      {
        title: title.trim(),
        description: instructions.trim(),
        batchId: selectedBatch.id,
        dueDate: combinedDueDateTime,
      },
      {
        onSuccess: () => {
          setLocalAssignments((prev) => [newAssignment, ...prev]);
        },
        onError: () => {
          // API error surfaced via mutation state
        },
      }
    );

    setSuccessToast(
      `Assignment created & automatically assigned to all ${selectedBatch.studentCount} students in ${selectedBatch.name} (${selectedBatch.code})!`
    );
    handleResetForm();
    setTimeout(() => setSuccessToast(null), 4500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-300">
      {/* ─── 1. PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <span>My Assignments</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Create, assign, and evaluate student assignments across your cohorts
          </p>
        </div>

        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm h-11 px-5 rounded-2xl shadow-md shadow-amber-600/20 gap-2 cursor-pointer transition-all hover:scale-102"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create New Assignment</span>
        </Button>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:opacity-75 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── 2. STATS CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-[#111C35] border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-3xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {allAssignments.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Total Assignments
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#111C35] border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-3xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {allAssignments.filter((a) => a.status === "ACTIVE").length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Active Assignments
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#111C35] border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-3xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {allAssignments.reduce((acc, a) => acc + (a.submissionCount || 0), 0)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Total Submissions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. ASSIGNMENTS LIST & TABLE ─────────────────────────────────── */}
      <Card className="bg-white dark:bg-[#111C35] border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Assignments Directory
            </h3>
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/50 font-bold text-xs">
              {filteredAssignments.length} Items
            </Badge>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, course, or batch..."
              className="pl-9 h-9 text-xs bg-slate-50 dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 rounded-xl"
            />
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 dark:bg-[#0D1527] border-b border-slate-200/80 dark:border-slate-800/80">
                <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  Assignment Title
                </TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  Course &amp; Batch
                </TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  Due Date &amp; Time
                </TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  Submissions
                </TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  Document
                </TableHead>
                <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-300 text-right pr-6">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">
                      No assignments found matching your search
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateDialog(true)}
                      className="mt-3 text-xs font-bold gap-1 rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Assignment</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((assignment: any) => (
                  <TableRow
                    key={assignment.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-[#162547]/50 text-xs border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                  >
                    <TableCell className="font-bold text-slate-900 dark:text-white py-3.5">
                      <span className="block">{assignment.title}</span>
                      {assignment.instructions && (
                        <span className="block text-[11px] text-slate-400 font-normal truncate max-w-xs mt-0.5">
                          {assignment.instructions}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {assignment.courseName}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">
                        {assignment.batchName} ({assignment.batchCode})
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {new Date(assignment.dueDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-[10.5px] text-slate-400 font-mono block">
                        {new Date(assignment.dueDate).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {assignment.submissionCount || 0} / {assignment.totalStudents || 30}
                        </span>
                        <span className="text-[10px] text-slate-400">submitted</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {assignment.hasDocument ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
                          <Paperclip className="w-3 h-3" />
                          <span>{assignment.documentName || "Document.pdf"}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {assignment.pendingGrade > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7"
                            onClick={() => {
                              const pending = (assignment.submissions || []).find(
                                (s: any) => s.submittedAt && s.marks == null
                              );
                              if (pending) {
                                setGradeTarget({
                                  assignmentTitle: assignment.title,
                                  submission: pending,
                                });
                                setGradeMarks("");
                                setGradeFeedback("");
                              }
                            }}
                          >
                            Grade ({assignment.pendingGrade})
                          </Button>
                        )}
                      <Badge
                        className={`text-[10px] font-extrabold uppercase border ${
                          assignment.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50"
                            : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {assignment.status}
                      </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── 4. REDESIGNED "CREATE NEW ASSIGNMENT" MODAL ─────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => !open && handleResetForm()}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white dark:bg-[#111C35] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Header with Title and Close */}
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-xs">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Create New Assignment
                  </DialogTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Assign coursework directly to your assigned batch of students
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateAssignment} className="space-y-4 pt-2 text-xs">
            {/* 1. Assignment Title * */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span>Assignment Title</span>
                <span className="text-amber-600">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. React Component Exercise"
                required
                className="h-10 rounded-xl bg-slate-50/70 dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 text-xs focus:bg-white dark:focus:bg-[#0D1527] focus:border-amber-600"
              />
            </div>

            {/* 2. Course / Batch * */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span>Course / Batch</span>
                <span className="text-amber-600">*</span>
              </Label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                required
                className="w-full h-10 px-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/70 dark:bg-[#0D1527] text-slate-900 dark:text-white text-xs font-semibold outline-none focus:bg-white dark:focus:bg-[#0D1527] focus:border-amber-600 transition-colors"
              >
                <option value="">Select Course / Batch</option>
                {assignedBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.courseName} — {b.name} ({b.code}) • {b.studentCount} Students
                  </option>
                ))}
              </select>

              {selectedBatch && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Will be automatically assigned to all {selectedBatch.studentCount} enrolled students in {selectedBatch.name}.
                  </span>
                </p>
              )}
            </div>

            {/* 3. Instructions * */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span>Instructions</span>
                <span className="text-amber-600">*</span>
              </Label>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Write assignment instructions..."
                required
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D1527] text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0D1527] focus:border-amber-600 outline-none resize-none transition-all"
              />
            </div>

            {/* 4. Upload Document (Optional) */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-800 dark:text-slate-200 block">
                Upload Document (Optional)
              </Label>

              {uploadedFile ? (
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg">📄</span>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                        {uploadedFile.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-[#111C35] transition-colors cursor-pointer"
                    title="Remove document"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 bg-slate-50/50 dark:bg-[#0D1527]/50 hover:bg-slate-50 dark:hover:bg-[#0D1527] rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Upload Assignment Document
                  </span>
                  <span className="text-[10.5px] text-slate-400 font-mono">
                    PDF, DOC, DOCX
                  </span>
                </label>
              )}
            </div>

            {/* 5. Due Date & Time * */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span>Due Date &amp; Time</span>
                <span className="text-amber-600">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="h-10 rounded-xl bg-slate-50/70 dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 text-xs focus:bg-white dark:focus:bg-[#0D1527] focus:border-amber-600"
                  />
                </div>
                <div className="relative">
                  <Input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    required
                    className="h-10 rounded-xl bg-slate-50/70 dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 text-xs font-mono focus:bg-white dark:focus:bg-[#0D1527] focus:border-amber-600"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <DialogFooter className="pt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetForm}
                className="h-10 text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || createMutation.isPending}
                className="h-10 flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? "Creating..." : "Create Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!gradeTarget} onOpenChange={(open) => !open && setGradeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grade submission</DialogTitle>
          </DialogHeader>
          {gradeTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {gradeTarget.assignmentTitle} ·{" "}
                {gradeTarget.submission?.student?.user?.name ||
                  gradeTarget.submission?.studentId ||
                  "Student"}
              </p>
              <div>
                <Label>Marks</Label>
                <Input
                  type="number"
                  min={0}
                  value={gradeMarks}
                  onChange={(e) => setGradeMarks(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Feedback</Label>
                <Input
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  className="mt-1"
                  placeholder="Optional comments"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGradeTarget(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#1769AA] text-white"
                  disabled={!gradeMarks || gradeMutation.isPending}
                  onClick={() => {
                    gradeMutation.mutate(
                      {
                        submissionId: gradeTarget.submission.id,
                        data: {
                          marks: Number(gradeMarks),
                          feedback: gradeFeedback || undefined,
                        },
                      },
                      {
                        onSuccess: () => {
                          setGradeTarget(null);
                          setSuccessToast("Submission graded successfully");
                          setTimeout(() => setSuccessToast(null), 3000);
                        },
                      }
                    );
                  }}
                >
                  {gradeMutation.isPending ? "Saving..." : "Save grade"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
