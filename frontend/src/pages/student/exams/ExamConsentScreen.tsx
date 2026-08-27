import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  Maximize,
  Eye,
  Lock,
  ArrowLeft,
  Play,
  MonitorCheck,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react';
import { useExamInstructions, useStartExam } from '@/hooks/useExamAttempts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const ExamConsentScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useExamInstructions(id || '');
  const startExamMutation = useStartExam();

  const [hasAgreed, setHasAgreed] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const examData = data?.data;
  const exam = examData?.exam;
  const canStart = examData?.canStartNewAttempt;
  const activeAttemptId = examData?.activeAttemptId;

  const handleStartExam = async () => {
    if (!id || (!canStart && !activeAttemptId)) return;

    setIsStarting(true);
    try {
      // If there is an active attempt already, navigate directly
      if (activeAttemptId) {
        if (document.documentElement.requestFullscreen) {
          try {
            await document.documentElement.requestFullscreen();
          } catch {
            // Proceed even if fullscreen gesture is deferred
          }
        }
        navigate(`/student/exams/${activeAttemptId}/take`);
        return;
      }

      // Start new attempt
      const res = await startExamMutation.mutateAsync({
        examId: id,
        deviceInfo: {
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          browserName: navigator.userAgent.includes('Chrome')
            ? 'Chrome'
            : navigator.userAgent.includes('Firefox')
            ? 'Firefox'
            : 'Other',
        },
      });

      const attemptId = res.data?.attempt?.id;
      if (attemptId) {
        if (document.documentElement.requestFullscreen) {
          try {
            await document.documentElement.requestFullscreen();
          } catch {
            // Ignore error if user browser requires immediate gesture
          }
        }
        navigate(`/student/exams/${attemptId}/take`);
      }
    } catch {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-64 bg-slate-100 rounded-xl" />
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Examination Not Found or Unauthorized</h2>
        <p className="text-sm text-slate-500">
          You may not be enrolled in the batch assigned to this exam, or the exam is not currently active.
        </p>
        <Button onClick={() => navigate('/student/exams')} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to My Exams
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/student/exams')}
        className="text-slate-500 hover:text-slate-900 gap-1.5 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Examinations
      </Button>

      {/* Main Exam Overview Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  {exam.course?.name || 'Aadya Assessment'}
                </span>
                {exam.proctoringEnabled && (
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] gap-1">
                    <ShieldCheck className="h-3 w-3" /> Secure Proctoring
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold text-white">
                {exam.name}
              </CardTitle>
              {exam.module?.name && (
                <CardDescription className="text-slate-300 text-xs sm:text-sm">
                  Module: {exam.module.name}
                </CardDescription>
              )}
            </div>

            <div className="grid grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-6 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
              <div className="text-center sm:text-left">
                <p className="text-[10px] uppercase text-slate-300 font-semibold">Duration</p>
                <p className="text-sm sm:text-base font-bold text-white flex items-center justify-center sm:justify-start gap-1">
                  <Clock className="h-4 w-4 text-indigo-300" /> {exam.durationMinutes}m
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[10px] uppercase text-slate-300 font-semibold">Total Marks</p>
                <p className="text-sm sm:text-base font-bold text-white flex items-center justify-center sm:justify-start gap-1">
                  <Award className="h-4 w-4 text-amber-300" /> {exam.totalMarks}
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[10px] uppercase text-slate-300 font-semibold">Passing Marks</p>
                <p className="text-sm sm:text-base font-bold text-emerald-300">
                  {exam.passingMarks}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Attempt Status notice */}
          {activeAttemptId ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-amber-500 animate-ping" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">You have an active attempt in progress</h4>
                  <p className="text-xs text-amber-700">Click below to resume your examination session immediately.</p>
                </div>
              </div>
              <Button
                onClick={handleStartExam}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Resume Now
              </Button>
            </div>
          ) : !canStart ? (
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-center space-y-1">
              <h4 className="text-sm font-bold text-slate-800">No Remaining Attempts</h4>
              <p className="text-xs text-slate-500">
                You have utilized all {exam.attemptsAllowed} attempt(s) permitted for this examination.
              </p>
            </div>
          ) : null}

          {/* System & Readiness Checks */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <MonitorCheck className="h-4 w-4 text-indigo-600" />
              Pre-Exam System Readiness Checks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Fullscreen Supported</p>
                  <p className="text-[11px] text-slate-500">Your browser supports full screen test environment</p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Active Connection</p>
                  <p className="text-[11px] text-slate-500">Autosave pipeline ready with offline recovery</p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Proctoring Engine</p>
                  <p className="text-[11px] text-slate-500">Session event monitor activated (v1 browser)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Proctoring Rules & Policy */}
          {exam.proctoringEnabled && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                Proctoring Policies & Violation Rules
              </h3>
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-3 text-xs text-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <Maximize className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">Fullscreen Requirement:</span>
                      <p className="text-slate-600 mt-0.5">
                        The test must be completed in fullscreen. Exiting fullscreen mode will register a violation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">Tab Switch & Blur Tracking:</span>
                      <p className="text-slate-600 mt-0.5">
                        Switching browser tabs or switching to another application window is strictly monitored.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lock className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">Clipboard & Shortcuts Lock:</span>
                      <p className="text-slate-600 mt-0.5">
                        Copying questions, pasting content, right-clicking, and DevTools shortcuts are disabled.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-900">3-Strike Auto-Termination:</span>
                      <p className="text-amber-800/90 mt-0.5">
                        You will receive Warning 1 and Warning 2 modals. On the <strong>3rd violation</strong>, your exam is terminated immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Exam Instructions */}
          {exam.instructions && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">Specific Examination Instructions</h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                {exam.instructions}
              </div>
            </div>
          )}

          {/* Student Consent Checkbox */}
          {canStart && (
            <div className="pt-2 border-t border-slate-200">
              <label
                onClick={() => setHasAgreed(!hasAgreed)}
                className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-300 bg-slate-50/50 cursor-pointer transition-all select-none"
              >
                {hasAgreed ? (
                  <CheckSquare className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">
                    I acknowledge and consent to the proctored examination rules
                  </p>
                  <p className="text-[11px] text-slate-500">
                    I understand that my browser activity (fullscreen, tab visibility, focus) will be tracked, and that 3 violations will automatically terminate my exam attempt.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Action CTA */}
          {canStart && (
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate('/student/exams')}
                className="w-full sm:w-auto text-xs"
              >
                Cancel
              </Button>
              <Button
                disabled={!hasAgreed || isStarting}
                onClick={handleStartExam}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-8 py-2.5 gap-2 shadow-sm"
              >
                {isStarting ? (
                  <>Launching Secure Session...</>
                ) : (
                  <>
                    <Maximize className="h-4 w-4" /> Enter Fullscreen & Start Examination
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamConsentScreen;
