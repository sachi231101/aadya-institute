import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle, Sparkles, Calendar } from "lucide-react";
import { batchesApi } from "@/services/batches.api";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BatchEnrolledStudents } from "./BatchEnrolledStudents";
import { BatchAssignedFaculty } from "./BatchAssignedFaculty";
import { BatchSubjectsFacultyTable } from "@/components/batches/BatchSubjectFacultyDisplay";
import { formatBatchSubjectNames, formatBatchInstructorsSummary, getBatchCourseRows } from "@/utils/batch.utils";

type Tab = "info" | "subjects" | "students" | "faculty";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const BatchDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("info");
  const queryClient = useQueryClient();

  const [generateStartDate, setGenerateStartDate] = useState("");
  const [generateEndDate, setGenerateEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["batches", id],
    queryFn: () => batchesApi.getById(id!),
    enabled: !!id,
  });

  const batch = data?.data;
  const subjectCount = getBatchCourseRows(batch ?? { courseId: "" }).length;

  const canGenerate =
    !!batch?.facultyId && Array.isArray(batch.schedules) && batch.schedules.length > 0;

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1769AA]" />
      </div>
    );
  }

  if (isError || !batch) {
    return (
      <div className="text-center py-20 text-red-600">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        Failed to load batch details.
        <Button variant="link" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Overview" },
    { key: "subjects", label: `Subjects (${subjectCount})` },
    { key: "students", label: "Students" },
    { key: "faculty", label: "Faculty" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">{batch.name}</h2>
          <p className="text-sm text-text-secondary mt-1">
            {batch.code} · {formatBatchSubjectNames(batch)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Instructors: {formatBatchInstructorsSummary(batch)}
          </p>
        </div>
        <Badge variant="outline">{batch.status}</Badge>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key ? "border-[#1769AA] text-[#1769AA]" : "border-transparent text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-text-secondary block">Course</span>{batch.course?.name}</div>
              <div><span className="text-text-secondary block">Branch</span>{batch.branch?.name || "—"}</div>
              <div><span className="text-text-secondary block">Start Date</span>{new Date(batch.startDate).toLocaleDateString("en-IN")}</div>
              <div>
                <span className="text-text-secondary block">Expected End Date</span>
                {batch.expectedEndDate
                  ? new Date(batch.expectedEndDate).toLocaleDateString("en-IN")
                  : "—"}
              </div>
              <div><span className="text-text-secondary block">Capacity</span>{batch.capacity || "—"}</div>
              <div><span className="text-text-secondary block">Schedule</span>{batch.schedulePattern} {batch.timeSlot && `· ${batch.timeSlot}`}</div>
              <div><span className="text-text-secondary block">Faculty</span>{batch.faculty?.user?.name || "Unassigned"}</div>
              <div><span className="text-text-secondary block">Enrolled Students</span>{batch._count?.enrollments ?? batch.enrollments?.length ?? 0}</div>
              <div>
                <Link to={ROUTES.ADMIN.BATCHES.ALL}>
                  <Button variant="outline" size="sm">Back to Batches</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#1769AA]" />
                <h3 className="font-semibold text-text-primary">Weekly Schedule Slots</h3>
              </div>
              {batch.schedules && batch.schedules.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {batch.schedules.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-text-secondary">
                      <Badge variant="outline" className="text-xs">{DAY_NAMES[s.dayOfWeek]}</Badge>
                      <span>{s.startTime} – {s.endTime}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-secondary">No weekly schedule slots defined.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#1769AA]" />
                <h3 className="font-semibold text-text-primary">Generate Class Sessions</h3>
              </div>
              <p className="text-xs text-text-secondary">
                Materialize class sessions from the weekly schedule for the timetable and portal views.
              </p>

              {!canGenerate && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs">
                  {!batch.facultyId
                    ? "Assign faculty to this batch before generating sessions."
                    : "No weekly schedule slots found for this batch."}
                </div>
              )}

              {generateError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                  {generateError}
                </div>
              )}

              {generateSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs">
                  {generateSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">From Date</label>
                  <Input
                    type="date"
                    value={generateStartDate}
                    onChange={(e) => setGenerateStartDate(e.target.value)}
                    placeholder={new Date(batch.startDate).toISOString().split("T")[0]}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">To Date</label>
                  <Input
                    type="date"
                    value={generateEndDate}
                    onChange={(e) => setGenerateEndDate(e.target.value)}
                    placeholder={defaultEndDate()}
                    className="text-xs"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateSessions}
                disabled={!canGenerate || isGenerating}
                className="bg-[#1769AA] hover:bg-[#1769AA]/90 text-white text-xs"
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
        </div>
      )}

      {tab === "subjects" && (
        <BatchSubjectsFacultyTable batchCourses={batch.batchCourses} batch={batch} />
      )}

      {tab === "students" && id && <BatchEnrolledStudents batchId={id} />}
      {tab === "faculty" && id && <BatchAssignedFaculty batchId={id} />}
    </div>
  );
};
