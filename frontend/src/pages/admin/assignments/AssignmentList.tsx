import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Download,
  Paperclip,
  Calendar,
  RotateCcw,
  X,
} from "lucide-react";
import {
  useAssignments,
  useDeleteAssignment,
  useUpdateAssignment,
} from "@/hooks/useAssignments";
import { assignmentsApi, type Assignment } from "@/services/assignments.api";
import { MasterSelect } from "@/components/common/MasterSelect";
import { getPortalBasePath } from "@/utils/portal-path";
import {
  assignmentStatusLabel,
  formatAssignmentDueDate,
} from "@/utils/assignment.utils";
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

async function downloadAttachment(assignmentId: string, fileName?: string | null) {
  const token = localStorage.getItem("token");
  const url = assignmentsApi.getAttachmentDownloadUrl(assignmentId);
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName || "attachment";
  a.click();
  URL.revokeObjectURL(a.href);
}

function targetSummary(a: Assignment): string {
  const targets = a.targets || [];
  if (targets.length === 0) return a.batch?.name || "—";
  if (targets.length === 1) {
    const t = targets[0];
    return `${t.course?.name || "Course"} · ${t.batch?.name || "Batch"}`;
  }
  return `${targets.length} targets`;
}

function submissionProgress(a: Assignment): string {
  const all = a._count?.submissions ?? a.submissions?.length ?? 0;
  const submitted =
    a.submissions?.filter((s) => s.submittedAt || s.submissionStatus !== "PENDING").length ?? 0;
  return `${submitted}/${all}`;
}

export const AssignmentList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const assignmentsBase = `${basePath}/assignments`;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [academicYearMasterId, setAcademicYearMasterId] = useState("");
  const [assignmentTypeMasterId, setAssignmentTypeMasterId] = useState("");
  const [assignedFrom, setAssignedFrom] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const params = useMemo(
    () => ({
      page,
      limit,
      ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      ...(academicYearMasterId ? { academicYearMasterId } : {}),
      ...(assignmentTypeMasterId ? { assignmentTypeMasterId } : {}),
      ...(assignedFrom ? { assignedFrom: new Date(assignedFrom).toISOString() } : {}),
      ...(assignedTo ? { assignedTo: new Date(`${assignedTo}T23:59:59`).toISOString() } : {}),
    }),
    [
      page,
      limit,
      searchTerm,
      statusFilter,
      academicYearMasterId,
      assignmentTypeMasterId,
      assignedFrom,
      assignedTo,
    ]
  );

  const { data, isLoading, isError, refetch } = useAssignments(params);
  const deleteMutation = useDeleteAssignment();
  const updateMutation = useUpdateAssignment();

  const assignments = (data?.data || []) as Assignment[];
  const meta = data?.meta || { totalPages: 1, page: 1, total: 0 };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    assignedFrom ||
    assignedTo ||
    academicYearMasterId ||
    assignmentTypeMasterId ||
    statusFilter !== "ALL"
  );

  const resetFilters = () => {
    setSearchTerm("");
    setAssignedFrom("");
    setAssignedTo("");
    setAcademicYearMasterId("");
    setAssignmentTypeMasterId("");
    setStatusFilter("ALL");
    setPage(1);
  };

  const handleCloseToggle = async (a: Assignment) => {
    const next = a.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await updateMutation.mutateAsync({ id: a.id, data: { status: next } });
  };

  const handleDelete = async (a: Assignment) => {
    if (!window.confirm(`Delete assignment "${a.title}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(a.id);
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Assignments</h2>
          <p className="text-sm text-text-secondary">
            Create, target, and manage coursework across courses and batches.
          </p>
        </div>
        <Button className="bg-[#1769AA] hover:bg-[#125387] text-white shadow-sm" onClick={() => navigate(`${assignmentsBase}/create`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
              <Input
                placeholder="Search by assignment title..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 h-9 text-xs bg-background border-border/80 rounded-md"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(""); setPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Controls Group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Range: From - To */}
              <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-md px-2.5 h-9 text-xs shadow-2xs">
                <Calendar className="h-3.5 w-3.5 text-text-muted shrink-0" />
                <span className="text-text-muted text-[11px] font-medium">From:</span>
                <input
                  type="date"
                  value={assignedFrom}
                  onChange={(e) => {
                    setAssignedFrom(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs text-text-primary focus:outline-none cursor-pointer"
                  title="Assigned from date"
                />
                <span className="text-text-muted text-[11px] font-medium ml-1">To:</span>
                <input
                  type="date"
                  value={assignedTo}
                  onChange={(e) => {
                    setAssignedTo(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs text-text-primary focus:outline-none cursor-pointer"
                  title="Assigned to date"
                />
                {(assignedFrom || assignedTo) && (
                  <button
                    type="button"
                    onClick={() => { setAssignedFrom(""); setAssignedTo(""); setPage(1); }}
                    className="text-text-muted hover:text-text-primary ml-0.5 cursor-pointer p-0.5 rounded"
                    title="Clear dates"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Academic Year */}
              <div className="w-[130px]">
                <MasterSelect
                  entityType="academicyear"
                  value={academicYearMasterId}
                  onChange={(id) => {
                    setAcademicYearMasterId(id);
                    setPage(1);
                  }}
                  allowCreate={false}
                  placeholder="Academic Year"
                  className="!mt-0 !h-9 text-xs border-border/80"
                />
              </div>

              {/* Assignment Type */}
              <div className="w-[120px]">
                <MasterSelect
                  entityType="assignmenttype"
                  value={assignmentTypeMasterId}
                  onChange={(id) => {
                    setAssignmentTypeMasterId(id);
                    setPage(1);
                  }}
                  allowCreate={false}
                  placeholder="All Types"
                  className="!mt-0 !h-9 text-xs border-border/80"
                />
              </div>

              {/* Status Select */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-2.5 border border-border/80 rounded-md text-xs bg-background text-text-primary focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Closed</option>
              </select>

              {/* Per Page */}
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 px-2 border border-border/80 rounded-md text-xs bg-background text-text-muted focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                title="Rows per page"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>

              {/* Reset Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-9 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 cursor-pointer font-medium"
                  title="Reset all filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border shadow-xs bg-card w-full overflow-hidden">
            <Table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[9%]" />
                <col className="w-[19%]" />
                <col className="w-[9%]" />
                <col className="w-[14%]" />
                <col className="w-[9%]" />
                <col className="w-[15%]" />
                <col className="w-[4.5%]" />
                <col className="w-[6%]" />
                <col className="w-[6.5%]" />
                <col className="w-[8%]" />
              </colgroup>
              <TableHeader className="bg-muted/60">
                <TableRow className="border-b border-border bg-muted/60 hover:bg-muted/60">
                  <TableHead className="h-10 px-2 text-[11px] font-semibold text-text-primary border-r border-border uppercase tracking-wider text-center">Assigned</TableHead>
                  <TableHead className="h-10 px-2.5 text-[11px] font-semibold text-text-primary border-r border-border uppercase tracking-wider">Title</TableHead>
                  <TableHead className="h-10 px-2 text-[11px] font-semibold text-text-primary border-r border-border uppercase tracking-wider text-center">Academic Year</TableHead>
                  <TableHead className="h-10 px-2.5 text-[11px] font-semibold text-text-primary border-r border-border uppercase tracking-wider">Due</TableHead>
                  <TableHead className="h-10 px-2 text-[11px] font-semibold text-text-primary border-r border-border uppercase tracking-wider text-center">Type</TableHead>
                  <TableHead className="h-10 px-2.5 text-[11px] font-semibold text-text-primary border-r border-border uppercase tracking-wider">Targets</TableHead>
                  <TableHead className="h-10 px-1 text-[11px] font-semibold text-text-primary border-r border-border uppercase tracking-wider text-center">File</TableHead>
                  <TableHead className="h-10 px-1 text-[11px] font-semibold text-text-primary border-r border-border uppercase tracking-wider text-center">Progress</TableHead>
                  <TableHead className="h-10 px-1 text-[11px] font-semibold text-text-primary border-r border-border uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="h-10 px-1.5 text-[11px] font-semibold text-text-primary text-center uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 border-none">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-red-600 border-none">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      Failed to load.
                      <Button variant="link" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-text-secondary border-none">
                      <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="font-medium text-text-primary mb-1">No assignments yet</p>
                      <p className="text-sm mb-4">Create your first assignment for a batch or course.</p>
                      <Button
                        className="bg-[#1769AA] text-white"
                        onClick={() => navigate(`${assignmentsBase}/create`)}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Create Assignment
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((a) => (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer hover:bg-muted/40 border-b border-border transition-colors last:border-b-0"
                      onClick={() => navigate(`${assignmentsBase}/${a.id}`)}
                    >
                      <TableCell className="text-xs text-center border-r border-border px-2 py-2 truncate">
                        {a.assignedAt
                          ? new Date(a.assignedAt).toLocaleDateString("en-IN")
                          : "—"}
                      </TableCell>
                      <TableCell className="font-semibold text-text-primary truncate border-r border-border px-2.5 py-2 text-xs" title={a.title}>
                        {a.title}
                      </TableCell>
                      <TableCell className="text-xs text-center border-r border-border px-2 py-2 truncate" title={a.academicYearMaster?.name || ""}>
                        {a.academicYearMaster?.name || "—"}
                      </TableCell>
                      <TableCell className="text-xs border-r border-border px-2.5 py-2 truncate" title={formatAssignmentDueDate(a.dueDate)}>
                        {formatAssignmentDueDate(a.dueDate)}
                      </TableCell>
                      <TableCell className="text-xs text-center border-r border-border px-2 py-2 truncate" title={a.assignmentTypeMaster?.name || ""}>
                        {a.assignmentTypeMaster?.name || "—"}
                      </TableCell>
                      <TableCell className="text-xs border-r border-border px-2.5 py-2 truncate" title={targetSummary(a)}>
                        {targetSummary(a)}
                      </TableCell>
                      <TableCell className="text-center border-r border-border px-1 py-2" onClick={(e) => e.stopPropagation()}>
                        {a.attachmentFileKey ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 mx-auto text-primary hover:bg-primary/10"
                            title={`Download ${a.attachmentFileName || "attachment"}`}
                            onClick={() => downloadAttachment(a.id, a.attachmentFileName)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium text-xs border-r border-border px-1 py-2">
                        {submissionProgress(a)}
                      </TableCell>
                      <TableCell className="text-center border-r border-border px-1 py-2">
                        <Badge variant={a.status === "ACTIVE" ? "success" : "secondary"} className="text-[10px] px-1.5 py-0.5 h-5 font-semibold">
                          {assignmentStatusLabel(a.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center px-1 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-muted"
                            title="View"
                            onClick={() => navigate(`${assignmentsBase}/${a.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 text-text-secondary" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-muted"
                            title="Edit"
                            onClick={() => navigate(`${assignmentsBase}/${a.id}?edit=1`)}
                          >
                            <Pencil className="h-3.5 w-3.5 text-text-secondary" />
                          </Button>
                          {a.attachmentFileKey && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 p-0 hover:bg-muted" title="Has attachment">
                              <Paperclip className="h-3.5 w-3.5 text-text-muted" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-muted"
                            title={a.status === "ACTIVE" ? "Close" : "Reopen"}
                            onClick={() => handleCloseToggle(a)}
                          >
                            {a.status === "ACTIVE" ? (
                              <Lock className="h-3.5 w-3.5 text-amber-600" />
                            ) : (
                              <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                            onClick={() => handleDelete(a)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between text-sm items-center">
            <span className="text-text-secondary">
              Showing page {meta.page} of {meta.totalPages || 1}
              {meta.total != null ? ` · ${meta.total} total` : ""}
            </span>
            {meta.totalPages > 1 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
