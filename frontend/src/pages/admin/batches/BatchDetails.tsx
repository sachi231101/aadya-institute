import React, { useMemo, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { batchesApi, type SessionSyncResult } from "@/services/batches.api";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { BatchEnrolledStudents } from "./BatchEnrolledStudents";
import { BatchSubjectsFacultyTable } from "@/components/batches/BatchSubjectFacultyDisplay";
import {
  formatBatchSubjectNames,
  getBatchCourseRows,
  getSessionSubjectLabel,
} from "@/utils/batch.utils";
import { getPortalBasePath } from "@/utils/portal-path";
import { useClassSessions } from "@/hooks/useClassSessions";
import type { BackendClassSession } from "@/services/class-sessions.api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Tab =
  | "overview"
  | "current"
  | "upcoming";

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

const todayDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

const formatSyncSummary = (sync: SessionSyncResult) => {
  if (sync.error) return sync.message || sync.error;
  if (sync.message) return sync.message;
  const parts = [
    `${sync.created} created`,
    `${sync.updated} updated`,
    sync.cancelled ? `${sync.cancelled} cancelled` : null,
    sync.skippedHolidays ? `${sync.skippedHolidays} holiday skips` : null,
    sync.skippedConflicts ? `${sync.skippedConflicts} conflict skips` : null,
  ].filter(Boolean);
  return `Timetable sync: ${parts.join(", ")}.`;
};

export const BatchDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const basePath = getPortalBasePath(location.pathname);
  const [tab, setTab] = useState<Tab>("overview");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["batches", id],
    queryFn: () => batchesApi.getById(id!),
    enabled: !!id,
  });

  const batch = data?.data;
  const subjectCount = getBatchCourseRows(batch ?? { courseId: "" }).length;

  const {
    data: upcomingSessionsRes,
    isLoading: upcomingLoading,
    isError: upcomingError,
    refetch: refetchUpcoming,
  } = useClassSessions(
    id
      ? {
          batchId: id,
          status: "UPCOMING",
          startDate: todayDateKey(),
          limit: 100,
        }
      : undefined
  );

  const upcomingSessions = useMemo(() => {
    const rows = (upcomingSessionsRes?.data ?? []) as BackendClassSession[];
    return [...rows].sort((a, b) => {
      const da = new Date(a.scheduledDate).getTime();
      const db = new Date(b.scheduledDate).getTime();
      if (da !== db) return da - db;
      return String(a.startTime || "").localeCompare(String(b.startTime || ""));
    });
  }, [upcomingSessionsRes?.data]);

  const summaryTitle = batch?.name ?? "";
  const timetablePath = `${basePath}/schedule/timetable`;

  const handleSyncTimetable = async () => {
    if (!id) return;
    try {
      setSyncing(true);
      setSyncError(null);
      setSyncMessage(null);
      const res = await batchesApi.generateSessions(id);
      setSyncMessage(formatSyncSummary(res.data));
      await refetch();
      await refetchUpcoming();
      await queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["schedule-summary"] });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        "Failed to sync timetable";
      setSyncError(message);
    } finally {
      setSyncing(false);
    }
  };

  const attributeRows = useMemo(() => {
    if (!batch) return [];
    return [
      { label: "Batch Code", value: batch.code },
      { label: "Batch Name", value: batch.name },
      { label: "Start Date", value: formatLongDate(batch.startDate) },
      { label: "End Date", value: formatLongDate(batch.expectedEndDate) },
      { label: "Course", value: formatBatchSubjectNames(batch) },
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
    { key: "current", label: "Courses & Students" },
    { key: "upcoming", label: "Upcoming Classes" },
  ];

  const syncActions = (
    <div className="flex flex-wrap items-center gap-2">
      <PermissionGate itemKey="batches.all" mode="write">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs gap-1.5"
          disabled={syncing || !batch.expectedEndDate}
          title={
            !batch.expectedEndDate
              ? "Set an expected end date on the batch before syncing"
              : "Generate weekly class sessions through the end date"
          }
          onClick={() => void handleSyncTimetable()}
        >
          {syncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Sync timetable
        </Button>
      </PermissionGate>
      <Button asChild size="sm" variant="ghost" className="text-xs gap-1.5">
        <Link to={timetablePath}>
          <CalendarDays className="h-3.5 w-3.5" />
          Timetable exceptions
        </Link>
      </Button>
    </div>
  );

  return (
    <PageContainer className="animate-in fade-in duration-300">
      <PageHeader
        title="Batch Schedule"
        className="border-b border-border pb-3"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`${basePath}/batches`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Summary bar */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground">
        <span className="break-words">{summaryTitle}</span>
      </div>

      {(syncMessage || syncError) && (
        <div
          className={`rounded-lg border px-3 py-2.5 text-xs font-medium ${
            syncError
              ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {syncError || syncMessage}
        </div>
      )}

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
            <div className="bg-muted/50 border-b border-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                  Time Table Details
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Weekly pattern fills classes through the end date. Use Timetable for odd-day exceptions.
                </p>
              </div>
              {syncActions}
            </div>
            <CardContent className="p-0 overflow-x-auto">
              {batch.schedules && batch.schedules.length > 0 ? (
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr className="text-left border-b border-border">
                      <th className="px-3 py-2.5 font-bold whitespace-nowrap border-r border-border">Day</th>
                      <th className="px-3 py-2.5 font-bold whitespace-nowrap border-r border-border">Time Slot</th>
                      <th className="px-3 py-2.5 font-bold whitespace-nowrap border-r border-border">Class Room</th>
                      <th className="px-3 py-2.5 font-bold whitespace-nowrap pr-3.5">Lecturer/Instructor/Trainer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...batch.schedules]
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-muted/20 transition-colors border-b border-border last:border-b-0">
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap border-r border-border">
                            <span className="inline-flex items-center gap-1.5">
                              {DAY_NAMES[s.dayOfWeek] || `Day ${s.dayOfWeek}`}
                              {s.status === "INACTIVE" && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-bold px-1.5 py-0"
                                  title="Legacy inactive — sessions are not generated for this slot"
                                >
                                  Inactive
                                </Badge>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono whitespace-nowrap text-muted-foreground border-r border-border">
                            {s.timeslotMaster?.name || (s.startTime ? `${s.startTime} - ${s.endTime}` : "—")}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap border-r border-border">
                            {s.classroomMaster?.name || "—"}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-medium pr-3.5">
                            {s.faculty?.user?.name ||
                              batch.faculty?.user?.name ||
                              "—"}
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
              Courses & Students ({subjectCount})
            </h3>
            <Badge variant="outline">{statusLabel(batch.status)}</Badge>
          </div>
          <BatchSubjectsFacultyTable batchCourses={batch.batchCourses} batch={batch} />
          {id && <BatchEnrolledStudents batchId={id} />}
        </div>
      )}

      {tab === "upcoming" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-foreground">
              Upcoming Classes ({upcomingSessions.length})
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {syncActions}
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link to={`${ROUTES.ADMIN.SCHEDULE.CLASSES}?batchId=${batch.id}`}>
                  Open Classes
                </Link>
              </Button>
            </div>
          </div>

          {upcomingLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading upcoming classes…</span>
            </div>
          ) : upcomingError ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center space-y-3">
                <p className="text-sm text-rose-600">Failed to load upcoming classes.</p>
                <Button variant="outline" size="sm" onClick={() => refetchUpcoming()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : upcomingSessions.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-foreground">No upcoming classes</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  There are no upcoming class sessions for this batch from today onward.
                  Use Sync timetable to fill weekly classes through the end date, or adjust odd days on Timetable.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border shadow-none rounded-lg overflow-hidden">
              <div className="min-w-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatLongDate(session.scheduledDate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                          {session.startTime || "—"}
                          {session.endTime ? ` – ${session.endTime}` : ""}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {getSessionSubjectLabel({
                            title: session.title,
                            batch: session.batch,
                          })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {session.faculty?.user?.name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {session.roomNo || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm" className="text-xs h-8">
                            <Link to={ROUTES.ADMIN.SCHEDULE.CLASS_DETAIL(session.id)}>
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      )}
    </PageContainer>
  );
};
