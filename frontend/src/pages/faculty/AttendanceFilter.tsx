import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowRight, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/layout";
import { useClassSessions } from "@/hooks/useClassSessions";
import { useFacultyDashboard } from "@/hooks/useFaculty";
import { useAuthStore } from "@/store/auth.store";
import { getSessionSubjectLabel } from "@/utils/batch.utils";
import type { BackendClassSession } from "@/services/class-sessions.api";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const sessionLabel = (s: BackendClassSession) => {
  const course = getSessionSubjectLabel({ title: s.title, batch: s.batch });
  const batch = s.batch?.code || s.batch?.name || "Batch";
  const time = `${s.startTime || "—"} – ${s.endTime || "—"}`;
  const room = s.roomNo || "Room —";
  const module = s.batchModule?.courseModule?.name || "Module —";
  return `${course} | ${batch} | ${time} | ${room} | ${module}`;
};

export const FacultyAttendanceFilter: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: dashboardRes } = useFacultyDashboard();
  const facultyId = user?.facultyId || dashboardRes?.data?.profile?.id;
  const facultyName =
    user?.name || dashboardRes?.data?.profile?.name || "Faculty";

  const [attendanceDate, setAttendanceDate] = useState(todayKey());
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [scheduleSearch, setScheduleSearch] = useState("");

  const { data, isLoading, isError, refetch } = useClassSessions({
    startDate: attendanceDate,
    endDate: attendanceDate,
    limit: 100,
    ...(facultyId ? { facultyId } : {}),
  });

  const sessions = useMemo(() => {
    const rows = (data?.data ?? []) as BackendClassSession[];
    const q = scheduleSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) => sessionLabel(s).toLowerCase().includes(q));
  }, [data?.data, scheduleSearch]);

  const canContinue = Boolean(attendanceDate && selectedSessionId);

  return (
    <PageContainer>
      <PageHeader
        title="Student Attendance"
        description="Select date and class session, then mark attendance."
        actions={
          <Button variant="outline" onClick={() => navigate("/faculty/attendance/history")}>
            Cancel
          </Button>
        }
      />

      <div className="max-w-2xl mx-auto">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-slate-900">Student Filter</h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Attendance Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => {
                  setAttendanceDate(e.target.value);
                  setSelectedSessionId("");
                }}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Lecturer / Instructor <span className="text-rose-500">*</span>
              </label>
              <Input value={facultyName} readOnly className="h-10 bg-slate-50" />
              <p className="text-[11px] text-slate-400">
                Locked to your teaching desk.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Batch Schedule <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Search course, batch, time…"
                value={scheduleSearch}
                onChange={(e) => setScheduleSearch(e.target.value)}
                className="h-9 mb-2"
                disabled={isLoading || isError}
              />
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center border rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading schedules…
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center gap-2 py-6 border rounded-lg">
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                  <p className="text-sm text-slate-600">Failed to load sessions.</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              ) : sessions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No class scheduled for this date
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Pick another date, or ask admin to schedule a class session first.
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y">
                  {sessions.map((s) => {
                    const selected = selectedSessionId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSessionId(s.id)}
                        className={`w-full text-left px-3 py-2.5 text-xs transition-colors ${
                          selected
                            ? "bg-blue-50 text-primary font-semibold"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        {sessionLabel(s)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate("/faculty/attendance/history")}
              >
                Cancel
              </Button>
              <Button
                disabled={!canContinue}
                onClick={() =>
                  navigate(
                    `/faculty/attendance/mark?sessionId=${encodeURIComponent(selectedSessionId)}`
                  )
                }
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
