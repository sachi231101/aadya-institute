import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, UserCheck } from "lucide-react";
import { batchesApi } from "@/services/batches.api";
import { Card, CardContent } from "@/components/ui/card";
import { BatchSubjectsFacultyTable } from "@/components/batches/BatchSubjectFacultyDisplay";
import { getBatchCourseRows } from "@/utils/batch.utils";

interface Props {
  batchId: string;
}

export const BatchAssignedFaculty: React.FC<Props> = ({ batchId }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["batches", batchId],
    queryFn: () => batchesApi.getById(batchId),
    enabled: !!batchId,
  });

  const batch = data?.data;
  const subjectRows = batch ? getBatchCourseRows(batch) : [];
  const coordinator = batch?.faculty;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <UserCheck className="w-5 h-5" />
          Faculty Assignments
        </h3>
        <p className="text-sm text-text-secondary">
          Each subject has its own instructor. Per-subject faculty is set when creating or editing the batch.
        </p>
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin inline text-[#1769AA]" />
        </div>
      ) : isError || !batch ? (
        <p className="text-sm text-red-600 text-center py-4">Failed to load faculty assignments.</p>
      ) : (
        <>
          <BatchSubjectsFacultyTable batchCourses={batch.batchCourses} batch={batch} />

          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                Batch Coordinator (optional)
              </p>
              {coordinator?.user?.name ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-text-secondary">Name</dt>
                    <dd className="font-semibold text-text-primary mt-0.5">{coordinator.user.name}</dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Employee Code</dt>
                    <dd className="font-medium mt-0.5">{coordinator.employeeCode ?? "—"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-text-secondary">No batch coordinator assigned.</p>
              )}
            </CardContent>
          </Card>

          {subjectRows.length > 1 && (
            <p className="text-xs text-muted-foreground">
              This batch has {subjectRows.length} subjects with{" "}
              {new Set(subjectRows.map((r) => r.faculty?.id).filter(Boolean)).size} assigned instructor(s).
              Edit the batch to change per-subject faculty.
            </p>
          )}
        </>
      )}
    </div>
  );
};
