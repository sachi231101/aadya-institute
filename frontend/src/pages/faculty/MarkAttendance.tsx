import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  X,
  Clock,
  Users,
  Video,
  ArrowRight,
  Save,
  Loader2,
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
import { useQuery } from "@tanstack/react-query";
import { classSessionsApi } from "../../services/class-sessions.api";
import { getSessionSubjectLabel } from "@/utils/batch.utils";
import { PageContainer, PageHeader, MetricGrid, PageSection } from "@/components/layout";

type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";

interface StudentRecord {
  id: string;
  studentId: string;
  name: string;
  avatar: string;
  email: string;
  status: AttendanceStatus;
  remarks: string;
}

export const FacultyMarkAttendance: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "";
  const [saveError, setSaveError] = useState<string | null>(null);

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
  const sessionLabel = session
    ? getSessionSubjectLabel({ title: session.title, batch: session.batch })
    : "Class session";
  const batchLabel = session?.batch?.code || session?.batch?.name || "";

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedPopupOpen, setIsSavedPopupOpen] = useState(false);

  React.useEffect(() => {
    if (!sessionId) {
      setStudents([]);
      setSaveError(
        "Open attendance from My Classes with a valid sessionId. Saving without a session is disabled."
      );
      return;
    }

    const roster = sessionAttendanceRes?.data?.students;
    if (Array.isArray(roster) && roster.length > 0) {
      setStudents(
        roster.map((s: any) => {
          const name = s.name || "Student";
          const rawStatus = s.status as string | null;
          const status: AttendanceStatus =
            rawStatus === "ABSENT"
              ? "ABSENT"
              : rawStatus === "LEAVE"
                ? "EXCUSED"
                : "PRESENT";
          return {
            id: s.studentId || s.id,
            studentId:
              s.studentCode || `STU-${String(s.studentId || s.id).slice(0, 4)}`,
            name,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
            email: s.email || "",
            status,
            remarks: s.remarks || "",
          };
        })
      );
      setSaveError(null);
      return;
    }

    if (!sessionLoading) {
      setStudents([]);
    }
  }, [sessionAttendanceRes, sessionId, sessionLoading]);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const presentCount = students.filter((s) => s.status === "PRESENT").length;
    const absentCount = students.filter((s) => s.status === "ABSENT").length;
    const excusedCount = students.filter((s) => s.status === "EXCUSED").length;

    return {
      total: totalStudents,
      present: presentCount,
      absent: absentCount,
      excused: excusedCount,
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

  const persistAttendance = async (): Promise<boolean> => {
    if (!sessionId) {
      setSaveError(
        "Open attendance from a class session (sessionId required). Go to My Classes and open a session."
      );
      return false;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await classSessionsApi.saveAttendance(
        sessionId,
        students.map((s) => ({
          studentId: s.id,
          status: s.status === "EXCUSED" ? "LEAVE" : s.status,
          remarks: s.remarks || undefined,
        }))
      );
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

  const goLive = () => {
    if (!sessionId) {
      setSaveError("Open attendance from My Classes with a valid sessionId first.");
      return;
    }
    navigate(`/faculty/class-session?id=${encodeURIComponent(sessionId)}&mode=live`, {
      state: { live: true },
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Mark Attendance"
        description={
          sessionMetaLoading
            ? "Loading session…"
            : session
              ? [sessionLabel, batchLabel, session.startTime && session.endTime
                  ? `${session.startTime} – ${session.endTime}`
                  : null]
                  .filter(Boolean)
                  .join(" · ")
              : sessionId
                ? "Take attendance for this class session."
                : "Open from My Classes with a session to mark attendance."
        }
      />

      <MetricGrid density="compact">
        <Card size="compact" className="border border-border/80 bg-card rounded-xl shadow-2xs">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5">{stats.total}</h3>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 bg-card rounded-xl shadow-2xs">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Present</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-0.5">{stats.present}</h3>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 bg-card rounded-xl shadow-2xs">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Absent</p>
            <h3 className="text-xl font-bold text-rose-600 mt-0.5">{stats.absent}</h3>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 bg-card rounded-xl shadow-2xs">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Leave</p>
            <h3 className="text-xl font-bold text-amber-600 mt-0.5">{stats.excused}</h3>
          </CardContent>
        </Card>
      </MetricGrid>

      <PageSection title="Roster">
      <Card className="border-border/50 rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-10">#</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {sessionLoading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary mb-2" />
                      <p className="text-sm font-medium">Loading roster…</p>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-semibold text-foreground">
                        No students enrolled in this batch yet
                      </p>
                      <p className="text-xs mt-0.5">
                        Admitted students assigned to this batch will appear here
                        automatically.
                      </p>
                    </td>
                  </tr>
                ) : (
                  students.map((student, idx) => (
                    <tr
                      key={student.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-3.5 px-3 font-medium text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-muted-foreground">
                        {student.studentId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8 rounded-full border border-border">
                            <AvatarImage src={student.avatar} alt={student.name} />
                            <AvatarFallback className="bg-muted text-foreground font-semibold text-xs">
                              {student.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-foreground text-xs">
                            {student.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-muted-foreground">
                        {student.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(student.id, "PRESENT")
                            }
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              student.status === "PRESENT"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(student.id, "ABSENT")
                            }
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              student.status === "ABSENT"
                                ? "bg-rose-50 text-rose-700 border border-rose-300"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(student.id, "EXCUSED")
                            }
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              student.status === "EXCUSED"
                                ? "bg-amber-50 text-amber-700 border border-amber-300"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Leave</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <Input
                          type="text"
                          value={student.remarks}
                          onChange={(e) =>
                            handleRemarkChange(student.id, e.target.value)
                          }
                          placeholder="Add remarks (optional)..."
                          className="h-8 text-xs rounded-lg"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-muted/40 border-t border-border flex items-center justify-between gap-2 text-xs text-muted-foreground font-medium">
            <span>
              Showing {students.length} student
              {students.length === 1 ? "" : "s"}
            </span>
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
            <span className="text-sm font-semibold text-foreground block leading-tight">
              {students.length} Students in Session Roster
            </span>
            <span className="text-xs text-muted-foreground font-medium mt-0.5 block">
              {sessionId
                ? "Attendance saves to the selected class session."
                : "Open this page from My Classes with a sessionId."}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSaveAttendance}
              disabled={isSaving || !sessionId || students.length === 0}
              className="text-xs font-semibold h-9 px-5 rounded-xl gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Attendance"}</span>
            </Button>

            <Button
              onClick={async () => {
                if (students.length > 0 && sessionId) {
                  const ok = await persistAttendance();
                  if (!ok) return;
                }
                goLive();
              }}
              disabled={!sessionId || isSaving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 px-6 rounded-xl gap-2"
            >
              <Video className="h-4 w-4" />
              <span>Save & Go Live</span>
              <ArrowRight className="h-4 w-4" />
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
              {stats.excused} Leave
            </span>
          </div>

          <Button
            onClick={() => {
              setIsSavedPopupOpen(false);
              goLive();
            }}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold gap-2"
          >
            <Video className="w-4 h-4" />
            Go Online & Take Class
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
