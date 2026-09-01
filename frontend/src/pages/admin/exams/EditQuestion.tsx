import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  HelpCircle,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  Save,
} from "lucide-react";
import { useQuestion, useUpdateQuestion } from "@/hooks/useQuestions";
import { useQuestionBanks } from "@/hooks/useQuestionBanks";
import { useCourses } from "@/hooks/useCourses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface OptionItem {
  id: string;
  optionText: string;
  isCorrect: boolean;
}

export const EditQuestion: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/center") ? "/center/exams" : "/admin/exams";

  const { data: questionResponse, isLoading: questionLoading, isError } = useQuestion(id || "");
  const existingQuestion = questionResponse?.data;

  const updateQuestionMutation = useUpdateQuestion(id || "");
  const { courses } = useCourses();
  const { data: banksResponse } = useQuestionBanks();
  const questionBanks = banksResponse?.data || [];

  // Form State
  const [questionType, setQuestionType] = useState<
    "MCQ_SINGLE" | "MCQ_MULTIPLE" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER" | "NUMERICAL" | "FILL_BLANK"
  >("MCQ_SINGLE");
  const [questionText, setQuestionText] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [questionBankId, setQuestionBankId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");

  const [options, setOptions] = useState<OptionItem[]>([
    { id: "1", optionText: "", isCorrect: true },
    { id: "2", optionText: "", isCorrect: false },
    { id: "3", optionText: "", isCorrect: false },
    { id: "4", optionText: "", isCorrect: false },
  ]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize form state once data is loaded
  useEffect(() => {
    if (existingQuestion && !isInitialized) {
      setQuestionType(existingQuestion.questionType || "MCQ_SINGLE");
      setQuestionText(existingQuestion.questionText || "");
      setDifficulty(existingQuestion.difficulty || "MEDIUM");
      setMarks(existingQuestion.marks ?? 1);
      setNegativeMarks(existingQuestion.negativeMarks ?? 0);
      setExplanation(existingQuestion.explanation || "");
      setQuestionBankId(existingQuestion.questionBankId || "");
      setCourseId(existingQuestion.courseId || "");
      setModuleId(existingQuestion.moduleId || "");

      if (existingQuestion.options && existingQuestion.options.length > 0) {
        setOptions(
          existingQuestion.options.map((opt: any, index: number) => ({
            id: opt.id || String(index + 1),
            optionText: opt.optionText || "",
            isCorrect: !!opt.isCorrect,
          }))
        );
      }
      setIsInitialized(true);
    }
  }, [existingQuestion, isInitialized]);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const availableModules = selectedCourse?.modules || [];

  const handleTypeChange = (newType: typeof questionType) => {
    setQuestionType(newType);
    if (newType === "TRUE_FALSE") {
      setOptions([
        { id: "1", optionText: "True", isCorrect: true },
        { id: "2", optionText: "False", isCorrect: false },
      ]);
    } else if (newType === "MCQ_SINGLE" || newType === "MCQ_MULTIPLE") {
      if (options.length < 2) {
        setOptions([
          { id: "1", optionText: "", isCorrect: true },
          { id: "2", optionText: "", isCorrect: false },
          { id: "3", optionText: "", isCorrect: false },
          { id: "4", optionText: "", isCorrect: false },
        ]);
      }
    }
  };

  const handleAddOption = () => {
    setOptions((prev) => [
      ...prev,
      { id: String(Date.now()), optionText: "", isCorrect: false },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionTextChange = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, optionText: text } : opt))
    );
  };

  const handleToggleCorrect = (index: number) => {
    if (questionType === "MCQ_SINGLE" || questionType === "TRUE_FALSE") {
      setOptions((prev) =>
        prev.map((opt, i) => ({ ...opt, isCorrect: i === index }))
      );
    } else if (questionType === "MCQ_MULTIPLE") {
      setOptions((prev) =>
        prev.map((opt, i) =>
          i === index ? { ...opt, isCorrect: !opt.isCorrect } : opt
        )
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!questionText.trim()) {
      setValidationError("Question text is required.");
      return;
    }

    const isOptionBased = ["MCQ_SINGLE", "MCQ_MULTIPLE", "TRUE_FALSE"].includes(questionType);

    if (isOptionBased) {
      if (options.length < 2) {
        setValidationError("Please add at least 2 options.");
        return;
      }

      const emptyOption = options.find((opt) => !opt.optionText.trim());
      if (emptyOption) {
        setValidationError("All option texts must be filled in.");
        return;
      }

      const hasCorrect = options.some((opt) => opt.isCorrect);
      if (!hasCorrect) {
        setValidationError("Please select at least one correct answer option.");
        return;
      }
    }

    try {
      const updatePayload = {
        questionType,
        questionText: questionText.trim(),
        difficulty,
        marks: Number(marks),
        negativeMarks: Number(negativeMarks),
        explanation: explanation.trim() || null,
        questionBankId: questionBankId || null,
        courseId: courseId || null,
        moduleId: moduleId || null,
        options: isOptionBased
          ? options.map((opt, i) => ({
              optionText: opt.optionText.trim(),
              isCorrect: opt.isCorrect,
              displayOrder: i,
            }))
          : [],
      };
      await updateQuestionMutation.mutateAsync(updatePayload);

      navigate(`${basePath}/question-bank`, {
        state: questionBankId ? { bankId: questionBankId } : null,
      });
    } catch (err: any) {
      setValidationError(err?.response?.data?.message || "Failed to update question");
    }
  };

  if (questionLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm">Loading question details...</p>
      </div>
    );
  }

  if (isError || !existingQuestion) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`${basePath}/question-bank`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Question Bank
        </Button>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold text-destructive">Question Not Found</h2>
            <p className="text-xs text-muted-foreground">
              The question you are attempting to edit does not exist or has been deleted.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`${basePath}/question-bank`, { state: questionBankId ? { bankId: questionBankId } : null })}
          className="h-9 w-9 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-purple-600" />
            Edit Assessment Question
          </h1>
          <p className="text-sm text-muted-foreground">
            Update question statement, difficulty, answers, choices, and scoring weights.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {validationError && (
          <div className="p-4 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-medium">
            {validationError}
          </div>
        )}

        {/* Section 1: Question Meta */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Question Type & Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Question Type</Label>
                <select
                  value={questionType}
                  onChange={(e) => handleTypeChange(e.target.value as any)}
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

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Difficulty Level</Label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>

              <div className="space-y-2">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
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

              <div className="space-y-2">
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

        {/* Section 2: Question Statement */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Question Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Question Statement <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Type your question statement here..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={4}
                required
              />
            </div>

            {/* Options Builder for MCQ & True/False */}
            {["MCQ_SINGLE", "MCQ_MULTIPLE", "TRUE_FALSE"].includes(questionType) && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Options & Correct Answers <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Click the circle/checkbox to mark the correct choice
                  </span>
                </div>

                <div className="space-y-2">
                  {options.map((opt, index) => (
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
                        onClick={() => handleToggleCorrect(index)}
                        className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          opt.isCorrect
                            ? "bg-emerald-600 text-white"
                            : "bg-background border border-muted-foreground/30 text-muted-foreground hover:border-foreground"
                        }`}
                      >
                        {opt.isCorrect ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + index)}
                      </button>

                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + index)} text...`}
                        value={opt.optionText}
                        disabled={questionType === "TRUE_FALSE"}
                        onChange={(e) => handleOptionTextChange(index, e.target.value)}
                        className="text-xs bg-background"
                      />

                      {questionType !== "TRUE_FALSE" && options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => handleRemoveOption(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {questionType !== "TRUE_FALSE" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handleAddOption}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Option
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Scoring & Explanation */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Scoring & Solution Explanation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Marks for Correct Answer</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Negative Marks (Penalty)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.25}
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Solution / Explanation (Optional)</Label>
              <Textarea
                placeholder="Explain why the answer is correct for student review..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`${basePath}/question-bank`, { state: questionBankId ? { bankId: questionBankId } : null })}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={updateQuestionMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 shadow-sm gap-2"
          >
            {updateQuestionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditQuestion;
