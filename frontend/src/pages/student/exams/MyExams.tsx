import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  Award,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Search,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { useStudentAvailableExams } from '@/hooks/useExamAttempts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const MyExams: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useStudentAvailableExams();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const exams: any[] = data?.data || [];

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.course?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const hasActiveAttempt = exam.attempts?.some((a: any) => a.status === 'IN_PROGRESS');
    const hasCompletedAttempt = exam.attempts?.some((a: any) =>
      ['COMPLETED', 'SUBMITTED'].includes(a.status)
    );

    if (activeTab === 'ACTIVE') return hasActiveAttempt || exam.attempts?.length === 0;
    if (activeTab === 'COMPLETED') return hasCompletedAttempt;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-indigo-600" />
            Online Examinations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access your scheduled course tests, proctored mock exams, and view performance results.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
          {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'ALL' ? 'All Exams' : tab === 'ACTIVE' ? 'Active & Available' : 'Completed'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search exam or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Loading & Empty States */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-8 text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">Failed to load examinations</p>
            <p className="text-xs text-red-500 mt-1">Please refresh or check your internet connection.</p>
          </CardContent>
        </Card>
      ) : filteredExams.length === 0 ? (
        <Card className="border-dashed border-slate-300 py-12">
          <CardContent className="text-center text-slate-500">
            <BookOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <h3 className="font-semibold text-slate-700">No Examinations Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              There are no examinations currently assigned to your enrolled batches matching this criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam) => {
            const latestAttempt = exam.attempts?.[0];
            const hasActiveAttempt = latestAttempt?.status === 'IN_PROGRESS';
            const isTerminated = latestAttempt?.status === 'TERMINATED';
            const isCompleted = ['COMPLETED', 'SUBMITTED'].includes(latestAttempt?.status);
            const attemptsLeft = Math.max(0, exam.attemptsAllowed - (exam.attempts?.length || 0));

            return (
              <Card
                key={exam.id}
                className="overflow-hidden border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                          {exam.course?.code || exam.course?.name || 'General Exam'}
                        </span>
                        <CardTitle className="text-base font-bold text-slate-900 line-clamp-1 mt-0.5">
                          {exam.name}
                        </CardTitle>
                      </div>
                      {exam.proctoringEnabled && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] gap-1 shrink-0">
                          <ShieldCheck className="h-3 w-3" /> Proctored
                        </Badge>
                      )}
                    </div>
                    {exam.module?.name && (
                      <CardDescription className="text-xs text-slate-500">
                        Module: {exam.module.name}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3 text-xs text-slate-600">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{exam.durationMinutes} Minutes</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Award className="h-3.5 w-3.5 text-slate-400" />
                        <span>{exam.totalMarks} Marks</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                        <span>{exam._count?.examQuestions || 0} Questions</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                        <span>{attemptsLeft} Attempt(s) left</span>
                      </div>
                    </div>

                    {/* Attempt Status Banner */}
                    {hasActiveAttempt && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-800 font-medium">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Attempt in progress! Resume now.</span>
                      </div>
                    )}

                    {isTerminated && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700">
                        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                        <span>Terminated: {latestAttempt.terminationReason || 'Violations'}</span>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 font-medium">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Completed
                        </span>
                        <span className="font-bold text-emerald-700">
                          {latestAttempt.score} / {latestAttempt.totalMarks} (
                          {latestAttempt.passed ? 'PASSED' : 'FAILED'})
                        </span>
                      </div>
                    )}
                  </CardContent>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 mt-2">
                  {hasActiveAttempt ? (
                    <Button
                      onClick={() => navigate(`/student/exams/${latestAttempt.id}/take`)}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Resume Examination
                    </Button>
                  ) : isCompleted ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/student/exams/${latestAttempt.id}/result`)}
                        className="flex-1 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      >
                        View Result
                      </Button>
                      {attemptsLeft > 0 && (
                        <Button
                          onClick={() => navigate(`/student/exams/${exam.id}/start`)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                        >
                          Retake Exam
                        </Button>
                      )}
                    </div>
                  ) : isTerminated && attemptsLeft === 0 ? (
                    <Button disabled variant="outline" className="w-full text-xs text-slate-400">
                      No Attempts Left
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate(`/student/exams/${exam.id}/start`)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Start Examination
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyExams;
