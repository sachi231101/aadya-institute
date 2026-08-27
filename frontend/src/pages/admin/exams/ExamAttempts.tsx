import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Search,
  Eye,
  Ban,
  UserCheck,
  RotateCcw,
  Users,
} from 'lucide-react';
import { useStaffExamAttempts, useStaffTerminateAttempt } from '@/hooks/useExamAttempts';
import { useExam } from '@/hooks/useExams';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export const ExamAttempts: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = location.pathname.startsWith('/center') ? '/center/exams' : '/admin/exams';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [terminatingAttemptId, setTerminatingAttemptId] = useState<string | null>(null);
  const [terminationReason, setTerminationReason] = useState('');

  const { data: examData } = useExam(id || '');
  const { data: attemptsData, isLoading, error } = useStaffExamAttempts(id || '', {
    search: searchTerm,
    status: statusFilter || undefined,
  });

  const terminateMutation = useStaffTerminateAttempt(terminatingAttemptId || '', id || '');

  const exam = examData?.data;
  const attempts: any[] = attemptsData?.data?.attempts || [];
  const total = attemptsData?.data?.total || 0;

  // Metric counts
  const inProgressCount = attempts.filter((a) => a.status === 'IN_PROGRESS').length;
  const completedCount = attempts.filter((a) => ['COMPLETED', 'SUBMITTED'].includes(a.status)).length;
  const terminatedCount = attempts.filter((a) => a.status === 'TERMINATED').length;

  const handleConfirmTerminate = async () => {
    if (!terminatingAttemptId || !terminationReason.trim()) return;
    try {
      await terminateMutation.mutateAsync(terminationReason);
      setTerminatingAttemptId(null);
      setTerminationReason('');
    } catch {
      // Handled by hook notification
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`${basePath}/${id}`)}
        className="text-slate-500 hover:text-slate-900 gap-1.5 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Exam Details
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="h-7 w-7 text-indigo-600" />
            Live Examination Attempts & Proctoring Monitor
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Exam: <strong className="text-slate-800">{exam?.name || 'Loading...'}</strong> • Real-time student session tracking & violation logs.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Attempts</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{total}</p>
            </div>
            <Users className="h-8 w-8 text-indigo-200" />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">In Progress</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">{inProgressCount}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-200" />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Completed</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{completedCount}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-200" />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Terminated (Violations)</p>
              <p className="text-2xl font-extrabold text-red-600 mt-1">{terminatedCount}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-200" />
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search student code, name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-md border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Attempts Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700">Student</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Attempt #</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Proctoring Violations</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Score</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Started / Submitted</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400 text-xs">
                    Loading student attempts...
                  </TableCell>
                </TableRow>
              ) : attempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500 text-xs">
                    No student examination attempts found matching this criteria.
                  </TableCell>
                </TableRow>
              ) : (
                attempts.map((attempt) => {
                  const isTerminated = attempt.status === 'TERMINATED';
                  const isInProgress = attempt.status === 'IN_PROGRESS';
                  const isCompleted = ['COMPLETED', 'SUBMITTED'].includes(attempt.status);

                  return (
                    <TableRow key={attempt.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="font-semibold text-xs text-slate-900">
                          {attempt.student?.user?.name || 'Student'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {attempt.student?.studentCode} • {attempt.student?.user?.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">
                        #{attempt.attemptNumber}
                      </TableCell>
                      <TableCell>
                        {isInProgress ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                            In Progress
                          </Badge>
                        ) : isTerminated ? (
                          <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] gap-1">
                            <XCircle className="h-3 w-3" /> Terminated
                          </Badge>
                        ) : isCompleted ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {attempt.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] font-bold ${
                            attempt.violationCount === 0
                              ? 'bg-slate-100 text-slate-700'
                              : attempt.violationCount === 1
                              ? 'bg-amber-100 text-amber-800'
                              : attempt.violationCount === 2
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {attempt.violationCount} / {attempt.maxViolations || 3} Violations
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800">
                        {attempt.score !== null && attempt.score !== undefined ? (
                          <span className={attempt.passed ? 'text-emerald-700 font-bold' : 'text-red-600'}>
                            {attempt.score} / {attempt.totalMarks} ({attempt.percentage}%)
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-600">
                        <div>{attempt.startedAt ? new Date(attempt.startedAt).toLocaleTimeString() : '—'}</div>
                        <div className="text-slate-400">
                          {attempt.submittedAt
                            ? new Date(attempt.submittedAt).toLocaleTimeString()
                            : attempt.terminatedAt
                            ? `Terminated: ${new Date(attempt.terminatedAt).toLocaleTimeString()}`
                            : 'Active session'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`${basePath}/attempts/${attempt.id}/proctoring`)}
                            className="h-7 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1"
                          >
                            <Eye className="h-3 w-3" /> Audit Log
                          </Button>
                          {isInProgress && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setTerminatingAttemptId(attempt.id)}
                              className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50 gap-1"
                            >
                              <Ban className="h-3 w-3" /> Terminate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manual Termination Dialog */}
      <Dialog open={!!terminatingAttemptId} onOpenChange={() => setTerminatingAttemptId(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <Ban className="h-5 w-5" /> Terminate Student Examination
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This action will immediately lock the student's active exam session and mark it as terminated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-bold text-slate-700">Reason for manual termination:</label>
            <Input
              placeholder="e.g. Unauthorized external aid confirmed by invigilator"
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setTerminatingAttemptId(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              disabled={!terminationReason.trim() || terminateMutation.isPending}
              onClick={handleConfirmTerminate}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Confirm Termination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamAttempts;
