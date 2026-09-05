import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle2, Eye, Download } from "lucide-react";
import { useAssignmentSubmissions, useGradeSubmission } from "@/hooks/useAssignments";
import { assignmentsApi, type AssignmentSubmission } from "@/services/assignments.api";
import { getPortalBasePath } from "@/utils/portal-path";
import { formatMarks, submissionStatusLabel, submissionStatusVariant } from "@/utils/assignment.utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

async function downloadSubmission(submissionId: string, fileName?: string) {
  const token = localStorage.getItem("token");
  const url = assignmentsApi.getDownloadUrl(submissionId);
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName || "submission";
  a.click();
  URL.revokeObjectURL(a.href);
}

export const ReviewsQueue: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [grading, setGrading] = useState<AssignmentSubmission | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const gradeMutation = useGradeSubmission();

  const query = useAssignmentSubmissions({
    page,
    limit: 50,
    ungradedOnly: true,
    ...(search.trim() ? { search: search.trim() } : {}),
  });

  const reviewQueue = (query.data?.data || []) as AssignmentSubmission[];
  const meta = query.data?.meta || { totalPages: 1, page: 1, total: 0 };

  const handleGrade = async () => {
    if (!grading || marks === "") return;
    const max = grading.assignment?.maxMarks ?? 100;
    if (Number(marks) > max) {
      setActionError(`Marks cannot exceed ${max}`);
      return;
    }
    setActionError(null);
    try {
      await gradeMutation.mutateAsync({
        submissionId: grading.id,
        data: { marks: Number(marks), feedback: feedback || undefined },
      });
      setGrading(null);
      setMarks("");
      setFeedback("");
      query.refetch();
    } catch (err: unknown) {
      setActionError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to save grade"
      );
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 pb-16">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Grading Queue</h2>
        <p className="text-sm text-text-secondary">
          Submissions that are waiting to be graded (submitted or late).
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder="Search student or assignment..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <div className="rounded-lg border border-border shadow-xs overflow-hidden overflow-x-auto bg-card">
            <Table className="w-full border-collapse">
              <TableHeader className="bg-muted/60">
                <TableRow className="border-b border-border bg-muted/60 hover:bg-muted/60">
                  <TableHead className="h-11 px-3.5 text-xs font-semibold text-text-primary border-r border-border uppercase tracking-wider whitespace-nowrap">
                    Assignment
                  </TableHead>
                  <TableHead className="h-11 px-3.5 text-xs font-semibold text-text-primary border-r border-border uppercase tracking-wider whitespace-nowrap">
                    Student
                  </TableHead>
                  <TableHead className="h-11 px-3.5 text-xs font-semibold text-text-primary border-r border-border uppercase tracking-wider whitespace-nowrap">
                    Submitted
                  </TableHead>
                  <TableHead className="h-11 px-3.5 text-xs font-semibold text-text-primary border-r border-border uppercase tracking-wider whitespace-nowrap">
                    Status
                  </TableHead>
                  <TableHead className="h-11 px-3.5 text-xs font-semibold text-text-primary border-r border-border uppercase tracking-wider whitespace-nowrap">
                    Marks
                  </TableHead>
                  <TableHead className="h-11 px-3.5 text-xs font-semibold text-text-primary text-right uppercase tracking-wider whitespace-nowrap">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 border-none">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : query.isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-red-600 border-none">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      Failed to load.
                      <Button variant="link" onClick={() => query.refetch()}>
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : reviewQueue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text-secondary border-none">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                      No submissions waiting to be graded.
                    </TableCell>
                  </TableRow>
                ) : (
                  reviewQueue.map((submission) => (
                    <TableRow
                      key={submission.id}
                      className="hover:bg-muted/40 border-b border-border transition-colors last:border-b-0"
                    >
                      <TableCell className="font-semibold text-text-primary border-r border-border px-3.5 py-3">
                        {submission.assignment?.title || "—"}
                      </TableCell>
                      <TableCell className="text-sm border-r border-border px-3.5 py-3">
                        {submission.student?.user?.name || "Student"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm border-r border-border px-3.5 py-3">
                        {submission.submittedAt
                          ? new Date(submission.submittedAt).toLocaleDateString("en-IN")
                          : "—"}
                      </TableCell>
                      <TableCell className="border-r border-border px-3.5 py-3">
                        <Badge variant={submissionStatusVariant(submission.submissionStatus)}>
                          {submissionStatusLabel(submission.submissionStatus, submission)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium border-r border-border px-3.5 py-3">
                        {formatMarks(submission.marks, submission.assignment?.maxMarks)}
                      </TableCell>
                      <TableCell className="text-right space-x-1 px-3.5 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            navigate(`${basePath}/assignments/${submission.assignment?.id}`)
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {submission.fileKey && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              downloadSubmission(submission.id, submission.fileName || undefined)
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActionError(null);
                            setGrading(submission);
                            setMarks(submission.marks != null ? String(submission.marks) : "");
                            setFeedback(submission.feedback || "");
                          }}
                        >
                          Grade
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex justify-between text-sm">
              <span>
                Page {meta.page} of {meta.totalPages} ({meta.total} waiting)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!grading} onOpenChange={(open) => !open && setGrading(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade — {grading?.student?.user?.name || "Student"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            <div>
              <Label>Marks (max {grading?.assignment?.maxMarks ?? 100})</Label>
              <Input
                type="number"
                min={0}
                max={grading?.assignment?.maxMarks ?? 100}
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
              />
            </div>
            <div>
              <Label>Feedback</Label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full min-h-[80px] p-3 border rounded-md text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrading(null)}>
              Cancel
            </Button>
            <Button onClick={handleGrade} disabled={gradeMutation.isPending || marks === ""}>
              {gradeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
