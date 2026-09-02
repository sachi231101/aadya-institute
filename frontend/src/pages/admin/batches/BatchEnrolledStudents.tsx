import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ExternalLink, Users } from "lucide-react";
import { batchesApi } from "@/services/batches.api";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  batchId: string;
}

export const BatchEnrolledStudents: React.FC<Props> = ({ batchId }) => {
  const location = useLocation();
  const isCenterPortal = location.pathname.startsWith("/center");

  const allocationPath = isCenterPortal
    ? `/center/students/student-allocation?batchId=${batchId}`
    : `${ROUTES.ADMIN.STUDENTS.STUDENT_ALLOCATION}?batchId=${batchId}`;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["batches", batchId, "students"],
    queryFn: () => batchesApi.getStudents(batchId),
    enabled: !!batchId,
  });

  const enrollments = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Users className="w-5 h-5" />
            Enrolled Students
          </h3>
          <p className="text-sm text-text-secondary">
            {enrollments.length} student{enrollments.length !== 1 ? "s" : ""} currently enrolled in this batch.
          </p>
        </div>
        <Button asChild>
          <Link to={allocationPath}>
            Manage in Assign Students to Batches
            <ExternalLink className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin inline text-[#1769AA]" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-red-600">Failed to load enrolled students.</p>
          ) : enrollments.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">
              No students enrolled yet. Use Assign Students to Batches to assign students to this batch.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">
                      {enrollment.student?.studentCode ?? "—"}
                    </TableCell>
                    <TableCell>{enrollment.student?.user?.name ?? "—"}</TableCell>
                    <TableCell>{enrollment.student?.user?.email ?? "—"}</TableCell>
                    <TableCell>{enrollment.student?.user?.phone ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
