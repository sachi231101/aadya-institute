import React, { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  Trash2,
  Pencil,
  Plus,
  X,
  MoreVertical,
} from "lucide-react";
import { batchesApi } from "@/services/batches.api";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BatchEnrolledStudents } from "./BatchEnrolledStudents";
import { BatchAssignedFaculty } from "./BatchAssignedFaculty";
import { BatchSubjectsFacultyTable } from "@/components/batches/BatchSubjectFacultyDisplay";
import {
  formatBatchSubjectNames,
  formatBatchScheduleTitle,
  getBatchCourseRows,
} from "@/utils/batch.utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Tab =
  | "overview"
  | "current"
  | "upcoming"
  | "attendance"
  | "activities"
  | "generate";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const formatLongDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusLabel = (status?: string) => {
  switch (status) {
    case "ACTIVE":
      return "Ongoing";
    case "UPCOMING":
      return "Upcoming";
    case "COMPLETED":
      return "Completed";
    case "INACTIVE":
      return "Inactive";
    default:
      return status || "—";
  }
};

export const BatchDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const queryClient = useQueryClient();

  const [generateStartDate, setGenerateStartDate] = useState("");
  const [generateEndDate, setGenerateEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["batches", id],
    queryFn: () => batchesApi.getById(id!),
    enabled: !!id,
  });

  const batch = data?.data;
  const subjectCount = getBatchCourseRows(batch ?? { courseId: "" }).length;

  const hasSubjectFaculty =
    Boolean(batch?.facultyId) ||
    Boolean(batch?.batchCourses?.some((bc) => bc.facultyId)) ||
    Boolean(batch?.schedules?.some((s) => s.facultyId));
  const canGenerate =
    hasSubjectFaculty && Array.isArray(batch?.schedules) && (batch?.schedules.length ?? 0) > 0;

  const summaryTitle = useMemo(
    () => (batch ? formatBatchScheduleTitle(batch) : ""),
    [batch]
  );

  const attributeRows = useMemo(() => {
    if (!batch) return [];
    const primaryModule =
      batch.batchCourses?.[0]?.course?.name ||
      batch.course?.name ||
      formatBatchSubjectNames(batch);
    const admissionSlot =
      batch.timeSlot ||
      batch.schedules?.[0]?.timeslotMaster?.name ||
      (batch.schedules?.[0]?.startTime
        ? `${batch.schedules[0].startTime} to ${batch.schedules[0].endTime}`
        : "—");

    return [
      { label: "Batch Code", value: batch.code },
      { label: "Batch Name", value: batch.name },
      { label: "Start Date", value: formatLongDate(batch.startDate) },
      { label: "End Date", value: formatLongDate(batch.expectedEndDate) },
      { label: "Course", value: formatBatchSubjectNames(batch) },
      { label: "Module", value: primaryModule },
      { label: "Admission Batch", value: admissionSlot },
      { label: "Branch", value: batch.branch?.name || "—" },
      { label: "Capacity", value: String(batch.capacity ?? "—") },
      {
        label: "Students",
        value: String(batch._count?.enrollments ?? batch.enrollments?.length ?? 0),
      },
      {
        label: "Coordinator",
        value: batch.faculty?.user?.name || "Unassigned",
      },
      { label: "Create Date", value: formatDateTime(batch.createdAt) },
      { label: "Update Date", value: formatDateTime(batch.updatedAt) },
      { label: "Batch Schedule Status", value: statusLabel(batch.status), isStatus: true },
      { label: "Remark", value: batch.remark?.trim() || "—" },
    ];
  }, [batch]);

  const defaultEndDate = () => {
    if (!batch) return "";
    if (batch.expectedEndDate) {
      return new Date(batch.expectedEndDate).toISOString().split("T")[0];
    }
    const start = new Date(batch.startDate);
    start.setDate(start.getDate() + 90);
    return start.toISOString().split("T")[0];
  };

  const handleGenerateSessions = async () => {
    if (!batch) return;
    try {
      setIsGenerating(true);
      setGenerateError(null);
      setGenerateSuccess(null);
      const start =
        generateStartDate || new Date(batch.startDate).toISOString().split("T")[0];
      const end = generateEndDate || defaultEndDate();
      const result = await batchesApi.generateSessions(batch.id, {
        startDate: start,
        endDate: end,
      });
      await queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["schedule-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["faculty-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      await refetch();
      const created = (result as { data?: { created?: number } }).data?.created ?? 0;
      setGenerateSuccess(`Generated ${created} class session(s).`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to generate class sessions";
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!batch) return;
    if (!window.confirm(`Delete batch "${batch.name}" (${batch.code})?`)) return;
    try {
      setIsDeleting(true);
      await batchesApi.delete(batch.id);
      navigate(ROUTES.ADMIN.BATCHES.ALL);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to delete batch";
      window.alert(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !batch) {
    return (
      <div className="text-center py-20 text-rose-600">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        Failed to load batch details.
        <Button variant="link" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "current", label: "Current Batch" },
    { key: "upcoming", label: "Upcoming Batch" },
    { key: "attendance", label: "Attendance Details" },
    { key: "activities", label: "Recent Activities" },
    { key: "generate", label: "Generate Sessions" },
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Zenox-style header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-border pb-3">
        <h2 className="text-xl font-black tracking-tight text-foreground">Batch Schedule</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs rounded-lg transition-all cursor-pointer"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Delete
          </Button>
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs rounded-lg transition-all cursor-pointer"
            asChild
          >
            <Link to={`${ROUTES.ADMIN.BATCHES.ALL}?edit=${batch.id}`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-xs rounded-lg transition-all cursor-pointer"
            asChild
          >
            <Link to={`${ROUTES.ADMIN.BATCHES.ALL}?create=1`}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add New
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs font-semibold rounded-lg border-border hover:bg-muted/50 transition-all cursor-pointer"
            onClick={() => navigate(ROUTES.ADMIN.BATCHES.ALL)}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Cancel
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs font-semibold rounded-lg border-border hover:bg-muted/50 transition-all cursor-pointer">
                More Action
                <MoreVertical className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTab("generate")}>
                Generate Class Sessions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTab("current")}>
                View Students
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTab("activities")}>
                View Faculty
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary bar */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground">
        <span className="mr-2" aria-hidden>
          👉
        </span>
        <span className="break-words">{summaryTitle}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-t-2 transition-colors ${
              tab === t.key
                ? "border-primary bg-card text-primary -mb-px"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left attribute panel */}
          <Card className="lg:col-span-4 xl:col-span-4 border-border shadow-xs rounded-xl overflow-hidden">
            <div className="bg-muted/50 border-b border-border px-4 py-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                Batch Information
              </h3>
            </div>
            <CardContent className="p-0">
              <dl className="divide-y divide-border">
                {attributeRows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-5 text-xs min-h-[2.5rem] border-b border-border last:border-b-0"
                  >
                    <dt className="col-span-2 bg-muted/50 px-3.5 py-2.5 font-semibold text-muted-foreground flex items-center border-r border-border">
                      {row.label}
                    </dt>
                    <dd className="col-span-3 px-3.5 py-2.5 text-foreground font-medium flex items-center break-words">
                      {"isStatus" in row && row.isStatus ? (
                        <Badge
                          variant={
                            batch.status === "ACTIVE"
                              ? "success"
                              : batch.status === "UPCOMING"
                              ? "warning"
                              : "secondary"
                          }
                          className="text-[10px] font-bold px-2 py-0.5"
                        >
                          {row.value}
                        </Badge>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Right Time Table Details */}
          <Card className="lg:col-span-8 xl:col-span-8 border-border shadow-xs rounded-xl overflow-hidden">
            <div className="bg-muted/50 border-b border-border px-4 py-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                Time Table Details
              </h3>
            </div>
            <CardContent className="p-0 overflow-x-auto">
              {batch.schedules && batch.schedules.length > 0 ? (
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr className="text-left border-b border-border">
                      <th className="px-3 py-2.5 font-bold whitespace-nowrap border-r border-border">Day</th>
                      <th className="px-3 py-2.5 font-bold whitespace-nowrap border-r border-border">Time Slot</th>
                      <th className="px-3 py-2.5 font-bold whitespace-nowrap border-r border-border">Class Room</th>
                      <th className="px-3 py-2.5 font-bold whitespace-nowrap border-r border-border">Lecturer/Instructor/Trainer</th>
                      <th className="px-3 py-2.5 font-bold text-center whitespace-nowrap border-r border-border">Status</th>
                      <th className="px-3 py-2.5 font-bold text-center whitespace-nowrap pr-3.5">Attendance Applicable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...batch.schedules]
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-muted/20 transition-colors border-b border-border last:border-b-0">
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap border-r border-border">
                            {DAY_NAMES[s.dayOfWeek] || `Day ${s.dayOfWeek}`}
                          </td>
                          <td className="px-3 py-2.5 font-mono whitespace-nowrap text-muted-foreground border-r border-border">
                            {s.timeslotMaster?.name || (s.startTime ? `${s.startTime} - ${s.endTime}` : "—")}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap border-r border-border">
                            {s.classroomMaster?.name || "—"}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-medium border-r border-border">
                            {s.faculty?.user?.name ||
                              batch.faculty?.user?.name ||
                              "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center border-r border-border">
                            <Badge
                              variant={s.status === "INACTIVE" ? "secondary" : "outline"}
                              className="text-[10px] font-bold px-2 py-0.5"
                            >
                              {s.status === "INACTIVE" ? "I" : "A"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap pr-3.5">
                            {s.attendanceEnabled === false ? (
                              <span className="text-muted-foreground">No</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Yes</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-6 text-sm text-muted-foreground">
                  No timetable lines defined for this batch.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "current" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Current Batch · Subjects ({subjectCount})
            </h3>
            <Badge variant="outline">{statusLabel(batch.status)}</Badge>
          </div>
          <BatchSubjectsFacultyTable batchCourses={batch.batchCourses} batch={batch} />
          {id && <BatchEnrolledStudents batchId={id} />}
        </div>
      )}

      {tab === "upcoming" && (
        <Card className="border-border">
          <CardContent className="p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">Upcoming Batch</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {batch.status === "UPCOMING"
                ? `This batch is scheduled to start on ${formatLongDate(batch.startDate)}.`
                : "No separate upcoming schedule is linked. Use Overview for the active timetable."}
            </p>
          </CardContent>
        </Card>
      )}

      {tab === "attendance" && (
        <Card className="border-border">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-foreground">Attendance Details</p>
            <p className="text-xs text-muted-foreground">
              Open the attendance module for session-wise marking and reports for this batch.
            </p>
            <Button asChild size="sm" className="text-xs font-bold">
              <Link to={ROUTES.ADMIN.STUDENTS.ATTENDANCE}>Go to Attendance</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "activities" && id && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground">Assigned Faculty</h3>
          <BatchAssignedFaculty batchId={id} />
        </div>
      )}

      {tab === "generate" && (
        <Card className="border-border">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Generate Class Sessions</h3>
              </div>
            <p className="text-xs text-muted-foreground">
              Materialize class sessions from the weekly timetable for the portal and attendance views.
              </p>

              {!canGenerate && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs">
                {!hasSubjectFaculty
                  ? "Assign faculty on at least one schedule line before generating sessions."
                    : "No weekly schedule slots found for this batch."}
                </div>
              )}

              {generateError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                  {generateError}
                </div>
              )}

              {generateSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs space-y-2">
                  <p>{generateSuccess}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`${ROUTES.ADMIN.SCHEDULE.CLASSES}?batchId=${batch.id}`}
                      className="underline font-semibold"
                    >
                      Open Classes & Sessions
                    </Link>
                    <span className="text-emerald-600/60">·</span>
                    <Link
                      to={ROUTES.ADMIN.SCHEDULE.TIMETABLE}
                      className="underline font-semibold"
                    >
                      Open Timetable
                    </Link>
                    <span className="text-emerald-600/60">·</span>
                    <Link
                      to={`${ROUTES.ADMIN.SCHEDULE.RECORDINGS}?batchId=${batch.id}`}
                      className="underline font-semibold"
                    >
                      Open Recordings
                    </Link>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  From Date
                </label>
                  <Input
                    type="date"
                    value={generateStartDate}
                    onChange={(e) => setGenerateStartDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  To Date
                </label>
                  <Input
                    type="date"
                    value={generateEndDate}
                    onChange={(e) => setGenerateEndDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateSessions}
                disabled={!canGenerate || isGenerating}
              className="bg-primary hover:bg-primary/90 text-white text-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Class Sessions
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
      )}
    </div>
  );
};
