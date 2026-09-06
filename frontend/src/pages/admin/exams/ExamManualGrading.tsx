import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  Save,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useStaffAttemptForGrading, useStaffGradeAnswer } from '@/hooks/useExamAttempts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type GradeDraft = {
  marksAwarded: string;
  graderComment: string;
};

export const ExamManualGrading: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/center') ? '/center/exams' : '/admin/exams';

  const { data, isLoading, error } = useStaffAttemptForGrading(attemptId || '');
  const gradePayload = data?.data;
  const examId = gradePayload?.exam?.id as string | undefined;
  const gradeMutation = useStaffGradeAnswer(attemptId || '', examId);

  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>({});

  const subjectiveAnswers = gradePayload?.subjectiveAnswers || [];

  const getDraft = (answerId: string, item: any): GradeDraft => {
    if (drafts[answerId]) return drafts[answerId];
    return {
      marksAwarded:
        item.marksAwarded !== null && item.marksAwarded !== undefined
          ? String(item.marksAwarded)
          : '',
      graderComment: item.graderComment || '',
    };
  };

  const pendingCount = gradePayload?.pendingCount ?? 0;
  const gradedCount = gradePayload?.gradedCount ?? 0;
  const totalSubjective = gradePayload?.totalSubjective ?? 0;

  const typeLabel = (t: string) => {
    switch (t) {
      case 'FILL_BLANK':
        return 'Fill Blank';
      case 'SHORT_ANSWER':
        return 'Short Answer';
      case 'LONG_ANSWER':
        return 'Long Answer';
      default:
        return t;
    }
  };

  const handleSave = async (item: any) => {
    const draft = getDraft(item.answerId, item);
    const marks = Number(draft.marksAwarded);
    if (Number.isNaN(marks) || marks < 0 || marks > item.maxMarks) {
      return;
    }
    await gradeMutation.mutateAsync({
      answerId: item.answerId,
      marksAwarded: marks,
      graderComment: draft.graderComment.trim() || undefined,
    });
  };

  const studentName = useMemo(() => {
    return (
      gradePayload?.student?.user?.name ||
      gradePayload?.student?.studentCode ||
      'Student'
    );
  }, [gradePayload]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading grading panel...
      </div>
    );
  }

  if (error || !gradePayload) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-red-600 font-semibold">Failed to load grading data</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`${basePath}/${examId}/attempts`)}
            className="text-slate-500 hover:text-slate-900 gap-1.5 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Attempts
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-indigo-600" />
            Manual Grading
          </h1>
          <p className="text-sm text-muted-foreground">
            {gradePayload.exam?.name} — {studentName} (Attempt #{gradePayload.attempt?.attemptNumber})
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="h-3 w-3" /> {pendingCount} pending
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" /> {gradedCount}/{totalSubjective} graded
          </Badge>
          {gradePayload.attempt?.status === 'COMPLETED' && (
            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs">
              Attempt completed
            </Badge>
          )}
        </div>
      </div>

      {totalSubjective === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-500 text-sm">
            No fill-blank, short, or long answer questions on this attempt.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subjectiveAnswers.map((item: any, idx: number) => {
            const draft = getDraft(item.answerId, item);
            const isPending = item.gradingStatus === 'PENDING_MANUAL';
            const isSaving =
              gradeMutation.isPending && gradeMutation.variables?.answerId === item.answerId;

            return (
              <Card key={item.answerId} className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Q{idx + 1}. {item.questionText}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {typeLabel(item.questionType)}
                        </Badge>
                        <span>Max {item.maxMarks} marks</span>
                      </CardDescription>
                    </div>
                    {isPending ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                        Needs grading
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                        Graded
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      Student Answer
                    </p>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">
                      {item.textAnswer?.trim() || (
                        <span className="italic text-slate-400">No answer submitted</span>
                      )}
                    </p>
                  </div>

                  {item.sampleAnswer?.trim() && (
                    <div className="rounded-lg bg-indigo-50/60 border border-indigo-100 p-3">
                      <p className="text-[10px] uppercase font-semibold text-indigo-400 mb-1">
                        Sample / Expected Answer
                      </p>
                      <p className="text-sm text-indigo-950 whitespace-pre-wrap">{item.sampleAnswer}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Marks (0–{item.maxMarks})</Label>
                      <Input
                        type="number"
                        min={0}
                        max={item.maxMarks}
                        step={0.5}
                        value={draft.marksAwarded}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.answerId]: {
                              ...getDraft(item.answerId, item),
                              marksAwarded: e.target.value,
                            },
                          }))
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Comment (optional)</Label>
                      <Textarea
                        rows={2}
                        placeholder="Feedback for internal record..."
                        value={draft.graderComment}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.answerId]: {
                              ...getDraft(item.answerId, item),
                              graderComment: e.target.value,
                            },
                          }))
                        }
                        className="text-xs"
                      />
                    </div>
                    <Button
                      onClick={() => handleSave(item)}
                      disabled={isSaving || draft.marksAwarded === ''}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {pendingCount === 0 && totalSubjective > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="py-4 text-sm text-emerald-800 font-medium text-center">
            All subjective answers are graded. Attempt score has been finalized.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExamManualGrading;
