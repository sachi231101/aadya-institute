import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  HelpCircle,
  Plus,
  Search,
  BookOpen,
  CheckCircle2,
  Trash2,
  Edit,
  Layers,
  Check,
  Loader2,
  Filter,
  Sparkles,
  FolderPlus,
  Folder,
} from "lucide-react";
import {
  useQuestions,
  useDeleteQuestion,
} from "@/hooks/useQuestions";
import {
  useQuestionBanks,
  useCreateQuestionBank,
  useDeleteQuestionBank,
} from "@/hooks/useQuestionBanks";
import { useCourses } from "@/hooks/useCourses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

export const QuestionBank: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/center") ? "/center/exams" : "/admin/exams";
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [bankFilter, setBankFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("questions");

  useEffect(() => {
    const state = location.state as { bankId?: string } | null;
    if (state?.bankId) {
      setBankFilter(state.bankId);
      setActiveTab("questions");
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const { data: allQuestionsResponse } = useQuestions();
  const allQuestions = allQuestionsResponse?.data || [];

  const { data: questionsResponse, isLoading: questionsLoading } = useQuestions({
    search: searchTerm || undefined,
    questionType: typeFilter !== "ALL" ? typeFilter : undefined,
    difficulty: difficultyFilter !== "ALL" ? difficultyFilter : undefined,
    courseId: courseFilter !== "ALL" ? courseFilter : undefined,
    questionBankId: bankFilter !== "ALL" ? bankFilter : undefined,
  });
  const questions = questionsResponse?.data || [];

  const { data: banksResponse, isLoading: banksLoading } = useQuestionBanks({
    courseId: courseFilter !== "ALL" ? courseFilter : undefined,
  });
  const questionBanks = banksResponse?.data || [];
  const selectedBank = questionBanks.find((b: any) => b.id === bankFilter);

  const { courses } = useCourses();

  const deleteQuestionMutation = useDeleteQuestion();
  const createBankMutation = useCreateQuestionBank();
  const deleteBankMutation = useDeleteQuestionBank();

  // Create Question Bank Modal
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankDesc, setBankDesc] = useState("");
  const [bankCourseId, setBankCourseId] = useState("");

  const handleCreateBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) return;
    try {
      await createBankMutation.mutateAsync({
        name: bankName.trim(),
        description: bankDesc.trim() || undefined,
        courseId: bankCourseId || undefined,
      });
      setShowBankModal(false);
      setBankName("");
      setBankDesc("");
      setBankCourseId("");
      setActiveTab("banks");
    } catch {
      // Error handled in hook
    }
  };

  const handleViewBankQuestions = (bankId: string) => {
    setBankFilter(bankId);
    setActiveTab("questions");
  };

  const handleCreateQuestionForBank = (bankId?: string) => {
    const query = bankId ? `?bankId=${bankId}` : "";
    navigate(`${basePath}/questions/create${query}`);
  };

  const easyCount = allQuestions.filter((q: any) => q.difficulty === "EASY").length;
  const mediumCount = allQuestions.filter((q: any) => q.difficulty === "MEDIUM").length;
  const hardCount = allQuestions.filter((q: any) => q.difficulty === "HARD").length;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HelpCircle className="h-7 w-7 text-purple-600" />
            Question Banks & Catalog
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build reusable question repositories, organize by topic/difficulty, and curate assessments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowBankModal(true)}
          >
            <FolderPlus className="h-4 w-4 text-purple-600" />
            New Question Bank
          </Button>

          <Button
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
            onClick={() => handleCreateQuestionForBank()}
          >
            <Plus className="h-4 w-4" />
            Create Question
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Questions</p>
              <p className="text-2xl font-bold mt-1">{allQuestions.length}</p>
            </div>
            <HelpCircle className="h-7 w-7 text-purple-500/40" />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Question Banks</p>
              <p className="text-2xl font-bold mt-1">{questionBanks.length}</p>
            </div>
            <Folder className="h-7 w-7 text-blue-500/40" />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Easy</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{easyCount}</p>
            </div>
            <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-600 text-xs">
              E
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Medium</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{mediumCount}</p>
            </div>
            <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-amber-600 text-xs">
              M
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Hard</p>
              <p className="text-2xl font-bold mt-1 text-rose-600">{hardCount}</p>
            </div>
            <div className="h-7 w-7 rounded-full bg-rose-500/10 flex items-center justify-center font-bold text-rose-600 text-xs">
              H
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-[350px] grid grid-cols-2">
          <TabsTrigger value="questions">
            Questions ({bankFilter !== "ALL" ? questions.length : allQuestions.length})
          </TabsTrigger>
          <TabsTrigger value="banks">Question Banks ({questionBanks.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Questions Catalog */}
        <TabsContent value="questions" className="space-y-4">
          {bankFilter !== "ALL" && selectedBank && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple-200 bg-purple-500/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Folder className="h-4 w-4 text-purple-600" />
                <span>
                  Showing questions in <strong>{selectedBank.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => handleCreateQuestionForBank(bankFilter)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add to Bank
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setBankFilter("ALL")}
                >
                  Clear Filter
                </Button>
              </div>
            </div>
          )}
          {/* Filter Bar */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search question text..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-xs bg-background"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Type:</span>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      aria-label="Filter by type"
                      className="text-xs rounded-md border border-input bg-background px-3 py-1.5 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="ALL">All Types</option>
                      <option value="MCQ_SINGLE">Single Choice (MCQ)</option>
                      <option value="MCQ_MULTIPLE">Multiple Choice</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                      <option value="LONG_ANSWER">Long Answer</option>
                      <option value="NUMERICAL">Numerical</option>
                      <option value="FILL_BLANK">Fill in Blank</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Difficulty:</span>
                    <select
                      value={difficultyFilter}
                      onChange={(e) => setDifficultyFilter(e.target.value)}
                      aria-label="Filter by difficulty"
                      className="text-xs rounded-md border border-input bg-background px-3 py-1.5 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="ALL">All Difficulties</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Bank:</span>
                    <select
                      value={bankFilter}
                      onChange={(e) => setBankFilter(e.target.value)}
                      aria-label="Filter by question bank"
                      className="text-xs rounded-md border border-input bg-background px-3 py-1.5 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="ALL">All Banks</option>
                  {questionBanks.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name || "Unnamed Bank"}
                    </option>
                  ))}
                    </select>
                  </div>

                  {(searchTerm || typeFilter !== "ALL" || difficultyFilter !== "ALL" || bankFilter !== "ALL") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setTypeFilter("ALL");
                        setDifficultyFilter("ALL");
                        setBankFilter("ALL");
                      }}
                      className="text-xs text-muted-foreground h-8"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question List */}
          {questionsLoading ? (
            <div className="py-16 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              Loading questions...
            </div>
          ) : questions.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-16 text-center space-y-3">
                <HelpCircle className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="font-semibold text-foreground">
                  {bankFilter !== "ALL" && selectedBank
                    ? `No questions in "${selectedBank.name}" yet`
                    : "No questions found"}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {bankFilter !== "ALL"
                    ? "Add assessment questions to this bank to build a reusable question repository."
                    : "Create your first assessment question to populate the institute question catalog."}
                </p>
                <Button
                  size="sm"
                  className="gap-2 mt-2"
                  onClick={() =>
                    handleCreateQuestionForBank(bankFilter !== "ALL" ? bankFilter : undefined)
                  }
                >
                  <Plus className="h-4 w-4" /> Create Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {questions.map((q: any, index: number) => (
                <Card key={q.id} className="border-border/60 shadow-xs hover:border-border transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            #{index + 1}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {q.questionType?.replace("_", " ")}
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

                          {q.questionBank && (
                            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-300">
                              Bank: {q.questionBank.name}
                            </Badge>
                          )}

                          {q.course && (
                            <span className="text-xs text-muted-foreground">
                              • {q.course.name}
                            </span>
                          )}

                          <span className="text-xs text-muted-foreground font-semibold ml-auto">
                            Marks: <strong className="text-foreground">{q.marks}</strong> pts
                            {q.negativeMarks > 0 && <span className="text-rose-600 ml-1">(-{q.negativeMarks})</span>}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-foreground pt-1">{q.questionText}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this question?")) {
                              deleteQuestionMutation.mutate(q.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Options Preview for MCQ/TF */}
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

                    {q.explanation && (
                      <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-2 rounded border border-border/40">
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Question Banks */}
        <TabsContent value="banks" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {banksLoading ? (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                Loading question banks...
              </div>
            ) : questionBanks.length === 0 ? (
              <div className="col-span-full py-16 text-center space-y-3">
                <Folder className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="font-semibold text-foreground">No Question Banks Created</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Question banks allow you to organize questions into reusable subject-specific folders.
                </p>
                <Button
                  size="sm"
                  className="gap-2 mt-2"
                  onClick={() => setShowBankModal(true)}
                >
                  <FolderPlus className="h-4 w-4" /> Create First Bank
                </Button>
              </div>
            ) : (
              questionBanks.map((bank: any) => (
                <Card
                  key={bank.id}
                  className="border-border/60 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewBankQuestions(bank.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                          <Folder className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{bank.name}</CardTitle>
                          <p className="text-[11px] text-muted-foreground">
                            {bank.course?.name || "General"}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete question bank "${bank.name}"?`)) {
                            deleteBankMutation.mutate(bank.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {bank.description && (
                      <p className="text-muted-foreground line-clamp-2">
                        {bank.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                      <span>Questions: <strong className="text-foreground">{bank._count?.questions ?? 0}</strong></span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateQuestionForBank(bank.id);
                          }}
                        >
                          Add Question
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewBankQuestions(bank.id);
                          }}
                        >
                          View Questions →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Question Bank Modal */}
      <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-purple-600" />
              Create Question Bank
            </DialogTitle>
            <DialogDescription>
              Create a named repository for organizing subject and module questions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBankSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bankName" className="text-xs font-semibold">
                Bank Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bankName"
                placeholder="e.g. JavaScript Core Concepts Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankCourse" className="text-xs font-semibold">Course Association</Label>
              <select
                id="bankCourse"
                value={bankCourseId}
                onChange={(e) => setBankCourseId(e.target.value)}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">General / Cross-Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankDesc" className="text-xs font-semibold">Description</Label>
              <Textarea
                id="bankDesc"
                placeholder="Topics and concepts covered in this bank..."
                value={bankDesc}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBankDesc(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setShowBankModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBankMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {createBankMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Bank"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionBank;
