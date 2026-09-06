import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  MinusCircle,
} from 'lucide-react';
import { useAttemptDetails } from '@/hooks/useExamAttempts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ReviewOption = {
  id: string;
  optionText: string;
  isCorrect: boolean;
  isSelected: boolean;
};

type ReviewItem = {
  displayOrder: number;
  questionId: string;
  questionText: string;
  questionType: string;
  marks: number;
  options: ReviewOption[];
  studentAnswer: {
    selectedOptionIds: string[];
    textAnswer: string | null;
    numericalAnswer: number | null;
    isCorrect: boolean | null;
    marksAwarded: number | null;
    isFlagged: boolean;
  } | null;
};

export const ExamResultScreen: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, isFetching } = useAttemptDetails(attemptId || '', {
    pollWhileEvaluating: true,
  });

  const attempt = data?.data;
  const exam = attempt?.exam;
  const resultReview: ReviewItem[] = attempt?.resultReview || [];

  if (isLoading && !attempt) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4 animate-pulse">
        <div className="h-16 w-16 bg-slate-200 rounded-full mx-auto" />
        <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto" />
        <div className="h-48 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Unable to load examination result</h2>
        <p className="text-sm text-slate-500">The attempt was not found or you do not have access.</p>
        <Button variant="outline" onClick={() => navigate('/student/exams')}>
          Back to My Exams
        </Button>
      </div>
    );
  }

  if (['EVALUATING', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(attempt.status)) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Evaluation in progress…</h2>
        <p className="text-sm text-slate-500">
          Objective questions are scored automatically. If this exam includes fill-in, short, or long
          answers, an instructor will review them before your final result is ready.
        </p>
      </div>
    );
  }

  if (attempt.status === 'TERMINATED') {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <XCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Examination Terminated</h2>
        <p className="text-sm text-slate-500">
          {attempt.terminationReason ||
            'This attempt was terminated and is not eligible for a scored result.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/student/exams')}>
          Back to My Exams
        </Button>
      </div>
    );
  }

  if (exam?.showResults === false) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <ShieldCheck className="h-12 w-12 text-indigo-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Results Hidden</h2>
        <p className="text-sm text-slate-500">
          Your answers were submitted successfully. The institute has not enabled score visibility for
          this exam yet.
        </p>
        <Button variant="outline" onClick={() => navigate('/student/exams')}>
          Back to My Exams
        </Button>
      </div>
    );
  }

  const isPassed = attempt.passed;
  const percentage = attempt.percentage ?? 0;
  const score = attempt.score ?? 0;
  const totalMarks = attempt.totalMarks || exam?.totalMarks || 0;

  const formatStudentResponse = (item: ReviewItem) => {
    const ans = item.studentAnswer;
    if (!ans) return 'Not answered';

    if (item.questionType === 'NUMERICAL') {
      return ans.numericalAnswer !== null && ans.numericalAnswer !== undefined
        ? String(ans.numericalAnswer)
        : 'Not answered';
    }

    if (
      item.questionType === 'SHORT_ANSWER' ||
      item.questionType === 'LONG_ANSWER' ||
      item.questionType === 'FILL_BLANK'
    ) {
      return ans.textAnswer?.trim() || 'Not answered';
    }

    const selected = item.options.filter((o) => o.isSelected).map((o) => o.optionText);
    return selected.length > 0 ? selected.join(', ') : 'Not answered';
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/student/exams')}
        className="text-slate-500 hover:text-slate-900 gap-1.5 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Exams
      </Button>

      <Card className="border-slate-200 shadow-md overflow-hidden bg-white">
        <div
          className={`p-8 text-center text-white space-y-3 ${
            isPassed ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-rose-600 to-red-700'
          }`}
        >
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto shadow-inner">
            {isPassed ? (
              <CheckCircle2 className="h-10 w-10 text-white" />
            ) : (
              <XCircle className="h-10 w-10 text-white" />
            )}
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">
              Examination Result
            </span>
            <h1 className="text-3xl font-black tracking-tight text-white mt-1">
              {isPassed ? 'Assessment Passed!' : 'Assessment Not Cleared'}
            </h1>
            <p className="text-xs text-white/80 mt-1 max-w-md mx-auto">
              {exam?.name} • {exam?.course?.name}
            </p>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Score</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {score} / {totalMarks}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Percentage</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{percentage}%</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Passing Score</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{exam?.passingMarks}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Result Status</p>
              <Badge
                className={`mt-1 text-xs font-bold ${
                  isPassed
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }`}
              >
                {isPassed ? 'PASSED' : 'FAILED'}
              </Badge>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-2.5">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              Proctoring & Session Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 pt-1">
              <div>
                <span className="text-slate-400">Attempt Number:</span>{' '}
                <span className="font-semibold text-slate-800">#{attempt.attemptNumber}</span>
              </div>
              <div>
                <span className="text-slate-400">Proctoring Violations:</span>{' '}
                <span className="font-semibold text-slate-800">
                  {attempt.violationCount} / {attempt.maxViolations}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Started At:</span>{' '}
                <span className="font-semibold text-slate-800">
                  {attempt.startedAt ? new Date(attempt.startedAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Submitted At:</span>{' '}
                <span className="font-semibold text-slate-800">
                  {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            Question & Answer Review
          </CardTitle>
          <p className="text-xs text-slate-500">
            Review each question, your response, and the correct answer.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {resultReview.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No question review is available for this attempt.
            </p>
          ) : (
            resultReview.map((item) => {
              const answered = !!item.studentAnswer;
              const correct = item.studentAnswer?.isCorrect === true;
              const incorrect = answered && item.studentAnswer?.isCorrect === false;
              const awarded = item.studentAnswer?.marksAwarded;

              return (
                <div
                  key={item.questionId}
                  className={`rounded-xl border p-4 space-y-3 ${
                    correct
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : incorrect
                        ? 'border-rose-200 bg-rose-50/30'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          Q{item.displayOrder}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.questionType.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.marks} mark{item.marks === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                        {item.questionText}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {!answered ? (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] gap-1">
                          <MinusCircle className="h-3 w-3" /> Skipped
                        </Badge>
                      ) : correct ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Correct
                          {awarded != null ? ` (+${awarded})` : ''}
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] gap-1">
                          <XCircle className="h-3 w-3" /> Incorrect
                          {awarded != null ? ` (${awarded})` : ''}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {item.options.length > 0 && (
                    <div className="space-y-1.5">
                      {item.options.map((opt) => {
                        const selected = opt.isSelected;
                        const isRight = opt.isCorrect;
                        let optionClass =
                          'border-slate-200 bg-white text-slate-700';
                        if (isRight && selected) {
                          optionClass = 'border-emerald-400 bg-emerald-100 text-emerald-900';
                        } else if (isRight) {
                          optionClass = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                        } else if (selected) {
                          optionClass = 'border-rose-300 bg-rose-50 text-rose-800';
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${optionClass}`}
                          >
                            <span className="mt-0.5 shrink-0">
                              {isRight ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              ) : selected ? (
                                <XCircle className="h-3.5 w-3.5 text-rose-500" />
                              ) : (
                                <span className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300" />
                              )}
                            </span>
                            <span className="flex-1 leading-relaxed">{opt.optionText}</span>
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                              {selected && isRight
                                ? 'Your answer · Correct'
                                : selected
                                  ? 'Your answer'
                                  : isRight
                                    ? 'Correct answer'
                                    : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {item.options.length === 0 && (
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                          Your Answer
                        </p>
                        <p className="text-slate-800 whitespace-pre-wrap">
                          {formatStudentResponse(item)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                        <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">
                          Marks Awarded
                        </p>
                        <p className="text-slate-800 font-semibold">
                          {awarded != null ? `${awarded} / ${item.marks}` : '—'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => navigate('/student/exams')}
          className="w-full sm:w-auto text-xs"
        >
          Back to My Exams
        </Button>
        <Button
          onClick={() => navigate('/student/dashboard')}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default ExamResultScreen;
