import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Video,
  Pencil,
  Lock,
  Unlock,
} from "lucide-react";
import {
  useAssignmentById,
  useGradeSubmission,
  useUpdateAssignment,
} from "@/hooks/useAssignments";
import { assignmentsApi } from "@/services/assignments.api";
import { getPortalBasePath } from "@/utils/portal-path";
import {
  assignmentStatusLabel,
  formatAssignmentDueDate,
  formatMarks,
  submissionStatusLabel,
  submissionStatusVariant,
} from "@/utils/assignment.utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { AssignmentSubmission } from "@/services/assignments.api";

async function downloadAttachment(assignmentId: string, fileName?: string | null) {
  const token = localStorage.getItem("token");
  const url = assignmentsApi.getAttachmentDownloadUrl(assignmentId);
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName || "attachment";
  a.click();
  URL.revokeObjectURL(a.href);
}

export const AssignmentDetail: React.FC = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const basePath = getPortalBasePath(location.pathname);
  const assignmentsBase = `${basePath}/assignments`;

  const { data, isLoading, isError, refetch } = useAssignmentById(id);
  const assignment = data?.data;
  const updateMutation = useUpdateAssignment();
  const gradeMutation = useGradeSubmission();

  const [editOpen, setEditOpen] = useState(searchParams.get("edit") === "1");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [allowLate, setAllowLate] = useState(false);
  const [restrictUpload, setRestrictUpload] = useState(false);

  const [grading, setGrading] = useState<AssignmentSubmission | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!assignment) return;
    setTitle(assignment.title || "");
    setDescription(assignment.description || "");
    setDueDate(
      assignment.dueDate
        ? new Date(assignment.dueDate).toISOString().slice(0, 16)
        : ""
    );
    setMaxMarks(String(assignment.maxMarks ?? 100));
    setAllowLate(!!assignment.allowLate);
    setRestrictUpload(!!assignment.restrictStudentUpload);
  }, [assignment]);

  const submissions = useMemo(
    () => (assignment?.submissions || []) as AssignmentSubmission[],
    [assignment]
  );

  const handleSaveEdit = async () => {
    await updateMutation.mutateAsync({
      id,
      data: {
        title,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        maxMarks: Number(maxMarks) || 100,
        allowLate,
        restrictStudentUpload: restrictUpload,
      },
    });
    setEditOpen(false);
    refetch();
  };

  const handleGrade = async () => {
    if (!grading || marks === "") return;
    await gradeMutation.mutateAsync({
      submissionId: grading.id,
      data: { marks: Number(marks), feedback: feedback || undefined },
    });
    setGrading(null);
    setMarks("");
    setFeedback("");
    refetch();
  };

  const downloadFile = (submissionId: string, fileName?: string) => {
    const token = localStorage.getItem("token");
    const url = assignmentsApi.getDownloadUrl(submissionId);
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => {
        if (!r.ok) throw new Error("Download failed");
        return r.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName || "submission";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => undefined);
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin inline mr-2" />
        Loading assignment...
      </div>
    );
  }

  if (isError || !assignment) {
    return (
      <div className="py-16 text-center text-red-600">
        <AlertCircle className="w-6 h-6 inline mr-2" />
        Assignment not found.
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate(assignmentsBase)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border shadow-xs hover:bg-muted cursor-pointer shrink-0"
            onClick={() => navigate(assignmentsBase)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-text-primary">{assignment.title}</h2>
            <p className="text-sm text-text-secondary">
              {assignment.batch?.name || "Batch"} · {assignment.faculty?.user?.name || "Faculty"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge
            variant={assignment.status === "ACTIVE" ? "success" : "secondary"}
            className="h-9 px-3.5 text-xs font-semibold rounded-md flex items-center justify-center shadow-2xs"
          >
            {assignmentStatusLabel(assignment.status)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3.5 border-border shadow-xs hover:bg-muted font-medium gap-1.5 cursor-pointer text-text-primary"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3.5 border-border shadow-xs hover:bg-muted font-medium gap-1.5 cursor-pointer text-text-primary"
            onClick={async () => {
              await updateMutation.mutateAsync({
                id,
                data: { status: assignment.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
              });
              refetch();
            }}
          >
            {assignment.status === "ACTIVE" ? (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                Close
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                Reopen
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-text-muted font-medium">Assigned</p>
            <p className="text-base font-semibold text-text-primary mt-1">
              {assignment.assignedAt
                ? new Date(assignment.assignedAt).toLocaleDateString("en-IN")
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-text-muted font-medium">Due</p>
            <p className="text-base font-semibold text-text-primary mt-1">{formatAssignmentDueDate(assignment.dueDate)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-text-muted font-medium">Max Marks</p>
            <p className="text-base font-semibold text-text-primary mt-1">{assignment.maxMarks ?? 100}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-text-muted font-medium">Submissions</p>
            <p className="text-base font-semibold text-text-primary mt-1">
              {submissions.filter((s) => s.submittedAt).length}/{submissions.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(assignment.targets || []).length === 0 ? (
              <p className="text-text-secondary">
                {assignment.batch?.name || "Primary batch only"}
              </p>
            ) : (
              (assignment.targets || []).map((t) => (
                <div key={t.id || `${t.courseId}-${t.batchId}`} className="p-2.5 rounded-md border border-border bg-muted/20">
                  <p className="font-semibold text-text-primary">{t.course?.name || "Course"}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {[t.courseModule?.name, t.topic, t.batch?.name].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))
            )}
            {(assignment.recipients || []).length > 0 && (
              <p className="text-xs text-amber-700 pt-2 font-medium">
                Limited to {assignment.recipients!.length} specific student(s)
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-2 text-xs">
              {assignment.academicYearMaster?.name && (
                <Badge variant="outline" className="border-border">{assignment.academicYearMaster.name}</Badge>
              )}
              {assignment.assignmentTypeMaster?.name && (
                <Badge variant="outline" className="border-border">{assignment.assignmentTypeMaster.name}</Badge>
              )}
              {assignment.restrictStudentUpload && (
                <Badge variant="warning">Upload restricted</Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {assignment.attachmentFileKey ? (
              <Button
                variant="outline"
                size="sm"
                className="border-border shadow-xs hover:bg-muted font-medium"
                onClick={() => downloadAttachment(assignment.id, assignment.attachmentFileName)}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                {assignment.attachmentFileName || "Download attachment"}
              </Button>
            ) : (
              <p className="text-text-secondary">No instructor attachment</p>
            )}
            {assignment.youtubeVideoId ? (
              <div>
                <a
                  href={`https://www.youtube.com/watch?v=${assignment.youtubeVideoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[#1769AA] hover:underline font-medium text-sm"
                >
                  <Video className="h-4 w-4" />
                  Watch on YouTube
                </a>
              </div>
            ) : null}
            {assignment.validTill && (
              <p className="text-xs text-text-muted">
                Valid till {formatAssignmentDueDate(assignment.validTill)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {assignment.description && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap text-text-secondary">
            {assignment.description}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Submission Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border shadow-xs overflow-hidden overflow-x-auto bg-card">
            <Table className="w-full border-collapse">
              <TableHeader className="bg-muted/60">
                <TableRow className="border-b border-border bg-muted/60 hover:bg-muted/60">
                  <TableHead className="h-11 px-3.5 text-xs font-semibold text-text-primary border-r border-border uppercase tracking-wider whitespace-nowrap">Student</TableHead>
                  <TableHead className="h-11 px-3.5 text-xs font-semibold text-text-primary border-r border-border uppercase tracking-wider whitespace-nowrap">Status</TableHead>
                  <TableHead className="h-11 px-3.5 text-xs font-semibold text-text-primary border-r border-border uppercase tracking-wider whitespace-nowrap">Submitted</TableHead>
                  <TableHead className="h-11 px-3.5 text-xs font-semibold text-text-primary border-r border-border uppercase tracking-wider whitespace-nowrap">Marks</TableHead>
                  <TableHead className="h-11 px-3.5 text-xs font-semibold text-text-primary text-right uppercase tracking-wider whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-text-secondary border-none">
                      No students enrolled yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/40 border-b border-border transition-colors last:border-b-0">
                      <TableCell className="border-r border-border px-3.5 py-3">
                        <span className="font-semibold text-text-primary">{s.student?.user?.name || "Student"}</span>
                        <span className="block text-xs text-text-muted mt-0.5">{s.student?.studentCode}</span>
                      </TableCell>
                      <TableCell className="border-r border-border px-3.5 py-3">
                        <Badge variant={submissionStatusVariant(s.submissionStatus)}>
                          {submissionStatusLabel(s.submissionStatus, s)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm border-r border-border px-3.5 py-3">
                        {s.submittedAt ? new Date(s.submittedAt).toLocaleString("en-IN") : "—"}
                      </TableCell>
                      <TableCell className="font-medium border-r border-border px-3.5 py-3">
                        {formatMarks(s.marks, assignment.maxMarks)}
                      </TableCell>
                      <TableCell className="text-right space-x-1 px-3.5 py-3">
                        {s.fileKey && (
                          <Button size="sm" variant="ghost" onClick={() => downloadFile(s.id, s.fileName || undefined)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {s.submittedAt && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border shadow-xs hover:bg-muted"
                            onClick={() => {
                              setGrading(s);
                              setMarks(s.marks != null ? String(s.marks) : "");
                              setFeedback(s.feedback || "");
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Grade
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Instructions</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] p-3 border rounded-md text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due Date</Label>
                <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label>Max Marks</Label>
                <Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} />
              Allow late submissions
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={restrictUpload}
                onChange={(e) => setRestrictUpload(e.target.checked)}
              />
              Restrict student file upload
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!grading} onOpenChange={(open) => !open && setGrading(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Grade — {grading?.student?.user?.name || "Student"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Marks (max {assignment.maxMarks ?? 100})</Label>
              <Input
                type="number"
                min={0}
                max={assignment.maxMarks ?? 100}
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
              {gradeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Grade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
