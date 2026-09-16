import React, { useMemo, useState, useEffect } from "react";
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
  ClipboardCheck,
  Eye,
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
import { toDateKey } from "@/constants/timetable-slots";
import type { BackendClassSession } from "@/services/class-sessions.api";
import { ROUTES } from "@/constants/routes";

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

const markedBar = (marked: number, enrolled: number) => {
  const pct = enrolled > 0 ? Math.round((marked / enrolled) * 100) : marked > 0 ? 100 : 0;
  const clamped = Math.max(0, Math.min(100, pct));
  const color =
    enrolled > 0 && marked >= enrolled
      ? "bg-emerald-500"
      : marked > 0
        ? "bg-amber-500"
        : "bg-slate-300";
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums whitespace-nowrap">
        Marked {marked}/{enrolled || "—"}
      </span>
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
  const [studentPage, setStudentPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [detailOpen, setDetailOpen] = useState(Boolean(initialStudentId));

  useEffect(() => {
    const sid = searchParams.get("studentId") || "";
    if (!sid) return;
    setView("students");
    setSelectedStudentId(sid);
    setDetailOpen(true);
  }, [searchParams]);

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
    const active = rows.filter(
      (s) => String(s.sessionStatus || "").toUpperCase() !== "CANCELLED"
    );
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? active
      : active.filter((s) => {
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
      const da = toDateKey(a.scheduledDate);
      const db = toDateKey(b.scheduledDate);
      if (da !== db) return db.localeCompare(da);
      return String(b.startTime || "").localeCompare(String(a.startTime || ""));
    });
  }, [sessionsRes?.data, search]);

  const queryParams = useMemo(
    () => ({
      month,
      page: 1,
      limit: 100,
      batchId: batchId !== "ALL" ? batchId : undefined,
    }),
    [month, batchId]
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
  const calendar = payload?.calendar ?? {};
  const summary = payload?.summary ?? {
    present: 0,
    absent: 0,
    leave: 0,
    total: 0,
    overallPercentage: 0,
  };

  const studentRows = useMemo(() => {
    const rows = payload?.students ?? [];
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? rows
      : rows.filter(
          (s) =>
            s.studentName.toLowerCase().includes(q) ||
            s.studentCode.toLowerCase().includes(q) ||
            (s.batchCodes || []).some((c) => c.toLowerCase().includes(q))
        );
    return filtered;
  }, [payload?.students, search]);

  const STUDENTS_PER_PAGE = 20;
  const studentTotalPages = Math.max(1, Math.ceil(studentRows.length / STUDENTS_PER_PAGE));
  const pagedStudents = useMemo(() => {
    const start = (studentPage - 1) * STUDENTS_PER_PAGE;
    return studentRows.slice(start, start + STUDENTS_PER_PAGE);
  }, [studentRows, studentPage]);

  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay();

  const shiftMonth = (delta: number) => {
    const d = new Date(year, monthNum - 1 + delta, 1);
    setMonth(monthKey(d));
    setStudentPage(1);
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

  const sessionsDone = sessionRows.filter((s) => {
    const enrolled = s.enrolledStudentsCount ?? 0;
    const marked = s.attendanceMarkedCount ?? 0;
    return enrolled > 0 && marked >= enrolled;
  }).length;

  return (
    <PageContainer>
      <PageHeader
        title="Attendance History"
        description="Class sessions and student attendance for your teaching desk."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(ROUTES.FACULTY.STUDENTS)}>
              My Students
            </Button>
            <Button variant="outline" onClick={() => navigate(ROUTES.FACULTY.ATTENDANCE_TAKE)}>
              Take Attendance
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-1 border-b border-slate-200 mb-1">
        <button
          type="button"
          onClick={() => {
            setView("sessions");
            setSearch("");
          }}
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
          onClick={() => {
            setView("students");
            setSearch("");
            setStudentPage(1);
          }}
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
            setStudentPage(1);
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
            placeholder={
              view === "sessions" ? "Search course, batch, room…" : "Search student name or code…"
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setStudentPage(1);
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
              <div className="text-center py-12 space-y-2">
                <p className="text-sm text-slate-500">No class sessions in this month.</p>
                <p className="text-xs text-slate-400">
                  Sessions come from the batch timetable. Use Take Attendance for today&apos;s classes.
                </p>
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
                      <th className="py-3 px-3">Marked</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionRows.map((s) => {
                      const dateKey = toDateKey(s.scheduledDate);
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
                      const marked = s.attendanceMarkedCount ?? 0;
                      const enrolled = s.enrolledStudentsCount ?? 0;
                      const fullyMarked = enrolled > 0 && marked >= enrolled;
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
                          <td className="py-3 px-3">{markedBar(marked, enrolled)}</td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(
                                  fullyMarked
                                    ? `${ROUTES.FACULTY.ATTENDANCE_MARK}?sessionId=${encodeURIComponent(s.id)}&mode=view`
                                    : `${ROUTES.FACULTY.ATTENDANCE_MARK}?sessionId=${encodeURIComponent(s.id)}`
                                )
                              }
                            >
                              {fullyMarked ? "View" : "Mark"}
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
                <h3 className="text-xl font-bold mt-0.5">
                  {Math.round(summary.overallPercentage)}%
                </h3>
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

          <PageSection title={`Students (${studentRows.length})`}>
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading students…
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle className="w-8 h-8 text-rose-500" />
                <p className="text-sm text-slate-600">Failed to load attendance history.</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : studentRows.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">
                No students in your teaching batches for this filter.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <th className="py-3 px-3">Student</th>
                        <th className="py-3 px-3">Code</th>
                        <th className="py-3 px-3">Batches</th>
                        <th className="py-3 px-3">Attendance</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedStudents.map((s) => (
                        <tr
                          key={s.studentId}
                          className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer"
                          onClick={() => openStudentDetail(s.studentId)}
                        >
                          <td className="py-3 px-3 font-semibold">{s.studentName}</td>
                          <td className="py-3 px-3 font-mono text-xs">{s.studentCode}</td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {(s.batchCodes || []).length > 0 ? (
                                (s.batchCodes || []).map((code) => (
                                  <Badge key={code} variant="outline" className="text-[10px]">
                                    {code}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {s.total > 0 ? (
                              <div className="leading-snug">
                                <span className="font-semibold">
                                  {Math.round(s.attendancePercentage)}%
                                </span>
                                <span className="text-xs text-muted-foreground block">
                                  {s.present} Present / {s.total} Classes
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No classes yet</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openStudentDetail(s.studentId)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {studentTotalPages > 1 ? (
                  <div className="flex items-center justify-between mt-4 text-sm">
                    <span className="text-slate-500">
                      Page {studentPage} of {studentTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={studentPage <= 1}
                        onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={studentPage >= studentTotalPages}
                        onClick={() => setStudentPage((p) => p + 1)}
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
                ? ` · ${Math.round(selectedSummary.attendancePercentage)}% — ${selectedSummary.present} Present / ${selectedSummary.total} Classes`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {studentRecords.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                No attendance marks for this student in the selected month.
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
                      {r.startTime ? ` · ${r.startTime}` : ""}
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
