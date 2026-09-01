import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  Maximize2,
  WifiOff,
  XCircle,
  HelpCircle,
  Check,
} from 'lucide-react';
import { useAttemptDetails, useSaveAnswers, useSubmitExam } from '@/hooks/useExamAttempts';
import { useProctoring } from '@/hooks/useProctoring';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface AnswerState {
  selectedOptionIds: string[];
  textAnswer: string;
  numericalAnswer: string;
  isFlagged: boolean;
}

const DEMO_QUESTIONS = [
  {
    id: "q-1",
    questionText: "Which React hook should you use to perform side effects such as data fetching or subscriptions in a functional component?",
    questionType: "MCQ_SINGLE",
    marks: 4,
    negativeMarks: 1,
    displayOrder: 1,
    options: [
      { id: "opt-1a", optionText: "useState()", isCorrect: false },
      { id: "opt-1b", optionText: "useEffect()", isCorrect: true },
      { id: "opt-1c", optionText: "useReducer()", isCorrect: false },
      { id: "opt-1d", optionText: "useMemo()", isCorrect: false },
    ],
  },
  {
    id: "q-2",
    questionText: "What is the primary benefit of database indexing in PostgreSQL?",
    questionType: "MCQ_SINGLE",
    marks: 4,
    negativeMarks: 1,
    displayOrder: 2,
    options: [
      { id: "opt-2a", optionText: "Speeds up data retrieval queries by creating auxiliary lookup structures (B-Tree/GIN)", isCorrect: true },
      { id: "opt-2b", optionText: "Encrypts table records at rest", isCorrect: false },
      { id: "opt-2c", optionText: "Automatically duplicates tables for cluster replication", isCorrect: false },
      { id: "opt-2d", optionText: "Eliminates the need for foreign key constraints", isCorrect: false },
    ],
  },
  {
    id: "q-3",
    questionText: "In TypeScript, which keyword is used to ensure a variable's type is inferred from a literal constant value?",
    questionType: "MCQ_SINGLE",
    marks: 4,
    negativeMarks: 0,
    displayOrder: 3,
    options: [
      { id: "opt-3a", optionText: "as const", isCorrect: true },
      { id: "opt-3b", optionText: "readonly any", isCorrect: false },
      { id: "opt-3c", optionText: "static type", isCorrect: false },
      { id: "opt-3d", optionText: "final", isCorrect: false },
    ],
  },
  {
    id: "q-4",
    questionText: "Which HTTP status code signifies that the client request lacks valid authentication credentials for the target resource?",
    questionType: "MCQ_SINGLE",
    marks: 4,
    negativeMarks: 1,
    displayOrder: 4,
    options: [
      { id: "opt-4a", optionText: "200 OK", isCorrect: false },
      { id: "opt-4b", optionText: "401 Unauthorized", isCorrect: true },
      { id: "opt-4c", optionText: "404 Not Found", isCorrect: false },
      { id: "opt-4d", optionText: "500 Internal Server Error", isCorrect: false },
    ],
  },
];

const FALLBACK_ATTEMPT = {
  id: "demo-attempt-01",
  status: "IN_PROGRESS",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  violationCount: 0,
  warningCount: 0,
  exam: {
    name: "Full Stack Engineering & Web Architecture Assessment",
    proctoringEnabled: true,
    fullscreenRequired: true,
    maxWarnings: 3,
    tabSwitchDetection: true,
    windowBlurDetection: true,
    fullscreenExitDetection: true,
    keyboardShortcutDetection: true,
    copyPasteDetection: true,
    rightClickDetection: false,
    networkGracePeriodSeconds: 30,
    examQuestions: DEMO_QUESTIONS.map((q) => ({
      question: q,
      questionId: q.id,
      marksOverride: q.marks,
      negativeMarks: q.negativeMarks,
      displayOrder: q.displayOrder,
    })),
  },
};

export const TakeExam: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const { data: attemptData, isLoading, error } = useAttemptDetails(attemptId || '');
  const saveAnswersMutation = useSaveAnswers(attemptId || '');
  const submitExamMutation = useSubmitExam(attemptId || '');

  const attempt = attemptData?.data || FALLBACK_ATTEMPT;
  const exam = attempt?.exam;

  // Local state for answers & navigation
  const [answersMap, setAnswersMap] = useState<Record<string, AnswerState>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paletteFilter, setPaletteFilter] = useState<'ALL' | 'ANSWERED' | 'FLAGGED' | 'UNANSWERED'>('ALL');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Initialize Proctoring Engine Hook
  const proctoring = useProctoring({
    attemptId: attemptId || '',
    proctoringEnabled: exam?.proctoringEnabled ?? false,
    fullscreenRequired: exam?.fullscreenRequired ?? true,
    maxWarnings: exam?.maxWarnings ?? 3,
    tabSwitchDetection: exam?.tabSwitchDetection ?? true,
    windowBlurDetection: exam?.windowBlurDetection ?? true,
    fullscreenExitDetection: exam?.fullscreenExitDetection ?? true,
    keyboardShortcutDetection: exam?.keyboardShortcutDetection ?? true,
    copyPasteDetection: exam?.copyPasteDetection ?? true,
    rightClickDetection: exam?.rightClickDetection ?? false,
    networkGracePeriodSeconds: exam?.networkGracePeriodSeconds ?? 30,
    initialViolationCount: attempt?.violationCount ?? 0,
    initialWarningCount: attempt?.warningCount ?? 0,
    isTerminated: attempt?.status === 'TERMINATED',
  });

  // Prepare questions list from attempt
  const questions: any[] = useMemo(() => {
    if (!attempt) return [];
    // If backend returned nested examQuestions
    if (attempt.exam?.examQuestions) {
      return attempt.exam.examQuestions.map((eq: any) => ({
        id: eq.question?.id || eq.questionId,
        questionText: eq.question?.questionText || '',
        questionType: eq.question?.questionType || 'MCQ_SINGLE',
        marks: eq.marksOverride ?? eq.question?.marks ?? 1,
        negativeMarks: eq.question?.negativeMarks ?? 0,
        displayOrder: eq.displayOrder ?? 0,
        options: eq.question?.options || [],
      }));
    }
    return DEMO_QUESTIONS;
  }, [attempt]);

  // Sync existing saved answers into local state on load
  useEffect(() => {
    if (!attempt?.answers) return;
    const initialMap: Record<string, AnswerState> = {};
    for (const ans of attempt.answers) {
      initialMap[ans.questionId] = {
        selectedOptionIds: Array.isArray(ans.selectedOptionIds) ? ans.selectedOptionIds : [],
        textAnswer: ans.textAnswer || '',
        numericalAnswer: ans.numericalAnswer !== null && ans.numericalAnswer !== undefined ? String(ans.numericalAnswer) : '',
        isFlagged: ans.isFlagged || false,
      };
    }
    setAnswersMap(initialMap);
  }, [attempt?.answers]);

  // Server-Authoritative Timer Countdown
  useEffect(() => {
    if (!attempt?.expiresAt || attempt.status !== 'IN_PROGRESS' || proctoring.isTerminated) return;

    const calculateRemaining = () => {
      const expires = new Date(attempt.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      setSecondsRemaining(remaining);

      if (remaining === 0 && !isAutoSubmitting) {
        setIsAutoSubmitting(true);
        handleSubmitExam(true);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [attempt?.expiresAt, attempt?.status, proctoring.isTerminated, isAutoSubmitting]);

  // Format Timer mm:ss or hh:mm:ss
  const formattedTime = useMemo(() => {
    if (secondsRemaining === null) return '--:--';
    const hours = Math.floor(secondsRemaining / 3600);
    const mins = Math.floor((secondsRemaining % 3600) / 60);
    const secs = secondsRemaining % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [secondsRemaining]);

  const timerColorClass = useMemo(() => {
    if (secondsRemaining === null) return 'text-slate-800';
    if (secondsRemaining < 300) return 'text-red-600 animate-pulse'; // < 5 mins
    if (secondsRemaining < 900) return 'text-amber-600'; // < 15 mins
    return 'text-emerald-700';
  }, [secondsRemaining]);

  // Autosave Answer Pipeline (Debounced — longer under load; text uses longer delay)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutosave = useCallback(
    (questionId: string, newState: AnswerState, debounceMs = 2500) => {
      if (proctoring.isTerminated || attempt?.status !== 'IN_PROGRESS') return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const numVal = newState.numericalAnswer.trim() ? parseFloat(newState.numericalAnswer) : undefined;
          await saveAnswersMutation.mutateAsync([
            {
              questionId,
              selectedOptionIds: newState.selectedOptionIds,
              textAnswer: newState.textAnswer || undefined,
              numericalAnswer: !isNaN(numVal as number) ? numVal : undefined,
              isFlagged: newState.isFlagged,
            },
          ]);
        } catch {
          // Handled silently
        }
      }, debounceMs);
    },
    [proctoring.isTerminated, attempt?.status, saveAnswersMutation]
  );

  // Handlers for Question Interactions
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answersMap[currentQuestion.id] || {
    selectedOptionIds: [],
    textAnswer: '',
    numericalAnswer: '',
    isFlagged: false,
  } : null;

  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion || proctoring.isTerminated) return;

    let newSelected: string[] = [];
    if (currentQuestion.questionType === 'MCQ_MULTIPLE') {
      if (currentAnswer?.selectedOptionIds.includes(optionId)) {
        newSelected = currentAnswer.selectedOptionIds.filter((id) => id !== optionId);
      } else {
        newSelected = [...(currentAnswer?.selectedOptionIds || []), optionId];
      }
    } else {
      // Single choice or True/False
      newSelected = [optionId];
    }

    const updatedState: AnswerState = {
      ...(currentAnswer || { textAnswer: '', numericalAnswer: '', isFlagged: false }),
      selectedOptionIds: newSelected,
    };

    setAnswersMap((prev) => ({ ...prev, [currentQuestion.id]: updatedState }));
    triggerAutosave(currentQuestion.id, updatedState);
  };

  const handleTextAnswerChange = (val: string) => {
    if (!currentQuestion || proctoring.isTerminated) return;
    const updatedState: AnswerState = {
      ...(currentAnswer || { selectedOptionIds: [], numericalAnswer: '', isFlagged: false }),
      textAnswer: val,
    };
    setAnswersMap((prev) => ({ ...prev, [currentQuestion.id]: updatedState }));
    triggerAutosave(currentQuestion.id, updatedState, 4000);
  };

  const handleNumericalAnswerChange = (val: string) => {
    if (!currentQuestion || proctoring.isTerminated) return;
    const updatedState: AnswerState = {
      ...(currentAnswer || { selectedOptionIds: [], textAnswer: '', isFlagged: false }),
      numericalAnswer: val,
    };
    setAnswersMap((prev) => ({ ...prev, [currentQuestion.id]: updatedState }));
    triggerAutosave(currentQuestion.id, updatedState, 4000);
  };

  const handleToggleFlag = () => {
    if (!currentQuestion || proctoring.isTerminated) return;
    const updatedState: AnswerState = {
      ...(currentAnswer || { selectedOptionIds: [], textAnswer: '', numericalAnswer: '' }),
      isFlagged: !currentAnswer?.isFlagged,
    };
    setAnswersMap((prev) => ({ ...prev, [currentQuestion.id]: updatedState }));
    triggerAutosave(currentQuestion.id, updatedState);
  };

  const handleClearResponse = () => {
    if (!currentQuestion || proctoring.isTerminated) return;
    const updatedState: AnswerState = {
      selectedOptionIds: [],
      textAnswer: '',
      numericalAnswer: '',
      isFlagged: currentAnswer?.isFlagged || false,
    };
    setAnswersMap((prev) => ({ ...prev, [currentQuestion.id]: updatedState }));
    triggerAutosave(currentQuestion.id, updatedState);
  };

  const handleSubmitExam = async (isAuto = false) => {
    if (proctoring.isTerminated) return;
    try {
      await submitExamMutation.mutateAsync();
      setIsSubmitModalOpen(false);
      navigate(`/student/exams/${attemptId}/result`);
    } catch {
      if (!isAuto) setIsSubmitModalOpen(false);
    }
  };

  // Question status helper
  const isQuestionAnswered = (qId: string) => {
    const ans = answersMap[qId];
    if (!ans) return false;
    return (
      ans.selectedOptionIds.length > 0 ||
      ans.textAnswer.trim().length > 0 ||
      ans.numericalAnswer.trim().length > 0
    );
  };

  // Summary counts
  const answeredCount = questions.filter((q) => isQuestionAnswered(q.id)).length;
  const flaggedCount = questions.filter((q) => answersMap[q.id]?.isFlagged).length;
  const unansweredCount = questions.length - answeredCount;

  // Filtered Question Palette
  const filteredQuestions = questions.filter((q) => {
    const isAns = isQuestionAnswered(q.id);
    const isFlg = answersMap[q.id]?.isFlagged;
    if (paletteFilter === 'ANSWERED') return isAns;
    if (paletteFilter === 'FLAGGED') return isFlg;
    if (paletteFilter === 'UNANSWERED') return !isAns;
    return true;
  });

  // Redirect if already completed / evaluating
  useEffect(() => {
    if (attempt && ['COMPLETED', 'SUBMITTED', 'EVALUATING', 'AUTO_SUBMITTED'].includes(attempt.status)) {
      navigate(`/student/exams/${attemptId}/result`);
    }
  }, [attempt, attemptId, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Loading Secure Examination Session...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Unable to load examination session</h2>
        <p className="text-sm text-slate-500">The attempt may have expired or is not accessible.</p>
        <Button onClick={() => navigate('/student/exams')} variant="outline">
          Return to My Exams
        </Button>
      </div>
    );
  }

  // ─── TERMINATED SCREEN ──────────────────────────────────────────────────────
  if (proctoring.isTerminated || attempt.status === 'TERMINATED') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-red-900 bg-slate-900 text-white shadow-2xl overflow-hidden">
          <div className="bg-red-600 p-6 text-center space-y-2">
            <XCircle className="h-14 w-14 text-white mx-auto animate-bounce" />
            <h2 className="text-2xl font-black tracking-tight text-white uppercase">
              Examination Terminated
            </h2>
            <p className="text-xs text-red-100 font-medium">
              Maximum proctoring violations limit reached (3 of 3).
            </p>
          </div>
          <CardContent className="p-6 space-y-5 text-center">
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-900/60 text-xs text-red-300 text-left space-y-2">
              <p className="font-bold text-red-200 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Termination Reason:
              </p>
              <p className="text-slate-300">
                {proctoring.terminationReason || attempt.terminationReason || 'MAX_PROCTORING_VIOLATIONS: Repeatedly leaving the exam window, tab switches, or exiting fullscreen mode.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div className="p-3 bg-slate-800/80 rounded-lg">
                <span className="block font-semibold text-slate-200">Total Violations</span>
                <span className="text-base font-bold text-red-400">
                  {proctoring.violationCount || attempt.violationCount || 3} / 3
                </span>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-lg">
                <span className="block font-semibold text-slate-200">Attempt Status</span>
                <span className="text-base font-bold text-red-400">LOCKED</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Your responses up to the termination point have been locked and submitted for administrative review.
            </p>

            <Button
              onClick={() => navigate('/student/exams')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs py-2.5 font-bold"
            >
              Return to Examination Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none">
      {/* ─── TOP EXAM HEADER ───────────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-xs text-white">
            AI
          </div>
          <div>
            <h1 className="text-sm font-bold text-white line-clamp-1">{exam?.name}</h1>
            <p className="text-[11px] text-slate-400">
              {exam?.course?.name} • Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        {/* Center: Proctoring Status Badge */}
        <div className="hidden sm:flex items-center gap-2">
          {exam?.proctoringEnabled && (
            <Badge
              className={`text-xs gap-1.5 px-3 py-1 font-semibold ${
                proctoring.violationCount === 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : proctoring.violationCount === 1
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/30'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Proctoring Active ({proctoring.violationCount}/3 Warnings)
            </Badge>
          )}

          {proctoring.isOffline && (
            <Badge className="bg-red-600 text-white text-xs gap-1">
              <WifiOff className="h-3 w-3" /> Offline (Reconnecting...)
            </Badge>
          )}

          {!proctoring.isFullscreen && (
            <Button
              size="sm"
              variant="outline"
              onClick={proctoring.reEnterFullscreen}
              className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white border-amber-600 gap-1"
            >
              <Maximize2 className="h-3 w-3" /> Re-enter Fullscreen
            </Button>
          )}
        </div>

        {/* Right: Timer & Submit Button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Clock className={`h-4 w-4 ${timerColorClass}`} />
            <span className={`text-sm font-extrabold tracking-wider ${timerColorClass}`}>
              {formattedTime}
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
          >
            <Send className="h-3.5 w-3.5" /> Submit Exam
          </Button>
        </div>
      </header>

      {/* ─── MAIN EXAM BODY ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Active Question Card (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {currentQuestion ? (
            <Card className="flex-1 flex flex-col justify-between border-slate-200 shadow-sm bg-white overflow-hidden">
              <div>
                <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-100 text-indigo-800">
                      Question {currentIndex + 1}
                    </span>
                    <Badge variant="outline" className="text-[11px] font-medium text-slate-600">
                      {currentQuestion.questionType.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-emerald-700">
                      +{currentQuestion.marks} Marks
                    </span>
                    {exam?.negativeMarkingEnabled && currentQuestion.negativeMarks > 0 && (
                      <span className="text-xs font-semibold text-red-600">
                        -{currentQuestion.negativeMarks} Neg
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleToggleFlag}
                      className={`h-7 px-2 text-xs gap-1 ${
                        currentAnswer?.isFlagged
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Bookmark
                        className={`h-3.5 w-3.5 ${
                          currentAnswer?.isFlagged ? 'fill-amber-500 text-amber-500' : ''
                        }`}
                      />
                      {currentAnswer?.isFlagged ? 'Flagged' : 'Flag'}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 pb-6 space-y-6">
                  {/* Question Text */}
                  <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                    {currentQuestion.questionText}
                  </div>

                  {/* Options (MCQ Single, Multiple, True/False) */}
                  {['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE'].includes(currentQuestion.questionType) && (
                    <div className="space-y-3">
                      {currentQuestion.options?.map((opt: any, optIdx: number) => {
                        const isSelected = currentAnswer?.selectedOptionIds.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectOption(opt.id)}
                            className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                                : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                            }`}
                          >
                            <div
                              className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'border-2 border-slate-300 text-slate-500'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="h-3 w-3 stroke-[3]" />
                              ) : (
                                String.fromCharCode(65 + optIdx)
                              )}
                            </div>
                            <span
                              className={`text-sm ${
                                isSelected ? 'font-bold text-indigo-950' : 'text-slate-700'
                              }`}
                            >
                              {opt.optionText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Numerical Answer Input */}
                  {currentQuestion.questionType === 'NUMERICAL' && (
                    <div className="space-y-2 max-w-sm">
                      <label className="text-xs font-bold text-slate-700">Enter Numerical Value:</label>
                      <Input
                        type="number"
                        placeholder="e.g. 42.5"
                        value={currentAnswer?.numericalAnswer || ''}
                        onChange={(e) => handleNumericalAnswerChange(e.target.value)}
                        className="text-sm font-semibold"
                      />
                    </div>
                  )}

                  {/* Descriptive / Subjective Answer Area */}
                  {currentQuestion.questionType === 'DESCRIPTIVE' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Type Your Answer:</label>
                      <textarea
                        rows={6}
                        placeholder="Write your explanation or detailed answer here..."
                        value={currentAnswer?.textAnswer || ''}
                        onChange={(e) => handleTextAnswerChange(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                      />
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Bottom Nav Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearResponse}
                    disabled={
                      !currentAnswer?.selectedOptionIds.length &&
                      !currentAnswer?.textAnswer &&
                      !currentAnswer?.numericalAnswer
                    }
                    className="text-xs text-slate-600"
                  >
                    Clear Response
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (currentQuestion && currentAnswer) {
                        triggerAutosave(currentQuestion.id, currentAnswer, 0);
                      }
                      setCurrentIndex((prev) => Math.max(0, prev - 1));
                    }}
                    disabled={currentIndex === 0}
                    className="text-xs gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>

                  {currentIndex < questions.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (currentQuestion && currentAnswer) {
                          triggerAutosave(currentQuestion.id, currentAnswer, 0);
                        }
                        setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setIsSubmitModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                    >
                      Review & Submit <Send className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-slate-500">
              <HelpCircle className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p>No questions found for this exam.</p>
            </Card>
          )}
        </div>

        {/* Right: Question Palette & Proctoring Status (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Question Palette
                </CardTitle>
                <span className="text-[11px] font-semibold text-indigo-600">
                  {answeredCount}/{questions.length} Answered
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg mt-2 text-[10px] font-semibold">
                {(['ALL', 'ANSWERED', 'FLAGGED', 'UNANSWERED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPaletteFilter(filter)}
                    className={`py-1 rounded text-center transition-all ${
                      paletteFilter === filter
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filter === 'ALL' ? 'All' : filter === 'ANSWERED' ? 'Done' : filter === 'FLAGGED' ? 'Flag' : 'Left'}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="pt-4 pb-4">
              {/* Question Buttons Grid */}
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
                {filteredQuestions.map((q) => {
                  const actualIdx = questions.findIndex((item) => item.id === q.id);
                  const isCurrent = actualIdx === currentIndex;
                  const isAns = isQuestionAnswered(q.id);
                  const isFlg = answersMap[q.id]?.isFlagged;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(actualIdx)}
                      className={`h-9 w-full rounded-lg text-xs font-bold flex items-center justify-center relative transition-all ${
                        isCurrent
                          ? 'ring-2 ring-indigo-600 ring-offset-1 bg-indigo-600 text-white'
                          : isAns
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : isFlg
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {actualIdx + 1}
                      {isFlg && !isCurrent && (
                        <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-1 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-emerald-600" />
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-slate-200" />
                  <span>Unanswered ({unansweredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-amber-400" />
                  <span>Flagged ({flaggedCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-indigo-600 ring-1 ring-slate-400" />
                  <span>Current</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proctoring Summary Card */}
          {exam?.proctoringEnabled && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  Proctoring Audit Status
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Warning Status:</span>
                  <span
                    className={`font-bold ${
                      proctoring.violationCount === 0
                        ? 'text-emerald-600'
                        : proctoring.violationCount === 1
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}
                  >
                    {proctoring.violationCount} / {proctoring.maxWarnings} Warnings
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Fullscreen Enforced:</span>
                  <span className="font-semibold text-slate-900">
                    {proctoring.isFullscreen ? '✓ Yes' : '⚠ Exited'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 text-[11px] text-slate-500 border border-slate-100">
                  Stay in fullscreen mode. 3 violations will auto-terminate your test.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* ─── UNCLOSEABLE PROCTORING WARNING MODAL ───────────────────────────── */}
      <Dialog open={proctoring.warningModalOpen}>
        <DialogContent className="max-w-md bg-white border-amber-200 shadow-2xl [&>button]:hidden">
          <DialogHeader className="space-y-2">
            <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <DialogTitle className="text-lg font-black text-center text-slate-900">
              {proctoring.warningTitle || 'Proctoring Warning'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-600">
              {proctoring.warningMessage}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-bold">Strict Proctoring Policy:</p>
            <p>
              This is Warning <strong>{proctoring.warningNumber} of {proctoring.maxWarnings}</strong>. Reaching 3 violations will immediately lock and terminate your exam attempt.
            </p>
          </div>

          <DialogFooter className="mt-4">
            <Button
              onClick={proctoring.dismissWarningModal}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5"
            >
              Acknowledge & Continue Examination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SUBMIT CONFIRMATION MODAL ─────────────────────────────────────── */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Submit Examination?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please review your question completion summary before final submission. Once submitted, you cannot change your answers.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 py-3">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
              <span className="text-lg font-extrabold text-emerald-700">{answeredCount}</span>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase">Answered</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-center">
              <span className="text-lg font-extrabold text-slate-700">{unansweredCount}</span>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Unanswered</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
              <span className="text-lg font-extrabold text-amber-700">{flaggedCount}</span>
              <p className="text-[10px] text-amber-600 font-semibold uppercase">Flagged</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSubmitModalOpen(false)}
              className="text-xs"
            >
              Back to Test
            </Button>
            <Button
              onClick={() => handleSubmitExam(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Yes, Submit Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TakeExam;
