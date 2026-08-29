import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Award,
  Clock,
  ShieldCheck,
  ArrowLeft,
  RotateCcw,
  BarChart3,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useAttemptDetails } from '@/hooks/useExamAttempts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const ExamResultScreen: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useAttemptDetails(attemptId || '', { pollWhileEvaluating: true });
  const attempt = data?.data;
  const exam = attempt?.exam;

  if (isLoading) {
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
        <h2 className="text-xl font-bold text-slate-900">Result Not Found</h2>
        <Button onClick={() => navigate('/student/exams')} variant="outline">
          Back to My Exams
        </Button>
      </div>
    );
  }

  if (['EVALUATING', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(attempt.status)) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Evaluating your answers…</h2>
        <p className="text-sm text-slate-500">This usually takes a few seconds under load. Results will appear automatically.</p>
      </div>
    );
  }

  const isPassed = attempt.passed;
  const percentage = attempt.percentage ?? 0;
  const score = attempt.score ?? 0;
  const totalMarks = attempt.totalMarks || exam?.totalMarks || 0;

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Header Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/student/exams')}
        className="text-slate-500 hover:text-slate-900 gap-1.5 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Exams
      </Button>

      {/* Main Result Card */}
      <Card className="border-slate-200 shadow-md overflow-hidden bg-white">
        {/* Banner */}
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
          {/* Score & Metrics Grid */}
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

          {/* Details & Proctoring Audit */}
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

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
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
              Go to Student Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamResultScreen;
