import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Search, Loader2, AlertCircle } from "lucide-react";
import { useAssignments } from "@/hooks/useAssignments";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Assignment } from "@/services/assignments.api";

export const AssignmentList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    }),
    [page, searchTerm, statusFilter]
  );

  const { data, isLoading, isError, refetch } = useAssignments(params);
  const assignments = (data?.data || []) as Assignment[];
  const meta = data?.meta || { totalPages: 1, page: 1 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Assignments</h2>
          <p className="text-sm text-text-secondary">Manage batch assignments and due dates.</p>
        </div>
        <Button className="bg-[#1769AA] text-white" onClick={() => navigate(ROUTES.ADMIN.ASSIGNMENTS.CREATE)}>
          <Plus className="mr-2 h-4 w-4" /> Create Assignment
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input placeholder="Search assignments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 border rounded-md text-sm">
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
                ) : isError ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.<Button variant="link" onClick={() => refetch()}>Retry</Button></TableCell></TableRow>
                ) : assignments.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-text-secondary"><FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />No assignments found.</TableCell></TableRow>
                ) : (
                  assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>{a.dueDate ? new Date(a.dueDate).toLocaleDateString("en-IN") : "—"}</TableCell>
                      <TableCell>{a._count?.submissions ?? a.submissions?.length ?? 0}</TableCell>
                      <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex justify-between text-sm">
              <span>Page {meta.page} of {meta.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
