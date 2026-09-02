import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserCheck } from "lucide-react";
import { batchesApi } from "@/services/batches.api";
import { useFacultyAllocation } from "@/hooks/useFacultyAllocation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  batchId: string;
}

export const BatchAssignedFaculty: React.FC<Props> = ({ batchId }) => {
  const queryClient = useQueryClient();
  const { facultyList, loadingFaculty, assignFacultyToBatch, invalidateAllocation } =
    useFacultyAllocation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetFacultyId, setTargetFacultyId] = useState("");
  const [actionError, setActionError] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["batches", batchId],
    queryFn: () => batchesApi.getById(batchId),
    enabled: !!batchId,
  });

  const batch = data?.data;
  const faculty = batch?.faculty;

  const assignMutation = useMutation({
    mutationFn: (facultyId: string) => assignFacultyToBatch(batchId, facultyId),
    onSuccess: async () => {
      await Promise.all([
        invalidateAllocation(),
        queryClient.invalidateQueries({ queryKey: ["batches", batchId] }),
      ]);
      setDialogOpen(false);
      setActionError("");
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setActionError(message || "Failed to assign faculty");
    },
  });

  const openAssignDialog = () => {
    setTargetFacultyId(faculty?.id || facultyList[0]?.id || "");
    setActionError("");
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Assigned Faculty
          </h3>
          <p className="text-sm text-text-secondary">
            Faculty is usually set when creating the batch. You can reassign here if needed.
          </p>
        </div>
        <Button onClick={openAssignDialog} disabled={loadingFaculty}>
          {faculty?.user?.name ? "Reassign Faculty" : "Assign Faculty"}
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin inline text-[#1769AA]" />
            </div>
          ) : isError ? (
            <p className="text-sm text-red-600 text-center py-4">Failed to load faculty assignment.</p>
          ) : faculty?.user?.name ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-text-secondary">Faculty Name</dt>
                <dd className="font-semibold text-text-primary mt-1">{faculty.user.name}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Employee Code</dt>
                <dd className="font-medium mt-1">{faculty.employeeCode ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Email</dt>
                <dd className="font-medium mt-1">{faculty.user.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Phone</dt>
                <dd className="font-medium mt-1">{faculty.user.phone ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-text-secondary text-center py-4">
              No faculty assigned yet. Assign an instructor from here or when creating the batch.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{faculty?.user?.name ? "Reassign Faculty" : "Assign Faculty"}</DialogTitle>
            <DialogDescription>
              Select the faculty member responsible for this batch.
            </DialogDescription>
          </DialogHeader>
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          <select
            value={targetFacultyId}
            onChange={(e) => setTargetFacultyId(e.target.value)}
            className="w-full h-10 px-3 border rounded-md text-sm"
          >
            <option value="">Select faculty</option>
            {facultyList.map((f) => (
              <option key={f.id} value={f.id}>
                {f.user?.name || "Unnamed"} ({f.employeeCode || "—"})
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!targetFacultyId || assignMutation.isPending}
              onClick={() => assignMutation.mutate(targetFacultyId)}
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save Assignment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
