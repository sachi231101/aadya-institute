import React, { useMemo } from "react";
import { Loader2, AlertCircle, Inbox } from "lucide-react";
import { useAssignments } from "@/hooks/useAssignments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Assignment, AssignmentSubmission } from "@/services/assignments.api";

export const SubmissionsQueue: React.FC = () => {
  const { data, isLoading, isError, refetch } = useAssignments({ limit: 100, status: "ACTIVE" });
  const assignments = (data?.data || []) as Assignment[];

  const pendingSubmissions = useMemo(() => {
    const rows: Array<{ assignment: Assignment; submission: AssignmentSubmission }> = [];
    for (const a of assignments) {
      for (const s of a.submissions || []) {
        if (s.status === "SUBMITTED" || (!s.evaluatedAt && s.submittedAt)) {
          rows.push({ assignment: a, submission: s });
        }
      }
    }
    return rows;
  }, [assignments]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Submissions Queue</h2>
        <p className="text-sm text-text-secondary">Pending student submissions awaiting review.</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.<Button variant="link" onClick={() => refetch()}>Retry</Button></TableCell></TableRow>
              ) : pendingSubmissions.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-text-secondary"><Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />No pending submissions.</TableCell></TableRow>
              ) : (
                pendingSubmissions.map(({ assignment, submission }) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{assignment.title}</TableCell>
                    <TableCell>{submission.student?.user?.name || "Student"}</TableCell>
                    <TableCell>{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString("en-IN") : "—"}</TableCell>
                    <TableCell><Badge variant="warning">{submission.status}</Badge></TableCell>
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
