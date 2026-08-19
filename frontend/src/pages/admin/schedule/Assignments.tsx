import React from "react";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAssignments } from "@/hooks/useAssignments";

export const AdminAssignments: React.FC = () => {
  const { data: assignmentsResponse, isLoading } = useAssignments({});
  const assignments = assignmentsResponse?.data || [];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileText className="h-6 w-6 text-[#1769AA]" />
          All Assignments
        </h1>
        <p className="text-sm text-text-secondary mt-1">View all assignments across batches and faculty</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="font-semibold">Session</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="font-semibold">Submissions</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-text-secondary">Loading...</TableCell></TableRow>
              ) : assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-text-secondary font-medium">No assignments found</p>
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((a: any) => (
                  <TableRow key={a.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-medium text-sm">{a.title}</TableCell>
                    <TableCell className="text-sm">{a.classSession?.title || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {a.dueDate ? new Date(a.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{a._count?.submissions || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs border ${a.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {a.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
