import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Award,
  Users,
  Plus,
  Trash2,
  Send,
  Archive,
  Edit,
  ShieldAlert,
  HelpCircle,
  AlertCircle,
  Loader2,
  BookOpen,
  Check,
  X,
  Folder,
  Search,
  UserPlus,
  GraduationCap,
} from "lucide-react";
import {
  useExam,
  useExamQuestions,
  useExamBatches,
  useExamStudents,
  usePublishExam,
  useScheduleExam,
  useArchiveExam,
  useAddQuestionToExam,
  useAddQuestionBankToExam,
  useRemoveQuestionFromExam,
  useAssignBatchToExam,
  useRemoveBatchFromExam,
  useAssignStudentsToExam,
  useRemoveStudentFromExam,
} from "@/hooks/useExams";
import { useQuestions } from "@/hooks/useQuestions";
import { useQuestionBanks } from "@/hooks/useQuestionBanks";
import { useBatches } from "@/hooks/useBatches";
import { useStudentList } from "@/hooks/useStudents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PICKER_PAGE_SIZE = 20;

export const ExamDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/center") ? "/center/exams" : "/admin/exams";

  const { data: examResponse, isLoading: examLoading } = useExam(id || "");
  const exam = examResponse?.data;

  const { data: questionsResponse, isLoading: questionsLoading } = useExamQuestions(id || "");
  const examQuestions = questionsResponse?.data || [];

  const { data: batchesResponse, isLoading: batchesLoading } = useExamBatches(id || "");
  const examBatches = batchesResponse?.data || [];

  const { data: studentsResponse, isLoading: studentsLoading } = useExamStudents(id || "");
  const examStudents = studentsResponse?.data || [];

  // Mutations
  const publishMutation = usePublishExam();
  const scheduleMutation = useScheduleExam(id || "");
  const archiveMutation = useArchiveExam();
  const addQuestionMutation = useAddQuestionToExam(id || "");
  const addQuestionBankMutation = useAddQuestionBankToExam(id || "");
  const removeQuestionMutation = useRemoveQuestionFromExam(id || "");
  const assignBatchMutation = useAssignBatchToExam(id || "");
  const removeBatchMutation = useRemoveBatchFromExam(id || "");
  const assignStudentsMutation = useAssignStudentsToExam(id || "");
  const removeStudentMutation = useRemoveStudentFromExam(id || "");

  // Inline question bank picker (banks list → questions → Add to Exam)
  type PickerView = "banks" | "questions";
  const [pickerView, setPickerView] = useState<PickerView>("banks");
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerPage, setPickerPage] = useState(1);
  const [addingBankId, setAddingBankId] = useState<string | null>(null);

  const canEditQuestions = exam && ["DRAFT", "PUBLISHED", "SCHEDULED"].includes(exam.status);

  const { data: banksResponse, isLoading: banksLoading } = useQuestionBanks();
  const questionBanks = banksResponse?.data || [];
  const selectedBank = questionBanks.find((b: any) => b.id === selectedBankId);

  const { data: pickerQuestionsResponse, isLoading: pickerQuestionsLoading } = useQuestions(
    {
      search: pickerSearch || undefined,
      questionBankId: selectedBankId || undefined,
      page: pickerPage,
      limit: PICKER_PAGE_SIZE,
    },
    { enabled: pickerView === "questions" && !!selectedBankId }
  );
  const pickerQuestions = pickerQuestionsResponse?.data || [];
  const pickerTotal = pickerQuestionsResponse?.meta?.total ?? pickerQuestions.length;
  const pickerTotalPages = pickerQuestionsResponse?.meta?.totalPages ?? 1;

  useEffect(() => {
    setPickerPage(1);
  }, [pickerSearch, selectedBankId]);

  const handleBrowseBank = (bankId: string) => {
    setSelectedBankId(bankId);
    setPickerSearch("");
    setPickerPage(1);
    setPickerView("questions");
  };

  const handleBackToBanks = () => {
    setPickerView("banks");
    setSelectedBankId(null);
    setPickerSearch("");
    setPickerPage(1);
  };

  const handleAddFullBank = async (bank: { id: string; name: string; _count?: { questions?: number } }) => {
    const count = bank._count?.questions ?? 0;
    if (count === 0) return;

    const message =
      count === 1
        ? `Add the only question from "${bank.name}" to this exam?`
        : `Add all ${count} questions from "${bank.name}" to this exam?`;

    if (!window.confirm(message)) return;

    setAddingBankId(bank.id);
    try {
      await addQuestionBankMutation.mutateAsync(bank.id);
    } finally {
      setAddingBankId(null);
    }
  };

  // Assign Batch Modal
  const [showAssignBatchModal, setShowAssignBatchModal] = useState(false);
  const { batches: allBatches } = useBatches({
    courseId: exam?.courseId || undefined,
  });

  // Assign Students Modal
  const [showAssignStudentModal, setShowAssignStudentModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const { data: studentListResponse, isLoading: studentListLoading } = useStudentList(
    { search: studentSearch || undefined, status: "ACTIVE", limit: 50 },
  );
  const availableStudents = studentListResponse?.data || [];

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700">Draft</Badge>;
      case "PUBLISHED":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-700">Published</Badge>;
      case "SCHEDULED":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-300 dark:border-purple-700">Scheduled</Badge>;
      case "LIVE":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-700 animate-pulse">● Live</Badge>;
      case "ENDED":
      case "COMPLETED":
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-300 dark:border-slate-700">Completed</Badge>;
      case "ARCHIVED":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-300 dark:border-gray-700">Archived</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-300 dark:border-red-700">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenSchedule = () => {
    setScheduleError(null);
    if (exam?.startAt) {
      setStartAt(new Date(exam.startAt).toISOString().slice(0, 16));
    } else {
      setStartAt(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
    }
    if (exam?.endAt) {
      setEndAt(new Date(exam.endAt).toISOString().slice(0, 16));
    } else {
      setEndAt(new Date(Date.now() + 7200000).toISOString().slice(0, 16));
    }
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startAt || !endAt) {
      setScheduleError("Both start and end dates are required.");
      return;
    }
    const sDate = new Date(startAt);
    const eDate = new Date(endAt);
    if (eDate <= sDate) {
      setScheduleError("End time must be strictly after start time.");
      return;
    }

    try {
      await scheduleMutation.mutateAsync({
        startAt: sDate.toISOString(),
        endAt: eDate.toISOString(),
      });
      setShowScheduleModal(false);
    } catch (err: any) {
      setScheduleError(err?.response?.data?.message || "Failed to schedule exam");
    }
  };

  const handlePublish = async () => {
    if (!exam) return;
    try {
      await publishMutation.mutateAsync(exam.id);
    } catch {
      // Handled in mutation hook
    }
  };

  const handleArchive = async () => {
    if (!exam) return;
    if (window.confirm(`Are you sure you want to archive "${exam.name}"?`)) {
      await archiveMutation.mutateAsync(exam.id);
    }
  };

  const existingQuestionIds = new Set(examQuestions.map((eq: any) => eq.questionId));
  const assignedBatchIds = new Set(examBatches.map((eb: any) => eb.batchId));
  const assignedStudentIds = new Set(examStudents.map((es: any) => es.studentId));

  const canAssign = ["DRAFT", "PUBLISHED", "SCHEDULED"].includes(exam?.status || "");

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleAssignSelectedStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    await assignStudentsMutation.mutateAsync(selectedStudentIds);
    setSelectedStudentIds([]);
    setShowAssignStudentModal(false);
    setStudentSearch("");
  };

  if (examLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading examination details...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Exam Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested exam does not exist or has been removed.</p>
        <Button onClick={() => navigate(basePath)}>Back to Examinations</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(basePath)}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{exam.name}</h1>
              {getStatusBadge(exam.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {exam.course?.name || "General Course"} {exam.module && `• Module: ${exam.module.name}`} • Created by {exam.createdBy?.name || "Admin"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-indigo-600 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            onClick={() => navigate(`${basePath}/${exam.id}/attempts`)}
          >
            <Users className="h-4 w-4" /> View Attempts & Proctoring
          </Button>

          {["DRAFT", "SCHEDULED", "PUBLISHED"].includes(exam.status) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate(`${basePath}/${exam.id}/edit`)}
            >
              <Edit className="h-4 w-4" /> Edit
            </Button>
          )}

          {["DRAFT", "PUBLISHED"].includes(exam.status) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-purple-600 border-purple-300 dark:border-purple-800"
              onClick={handleOpenSchedule}
            >
              <Calendar className="h-4 w-4" /> Schedule
            </Button>
          )}

          {exam.status === "DRAFT" && (
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={publishMutation.isPending}
              onClick={handlePublish}
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publish Exam
            </Button>
          )}

          {["PUBLISHED", "SCHEDULED", "LIVE", "ENDED", "COMPLETED"].includes(exam.status) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-gray-500"
              onClick={handleArchive}
            >
              <Archive className="h-4 w-4" /> Archive
            </Button>
          )}
        </div>
      </div>

      {/* Quick Summary Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Duration</p>
              <p className="text-xl font-bold mt-0.5">{exam.durationMinutes} Mins</p>
            </div>
            <Clock className="h-7 w-7 text-primary/40" />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Total Marks</p>
              <p className="text-xl font-bold mt-0.5">{exam.totalMarks} Pts</p>
            </div>
            <Award className="h-7 w-7 text-amber-500/40" />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Questions</p>
              <p className="text-xl font-bold mt-0.5">{examQuestions.length}</p>
            </div>
            <HelpCircle className="h-7 w-7 text-purple-500/40" />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium">Assigned Batches</p>
              <p className="text-xl font-bold mt-0.5">{examBatches.length}</p>
            </div>
            <Users className="h-7 w-7 text-blue-500/40" />
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="questions" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full sm:w-[560px]">
          <TabsTrigger value="questions">Questions ({examQuestions.length})</TabsTrigger>
          <TabsTrigger value="batches">
            Assignments ({examBatches.length + examStudents.length})
          </TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings & Proctoring</TabsTrigger>
        </TabsList>

        {/* Tab 1: Questions Management */}
        <TabsContent value="questions" className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Questions on This Exam</CardTitle>
              <CardDescription>
                Questions currently attached to <strong>{exam.name}</strong>. Remove any you do not want on this paper.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {questionsLoading ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading questions...
                </div>
              ) : examQuestions.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <HelpCircle className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="font-semibold text-foreground">No questions on this exam yet</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Browse a question bank below and click <strong>Add to Exam</strong> on each question you want.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {examQuestions.map((eq: any, index: number) => {
                    const q = eq.question;
                    return (
                      <div
                        key={eq.id}
                        className="p-4 rounded-lg border border-border/70 bg-card hover:border-border transition-colors space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-[11px] font-bold">
                                Q{index + 1}
                              </Badge>
                              <Badge variant="outline" className="text-[11px]">
                                {q.questionType?.replace(/_/g, " ")}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[11px] ${
                                  q.difficulty === "EASY"
                                    ? "text-emerald-600 border-emerald-300"
                                    : q.difficulty === "HARD"
                                    ? "text-rose-600 border-rose-300"
                                    : "text-amber-600 border-amber-300"
                                }`}
                              >
                                {q.difficulty}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-semibold ml-auto">
                                Marks: <strong className="text-foreground">{eq.marksOverride ?? q.marks}</strong> pts
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground pt-1">{q.questionText}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Edit Question"
                              onClick={() => navigate(`${basePath}/questions/${q.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {canEditQuestions && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Remove from Exam"
                                onClick={() => removeQuestionMutation.mutate(q.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt: any, optIdx: number) => (
                              <div
                                key={opt.id}
                                className={`p-2 rounded text-xs flex items-center gap-2 border ${
                                  opt.isCorrect
                                    ? "bg-emerald-500/10 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold"
                                    : "bg-muted/30 border-border/50 text-foreground"
                                }`}
                              >
                                <span className="h-5 w-5 rounded-full bg-background border flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1 line-clamp-1">{opt.optionText}</span>
                                {opt.isCorrect && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {canEditQuestions && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Folder className="h-4 w-4 text-purple-600" />
                      Add from Question Bank
                    </CardTitle>
                    <CardDescription>
                      Pick a question bank and add all questions at once, or browse and add individually.
                    </CardDescription>
                  </div>
                  {pickerView === "questions" && selectedBank && (
                    <Button variant="outline" size="sm" onClick={handleBackToBanks}>
                      ← Back to Banks
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs
                  value={pickerView}
                  onValueChange={(v) => {
                    if (v === "banks") handleBackToBanks();
                  }}
                >
                  <TabsList className="grid w-full sm:w-[320px] grid-cols-2">
                    <TabsTrigger value="banks">
                      Question Banks ({questionBanks.length})
                    </TabsTrigger>
                    <TabsTrigger value="questions" disabled={!selectedBankId}>
                      Questions{selectedBank ? ` (${pickerTotal})` : ""}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="banks" className="mt-4 space-y-3">
                    {banksLoading ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading question banks...
                      </div>
                    ) : questionBanks.length === 0 ? (
                      <div className="py-12 text-center space-y-3">
                        <Folder className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                        <p className="font-semibold text-foreground">No question banks found</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Create question banks and add questions in the{" "}
                          <Link to={`${basePath}/question-bank`} className="text-primary underline">
                            Question Bank
                          </Link>{" "}
                          page first.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => navigate(`${basePath}/question-bank`)}
                        >
                          <BookOpen className="h-4 w-4" /> Open Question Bank
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {questionBanks.map((bank: any) => (
                          <Card
                            key={bank.id}
                            className="border-border/60 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleBrowseBank(bank.id)}
                          >
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
                                  <Folder className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">{bank.name}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {bank.course?.name || "General"}
                                  </p>
                                </div>
                              </div>
                              {bank.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2">{bank.description}</p>
                              )}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-[11px]">
                                <span>
                                  Questions:{" "}
                                  <strong className="text-foreground">{bank._count?.questions ?? 0}</strong>
                                </span>
                                <div className="flex items-center gap-1">
                                  {(bank._count?.questions ?? 0) > 0 && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-7 text-[11px] px-2"
                                      disabled={addingBankId === bank.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddFullBank(bank);
                                      }}
                                    >
                                      {addingBankId === bank.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        "Add Full Bank"
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBrowseBank(bank.id);
                                    }}
                                  >
                                    Browse →
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="questions" className="mt-4 space-y-4">
                    {selectedBank && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple-200 bg-purple-500/5 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Folder className="h-4 w-4 text-purple-600" />
                          <span>
                            Browsing <strong>{selectedBank.name}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {pickerTotal > 0 && (
                            <Button
                              size="sm"
                              disabled={addingBankId === selectedBank.id}
                              onClick={() => handleAddFullBank(selectedBank)}
                            >
                              {addingBankId === selectedBank.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Adding...
                                </>
                              ) : (
                                "Add All to Exam"
                              )}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-xs" onClick={handleBackToBanks}>
                            Change Bank
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search questions in this bank..."
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        className="pl-9 text-sm"
                      />
                    </div>

                    {pickerQuestionsLoading ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading questions...
                      </div>
                    ) : pickerQuestions.length === 0 ? (
                      <div className="py-12 text-center space-y-2 text-muted-foreground">
                        <HelpCircle className="h-10 w-10 mx-auto opacity-40" />
                        <p className="text-sm font-medium text-foreground">No questions in this bank</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 mt-2"
                          onClick={() =>
                            navigate(`${basePath}/questions/create?bankId=${selectedBankId}`)
                          }
                        >
                          <Plus className="h-4 w-4" /> Add Questions to Bank
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pickerQuestions.map((q: any) => {
                          const isAdded = existingQuestionIds.has(q.id);
                          return (
                            <div
                              key={q.id}
                              className={`p-4 border rounded-lg flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                                isAdded ? "bg-muted/40 border-border/60" : "hover:bg-muted/20 border-border/70"
                              }`}
                            >
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="text-[10px]">
                                    {q.questionType?.replace(/_/g, " ")}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                      q.difficulty === "EASY"
                                        ? "text-emerald-600 border-emerald-300"
                                        : q.difficulty === "HARD"
                                        ? "text-rose-600 border-rose-300"
                                        : "text-amber-600 border-amber-300"
                                    }`}
                                  >
                                    {q.difficulty}
                                  </Badge>
                                  <span className="text-[11px] text-muted-foreground">{q.marks} pts</span>
                                </div>
                                <p className="text-sm text-foreground">{q.questionText}</p>
                                {q.options && q.options.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {q.options.map((opt: any, i: number) => (
                                      <span
                                        key={opt.id}
                                        className={`text-[10px] px-2 py-1 rounded border ${
                                          opt.isCorrect
                                            ? "bg-emerald-500/10 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                                            : "bg-muted/50 border-border/50"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + i)}. {opt.optionText}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                disabled={isAdded || addQuestionMutation.isPending}
                                variant={isAdded ? "secondary" : "default"}
                                className="shrink-0 w-full sm:w-auto"
                                onClick={() => addQuestionMutation.mutate({ questionId: q.id })}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 mr-1" /> Added
                                  </>
                                ) : (
                                  "Add to Exam"
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {pickerTotalPages > 1 && (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t text-xs">
                        <span className="text-muted-foreground">
                          Page {pickerPage} of {pickerTotalPages} ({pickerTotal} questions)
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pickerPage <= 1}
                            onClick={() => setPickerPage((p) => p - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pickerPage >= pickerTotalPages}
                            onClick={() => setPickerPage((p) => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Batch & Student Assignments */}
        <TabsContent value="batches" className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Assigned Batches</CardTitle>
                <CardDescription>
                  All students enrolled in these batches can take this exam.
                </CardDescription>
              </div>

              {canAssign && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowAssignBatchModal(true)}
                >
                  <Plus className="h-4 w-4" /> Assign Batch
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {batchesLoading ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading batch assignments...
                </div>
              ) : examBatches.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="font-semibold text-foreground">No batches assigned</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Assign a batch to grant access to all its enrolled students, or assign individual students below.
                  </p>
                  {canAssign && (
                    <Button
                      size="sm"
                      className="gap-2 mt-2"
                      onClick={() => setShowAssignBatchModal(true)}
                    >
                      <Plus className="h-4 w-4" /> Assign a Batch
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examBatches.map((eb: any) => (
                      <TableRow key={eb.id}>
                        <TableCell className="font-medium text-foreground">
                          {eb.batch?.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{eb.batch?.code}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {eb.batch?.course?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {eb.batch?.status || "ACTIVE"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canAssign && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removeBatchMutation.mutate(eb.batchId)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Unassign
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  Assigned Students
                </CardTitle>
                <CardDescription>
                  Individual students who can take this exam (in addition to batch assignments).
                </CardDescription>
              </div>

              {canAssign && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setSelectedStudentIds([]);
                    setStudentSearch("");
                    setShowAssignStudentModal(true);
                  }}
                >
                  <UserPlus className="h-4 w-4" /> Assign Students
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading student assignments...
                </div>
              ) : examStudents.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="font-semibold text-foreground">No individual students assigned</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Assign specific students when the exam should not go to an entire batch.
                  </p>
                  {canAssign && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 mt-2"
                      onClick={() => {
                        setSelectedStudentIds([]);
                        setStudentSearch("");
                        setShowAssignStudentModal(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4" /> Assign Students
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examStudents.map((es: any) => {
                      const activeBatch = es.student?.batchEnrollments?.[0]?.batch;
                      return (
                        <TableRow key={es.id}>
                          <TableCell className="font-medium text-foreground">
                            {es.student?.user?.name || "—"}
                            {es.student?.user?.email && (
                              <p className="text-[11px] text-muted-foreground font-normal">
                                {es.student.user.email}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{es.student?.studentCode}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {activeBatch?.name || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {es.student?.branch?.name || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {canAssign && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeStudentMutation.mutate(es.studentId)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Unassign
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {examBatches.length === 0 && examStudents.length === 0 && (
            <div className="p-4 rounded-lg border border-amber-300 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200">
              Assign at least one batch or student before publishing this exam.
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">General Information & Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Description</p>
                  <p className="text-foreground">{exam.description || <span className="italic text-muted-foreground">No description provided</span>}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Schedule Window</p>
                  <p className="text-foreground">
                    {exam.startAt && exam.endAt ? (
                      `${new Date(exam.startAt).toLocaleString()} to ${new Date(exam.endAt).toLocaleString()}`
                    ) : (
                      <span className="italic text-muted-foreground">Not scheduled (On-demand)</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Student Instructions</p>
                <div className="p-4 rounded-lg bg-muted/40 border text-xs whitespace-pre-wrap text-foreground font-mono">
                  {exam.instructions || "No custom instructions specified."}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Settings & Proctoring */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Assessment Integrity & Proctoring Rules
              </CardTitle>
              <CardDescription>
                Live exam constraints and student browser violation rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Negative Marking</p>
                    <p className="text-[11px] text-muted-foreground">Deducts marks for wrong answers</p>
                  </div>
                  {exam.negativeMarkingEnabled ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-muted-foreground" />}
                </div>

                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Instant Result Display</p>
                    <p className="text-[11px] text-muted-foreground">Candidate sees scores upon submission</p>
                  </div>
                  {exam.showResults ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-muted-foreground" />}
                </div>

                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Shuffle Questions</p>
                    <p className="text-[11px] text-muted-foreground">Randomize question order per student</p>
                  </div>
                  {exam.randomizeQuestions ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-muted-foreground" />}
                </div>

                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Shuffle MCQ Options</p>
                    <p className="text-[11px] text-muted-foreground">Randomize answer choices order</p>
                  </div>
                  {exam.randomizeOptions ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-muted-foreground" />}
                </div>

                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Proctoring Monitored</p>
                    <p className="text-[11px] text-muted-foreground">Tab switches & blur events logged</p>
                  </div>
                  {exam.proctoringEnabled ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-muted-foreground" />}
                </div>

                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Fullscreen Enforced</p>
                    <p className="text-[11px] text-muted-foreground">Fullscreen mode mandatory</p>
                  </div>
                  {exam.fullscreenRequired ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-muted-foreground" />}
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg text-xs flex items-center justify-between">
                <span>Maximum Allowed Violations / Warnings Before Auto-Submit:</span>
                <strong className="text-foreground">{exam.maxWarnings} Warnings</strong>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Batch Modal */}
      <Dialog open={showAssignBatchModal} onOpenChange={setShowAssignBatchModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Assign Batch to Exam
            </DialogTitle>
            <DialogDescription>
              Select a batch to grant assessment access to its enrolled students.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[350px] overflow-y-auto py-2">
            {allBatches.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No batches found.</p>
            ) : (
              allBatches.map((b: any) => {
                const isAssigned = assignedBatchIds.has(b.id);
                return (
                  <div
                    key={b.id}
                    className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/20"
                  >
                    <div>
                      <p className="text-xs font-semibold">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">Code: {b.code}</p>
                    </div>

                    <Button
                      size="sm"
                      disabled={isAssigned || assignBatchMutation.isPending}
                      variant={isAssigned ? "secondary" : "default"}
                      onClick={() => {
                        assignBatchMutation.mutate(b.id);
                      }}
                    >
                      {isAssigned ? "Assigned" : "Assign"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowAssignBatchModal(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Students Modal */}
      <Dialog open={showAssignStudentModal} onOpenChange={setShowAssignStudentModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Assign Students to Exam
            </DialogTitle>
            <DialogDescription>
              Search and select one or more students. Already assigned students are marked.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or student code..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto py-1">
            {studentListLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading students...
              </div>
            ) : availableStudents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No students found.</p>
            ) : (
              availableStudents.map((s) => {
                const isAssigned = assignedStudentIds.has(s.id);
                const isSelected = selectedStudentIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`p-3 border rounded-lg flex items-center gap-3 cursor-pointer hover:bg-muted/20 ${
                      isAssigned ? "opacity-60 cursor-not-allowed" : ""
                    } ${isSelected ? "border-indigo-400 bg-indigo-500/5" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      disabled={isAssigned}
                      checked={isSelected}
                      onChange={() => !isAssigned && toggleStudentSelection(s.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {s.user?.name || "Unnamed Student"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.studentCode}
                        {s.user?.email ? ` • ${s.user.email}` : ""}
                        {s.batchName ? ` • ${s.batchName}` : ""}
                      </p>
                    </div>
                    {isAssigned && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Assigned
                      </Badge>
                    )}
                  </label>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAssignStudentModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={selectedStudentIds.length === 0 || assignStudentsMutation.isPending}
              onClick={handleAssignSelectedStudents}
            >
              {assignStudentsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Assigning...
                </>
              ) : (
                `Assign ${selectedStudentIds.length || ""} Student${selectedStudentIds.length === 1 ? "" : "s"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Schedule Exam
            </DialogTitle>
            <DialogDescription>
              Set the live window dates and times for <strong>{exam.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleSubmit} className="space-y-4 py-2">
            {scheduleError && (
              <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{scheduleError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="schedStart" className="text-xs font-semibold">Start Window</Label>
              <Input
                id="schedStart"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedEnd" className="text-xs font-semibold">End Window (Deadline)</Label>
              <Input
                id="schedEnd"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setShowScheduleModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scheduleMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {scheduleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamDetails;
