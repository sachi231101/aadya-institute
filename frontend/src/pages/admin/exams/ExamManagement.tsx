import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FileText,
  Plus,
  Search,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Send,
  Archive,
  Layers,
  HelpCircle,
  Loader2,
  Users,
  ShieldAlert,
} from "lucide-react";
import {
  useExams,
  useExamStats,
  usePublishExam,
  useScheduleExam,
  useArchiveExam,
  useDeleteExam,
} from "@/hooks/useExams";
import { useCourses } from "@/hooks/useCourses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const ExamManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/center") ? "/center/exams" : "/admin/exams";
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");

  const { data: statsResponse, isLoading: statsLoading } = useExamStats();
  const stats = statsResponse?.data;

  const { data: examsResponse, isLoading: examsLoading } = useExams({
    search: searchTerm || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    courseId: courseFilter !== "ALL" ? courseFilter : undefined,
  });
  const exams = examsResponse?.data || [];

  const { courses } = useCourses();

  // Mutations
  const publishMutation = usePublishExam();
  const scheduleMutation = useScheduleExam("");
  const archiveMutation = useArchiveExam();
  const deleteMutation = useDeleteExam();

  // Schedule Modal
  const [schedulingExam, setSchedulingExam] = useState<any | null>(null);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Delete Modal
  const [deletingExam, setDeletingExam] = useState<any | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700">Draft</Badge>;
      case "PUBLISHED":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-700">Published</Badge>;
      case "SCHEDULED":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-300 dark:border-purple-700">Scheduled</Badge>;
      case "LIVE":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-700 animate-pulse">● Live</Badge>;
      case "ENDED":
      case "COMPLETED":
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-300 dark:border-slate-700">Completed</Badge>;
      case "ARCHIVED":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-300 dark:border-gray-700">Archived</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-300 dark:border-red-700">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenSchedule = (exam: any) => {
    setSchedulingExam(exam);
    setScheduleError(null);
    if (exam.startAt) {
      setStartAt(new Date(exam.startAt).toISOString().slice(0, 16));
    } else {
      setStartAt(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
    }
    if (exam.endAt) {
      setEndAt(new Date(exam.endAt).toISOString().slice(0, 16));
    } else {
      setEndAt(new Date(Date.now() + 7200000).toISOString().slice(0, 16));
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingExam) return;
    if (!startAt || !endAt) {
      setScheduleError("Both start and end dates/times are required.");
      return;
    }
    const sDate = new Date(startAt);
    const eDate = new Date(endAt);
    if (eDate <= sDate) {
      setScheduleError("End time must be strictly after start time.");
      return;
    }

    try {
      await scheduleMutation.mutateAsync({
        startAt: sDate.toISOString(),
        endAt: eDate.toISOString(),
      });
      setSchedulingExam(null);
    } catch (err: any) {
      setScheduleError(err?.response?.data?.message || "Failed to schedule exam");
    }
  };

  const handlePublish = async (exam: any) => {
    try {
      await publishMutation.mutateAsync(exam.id);
    } catch {
      // Handled in mutation hook
    }
  };

  const handleArchive = async (exam: any) => {
    if (window.confirm(`Are you sure you want to archive "${exam.name}"?`)) {
      await archiveMutation.mutateAsync(exam.id);
    }
  };

  const handleDelete = async () => {
    if (!deletingExam) return;
    try {
      await deleteMutation.mutateAsync(deletingExam.id);
      setDeletingExam(null);
    } catch {
      // Handled in mutation hook
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Examination Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, schedule, manage question banks, and administer institute assessments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`${basePath}/question-bank`)}
          >
            <HelpCircle className="h-4 w-4 text-purple-500" />
            Question Bank
          </Button>

          <Button
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
            onClick={() => navigate(`${basePath}/create`)}
          >
            <Plus className="h-4 w-4" />
            Create Exam
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Exams</p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.total ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Draft</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">
                {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.DRAFT ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Edit className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Published</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">
                {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.PUBLISHED ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Send className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Scheduled</p>
              <p className="text-2xl font-bold mt-1 text-purple-600">
                {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.SCHEDULED ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Live Now</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">
                {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.LIVE ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Archived</p>
              <p className="text-2xl font-bold mt-1 text-gray-500">
                {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.ARCHIVED ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-500">
              <Archive className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-border/80"
              />
            </div>

            {/* Filter Selects */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter exams by status"
                  className="text-xs rounded-md border border-input bg-background px-3 py-1.5 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="LIVE">Live</option>
                  <option value="ENDED">Ended</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Course:</span>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  aria-label="Filter exams by course"
                  className="text-xs rounded-md border border-input bg-background px-3 py-1.5 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {(searchTerm || statusFilter !== "ALL" || courseFilter !== "ALL") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                    setCourseFilter("ALL");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground h-8"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exams Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[280px]">Exam Name</TableHead>
                <TableHead>Course & Module</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration & Marks</TableHead>
                <TableHead>Batches</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {examsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      <p className="text-sm">Loading examinations...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : exams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground max-w-sm mx-auto">
                      <FileText className="h-10 w-10 text-muted-foreground/50" />
                      <p className="font-medium text-foreground">No examinations found</p>
                      <p className="text-xs text-muted-foreground">
                        {searchTerm || statusFilter !== "ALL" || courseFilter !== "ALL"
                          ? "Try adjusting your search filters to find what you're looking for."
                          : "Get started by creating your first exam using the button above."}
                      </p>
                      {!searchTerm && statusFilter === "ALL" && courseFilter === "ALL" && (
                        <Button
                          size="sm"
                          className="mt-2 gap-2"
                          onClick={() => navigate(`${basePath}/create`)}
                        >
                          <Plus className="h-4 w-4" /> Create Exam
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                exams.map((exam: any) => (
                  <TableRow key={exam.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="space-y-1">
                        <Link
                          to={`${basePath}/${exam.id}`}
                          className="font-semibold text-primary hover:underline block leading-tight"
                        >
                          {exam.name}
                        </Link>
                        {exam.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {exam.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{exam._count?.examQuestions ?? 0} Questions</span>
                          <span>•</span>
                          <span>{exam.attemptsAllowed} attempt{exam.attemptsAllowed > 1 ? "s" : ""}</span>
                          {exam.proctoringEnabled && (
                            <>
                              <span>•</span>
                              <span className="text-purple-600 flex items-center gap-0.5">
                                <ShieldAlert className="h-3 w-3" /> Proctored
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {exam.course?.name || <span className="text-muted-foreground italic">General / All</span>}
                        </p>
                        {exam.module && (
                          <p className="text-xs text-muted-foreground">
                            Mod: {exam.module.name}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {exam.examType || "ONLINE"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1 font-medium">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{exam.durationMinutes} mins</span>
                        </div>
                        <p className="text-muted-foreground">
                          Total: <strong className="text-foreground">{exam.totalMarks}</strong> pts | Pass: {exam.passingMarks}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {exam.batchAssignments?.length || 0} Batches
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(exam.status)}
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigate(`${basePath}/${exam.id}`)}>
                            <Eye className="h-4 w-4 mr-2 text-primary" /> View Details
                          </DropdownMenuItem>

                          {["DRAFT", "SCHEDULED", "PUBLISHED"].includes(exam.status) && (
                            <DropdownMenuItem onClick={() => navigate(`${basePath}/${exam.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit Exam
                            </DropdownMenuItem>
                          )}

                          {exam.status === "DRAFT" && (
                            <DropdownMenuItem onClick={() => handlePublish(exam)}>
                              <Send className="h-4 w-4 mr-2 text-blue-600" /> Publish Exam
                            </DropdownMenuItem>
                          )}

                          {["DRAFT", "PUBLISHED"].includes(exam.status) && (
                            <DropdownMenuItem onClick={() => handleOpenSchedule(exam)}>
                              <Calendar className="h-4 w-4 mr-2 text-purple-600" /> Schedule
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {["PUBLISHED", "SCHEDULED", "LIVE", "ENDED", "COMPLETED"].includes(exam.status) && (
                            <DropdownMenuItem onClick={() => handleArchive(exam)}>
                              <Archive className="h-4 w-4 mr-2 text-gray-500" /> Archive
                            </DropdownMenuItem>
                          )}

                          {["DRAFT", "CANCELLED"].includes(exam.status) && (
                            <DropdownMenuItem
                              onClick={() => setDeletingExam(exam)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Schedule Modal */}
      <Dialog open={!!schedulingExam} onOpenChange={(open) => !open && setSchedulingExam(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Schedule Exam
            </DialogTitle>
            <DialogDescription>
              Set the start and end date/time window during which students can take{" "}
              <strong>{schedulingExam?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleSubmit} className="space-y-4 py-2">
            {scheduleError && (
              <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{scheduleError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="startAt" className="text-xs font-semibold">
                Start Date & Time (Live Window)
              </Label>
              <Input
                id="startAt"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endAt" className="text-xs font-semibold">
                End Date & Time (Submission Deadline)
              </Label>
              <Input
                id="endAt"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSchedulingExam(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scheduleMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {scheduleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scheduling...
                  </>
                ) : (
                  "Confirm Schedule"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingExam} onOpenChange={(open) => !open && setDeletingExam(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Examination
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{deletingExam?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDeletingExam(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Exam"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamManagement;
