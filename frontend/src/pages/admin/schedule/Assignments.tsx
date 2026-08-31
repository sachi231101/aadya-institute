import React, { useMemo, useState } from "react";
import {
  FileText,
  Plus,
  Clock,
  Users,
  Upload,
  X,
  CheckCircle2,
  Paperclip,
  BookOpen,
  FileCheck,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
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
import {
  useAssignments,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  useGradeSubmission,
} from "@/hooks/useAssignments";
import { useQuery } from "@tanstack/react-query";
import { batchesApi } from "@/services/batches.api";
import type { Assignment } from "@/services/assignments.api";

interface BatchOption {
  id: string;
  name: string;
  code: string;
  courseName: string;
  studentCount: number;
}

interface MappedAssignment {
  id: string;
  title: string;
  courseName: string;
  batchName: string;
  batchCode: string;
  instructions: string;
  dueDate: string;
  submissionCount: number;
  totalStudents: number;
  pendingGrade: number;
  status: string;
  hasDocument: boolean;
  submissions: Assignment["submissions"];
  raw: Assignment;
}

export const AdminAssignments: React.FC = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<MappedAssignment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [gradeTarget, setGradeTarget] = useState<{
    assignmentTitle: string;
    submission: NonNullable<Assignment["submissions"]>[number];
  } | null>(null);
  const [gradeMarks, setGradeMarks] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");

  const [title, setTitle] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("23:59");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      ...(batchFilter !== "ALL" ? { batchId: batchFilter } : {}),
    }),
    [page, limit, searchTerm, statusFilter, batchFilter]
  );

  const { data: assignmentsResponse, isLoading } = useAssignments(queryParams);
  const createMutation = useCreateAssignment();
  const updateMutation = useUpdateAssignment();
  const deleteMutation = useDeleteAssignment();
  const gradeMutation = useGradeSubmission();

  const apiAssignments = assignmentsResponse?.data || [];
  const meta = assignmentsResponse?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  const { data: batchesRes } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.getAll(),
  });

  const batchOptions: BatchOption[] = useMemo(() => {
    const liveBatches = batchesRes?.data;
    if (!Array.isArray(liveBatches)) return [];
    return liveBatches.map((b: {
      id: string;
      name: string;
      code: string;
      course?: { name: string };
      _count?: { enrollments: number };
      enrollments?: unknown[];
      capacity?: number;
    }) => ({
      id: b.id,
      name: b.name,
      code: b.code || "BATCH",
      courseName: b.course?.name || "Course",
      studentCount: b._count?.enrollments || (Array.isArray(b.enrollments) ? b.enrollments.length : 0) || b.capacity || 0,
    }));
  }, [batchesRes]);

  const allAssignments: MappedAssignment[] = useMemo(
    () =>
      (apiAssignments as Assignment[]).map((a) => ({
        id: a.id,
        title: a.title,
        courseName: a.classSession?.title || "Course",
        batchName: "",
        batchCode: "",
        instructions: a.description || "",
        dueDate: a.dueDate || "",
        submissionCount: (a.submissions || []).filter((s) => s.submittedAt).length,
        totalStudents: (a.submissions || []).length,
        pendingGrade: (a.submissions || []).filter((s) => s.submittedAt && s.marks == null).length,
        status: a.status || "ACTIVE",
        hasDocument: false,
        submissions: a.submissions || [],
        raw: a,
      })),
    [apiAssignments]
  );

  const selectedBatch = batchOptions.find((b) => b.id === selectedBatchId);

  const handleResetForm = () => {
    setTitle("");
    setSelectedBatchId("");
    setInstructions("");
    setDueDate("");
    setDueTime("23:59");
    setEditStatus("ACTIVE");
    setUploadedFile(null);
    setShowCreateDialog(false);
    setEditTarget(null);
  };

  const isFormValid =
    title.trim().length > 0 &&
    (editTarget || selectedBatchId.length > 0) &&
    instructions.trim().length > 0 &&
    dueDate.length > 0 &&
    dueTime.length > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.name.match(/\.(pdf|doc|docx)$/i)) {
        setUploadedFile(file);
      } else {
        alert("Please upload a valid PDF, DOC, or DOCX document.");
      }
    }
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedBatch) return;

    const combinedDueDateTime = `${dueDate}T${dueTime}:00`;
    createMutation.mutate(
      {
        title: title.trim(),
        description: instructions.trim(),
        batchId: selectedBatch.id,
        dueDate: combinedDueDateTime,
      },
      {
        onSuccess: () => {
          setSuccessToast(`Assignment created for ${selectedBatch.name}`);
          handleResetForm();
          setTimeout(() => setSuccessToast(null), 4000);
        },
        onError: () => alert("Failed to create assignment."),
      }
    );
  };

  const handleEditAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !editTarget) return;

    const combinedDueDateTime = `${dueDate}T${dueTime}:00`;
    updateMutation.mutate(
      {
        id: editTarget.id,
        data: {
          title: title.trim(),
          description: instructions.trim(),
          dueDate: combinedDueDateTime,
          status: editStatus as "ACTIVE" | "INACTIVE",
        },
      },
      {
        onSuccess: () => {
          setSuccessToast("Assignment updated successfully");
          handleResetForm();
          setTimeout(() => setSuccessToast(null), 4000);
        },
        onError: () => alert("Failed to update assignment."),
      }
    );
  };

  const openEditDialog = (assignment: MappedAssignment) => {
    const due = assignment.dueDate ? new Date(assignment.dueDate) : null;
    setEditTarget(assignment);
    setTitle(assignment.title);
    setInstructions(assignment.instructions);
    setDueDate(due ? due.toISOString().split("T")[0] : "");
    setDueTime(due ? due.toTimeString().slice(0, 5) : "23:59");
    setEditStatus(assignment.status);
    setShowCreateDialog(false);
  };

  const handleDelete = async (assignment: MappedAssignment) => {
    if (!window.confirm(`Delete assignment "${assignment.title}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(assignment.id);
      setSuccessToast("Assignment deleted");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch {
      alert("Failed to delete assignment.");
    }
  };

  const isEditMode = !!editTarget;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FileText className="h-6 w-6 text-[#1769AA]" />
            All Assignments
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Create, edit, grade, and manage assignments across all batches
          </p>
        </div>
        <Button
          onClick={() => {
            handleResetForm();
            setShowCreateDialog(true);
          }}
          className="bg-[#1769AA] hover:bg-[#125890] text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Assignment
        </Button>
      </div>

      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          {successToast}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="h-6 w-6 text-[#1769AA]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{meta.total}</p>
              <p className="text-xs text-text-secondary font-medium">Total Assignments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {allAssignments.filter((a) => a.status === "ACTIVE").length}
              </p>
              <p className="text-xs text-text-secondary font-medium">Active (this page)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {allAssignments.reduce((acc, a) => acc + a.submissionCount, 0)}
              </p>
              <p className="text-xs text-text-secondary font-medium">Submissions (this page)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10 h-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 border border-border rounded-md bg-background text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select
            value={batchFilter}
            onChange={(e) => {
              setBatchFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 border border-border rounded-md bg-background text-sm min-w-[160px]"
          >
            <option value="ALL">All Batches</option>
            {batchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="font-semibold">Session</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="font-semibold">Submissions</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-text-secondary">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : allAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-text-secondary font-medium">No assignments found</p>
                  </TableCell>
                </TableRow>
              ) : (
                allAssignments.map((assignment) => (
                  <TableRow key={assignment.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-medium text-sm">
                      <span className="block">{assignment.title}</span>
                      {assignment.instructions && (
                        <span className="block text-[11px] text-slate-400 truncate max-w-xs">
                          {assignment.instructions}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {assignment.raw.classSession?.title || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {assignment.dueDate
                        ? new Date(assignment.dueDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {assignment.submissionCount} / {assignment.totalStudents || assignment.raw._count?.submissions || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs border ${
                          assignment.status === "ACTIVE"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {assignment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {assignment.pendingGrade > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 px-2"
                            onClick={() => {
                              const pending = assignment.submissions?.find(
                                (s) => s.submittedAt && s.marks == null
                              );
                              if (pending) {
                                setGradeTarget({ assignmentTitle: assignment.title, submission: pending });
                                setGradeMarks("");
                                setGradeFeedback("");
                              }
                            }}
                          >
                            Grade ({assignment.pendingGrade})
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEditDialog(assignment)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500"
                          onClick={() => handleDelete(assignment)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-text-secondary">
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => !open && handleResetForm()}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-[#1769AA]" />
              Create New Assignment
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAssignment} className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <Label>Assignment Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Course / Batch *</Label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                required
                className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm"
              >
                <option value="">Select batch</option>
                {batchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.courseName} — {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Instructions *</Label>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                required
                className="w-full p-3 border border-border rounded-md bg-background text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Upload Document (Optional)</Label>
              {uploadedFile ? (
                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{uploadedFile.name}</span>
                  <button type="button" onClick={() => setUploadedFile(null)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center cursor-pointer">
                  <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                  <Upload className="h-5 w-5 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-500">PDF, DOC, DOCX</span>
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date *</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Due Time *</Label>
                <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleResetForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || createMutation.isPending}
                className="bg-[#1769AA] text-white"
              >
                {createMutation.isPending ? "Creating..." : "Create Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditMode} onOpenChange={(open) => !open && handleResetForm()}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditAssignment} className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Instructions *</Label>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                required
                className="w-full p-3 border border-border rounded-md bg-background text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date *</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Due Time *</Label>
                <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleResetForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || updateMutation.isPending}
                className="bg-[#1769AA] text-white"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={!!gradeTarget} onOpenChange={(open) => !open && setGradeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grade submission</DialogTitle>
          </DialogHeader>
          {gradeTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {gradeTarget.assignmentTitle} ·{" "}
                {gradeTarget.submission.student?.user?.name || "Student"}
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
