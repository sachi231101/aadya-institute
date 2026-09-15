import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Loader2,
  AlertCircle,
  Plus,
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

  const sessions = useMemo(
    () =>
      (data?.data ?? []) as Array<
        BackendClassSession & {
          attendanceMarkedCount?: number;
          attendanceDonePercentage?: number;
        }
      >,
    [data?.data]
  );

  const pendingCount = sessions.filter(
    (s) => (s.attendanceDonePercentage ?? 0) < 100
  ).length;

  return (
    <PageContainer>
      <PageHeader
        title="Take Attendance"
        description="Mark student attendance for your scheduled classes."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/faculty/attendance/history")}
            >
              <History className="w-4 h-4 mr-1.5" />
              History
            </Button>
            <Button onClick={() => navigate("/faculty/attendance/new")}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add New Attendance
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
          <div className="text-center py-12 space-y-3">
            <ClipboardCheck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm text-slate-500">No classes scheduled for today.</p>
            <Button onClick={() => navigate("/faculty/attendance/new")}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add New Attendance
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
              const pct = session.attendanceDonePercentage ?? 0;
              const enrolled = session.enrolledStudentsCount ?? 0;
              return (
                <Card key={session.id} className="border border-slate-200">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{course}</h3>
                        <Badge variant="secondary">{session.sessionStatus || "UPCOMING"}</Badge>
                        {pct >= 100 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            Done
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            {pct}% marked
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Batch {batch} · {session.startTime} – {session.endTime}
                        {session.roomNo ? ` · ${session.roomNo}` : ""}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {enrolled} students ·{" "}
                        {session.attendanceMarkedCount ?? 0} marked
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        navigate(
                          `/faculty/attendance/mark?sessionId=${encodeURIComponent(session.id)}`
                        )
                      }
                    >
                      Mark Attendance
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
