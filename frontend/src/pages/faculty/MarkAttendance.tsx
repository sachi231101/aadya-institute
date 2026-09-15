import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  X,
  Clock,
  Users,
  Save,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { classSessionsApi } from "../../services/class-sessions.api";
import { getSessionSubjectLabel } from "@/utils/batch.utils";
import { PageContainer, PageHeader, MetricGrid, PageSection } from "@/components/layout";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE";

interface StudentRecord {
  id: string;
  studentCode: string;
  name: string;
  avatar: string;
  email: string;
  status: AttendanceStatus;
  remarks: string;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  attendancePercentage: number;
}

export const FacultyMarkAttendance: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "";
  const [saveError, setSaveError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: sessionRes, isLoading: sessionMetaLoading } = useQuery({
    queryKey: ["class-session", sessionId],
    queryFn: () => classSessionsApi.getById(sessionId),
    enabled: Boolean(sessionId),
  });

  const { data: sessionAttendanceRes, isLoading: sessionLoading } = useQuery({
    queryKey: ["class-session-attendance", sessionId],
    queryFn: () => classSessionsApi.getAttendance(sessionId),
    enabled: Boolean(sessionId),
  });

  const session = sessionRes?.data;
  const attendancePayload = sessionAttendanceRes?.data;
  const classMeta = attendancePayload?.classSession || session;
  const sessionLabel = classMeta
    ? getSessionSubjectLabel({ title: classMeta.title, batch: classMeta.batch })
    : "Class session";
  const batchLabel = classMeta?.batch?.code || classMeta?.batch?.name || "";
  const dateLabel = classMeta?.scheduledDate
    ? String(classMeta.scheduledDate).slice(0, 10)
    : "";
  const timeLabel =
    classMeta?.startTime && classMeta?.endTime
      ? `${classMeta.startTime} – ${classMeta.endTime}`
      : "";

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedPopupOpen, setIsSavedPopupOpen] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setStudents([]);
      setSaveError(
        "Open attendance from Add New or History with a valid session."
      );
      return;
    }

    const roster = attendancePayload?.students;
    if (Array.isArray(roster) && roster.length > 0) {
      setStudents(
        roster.map((s: any) => {
          const name = s.name || "Student";
          const rawStatus = String(s.status || "").toUpperCase();
          const status: AttendanceStatus =
            rawStatus === "ABSENT"
              ? "ABSENT"
              : rawStatus === "LEAVE"
                ? "LEAVE"
                : "PRESENT";
          return {
            id: s.studentId || s.id,
            studentCode:
              s.studentCode || `STU-${String(s.studentId || s.id).slice(0, 4)}`,
            name,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
            email: s.email || "",
            status,
            remarks: s.remarks || "",
            presentCount: Number(s.presentCount) || 0,
            absentCount: Number(s.absentCount) || 0,
            leaveCount: Number(s.leaveCount) || 0,
            attendancePercentage: Number(s.attendancePercentage) || 0,
          };
        })
      );
      setSaveError(null);
      return;
    }

    if (!sessionLoading) {
      setStudents([]);
    }
  }, [attendancePayload, sessionId, sessionLoading]);

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [students, search]);

  const stats = useMemo(() => {
    return {
      total: students.length,
      present: students.filter((s) => s.status === "PRESENT").length,
      absent: students.filter((s) => s.status === "ABSENT").length,
      leave: students.filter((s) => s.status === "LEAVE").length,
    };
  }, [students]);

  const handleStatusChange = (id: string, newStatus: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, status: newStatus } : student
      )
    );
  };

  const handleRemarkChange = (id: string, remark: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, remarks: remark } : student
      )
    );
  };

  const markAll = (status: AttendanceStatus) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const persistAttendance = async (): Promise<boolean> => {
    if (!sessionId) {
      setSaveError("A class session is required to save attendance.");
      return false;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await classSessionsApi.saveAttendance(
        sessionId,
        students.map((s) => ({
          studentId: s.id,
          status: s.status,
          remarks: s.remarks || undefined,
        }))
      );
      await queryClient.invalidateQueries({
        queryKey: ["class-session-attendance", sessionId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["faculty-my-student-attendance"],
      });
      await queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      return true;
    } catch (err: any) {
      setSaveError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save attendance"
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAttendance = async () => {
    const ok = await persistAttendance();
    if (ok) setIsSavedPopupOpen(true);
  };

  const ratioBar = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    const color =
      clamped >= 75
        ? "bg-emerald-500"
        : clamped >= 50
          ? "bg-amber-500"
          : "bg-rose-500";
    return (
      <div className="flex items-center gap-2 min-w-[100px]">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${clamped}%` }} />
        </div>
        <span className="text-[11px] font-semibold tabular-nums w-9 text-right">
          {clamped}%
        </span>
      </div>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Mark Attendance"
        description={
          sessionMetaLoading
            ? "Loading session…"
            : [sessionLabel, batchLabel, dateLabel, timeLabel]
                .filter(Boolean)
                .join(" · ") || "Mark Present / Absent / Leave for this class."
        }
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/faculty/attendance/history")}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            History
          </Button>
        }
      />

      <Card className="border border-slate-200 mb-4">
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Date</span>
            <span className="font-semibold text-slate-800">{dateLabel || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Time</span>
            <span className="font-semibold text-slate-800">{timeLabel || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Batch</span>
            <span className="font-semibold text-slate-800">{batchLabel || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Course</span>
            <span className="font-semibold text-slate-800">{sessionLabel}</span>
          </div>
        </CardContent>
      </Card>

      <MetricGrid density="compact">
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total
            </p>
            <h3 className="text-xl font-bold mt-0.5">{stats.total}</h3>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Present
            </p>
            <h3 className="text-xl font-bold text-emerald-600 mt-0.5">
              {stats.present}
            </h3>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Absent
            </p>
            <h3 className="text-xl font-bold text-rose-600 mt-0.5">{stats.absent}</h3>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Leave
            </p>
            <h3 className="text-xl font-bold text-amber-600 mt-0.5">{stats.leave}</h3>
          </CardContent>
        </Card>
      </MetricGrid>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Input
          className="max-w-xs h-9"
          placeholder="Search student…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => markAll("PRESENT")}>
          Mark all Present
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => markAll("ABSENT")}>
          Mark all Absent
        </Button>
      </div>

      <PageSection title="Student roster">
        <Card className="border-border/50 rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[980px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 w-10">#</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-3 text-center">P</th>
                    <th className="py-3 px-3 text-center">A</th>
                    <th className="py-3 px-3 text-center">L</th>
                    <th className="py-3 px-4">Past %</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {sessionLoading ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary mb-2" />
                        <p className="text-sm font-medium">Loading roster…</p>
                      </td>
                    </tr>
                  ) : visibleStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-sm font-semibold text-foreground">
                          No students enrolled in this batch yet
                        </p>
                      </td>
                    </tr>
                  ) : (
                    visibleStudents.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 px-3 font-medium text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 rounded-full border border-border">
                              <AvatarImage src={student.avatar} alt={student.name} />
                              <AvatarFallback className="bg-muted text-foreground font-semibold text-xs">
                                {student.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-foreground text-xs">
                                {student.name}
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground">
                                {student.studentCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-emerald-700">
                          {student.presentCount}
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-rose-700">
                          {student.absentCount}
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-amber-700">
                          {student.leaveCount}
                        </td>
                        <td className="py-3.5 px-4">
                          {ratioBar(student.attendancePercentage)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, "PRESENT")}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                student.status === "PRESENT"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                  : "text-muted-foreground hover:bg-muted border border-transparent"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, "ABSENT")}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                student.status === "ABSENT"
                                  ? "bg-rose-50 text-rose-700 border border-rose-300"
                                  : "text-muted-foreground hover:bg-muted border border-transparent"
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, "LEAVE")}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                student.status === "LEAVE"
                                  ? "bg-amber-50 text-amber-700 border border-amber-300"
                                  : "text-muted-foreground hover:bg-muted border border-transparent"
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Leave
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 min-w-[160px]">
                          <Input
                            type="text"
                            value={student.remarks}
                            onChange={(e) =>
                              handleRemarkChange(student.id, e.target.value)
                            }
                            placeholder="Optional note…"
                            className="h-8 text-xs rounded-lg"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <div className="sticky bottom-4 z-20 p-4 bg-card/95 backdrop-blur-sm border border-border rounded-xl flex flex-col gap-3 shadow-md">
        {saveError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {saveError}
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-sm font-semibold text-foreground block">
              {students.length} students in roster
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              Saves Present / Absent / Leave for this class session.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/faculty/attendance/new")}
            >
              Back
            </Button>
            <Button
              onClick={handleSaveAttendance}
              disabled={isSaving || !sessionId || students.length === 0}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isSavedPopupOpen} onOpenChange={setIsSavedPopupOpen}>
        <DialogContent className="sm:max-w-md rounded-xl p-6 border-border">
          <DialogHeader className="text-center sm:text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-lg font-semibold text-foreground">
                Attendance saved
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Records saved for{" "}
                <span className="text-foreground font-semibold">
                  {sessionLabel}
                  {batchLabel ? ` (${batchLabel})` : ""}
                </span>
                .
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">
              {stats.present} Present
            </span>
            <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold">
              {stats.absent} Absent
            </span>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold">
              {stats.leave} Leave
            </span>
          </div>

          <Button
            onClick={() => {
              setIsSavedPopupOpen(false);
              navigate("/faculty/attendance/history");
            }}
            className="w-full rounded-xl font-semibold"
          >
            View Attendance History
          </Button>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
