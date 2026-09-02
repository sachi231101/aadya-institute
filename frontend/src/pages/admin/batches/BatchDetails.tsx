import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { batchesApi } from "@/services/batches.api";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BatchEnrolledStudents } from "./BatchEnrolledStudents";
import { BatchAssignedFaculty } from "./BatchAssignedFaculty";
import { BatchSubjectsFacultyTable } from "@/components/batches/BatchSubjectFacultyDisplay";
import { formatBatchSubjectNames, formatBatchInstructorsSummary, getBatchCourseRows } from "@/utils/batch.utils";

type Tab = "info" | "subjects" | "students" | "faculty";

export const BatchDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("info");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["batches", id],
    queryFn: () => batchesApi.getById(id!),
    enabled: !!id,
  });

  const batch = data?.data;
  const subjectCount = getBatchCourseRows(batch ?? { courseId: "" }).length;

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
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-6">
            <BatchSubjectsFacultyTable batchCourses={batch.batchCourses} batch={batch} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2 border-t border-border/60">
              <div><span className="text-text-secondary block">Branch</span>{batch.branch?.name || "—"}</div>
              <div><span className="text-text-secondary block">Batch Coordinator</span>{batch.faculty?.user?.name || "Unassigned"}</div>
              <div><span className="text-text-secondary block">Start Date</span>{new Date(batch.startDate).toLocaleDateString("en-IN")}</div>
              <div><span className="text-text-secondary block">Capacity</span>{batch.capacity || "—"}</div>
              <div><span className="text-text-secondary block">Schedule</span>{batch.schedulePattern} {batch.timeSlot && `· ${batch.timeSlot}`}</div>
              <div><span className="text-text-secondary block">Enrolled Students</span>{batch._count?.enrollments ?? batch.enrollments?.length ?? 0}</div>
            </div>
            <Link to={ROUTES.ADMIN.BATCHES.ALL}>
              <Button variant="outline" size="sm">Back to Batches</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {tab === "subjects" && (
        <BatchSubjectsFacultyTable batchCourses={batch.batchCourses} batch={batch} />
      )}

      {tab === "students" && id && <BatchEnrolledStudents batchId={id} />}
      {tab === "faculty" && id && <BatchAssignedFaculty batchId={id} />}
    </div>
  );
};
