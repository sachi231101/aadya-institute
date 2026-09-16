import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Loader2,
  AlertCircle,
  History,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PageContainer,
  PageHeader,
  PageSection,
  MetricGrid,
} from "@/components/layout";
import { useClassSessions } from "@/hooks/useClassSessions";
import { useAuthStore } from "@/store/auth.store";
import { useFacultyDashboard } from "@/hooks/useFaculty";
import { getSessionSubjectLabel } from "@/utils/batch.utils";
import type { BackendClassSession } from "@/services/class-sessions.api";
import { ROUTES } from "@/constants/routes";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const FacultyTakeAttendance: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: dashboardRes } = useFacultyDashboard();
  const facultyId = user?.facultyId || dashboardRes?.data?.profile?.id;
  const today = todayKey();

  const { data, isLoading, isError, refetch } = useClassSessions({
    startDate: today,
    endDate: today,
    limit: 50,
    ...(facultyId ? { facultyId } : {}),
  });

  const sessions = useMemo(() => {
    const rows = (data?.data ?? []) as Array<
      BackendClassSession & {
        attendanceMarkedCount?: number;
        attendanceDonePercentage?: number;
      }
    >;
    return rows.filter(
      (s) => String(s.sessionStatus || "").toUpperCase() !== "CANCELLED"
    );
  }, [data?.data]);

  const pendingCount = sessions.filter((s) => {
    const enrolled = s.enrolledStudentsCount ?? 0;
    const marked = s.attendanceMarkedCount ?? 0;
    return enrolled === 0 || marked < enrolled;
  }).length;

  return (
    <PageContainer>
      <PageHeader
        title="Take Attendance"
        description="Mark Present / Absent / Leave for today’s scheduled classes."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(ROUTES.FACULTY.STUDENTS)}
            >
              <Users className="w-4 h-4 mr-1.5" />
              My Students
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(ROUTES.FACULTY.ATTENDANCE_HISTORY)}
            >
              <History className="w-4 h-4 mr-1.5" />
              History
            </Button>
          </div>
        }
      />

      <MetricGrid density="compact">
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Today&apos;s sessions
            </p>
            <h3 className="text-xl font-bold mt-0.5">{sessions.length}</h3>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Pending mark
            </p>
            <h3 className="text-xl font-bold mt-0.5">{pendingCount}</h3>
          </CardContent>
        </Card>
      </MetricGrid>

      <PageSection title="Today's classes">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading sessions…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p className="text-sm text-slate-600">Failed to load today&apos;s sessions.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <ClipboardCheck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm text-slate-600 font-medium">No classes scheduled for today.</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Attendance is only available for scheduled class sessions. Check My Schedule, or mark
              pending past sessions from Attendance History.
            </p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => navigate(ROUTES.FACULTY.ATTENDANCE_HISTORY)}
            >
              <History className="w-4 h-4 mr-1.5" />
              Open Attendance History
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((session) => {
              const course = getSessionSubjectLabel({
                title: session.title,
                batch: session.batch,
              });
              const batch = session.batch?.code || session.batch?.name || "—";
              const enrolled = session.enrolledStudentsCount ?? 0;
              const marked = session.attendanceMarkedCount ?? 0;
              const done = enrolled > 0 && marked >= enrolled;
              return (
                <Card key={session.id} className="border border-slate-200">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{course}</h3>
                        <Badge variant="secondary">{session.sessionStatus || "UPCOMING"}</Badge>
                        {done ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            Done
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Batch {batch} · {session.startTime} – {session.endTime}
                        {session.roomNo ? ` · ${session.roomNo}` : ""}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Marked {marked}/{enrolled || "—"}
                      </p>
                    </div>
                    <Button
                      variant={done ? "outline" : "default"}
                      onClick={() =>
                        navigate(
                          done
                            ? `${ROUTES.FACULTY.ATTENDANCE_MARK}?sessionId=${encodeURIComponent(session.id)}&mode=view`
                            : `${ROUTES.FACULTY.ATTENDANCE_MARK}?sessionId=${encodeURIComponent(session.id)}`
                        )
                      }
                    >
                      {done ? "View" : "Mark Attendance"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageSection>
    </PageContainer>
  );
};
