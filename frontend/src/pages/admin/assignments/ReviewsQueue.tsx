import React, { useMemo, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAssignments, useGradeSubmission } from "@/hooks/useAssignments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Assignment, AssignmentSubmission } from "@/services/assignments.api";

export const ReviewsQueue: React.FC = () => {
  const { data, isLoading, isError, refetch } = useAssignments({ limit: 100 });
  const gradeMutation = useGradeSubmission();
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");

  const assignments = (data?.data || []) as Assignment[];

  const reviewQueue = useMemo(() => {
    const rows: Array<{ assignment: Assignment; submission: AssignmentSubmission }> = [];
    for (const a of assignments) {
      for (const s of a.submissions || []) {
        if (s.submittedAt && (s.status === "SUBMITTED" || !s.evaluatedAt)) {
          rows.push({ assignment: a, submission: s });
        }
      }
    }
    return rows;
  }, [assignments]);

  const handleGrade = async (submissionId: string) => {
    if (!marks) return;
    try {
      await gradeMutation.mutateAsync({ submissionId, data: { marks: Number(marks), feedback } });
      setGradingId(null);
      setMarks("");
      setFeedback("");
      refetch();
    } catch {
      alert("Failed to grade submission");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Grading Queue</h2>
        <p className="text-sm text-text-secondary">Review and grade submitted assignments.</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.</TableCell></TableRow>
              ) : reviewQueue.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-text-secondary">No submissions to grade.</TableCell></TableRow>
              ) : (
                reviewQueue.map(({ assignment, submission }) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{assignment.title}</TableCell>
                    <TableCell>{submission.student?.user?.name || "Student"}</TableCell>
                    <TableCell>{submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString("en-IN") : "—"}</TableCell>
                    <TableCell>
                      {gradingId === submission.id ? (
                        <div className="flex gap-2 items-center">
                          <Input type="number" min={0} max={100} value={marks} onChange={(e) => setMarks(e.target.value)} className="w-20 h-8" placeholder="Marks" />
                          <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-32 h-8" placeholder="Feedback" />
                        </div>
                      ) : (
                        <Badge variant="outline">{submission.marks ?? "—"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {gradingId === submission.id ? (
                        <Button size="sm" onClick={() => handleGrade(submission.id)} disabled={gradeMutation.isPending}>
                          {gradeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setGradingId(submission.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Grade
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
