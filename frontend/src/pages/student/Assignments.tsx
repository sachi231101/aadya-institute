import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  Calendar,
  Paperclip,
  Download,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  Layers,
  Star,
  Check,
  Eye,
  FileCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAssignments, useSubmitAssignment, useUploadSubmissionFile } from "@/hooks/useAssignments";
import { useAuthStore } from "@/store/auth.store";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";
import { getSessionSubjectLabel } from "@/utils/batch.utils";
import { canStudentSubmit, formatMarks } from "@/utils/assignment.utils";
import { assignmentsApi, type Assignment, type AssignmentSubmission } from "@/services/assignments.api";

interface EnrichedAssignment {
  id: string;
  title: string;
  courseName: string;
  batchName: string;
  batchCode: string;
  instructions: string;
  dueDate: string;
  maxMarks: number;
  allowLate: boolean;
  restrictStudentUpload: boolean;
  attachmentFileKey?: string | null;
  attachmentFileName?: string | null;
  youtubeVideoId?: string | null;
  assignmentStatus: string;
  hasDocument: boolean;
  documentName?: string;
  statusInfo: {
    status: "SUBMITTED" | "OVERDUE" | "PENDING" | "GRADED";
    label: string;
    color: string;
    submission?: AssignmentSubmission;
  };
}

export const StudentAssignments: React.FC = () => {
  const { user } = useAuthStore();
  const academic = useStudentAcademicAccess();
  const userId = user?.id;
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: assignmentsResponse, isLoading } = useAssignments({ limit: 100 });
  const submitMutation = useSubmitAssignment();
  const uploadMutation = useUploadSubmissionFile();
  const apiAssignments: Assignment[] = assignmentsResponse?.data || [];

  const [selectedAssignment, setSelectedAssignment] = useState<EnrichedAssignment | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Submission Form State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "SUBMITTED" | "GRADED" | "OVERDUE">("ALL");

  // Success Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getSubmissionForUser = (assignment: Assignment): AssignmentSubmission | undefined =>
    assignment.submissions?.find(
      (s) =>
        s.studentId === academic.studentId ||
        (s.student as { user?: { id?: string } })?.user?.id === userId
    );

  const getAssignmentStatus = (assignment: Assignment) => {
    const submission = getSubmissionForUser(assignment);
    if (
      submission?.submissionStatus === "GRADED" ||
      submission?.evaluatedAt ||
      submission?.marks != null
    ) {
      return {
        status: "GRADED" as const,
        label: "GRADED",
        color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        submission,
      };
    }
    if (submission?.submittedAt || submission?.submissionStatus === "SUBMITTED" || submission?.submissionStatus === "LATE") {
      return {
        status: "SUBMITTED" as const,
        label: submission?.submissionStatus === "LATE" ? "LATE" : "SUBMITTED",
        color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        submission,
      };
    }

    const isPastDue = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;
    if (isPastDue && !assignment.allowLate) {
      return {
        status: "OVERDUE" as const,
        label: "OVERDUE",
        color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
        submission: undefined,
      };
    }

    return {
      status: "PENDING" as const,
      label: "PENDING",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      submission: undefined,
    };
  };

  const enrichedAssignments = useMemo((): EnrichedAssignment[] => {
    return apiAssignments.map((asg) => {
      const session = asg.classSession as any;
      const batch = asg.batch || session?.batch;
      return {
        id: asg.id,
        title: asg.title,
        courseName:
          getSessionSubjectLabel({ title: session?.title, batch }) ||
          batch?.course?.name ||
          academic.primaryCourse?.name ||
          "Course Assignment",
        batchName: batch?.name || academic.primaryBatch?.name || "",
        batchCode: batch?.code || academic.primaryBatch?.code || "",
        instructions: asg.description || "",
        dueDate: asg.dueDate || "",
        maxMarks: asg.maxMarks ?? 100,
        allowLate: !!asg.allowLate,
        restrictStudentUpload: !!asg.restrictStudentUpload,
        attachmentFileKey: asg.attachmentFileKey,
        attachmentFileName: asg.attachmentFileName,
        youtubeVideoId: asg.youtubeVideoId,
        assignmentStatus: asg.status,
        hasDocument: false,
        statusInfo: getAssignmentStatus(asg),
      };
    });
  }, [apiAssignments, academic, userId]);

  // Tab Filter
  const filteredAssignments = useMemo(() => {
    if (filterTab === "ALL") return enrichedAssignments;
    return enrichedAssignments.filter((a) => a.statusInfo.status === filterTab);
  }, [enrichedAssignments, filterTab]);

  // Counts for Summary Cards
  const stats = useMemo(() => {
    const total = enrichedAssignments.length;
    const submitted = enrichedAssignments.filter((a) => a.statusInfo.status === "SUBMITTED").length;
    const pending = enrichedAssignments.filter((a) => a.statusInfo.status === "PENDING").length;
    const graded = enrichedAssignments.filter((a) => a.statusInfo.status === "GRADED").length;
    const overdue = enrichedAssignments.filter((a) => a.statusInfo.status === "OVERDUE").length;
    return { total, submitted, pending, graded, overdue };
  }, [enrichedAssignments]);

  // Deep-link from student dashboard (?assignmentId=...)
  useEffect(() => {
    const deepLinkId = searchParams.get("assignmentId");
    if (!deepLinkId || isLoading || enrichedAssignments.length === 0) return;
    const match = enrichedAssignments.find((a) => a.id === deepLinkId);
    const next = new URLSearchParams(searchParams);
    next.delete("assignmentId");
    setSearchParams(next, { replace: true });
    if (!match) return;
    setSelectedAssignment(match);
    setUploadedFile(null);
    setSubmissionNotes("");
    setShowModal(true);
  }, [enrichedAssignments, isLoading, searchParams, setSearchParams]);

  // Open Modal Handler
  const handleOpenAssignment = (assignment: EnrichedAssignment) => {
    setSelectedAssignment(assignment);
    setUploadedFile(null);
    setSubmissionNotes("");
    setShowModal(true);
  };

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = /\.(pdf|doc|docx|zip)$/i;
      if (validExtensions.test(file.name)) {
        setUploadedFile(file);
      } else {
        alert("Please upload a supported file format (PDF, DOC, DOCX, ZIP).");
      }
    }
  };

  // Submit Assignment Handler
  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !uploadedFile) return;

    setIsSubmitting(true);
    try {
      const uploadRes = await uploadMutation.mutateAsync({
        assignmentId: selectedAssignment.id,
        file: uploadedFile,
      });
      const { fileKey, fileName } = uploadRes.data;
      await submitMutation.mutateAsync({
        assignmentId: selectedAssignment.id,
        data: {
          fileKey,
          fileName,
          notes: submissionNotes.trim() || undefined,
        },
      });
      setShowModal(false);
      showToast(`Assignment "${selectedAssignment.title}" submitted successfully!`);
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to submit assignment. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSubmission = selectedAssignment?.statusInfo.submission;

  const canSubmitSelected = selectedAssignment
    ? canStudentSubmit({
        assignmentStatus: selectedAssignment.assignmentStatus,
        submissionStatus: currentSubmission?.submissionStatus,
        dueDate: selectedAssignment.dueDate,
        allowLate: selectedAssignment.allowLate,
      }) && !selectedAssignment.restrictStudentUpload
    : false;

  const isCurrentOverdue = selectedAssignment
    ? selectedAssignment.statusInfo.status === "OVERDUE" ||
      (!canSubmitSelected && !currentSubmission && !!selectedAssignment.dueDate && new Date() > new Date(selectedAssignment.dueDate))
    : false;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1300px] mx-auto animate-in fade-in duration-300">
      {/* ─── 1. PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <span>My Assignments</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            View, complete, and submit your assignments.
          </p>
        </div>

        {/* Enrolled Batch Indicator */}
        {(academic.primaryBatch?.name || academic.primaryCourse?.name) && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#111C35] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <BookOpen className="w-4 h-4 text-[#5B50EC] dark:text-indigo-400" />
            <span>
              Cohort:{" "}
              <strong className="text-slate-900 dark:text-white">
                {academic.primaryCourse?.name || "Course"}
                {academic.primaryBatch?.code ? ` (${academic.primaryBatch.code})` : ""}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Success Toast */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-600 hover:opacity-75 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── 2. SUMMARY STATS CARDS ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total */}
        <Card
          onClick={() => setFilterTab("ALL")}
          className={`cursor-pointer transition-all duration-200 bg-white dark:bg-[#111C35] border rounded-3xl shadow-xs hover:border-[#5B50EC] ${
            filterTab === "ALL"
              ? "border-[#5B50EC] ring-2 ring-[#5B50EC]/20"
              : "border-slate-200/80 dark:border-slate-800/80"
          }`}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-[#5B50EC] dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.total}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Total Assignments
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card
          onClick={() => setFilterTab("PENDING")}
          className={`cursor-pointer transition-all duration-200 bg-white dark:bg-[#111C35] border rounded-3xl shadow-xs hover:border-amber-500 ${
            filterTab === "PENDING"
              ? "border-amber-500 ring-2 ring-amber-500/20"
              : "border-slate-200/80 dark:border-slate-800/80"
          }`}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.pending}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Pending
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submitted */}
        <Card
          onClick={() => setFilterTab("SUBMITTED")}
          className={`cursor-pointer transition-all duration-200 bg-white dark:bg-[#111C35] border rounded-3xl shadow-xs hover:border-emerald-500 ${
            filterTab === "SUBMITTED"
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-slate-200/80 dark:border-slate-800/80"
          }`}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.submitted}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Submitted
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Graded */}
        <Card
          onClick={() => setFilterTab("GRADED")}
          className={`cursor-pointer transition-all duration-200 bg-white dark:bg-[#111C35] border rounded-3xl shadow-xs hover:border-indigo-500 ${
            filterTab === "GRADED"
              ? "border-indigo-500 ring-2 ring-indigo-500/20"
              : "border-slate-200/80 dark:border-slate-800/80"
          }`}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.graded}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Graded
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. FILTER TABS ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(["ALL", "PENDING", "SUBMITTED", "GRADED", "OVERDUE"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === tab
                ? "bg-[#5B50EC] text-white shadow-xs"
                : "bg-slate-100 dark:bg-[#111C35] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
            }`}
          >
            {tab === "ALL" && "All Assignments"}
            {tab === "PENDING" && `Pending (${stats.pending})`}
            {tab === "SUBMITTED" && `Submitted (${stats.submitted})`}
            {tab === "GRADED" && `Graded (${stats.graded})`}
            {tab === "OVERDUE" && `Overdue (${stats.overdue})`}
          </button>
        ))}
      </div>

      {/* ─── 4. ASSIGNMENT CARDS LIST ────────────────────────────────────── */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="bg-white dark:bg-[#111C35] border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-12 text-center">
            <p className="text-sm text-slate-500">Loading assignments...</p>
          </Card>
        ) : filteredAssignments.length === 0 ? (
          <Card className="bg-white dark:bg-[#111C35] border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No assignments found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {filterTab === "ALL"
                ? "Your faculty has not posted any assignments for your cohort yet."
                : `No assignments currently in ${filterTab.toLowerCase()} status.`}
            </p>
          </Card>
        ) : (
          filteredAssignments.map((assignment) => {
            const isSubmitted = assignment.statusInfo.status === "SUBMITTED" || assignment.statusInfo.status === "GRADED";
            const isGraded = assignment.statusInfo.status === "GRADED";
            const isOverdue = assignment.statusInfo.status === "OVERDUE";
            const submission = assignment.statusInfo.submission;

            return (
              <Card
                key={assignment.id}
                className="bg-white dark:bg-[#111C35] border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 rounded-3xl shadow-xs transition-all overflow-hidden group"
              >
                <CardContent className="p-5 sm:p-6 space-y-4">
                  {/* Card Header: Title and Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">📄</span>
                        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight group-hover:text-[#5B50EC] dark:group-hover:text-indigo-400 transition-colors">
                          {assignment.title}
                        </h3>
                      </div>

                      {/* Course & Batch info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>
                          Course:{" "}
                          <strong className="text-slate-800 dark:text-slate-200 font-bold">
                            {assignment.courseName}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Batch:{" "}
                          <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                            {assignment.batchCode}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      <Badge
                        className={`text-xs font-black uppercase px-3 py-1 rounded-xl border ${assignment.statusInfo.color}`}
                      >
                        {isGraded && "★ GRADED"}
                        {isSubmitted && !isGraded && "✓ SUBMITTED"}
                        {isOverdue && "OVERDUE"}
                        {!isSubmitted && !isOverdue && "PENDING"}
                      </Badge>
                    </div>
                  </div>

                  {/* Instructions snippet */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {assignment.instructions}
                  </p>

                  {/* Attached Document chip if available */}
                  {assignment.hasDocument && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0D1527] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{assignment.documentName || "Assignment_Spec.pdf"}</span>
                    </div>
                  )}

                  {/* Card Footer: Due Date / Submission Info & Action Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {isSubmitted ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            Submitted on:{" "}
                            {new Date(submission?.submittedAt || "").toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            •{" "}
                            {new Date(submission?.submittedAt || "").toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>
                            Due:{" "}
                            <strong
                              className={
                                isOverdue
                                  ? "text-rose-600 dark:text-rose-400 font-bold"
                                  : "text-slate-800 dark:text-slate-200 font-bold"
                              }
                            >
                              {new Date(assignment.dueDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              •{" "}
                              {new Date(assignment.dueDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </strong>
                          </span>
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleOpenAssignment(assignment)}
                      className={`text-xs font-bold h-10 px-5 rounded-2xl cursor-pointer transition-all ${
                        isSubmitted
                          ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                          : "bg-[#5B50EC] hover:bg-[#4C40DB] text-white shadow-md shadow-indigo-500/20 hover:scale-102"
                      }`}
                    >
                      {isSubmitted ? (
                        <>
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          <span>View Submission</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          <span>View &amp; Submit Assignment</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ─── 5. VIEW & SUBMIT ASSIGNMENT DIALOG ───────────────────────────── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl rounded-3xl p-6 bg-white dark:bg-[#111C35] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl max-h-[92vh] overflow-y-auto">
          {selectedAssignment && (
            <div className="space-y-5">
              {/* Header */}
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <DialogTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <span>{selectedAssignment.title}</span>
                    </DialogTitle>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
                      <span>Course: <strong>{selectedAssignment.courseName}</strong></span>
                      <span>•</span>
                      <span>Batch: <strong className="font-mono">{selectedAssignment.batchCode}</strong></span>
                    </div>
                  </div>

                  <Badge
                    className={`text-xs font-extrabold uppercase px-3 py-1 rounded-xl border ${
                      currentSubmission
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : isCurrentOverdue
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {currentSubmission ? "✓ SUBMITTED" : isCurrentOverdue ? "OVERDUE" : "PENDING"}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Instructions Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Assignment Instructions
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedAssignment.instructions}
                </p>
              </div>

              {/* Attached Faculty Document */}
              {selectedAssignment.attachmentFileKey && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#5B50EC] text-white flex items-center justify-center shrink-0">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                        {selectedAssignment.attachmentFileName || "Assignment document"}
                      </span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                        Faculty reference document
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const token = localStorage.getItem("token");
                      const url = assignmentsApi.getAttachmentDownloadUrl(selectedAssignment.id);
                      const res = await fetch(url, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = selectedAssignment.attachmentFileName || "attachment";
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }}
                    className="text-xs font-bold h-8 gap-1.5 rounded-xl border-indigo-200 dark:border-indigo-800 text-[#5B50EC] dark:text-indigo-300 hover:bg-indigo-100/50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>View / Download</span>
                  </Button>
                </div>
              )}
              {selectedAssignment.youtubeVideoId && (
                <a
                  href={`https://www.youtube.com/watch?v=${selectedAssignment.youtubeVideoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[#5B50EC] hover:underline"
                >
                  Watch related YouTube video
                </a>
              )}
              {selectedAssignment.restrictStudentUpload && !currentSubmission && (
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Student file upload is restricted for this assignment. Contact your faculty if you need to submit.
                </p>
              )}

              {/* Due Date & Deadline Notice */}
              <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-slate-50 dark:bg-[#0D1527] border border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    Deadline:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {new Date(selectedAssignment.dueDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(selectedAssignment.dueDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </span>
                </div>
                {isCurrentOverdue && (
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    ⚠️ Deadline has passed
                  </span>
                )}
              </div>

              {/* ─── SUBMISSION SECTION ───────────────────────────────────── */}
              {currentSubmission ? (
                /* Already Submitted State */
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">
                        Submitted Successfully
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                      {currentSubmission.submittedAt && new Date(currentSubmission.submittedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      •{" "}
                      {currentSubmission.submittedAt && new Date(currentSubmission.submittedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-[#111C35] rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span>📄</span>
                      <span>{currentSubmission.fileKey || "Submitted file"}</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px]">
                      File Verified
                    </Badge>
                  </div>

                  {currentSubmission.marks != null && (
                    <div className="p-3 bg-white dark:bg-[#111C35] rounded-xl border border-emerald-300 dark:border-emerald-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          <span>Evaluation Marks</span>
                        </div>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatMarks(currentSubmission.marks, selectedAssignment?.maxMarks)}
                        </span>
                      </div>
                      {currentSubmission.feedback && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                          Faculty Feedback: <em>&quot;{currentSubmission.feedback}&quot;</em>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : isCurrentOverdue ? (
                /* Overdue without submission */
                <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-center space-y-1.5">
                  <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 mx-auto" />
                  <p className="text-xs font-bold text-rose-900 dark:text-rose-300">
                    Assignment deadline has passed.
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">
                    Submission is closed for this assignment. Please reach out to your faculty if an extension is permitted.
                  </p>
                </div>
              ) : (
                /* Active Submission Form */
                <form onSubmit={handleSubmitAssignment} className="space-y-4 pt-1">
                  <div className="space-y-2">
                    <label className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                      Upload Submission *
                    </label>

                    {uploadedFile ? (
                      <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg">📄</span>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                              {uploadedFile.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {(uploadedFile.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadedFile(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-[#111C35] transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-[#5B50EC] bg-slate-50/50 dark:bg-[#0D1527]/50 hover:bg-slate-50 dark:hover:bg-[#0D1527] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-[#5B50EC] dark:text-indigo-400 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                            Upload Completed Assignment
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-mono mt-0.5 block">
                            Supported: PDF, DOC, DOCX, ZIP (Max 25 MB)
                          </span>
                        </div>
                      </label>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={submissionNotes}
                      onChange={(e) => setSubmissionNotes(e.target.value)}
                      placeholder="Add any comments or explanations for the faculty..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D1527] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#5B50EC] outline-none resize-none"
                    />
                  </div>

                  <DialogFooter className="pt-2 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowModal(false)}
                      className="h-10 text-xs font-bold rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!uploadedFile || isSubmitting || submitMutation.isPending || uploadMutation.isPending || !canSubmitSelected}
                      className="h-10 flex-1 bg-[#5B50EC] hover:bg-[#4C40DB] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting || submitMutation.isPending ? "Submitting..." : "Submit Assignment"}
                    </Button>
                  </DialogFooter>
                </form>
              )}

              {/* Close Button if already submitted or overdue */}
              {(currentSubmission || isCurrentOverdue) && (
                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="h-10 px-6 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
