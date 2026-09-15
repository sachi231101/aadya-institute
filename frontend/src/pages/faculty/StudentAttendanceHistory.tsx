import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  PageContainer,
  PageHeader,
  FilterToolbar,
  PageSection,
  MetricGrid,
} from "@/components/layout";
import {
  useFacultyMyStudentAttendance,
  useFacultyDashboard,
} from "@/hooks/useFaculty";
import { useBatches } from "@/hooks/useBatches";
import { useClassSessions } from "@/hooks/useClassSessions";
import { useAuthStore } from "@/store/auth.store";
import { getSessionSubjectLabel } from "@/utils/batch.utils";
import type { BackendClassSession } from "@/services/class-sessions.api";

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const statusBadge = (status: string) => {
  const s = status.toUpperCase();
  if (s === "PRESENT")
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Present</Badge>;
  if (s === "ABSENT")
    return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">Absent</Badge>;
  if (s === "LEAVE")
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Leave</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

const doneBar = (pct: number) => {
  const clamped = Math.max(0, Math.min(100, pct));
  const color =
    clamped >= 100
      ? "bg-emerald-500"
      : clamped > 0
        ? "bg-rose-500"
        : "bg-slate-300";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-10 text-right">{clamped}%</span>
    </div>
  );
};

export const FacultyStudentAttendanceHistory: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { data: dashboardRes } = useFacultyDashboard();
  const facultyId = user?.facultyId || dashboardRes?.data?.profile?.id;

  const initialStudentId = searchParams.get("studentId") || "";
  const [view, setView] = useState<"sessions" | "students">(
    initialStudentId ? "students" : "sessions"
  );
  const [month, setMonth] = useState(monthKey(new Date()));
  const [batchId, setBatchId] = useState(searchParams.get("batchId") || "ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [detailOpen, setDetailOpen] = useState(Boolean(initialStudentId));

  const { batches } = useBatches(facultyId ? { facultyId } : undefined);

  const [year, monthNum] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, "0")}`;

  const sessionQuery = useMemo(
    () => ({
      startDate: monthStart,
      endDate: monthEnd,
      limit: 200,
      ...(facultyId ? { facultyId } : {}),
      ...(batchId !== "ALL" ? { batchId } : {}),
    }),
    [monthStart, monthEnd, facultyId, batchId]
  );

  const {
    data: sessionsRes,
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useClassSessions(sessionQuery);

  const sessionRows = useMemo(() => {
    const rows = (sessionsRes?.data ?? []) as Array<
      BackendClassSession & {
        attendanceMarkedCount?: number;
        attendanceDonePercentage?: number;
      }
    >;
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? rows
      : rows.filter((s) => {
          const course = getSessionSubjectLabel({ title: s.title, batch: s.batch });
          const batch = s.batch?.code || s.batch?.name || "";
          const module = s.batchModule?.courseModule?.name || "";
          return (
            course.toLowerCase().includes(q) ||
            batch.toLowerCase().includes(q) ||
            module.toLowerCase().includes(q) ||
            String(s.roomNo || "").toLowerCase().includes(q)
          );
        });
    return [...filtered].sort((a, b) => {
      const da = String(a.scheduledDate).slice(0, 10);
      const db = String(b.scheduledDate).slice(0, 10);
      if (da !== db) return db.localeCompare(da);
      return String(b.startTime || "").localeCompare(String(a.startTime || ""));
    });
  }, [sessionsRes?.data, search]);

  const queryParams = useMemo(
    () => ({
      month,
      page,
      limit: 20,
      batchId: batchId !== "ALL" ? batchId : undefined,
      search: search.trim() || undefined,
    }),
    [month, page, batchId, search]
  );

  const detailParams = useMemo(
    () => ({
      month,
      page: 1,
      limit: 100,
      batchId: batchId !== "ALL" ? batchId : undefined,
      studentId: selectedStudentId || undefined,
    }),
    [month, batchId, selectedStudentId]
  );

  const { data, isLoading, isError, refetch } = useFacultyMyStudentAttendance(
    queryParams,
    view === "students"
  );
  const { data: detailData } = useFacultyMyStudentAttendance(
    detailParams,
    Boolean(detailOpen && selectedStudentId)
  );

  const payload = data?.data;
  const records = payload?.records ?? [];
  const calendar = payload?.calendar ?? {};
  const summary = payload?.summary ?? {
    present: 0,
    absent: 0,
    leave: 0,
    total: 0,
    overallPercentage: 0,
  };
  const meta = data?.meta;

  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay();

  const shiftMonth = (delta: number) => {
    const d = new Date(year, monthNum - 1 + delta, 1);
    setMonth(monthKey(d));
    setPage(1);
  };

  const openStudentDetail = (studentId: string) => {
    setSelectedStudentId(studentId);
    setDetailOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("studentId", studentId);
      return next;
    });
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedStudentId("");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("studentId");
      return next;
    });
  };

  const studentRecords = useMemo(() => {
    return detailData?.data?.records ?? [];
  }, [detailData?.data?.records]);

  const selectedSummary = detailData?.data?.students.find(
    (s) => s.studentId === selectedStudentId
  );

  const sessionsDone = sessionRows.filter(
    (s) => (s.attendanceDonePercentage ?? 0) >= 100
  ).length;

  return (
    <PageContainer>
      <PageHeader
        title="Attendance History"
        description="Class sessions and student attendance for your teaching desk."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/faculty/attendance/take")}>
              Take Attendance
            </Button>
            <Button onClick={() => navigate("/faculty/attendance/new")}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add New
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-1 border-b border-slate-200 mb-1">
        <button
          type="button"
          onClick={() => setView("sessions")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            view === "sessions"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          By Session
        </button>
        <button
          type="button"
          onClick={() => setView("students")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            view === "students"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          By Student
        </button>
      </div>

      <FilterToolbar>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm font-semibold min-w-[120px] text-center flex items-center justify-center gap-1">
            <CalendarDays className="w-4 h-4" />
            {new Date(year, monthNum - 1).toLocaleString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={batchId}
          onChange={(e) => {
            setBatchId(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.name}
            </option>
          ))}
        </select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={view === "sessions" ? "Search course, batch, room…" : "Search student…"}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </FilterToolbar>

      {view === "sessions" ? (
        <>
          <MetricGrid density="compact">
            <Card className="border border-border/80 shadow-2xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ClipboardCheck className="w-3.5 h-3.5" /> Sessions
                </p>
                <h3 className="text-xl font-bold mt-0.5">{sessionRows.length}</h3>
              </CardContent>
            </Card>
            <Card className="border border-border/80 shadow-2xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fully marked
                </p>
                <h3 className="text-xl font-bold mt-0.5">{sessionsDone}</h3>
              </CardContent>
            </Card>
            <Card className="border border-border/80 shadow-2xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Pending
                </p>
                <h3 className="text-xl font-bold mt-0.5">
                  {Math.max(0, sessionRows.length - sessionsDone)}
                </h3>
              </CardContent>
            </Card>
          </MetricGrid>

          <PageSection title="Class attendance sessions">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading sessions…
              </div>
            ) : sessionsError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle className="w-8 h-8 text-rose-500" />
                <p className="text-sm text-slate-600">Failed to load sessions.</p>
                <Button variant="outline" onClick={() => refetchSessions()}>
                  Retry
                </Button>
              </div>
            ) : sessionRows.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-sm text-slate-500">No class sessions in this month.</p>
                <Button onClick={() => navigate("/faculty/attendance/new")}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add New Attendance
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-[11px] uppercase text-slate-500">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Day</th>
                      <th className="py-3 px-3">Time</th>
                      <th className="py-3 px-3">Room</th>
                      <th className="py-3 px-3">Course / Batch</th>
                      <th className="py-3 px-3">Module</th>
                      <th className="py-3 px-3">Attendance Done</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionRows.map((s) => {
                      const dateKey = String(s.scheduledDate).slice(0, 10);
                      const dayLabel = new Date(`${dateKey}T12:00:00`).toLocaleDateString(
                        "en-IN",
                        { weekday: "long" }
                      );
                      const dateLabel = new Date(`${dateKey}T12:00:00`).toLocaleDateString(
                        "en-IN",
                        { day: "2-digit", month: "short", year: "numeric" }
                      );
                      const course = getSessionSubjectLabel({
                        title: s.title,
                        batch: s.batch,
                      });
                      const batch = s.batch?.code || s.batch?.name || "—";
                      const pct = s.attendanceDonePercentage ?? 0;
                      const marked = s.attendanceMarkedCount ?? 0;
                      const enrolled = s.enrolledStudentsCount ?? 0;
                      return (
                        <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                          <td className="py-3 px-3 whitespace-nowrap font-medium">{dateLabel}</td>
                          <td className="py-3 px-3 whitespace-nowrap">{dayLabel}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {s.startTime} – {s.endTime}
                          </td>
                          <td className="py-3 px-3">{s.roomNo || "—"}</td>
                          <td className="py-3 px-3">
                            <div className="font-semibold">{course}</div>
                            <div className="text-xs text-slate-500">{batch}</div>
                          </td>
                          <td className="py-3 px-3">
                            {s.batchModule?.courseModule?.name || "—"}
                          </td>
                          <td className="py-3 px-3">
                            {doneBar(pct)}
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {marked}/{enrolled} marked
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(
                                  `/faculty/attendance/mark?sessionId=${encodeURIComponent(s.id)}`
                                )
                              }
                            >
                              {pct >= 100 ? "Edit" : "Mark"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PageSection>
        </>
      ) : (
        <>
          <MetricGrid density="compact">
            <Card className="border border-border/80 shadow-2xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Overall %
                </p>
                <h3 className="text-xl font-bold mt-0.5">{summary.overallPercentage}%</h3>
              </CardContent>
            </Card>
            <Card className="border border-border/80 shadow-2xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Present
                </p>
                <h3 className="text-xl font-bold mt-0.5">{summary.present}</h3>
              </CardContent>
            </Card>
            <Card className="border border-border/80 shadow-2xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> Absent
                </p>
                <h3 className="text-xl font-bold mt-0.5">{summary.absent}</h3>
              </CardContent>
            </Card>
            <Card className="border border-border/80 shadow-2xs">
              <CardContent className="p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Leave
                </p>
                <h3 className="text-xl font-bold mt-0.5">{summary.leave}</h3>
              </CardContent>
            </Card>
          </MetricGrid>

          <PageSection title="Monthly calendar">
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstWeekday }).map((_, i) => (
                    <div key={`pad-${i}`} className="h-16 rounded-md bg-slate-50/50" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const key = `${month}-${String(day).padStart(2, "0")}`;
                    const cell = calendar[key];
                    const pct =
                      cell && cell.total > 0
                        ? Math.round((cell.present / cell.total) * 100)
                        : null;
                    return (
                      <div
                        key={key}
                        className="h-16 rounded-md border border-slate-100 p-1.5 text-left"
                      >
                        <div className="text-[11px] font-semibold text-slate-700">{day}</div>
                        {cell ? (
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                            <div className="text-emerald-700">P {cell.present}</div>
                            <div className="text-rose-600">A {cell.absent}</div>
                            {pct !== null ? <div>{pct}%</div> : null}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-300 mt-1">—</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </PageSection>

          <PageSection title="Date-wise attendance">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading attendance...
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle className="w-8 h-8 text-rose-500" />
                <p className="text-sm text-slate-600">Failed to load attendance history.</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">
                No attendance records for this period.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <th className="py-3 px-3">Student</th>
                        <th className="py-3 px-3">Batch</th>
                        <th className="py-3 px-3">Course</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer"
                          onClick={() => openStudentDetail(r.studentId)}
                        >
                          <td className="py-3 px-3">
                            <div className="font-semibold">{r.studentName}</div>
                            <div className="text-xs text-slate-500 font-mono">{r.studentCode}</div>
                          </td>
                          <td className="py-3 px-3">{r.batchCode || r.batchName || "—"}</td>
                          <td className="py-3 px-3">{r.courseName || "—"}</td>
                          <td className="py-3 px-3 whitespace-nowrap">{r.date}</td>
                          <td className="py-3 px-3">{statusBadge(r.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {meta && meta.totalPages > 1 ? (
                  <div className="flex items-center justify-between mt-4 text-sm">
                    <span className="text-slate-500">
                      Page {meta.page} of {meta.totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
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
                ) : null}
              </>
            )}
          </PageSection>
        </>
      )}

      <Dialog open={detailOpen} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSummary?.studentName || studentRecords[0]?.studentName || "Student"}
            </DialogTitle>
            <DialogDescription>
              Date-wise attendance
              {selectedSummary
                ? ` · ${selectedSummary.attendancePercentage}% (${selectedSummary.present}/${selectedSummary.total})`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {studentRecords.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                No records for this student in the selected month.
              </p>
            ) : (
              studentRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{r.date}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {r.courseName || "Class"} · {r.batchCode || r.batchName}
                    </div>
                  </div>
                  {statusBadge(r.status)}
                </div>
              ))
            )}
          </div>
          {selectedStudentId ? (
            <div className="pt-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  navigate(
                    `/faculty/reports/students?studentId=${encodeURIComponent(selectedStudentId)}`
                  )
                }
              >
                Open Student Performance
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
