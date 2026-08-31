import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  HelpCircle,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Loader2,
  Copy,
  ChevronDown,
  ChevronUp,
  Save,
  Layers,
  Sparkles,
} from "lucide-react";
import { useCreateBulkQuestions } from "@/hooks/useQuestions";
import { useQuestionBanks } from "@/hooks/useQuestionBanks";
import { useCourses } from "@/hooks/useCourses";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type QuestionType =
  | "MCQ_SINGLE"
  | "MCQ_MULTIPLE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "LONG_ANSWER"
  | "NUMERICAL"
  | "FILL_BLANK";

type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

interface OptionItem {
  id: string;
  optionText: string;
  isCorrect: boolean;
}

interface QuestionDraft {
  id: string;
  questionType: QuestionType;
  questionText: string;
  difficulty: DifficultyLevel;
  marks: number;
  negativeMarks: number;
  explanation: string;
  options: OptionItem[];
  isCollapsed?: boolean;
}

const createDefaultOptions = (type: QuestionType): OptionItem[] => {
  if (type === "TRUE_FALSE") {
    return [
      { id: "1", optionText: "True", isCorrect: true },
      { id: "2", optionText: "False", isCorrect: false },
    ];
  }
  return [
    { id: "1", optionText: "", isCorrect: true },
    { id: "2", optionText: "", isCorrect: false },
    { id: "3", optionText: "", isCorrect: false },
    { id: "4", optionText: "", isCorrect: false },
  ];
};

const createNewQuestionDraft = (
  defaultType: QuestionType = "MCQ_SINGLE",
  defaultDifficulty: DifficultyLevel = "MEDIUM"
): QuestionDraft => ({
  id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  questionType: defaultType,
  questionText: "",
  difficulty: defaultDifficulty,
  marks: 1,
  negativeMarks: 0,
  explanation: "",
  options: createDefaultOptions(defaultType),
  isCollapsed: false,
});

export const CreateQuestion: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const basePath = location.pathname.startsWith("/center") ? "/center/exams" : "/admin/exams";
  const createBulkQuestionsMutation = useCreateBulkQuestions();

  const { courses } = useCourses();
  const { data: banksResponse } = useQuestionBanks();
  const questionBanks = banksResponse?.data || [];
  const preselectedBankId = searchParams.get("bankId") || "";

  // Common Header State
  const [questionBankId, setQuestionBankId] = useState(preselectedBankId);
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [defaultDifficulty, setDefaultDifficulty] = useState<DifficultyLevel>("MEDIUM");
  const [defaultQuestionType, setDefaultQuestionType] = useState<QuestionType>("MCQ_SINGLE");

  // Questions List State (starts with 1 question)
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    createNewQuestionDraft("MCQ_SINGLE", "MEDIUM"),
  ]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const questionsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (preselectedBankId) {
      setQuestionBankId(preselectedBankId);
      const bank = questionBanks.find((b: any) => b.id === preselectedBankId);
      if (bank?.courseId && !courseId) {
        setCourseId(bank.courseId);
      }
    }
  }, [preselectedBankId, questionBanks, courseId]);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const availableModules = selectedCourse?.modules || [];

  // Add Another Question Handler
  const handleAddAnotherQuestion = () => {
    const newDraft = createNewQuestionDraft(defaultQuestionType, defaultDifficulty);
    setQuestions((prev) => [...prev, newDraft]);
    setValidationError(null);

    // Scroll to the new question smoothly
    setTimeout(() => {
      questionsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Duplicate a Question
  const handleDuplicateQuestion = (index: number) => {
    const source = questions[index];
    const duplicated: QuestionDraft = {
      ...source,
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      options: source.options.map((opt) => ({ ...opt, id: String(Date.now() + Math.random()) })),
      isCollapsed: false,
    };
    setQuestions((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
  };

  // Remove a Question
  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle Collapse
  const handleToggleCollapse = (index: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, isCollapsed: !q.isCollapsed } : q))
    );
  };

  // Update specific question field
  const handleQuestionFieldChange = (
    index: number,
    field: keyof QuestionDraft,
    value: any
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        if (field === "questionType") {
          return {
            ...q,
            questionType: value,
            options: createDefaultOptions(value),
          };
        }
        return { ...q, [field]: value };
      })
    );
  };

  // Option actions for a question
  const handleAddOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return {
          ...q,
          options: [
            ...q.options,
            { id: String(Date.now()), optionText: "", isCorrect: false },
          ],
        };
      })
    );
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.options.length <= 2) return q;
        return {
          ...q,
          options: q.options.filter((_, oi) => oi !== optIndex),
        };
      })
    );
  };

  const handleOptionTextChange = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return {
          ...q,
          options: q.options.map((opt, oi) =>
            oi === optIndex ? { ...opt, optionText: text } : opt
          ),
        };
      })
    );
  };

  const handleToggleCorrect = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.questionType === "MCQ_SINGLE" || q.questionType === "TRUE_FALSE") {
          return {
            ...q,
            options: q.options.map((opt, oi) => ({
              ...opt,
              isCorrect: oi === optIndex,
            })),
          };
        } else if (q.questionType === "MCQ_MULTIPLE") {
          return {
            ...q,
            options: q.options.map((opt, oi) =>
              oi === optIndex ? { ...opt, isCorrect: !opt.isCorrect } : opt
            ),
          };
        }
        return q;
      })
    );
  };

  // Submit All Questions
  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate each question
    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const qNum = idx + 1;

      if (!q.questionText.trim()) {
        setValidationError(`Question #${qNum}: Question statement is required.`);
        // Expand if collapsed
        if (q.isCollapsed) handleToggleCollapse(idx);
        return;
      }

      const isOptionBased = ["MCQ_SINGLE", "MCQ_MULTIPLE", "TRUE_FALSE"].includes(q.questionType);
      if (isOptionBased) {
        if (q.options.length < 2) {
          setValidationError(`Question #${qNum}: Please provide at least 2 choices.`);
          if (q.isCollapsed) handleToggleCollapse(idx);
          return;
        }

        const emptyOption = q.options.find((opt) => !opt.optionText.trim());
        if (emptyOption) {
          setValidationError(`Question #${qNum}: All choice texts must be filled.`);
          if (q.isCollapsed) handleToggleCollapse(idx);
          return;
        }

        const hasCorrect = q.options.some((opt) => opt.isCorrect);
        if (!hasCorrect) {
          setValidationError(`Question #${qNum}: Please select at least one correct choice.`);
          if (q.isCollapsed) handleToggleCollapse(idx);
          return;
        }
      }
    }

    try {
      const payload = questions.map((q) => {
        const isOptionBased = ["MCQ_SINGLE", "MCQ_MULTIPLE", "TRUE_FALSE"].includes(q.questionType);
        return {
          questionType: q.questionType,
          questionText: q.questionText.trim(),
          difficulty: q.difficulty,
          marks: Number(q.marks),
          negativeMarks: Number(q.negativeMarks),
          explanation: q.explanation.trim() || undefined,
          questionBankId: questionBankId || undefined,
          courseId: courseId || undefined,
          moduleId: moduleId || undefined,
          options: isOptionBased
            ? q.options.map((opt, i) => ({
                optionText: opt.optionText.trim(),
                isCorrect: opt.isCorrect,
                displayOrder: i,
              }))
            : undefined,
        };
      });

      await createBulkQuestionsMutation.mutateAsync(payload);

      navigate(`${basePath}/question-bank`, {
        state: questionBankId ? { bankId: questionBankId } : null,
      });
    } catch (err: any) {
      setValidationError(
        err?.response?.data?.message || "Failed to create questions. Please check the inputs."
      );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`${basePath}/question-bank`)}
            className="h-9 w-9 rounded-full shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-purple-600" />
              Add Questions to Bank
            </h1>
            <p className="text-sm text-muted-foreground">
              Author and batch-add multiple assessment questions seamlessly without saving one-by-one.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-purple-300 dark:border-purple-800 text-purple-600 hover:bg-purple-500/10 font-semibold"
            onClick={handleAddAnotherQuestion}
          >
            <Plus className="h-4 w-4" />
            Add Another Question
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmitAll} className="space-y-6">
        {validationError && (
          <div className="p-4 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-medium">
            {validationError}
          </div>
        )}

        {/* Section 1: Shared Classification & Target Repository */}
        <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-600" />
                  Target Repository & Course Association
                </CardTitle>
                <CardDescription className="text-xs">
                  All questions added below will be stored in this repository.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-semibold text-xs">
                {questions.length} {questions.length === 1 ? "Question" : "Questions"} in Draft
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Question Bank</Label>
                <select
                  value={questionBankId}
                  onChange={(e) => setQuestionBankId(e.target.value)}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">No Bank (General Catalog)</option>
                  {questionBanks.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name || "Unnamed Bank"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Course Association</Label>
                <select
                  value={courseId}
                  onChange={(e) => {
                    setCourseId(e.target.value);
                    setModuleId("");
                  }}
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Module (Optional)</Label>
                <select
                  value={moduleId}
                  disabled={!courseId || availableModules.length === 0}
                  onChange={(e) => setModuleId(e.target.value)}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Full Course</option>
                  {availableModules.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Questions Builder List */}
        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <Card
              key={q.id}
              className="border-border/70 shadow-sm hover:border-purple-500/40 transition-colors"
            >
              {/* Question Card Header */}
              <div className="p-4 bg-muted/20 border-b border-border/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-2.5 py-0.5">
                    Question #{qIndex + 1}
                  </Badge>
                  {q.questionText && (
                    <span className="text-xs text-muted-foreground font-medium line-clamp-1 max-w-[320px]">
                      {q.questionText}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => handleDuplicateQuestion(qIndex)}
                    title="Duplicate Question"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Duplicate</span>
                  </Button>

                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      title="Remove Question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => handleToggleCollapse(qIndex)}
                  >
                    {q.isCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Question Card Body */}
              {!q.isCollapsed && (
                <CardContent className="p-5 space-y-4">
                  {/* Row 1: Type, Difficulty, Marks */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Question Type</Label>
                      <select
                        value={q.questionType}
                        onChange={(e) =>
                          handleQuestionFieldChange(qIndex, "questionType", e.target.value)
                        }
                        className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="MCQ_SINGLE">Single Choice (MCQ)</option>
                        <option value="MCQ_MULTIPLE">Multiple Choice (Checkboxes)</option>
                        <option value="TRUE_FALSE">True / False</option>
                        <option value="SHORT_ANSWER">Short Answer (Text)</option>
                        <option value="LONG_ANSWER">Long Answer (Descriptive)</option>
                        <option value="NUMERICAL">Numerical Value</option>
                        <option value="FILL_BLANK">Fill in the Blank</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Difficulty Level</Label>
                      <select
                        value={q.difficulty}
                        onChange={(e) =>
                          handleQuestionFieldChange(qIndex, "difficulty", e.target.value)
                        }
                        className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Marks</Label>
                        <Input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={q.marks}
                          onChange={(e) =>
                            handleQuestionFieldChange(qIndex, "marks", Number(e.target.value))
                          }
                          required
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Penalty (-)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.25}
                          value={q.negativeMarks}
                          onChange={(e) =>
                            handleQuestionFieldChange(qIndex, "negativeMarks", Number(e.target.value))
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Question Statement */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Question Statement <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      placeholder={`Type question #${qIndex + 1} statement here...`}
                      value={q.questionText}
                      onChange={(e) =>
                        handleQuestionFieldChange(qIndex, "questionText", e.target.value)
                      }
                      rows={3}
                      required
                      className="text-xs"
                    />
                  </div>

                  {/* Options Builder for MCQ & True/False */}
                  {["MCQ_SINGLE", "MCQ_MULTIPLE", "TRUE_FALSE"].includes(q.questionType) && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">
                          Options & Correct Answers <span className="text-destructive">*</span>
                        </Label>
                        <span className="text-[11px] text-muted-foreground">
                          Click the letter badge to toggle the correct answer choice
                        </span>
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIndex) => (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                              opt.isCorrect
                                ? "bg-emerald-500/10 border-emerald-300 dark:border-emerald-800"
                                : "bg-muted/20 border-border/60"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleCorrect(qIndex, optIndex)}
                              className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                opt.isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : "bg-background border border-muted-foreground/30 text-muted-foreground hover:border-foreground"
                              }`}
                            >
                              {opt.isCorrect ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                String.fromCharCode(65 + optIndex)
                              )}
                            </button>

                            <Input
                              placeholder={`Option ${String.fromCharCode(65 + optIndex)} text...`}
                              value={opt.optionText}
                              disabled={q.questionType === "TRUE_FALSE"}
                              onChange={(e) =>
                                handleOptionTextChange(qIndex, optIndex, e.target.value)
                              }
                              className="text-xs bg-background"
                            />

                            {q.questionType !== "TRUE_FALSE" && q.options.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={() => handleRemoveOption(qIndex, optIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      {q.questionType !== "TRUE_FALSE" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs h-8"
                          onClick={() => handleAddOption(qIndex)}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Choice
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Solution Explanation */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs font-semibold">
                      Solution / Explanation (Optional)
                    </Label>
                    <Textarea
                      placeholder="Explain why the answer is correct for student review..."
                      value={q.explanation}
                      onChange={(e) =>
                        handleQuestionFieldChange(qIndex, "explanation", e.target.value)
                      }
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {/* Quick Add Another Question Box */}
          <div ref={questionsEndRef} className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddAnotherQuestion}
              className="w-full py-6 border-dashed border-2 border-purple-300 dark:border-purple-800/60 hover:border-purple-500 hover:bg-purple-500/5 text-purple-600 dark:text-purple-400 font-semibold gap-2 transition-all"
            >
              <Plus className="h-5 w-5" />
              Add Another Question (#{questions.length + 1})
            </Button>
          </div>
        </div>

        {/* Sticky Action Footer Bar */}
        <div className="sticky bottom-4 z-20 bg-card/95 backdrop-blur-md p-4 rounded-xl border border-border shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {questions.length} {questions.length === 1 ? "question" : "questions"}
            </span>{" "}
            ready to be saved into the catalog
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`${basePath}/question-bank`)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddAnotherQuestion}
              className="gap-1.5 text-purple-600 border-purple-300 dark:border-purple-800"
            >
              <Plus className="h-4 w-4" /> Add Another Question
            </Button>

            <Button
              type="submit"
              disabled={createBulkQuestionsMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 shadow-sm gap-2"
            >
              {createBulkQuestionsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving All Questions...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save {questions.length > 1 ? `All ${questions.length} Questions` : "Question"} to Bank
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateQuestion;
