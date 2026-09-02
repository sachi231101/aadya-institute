import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ExternalLink, UserCheck } from "lucide-react";
import { batchesApi } from "@/services/batches.api";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  batchId: string;
}

export const BatchAssignedFaculty: React.FC<Props> = ({ batchId }) => {
  const location = useLocation();
  const isCenterPortal = location.pathname.startsWith("/center");

  const allocationPath = isCenterPortal
    ? `/center/faculty/faculty-allocation?batchId=${batchId}`
    : `${ROUTES.ADMIN.FACULTY.FACULTY_ALLOCATION}?batchId=${batchId}`;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["batches", batchId],
    queryFn: () => batchesApi.getById(batchId),
    enabled: !!batchId,
  });

  const batch = data?.data;
  const faculty = batch?.faculty;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Assigned Faculty
          </h3>
          <p className="text-sm text-text-secondary">
            Faculty member responsible for delivering this batch.
          </p>
        </div>
        <Button asChild>
          <Link to={allocationPath}>
            Manage in Assign Faculty to Batches
            <ExternalLink className="w-4 h-4 ml-2" />
          </Link>
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
              No faculty assigned yet. Use Assign Faculty to Batches to assign an instructor to this batch.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
