import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Eye,
  Maximize2,
  Lock,
  WifiOff,
  User,
  Award,
  ListOrdered,
  Calendar,
} from 'lucide-react';
import { useStaffAttemptProctoring } from '@/hooks/useExamAttempts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const AttemptProctoringDetails: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = location.pathname.startsWith('/center') ? '/center/exams' : '/admin/exams';

  const { data, isLoading, error } = useStaffAttemptProctoring(attemptId || '');
  const attempt = data?.data;
  const exam = attempt?.exam;
  const student = attempt?.student;
  const proctoringEvents: any[] = attempt?.proctoringEvents || [];
  const answers: any[] = attempt?.answers || [];

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-12 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-40 bg-slate-100 rounded-xl" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Attempt Not Found</h2>
        <Button onClick={() => navigate(-1)} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'TAB_SWITCH':
      case 'VISIBILITY_HIDDEN':
        return <Eye className="h-4 w-4 text-amber-600" />;
      case 'FULLSCREEN_EXIT':
        return <Maximize2 className="h-4 w-4 text-orange-600" />;
      case 'KEYBOARD_SHORTCUT':
      case 'COPY_ATTEMPT':
      case 'PASTE_ATTEMPT':
        return <Lock className="h-4 w-4 text-red-600" />;
      case 'DEVTOOLS_ATTEMPT':
        return <AlertTriangle className="h-4 w-4 text-purple-600" />;
      case 'NETWORK_DISCONNECT':
        return <WifiOff className="h-4 w-4 text-slate-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`${basePath}/${exam?.id}/attempts`)}
        className="text-slate-500 hover:text-slate-900 gap-1.5 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Exam Attempts
      </Button>

      {/* Header Info Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Proctoring Audit Record
              </span>
              <CardTitle className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                {student?.user?.name} ({student?.studentCode})
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs mt-1">
                Exam: {exam?.name} • Attempt #{attempt.attemptNumber}
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                className={`text-xs px-3 py-1 font-bold ${
                  attempt.status === 'TERMINATED'
                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                    : attempt.status === 'IN_PROGRESS'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {attempt.status}
              </Badge>
              <Badge className="bg-slate-800 text-slate-200 border-slate-700 text-xs px-3 py-1 font-semibold">
                {attempt.violationCount} / {attempt.maxViolations} Violations
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Total Score</span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {attempt.score !== null ? `${attempt.score} / ${attempt.totalMarks}` : '—'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Percentage</span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {attempt.percentage !== null ? `${attempt.percentage}%` : '—'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Started At</span>
              <p className="text-xs font-semibold text-slate-800 mt-1">
                {attempt.startedAt ? new Date(attempt.startedAt).toLocaleString() : '—'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Submitted / Ended</span>
              <p className="text-xs font-semibold text-slate-800 mt-1">
                {attempt.submittedAt
                  ? new Date(attempt.submittedAt).toLocaleString()
                  : attempt.terminatedAt
                  ? `Terminated: ${new Date(attempt.terminatedAt).toLocaleString()}`
                  : 'Active'}
              </p>
            </div>
          </div>

          {attempt.terminationReason && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Termination Diagnostic Reason:</span>
                <p className="text-red-700 mt-0.5">{attempt.terminationReason}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proctoring Event Timeline */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              Chronological Proctoring Events Timeline ({proctoringEvents.length} Events)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {proctoringEvents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Clean Proctoring Session</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No browser violations, tab switches, or fullscreen exits were detected during this attempt.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
              {proctoringEvents.map((evt, idx) => (
                <div key={evt.id || idx} className="relative">
                  {/* Timeline Node Dot */}
                  <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getEventIcon(evt.eventType)}
                        <span className="text-xs font-bold text-slate-900">
                          {evt.eventType.replace('_', ' ')}
                        </span>
                        {evt.warningNumber && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                            Warning #{evt.warningNumber}
                          </Badge>
                        )}
                        {!evt.isCountedViolation && (
                          <Badge variant="outline" className="text-[10px] text-slate-500">
                            Debounced (&lt; 5s)
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(evt.occurredAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                      <pre className="p-2 rounded bg-slate-900 text-slate-300 text-[11px] font-mono overflow-x-auto">
                        {JSON.stringify(evt.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttemptProctoringDetails;
