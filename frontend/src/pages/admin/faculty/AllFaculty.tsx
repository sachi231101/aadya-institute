import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Plus, Loader2, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, MetricGrid, FilterToolbar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBranchScopeForLists } from "@/hooks/useBranchScopeForLists";
import { useFacultyReport } from "@/hooks/useReports";
import { useFacultyList, useDeleteFaculty } from "@/hooks/useFaculty";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { getApiErrorMessage } from "@/utils/api-error";

const ProgressBar = ({ value, colorClass }: { value: number, colorClass: string }) => (
  <div className="w-full bg-muted rounded-full h-1.5 mt-1.5 overflow-hidden">
    <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${Math.min(value, 100)}%` }} />
  </div>
);

const getStatusBadgeClass = (status: string) => {
  switch (status?.toUpperCase()) {
    case "ACTIVE": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
    case "ON_LEAVE":
    case "ON LEAVE": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
    case "INACTIVE": return "bg-slate-500/10 text-muted-foreground border border-border";
    default: return "bg-muted text-muted-foreground border border-border";
  }
};

type FacultyDeleteTarget = {
  id: string;
  name: string;
  employeeCode: string;
};

export const AllFaculty: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = usePermissions();
  const deleteFaculty = useDeleteFaculty();
  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
      ? "/center"
      : "/admin";
  const [selectedFilterTab, setSelectedFilterTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [facultyToDelete, setFacultyToDelete] = useState<FacultyDeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    branches,
    allowAllBranches,
    showBranchSelector,
    selectedBranchId,
    branchIdForQuery,
    setSelectedBranchId,
  } = useBranchScopeForLists();

  const { data: facultyReport } = useFacultyReport(branchIdForQuery);
  const { data: facultyListResponse, isLoading: isListLoading } = useFacultyList({
    branchId: branchIdForQuery,
    limit: 100,
  });

  // Faculty Directory uses the live faculty list as source of truth so newly created
  // members appear immediately; report metrics enrich matching rows when available.
  const reportById = new Map(
    (facultyReport?.faculty || []).map((f: any) => [f.id, f])
  );

  const rawFacultyList = (facultyListResponse?.data || []).map((f: any) => {
    const report = reportById.get(f.id);
    return {
      id: f.id,
      name: f.user?.name || report?.name || "Faculty Member",
      employeeCode: f.employeeCode || report?.employeeCode || f.id,
      branchName: f.branch?.name || report?.branchName || "Aadya Branch",
      specialization: f.specialization || report?.specialization || "Instructor",
      assignedBatchesCount:
        report?.assignedBatchesCount ?? f._count?.batches ?? f.batches?.length ?? 0,
      totalStudents: report?.totalStudents ?? 0,
      avgStudentAttendancePct: report?.avgStudentAttendancePct ?? 0,
      facultyAttendancePct: report?.facultyAttendancePct ?? 0,
      workloadHoursPerWeek: report?.workloadHoursPerWeek ?? 0,
      status: f.status || report?.status || "ACTIVE",
    };
  });

  // Filter faculty by search, status tabs
  const filteredFaculty = rawFacultyList.filter((fac: any) => {
    const matchesSearch =
      !searchTerm ||
      fac.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.specialization?.toLowerCase().includes(searchTerm.toLowerCase());

    const statusNorm = fac.status?.toUpperCase();
    const matchesStatus =
      selectedFilterTab === "All" ||
      (selectedFilterTab === "Active" && statusNorm === "ACTIVE") ||
      (selectedFilterTab === "On Leave" && (statusNorm === "ON_LEAVE" || statusNorm === "ON LEAVE")) ||
      (selectedFilterTab === "High Workload" && fac.workloadHoursPerWeek >= 25) ||
      (selectedFilterTab === "Needs Attention" && (statusNorm === "INACTIVE" || fac.facultyAttendancePct < 70));

    return matchesSearch && matchesStatus;
  });

  const kpis = {
    onLeave: rawFacultyList.filter((f: any) => f.status?.toUpperCase() === "ON_LEAVE" || f.status?.toUpperCase() === "ON LEAVE").length,
    inactive: rawFacultyList.filter((f: any) => f.status?.toUpperCase() === "INACTIVE").length,
    activeBatches: rawFacultyList.reduce((acc: number, f: any) => acc + (f.assignedBatchesCount || 0), 0),
  };

  const filterTabs = [
    { name: "All", count: rawFacultyList.length },
    { name: "Active", count: rawFacultyList.filter((f: any) => f.status?.toUpperCase() === "ACTIVE").length },
    { name: "On Leave", count: kpis.onLeave },
    { name: "High Workload", count: rawFacultyList.filter((f: any) => f.workloadHoursPerWeek >= 25).length },
    { name: "Needs Attention", count: rawFacultyList.filter((f: any) => f.status?.toUpperCase() === "INACTIVE" || f.facultyAttendancePct < 70).length },
  ];

  const isLoading = isListLoading;

  const closeDeleteDialog = () => {
    if (deleteFaculty.isPending) return;
    setFacultyToDelete(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!facultyToDelete) return;
    setDeleteError(null);
    try {
      await deleteFaculty.mutateAsync(facultyToDelete.id);
      setFacultyToDelete(null);
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, "Failed to delete faculty."));
    }
  };

  return (
    <PageContainer className="relative overflow-x-hidden animate-in fade-in duration-300">
      {/* ─── FACULTY DIRECTORY CONTENT ─── */}
      <PageHeader
        title="Faculty Directory"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shadow-2xs font-semibold cursor-pointer h-9 px-3.5 text-xs"
              onClick={() => navigate(`${basePath}/faculty/timetable`)}
            >
              Faculty Timetable
            </Button>
            <PermissionGate itemKey="faculty.all" mode="write">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-xs rounded-xl cursor-pointer h-9 px-3.5 text-xs"
                onClick={() => navigate(`${basePath}/faculty/add`)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Faculty
              </Button>
            </PermissionGate>
          </>
        }
      />

      <MetricGrid columns="grid-cols-1 sm:grid-cols-3" density="compact">
          {[
            { label: "On Leave", value: kpis.onLeave },
            { label: "Inactive", value: kpis.inactive },
            { label: "Active Batches", value: kpis.activeBatches },
          ].map((kpi, idx) => (
            <Card key={idx} size="compact" className="border border-border/80 shadow-2xs bg-card rounded-xl">
              <CardContent size="compact">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <h3 className="text-xl font-bold text-foreground mt-0.5 leading-tight">{kpi.value}</h3>
              </CardContent>
            </Card>
          ))}
      </MetricGrid>

      <FilterToolbar className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs font-medium bg-muted/30 border border-border text-foreground rounded-lg focus:outline-none focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground h-[34px]"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Status Filter Dropdown */}
              <select
                value={selectedFilterTab}
                onChange={(e) => setSelectedFilterTab(e.target.value)}
                className="text-xs font-semibold border border-border rounded-lg px-3 py-1.5 text-foreground bg-muted/30 focus:outline-none focus:bg-background focus:border-primary cursor-pointer h-[34px]"
              >
                {filterTabs.map(tab => (
                  <option key={tab.name} value={tab.name}>
                    {tab.name} ({tab.count})
                  </option>
                ))}
              </select>

              {/* Branch Filter Dropdown */}
              {showBranchSelector && (
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="text-xs font-semibold border border-border rounded-lg px-3 py-1.5 text-foreground bg-muted/30 focus:outline-none focus:bg-background focus:border-primary cursor-pointer h-[34px]"
                >
                  {allowAllBranches && (
                    <option value="ALL">All Branches ({branches.length})</option>
                  )}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>
          </FilterToolbar>

        <Card className="border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap border-collapse">
              <thead className="bg-muted/60 text-[11px] font-bold text-foreground uppercase tracking-wider">
                <tr className="border-b border-border/80">
                  <th className="px-4 py-2.5 border-r border-border/80">Faculty</th>
                  <th className="px-3 py-2.5 border-r border-border/80">Branch & Spec.</th>
                  <th className="px-3 py-2.5 text-center border-r border-border/80">Batches</th>
                  <th className="px-3 py-2.5 text-center border-r border-border/80">Students</th>
                  <th className="px-3 py-2.5 border-r border-border/80">Attendance</th>
                  <th className="px-3 py-2.5 text-center border-r border-border/80">Workload</th>
                  <th className="px-3 py-2.5 border-r border-border/80">Status</th>
                  <th className="px-4 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-xs font-medium">
                      <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mb-2" />
                      Loading faculty...
                    </td>
                  </tr>
                ) : filteredFaculty.length > 0 ? (
                  filteredFaculty.map((fac: any) => (
                    <tr
                      key={fac.id}
                      onClick={() => navigate(`${basePath}/faculty/${fac.id}`)}
                      className="border-b border-border/70 hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-2.5 border-r border-border/70">
                        <p className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors">{fac.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{fac.employeeCode}</p>
                      </td>
                      <td className="px-3 py-2.5 border-r border-border/70">
                        <p className="font-medium text-foreground text-xs">{fac.branchName}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{fac.specialization}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-foreground text-xs border-r border-border/70">
                        {fac.assignedBatchesCount}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-foreground text-xs border-r border-border/70">
                        {fac.totalStudents}
                      </td>
                      <td className="px-3 py-2.5 w-28 border-r border-border/70">
                        {fac.facultyAttendancePct > 0 ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-semibold text-foreground">{fac.facultyAttendancePct}%</span>
                            </div>
                            <ProgressBar value={fac.facultyAttendancePct} colorClass={fac.facultyAttendancePct >= 85 ? "bg-emerald-500" : fac.facultyAttendancePct >= 70 ? "bg-orange-500" : "bg-red-500"} />
                          </>
                        ) : <span className="text-muted-foreground text-xs font-mono">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center border-r border-border/70">
                        <span className="font-semibold text-foreground text-xs">{fac.workloadHoursPerWeek}h <span className="text-[10px] font-normal text-muted-foreground">/wk</span></span>
                      </td>
                      <td className="px-3 py-2.5 border-r border-border/70">
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(fac.status)}`}>
                          {fac.status}
                        </span>
                      </td>
                      <td
                        className="px-4 py-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => navigate(`${basePath}/faculty/${fac.id}`)}
                            >
                              View Details
                            </DropdownMenuItem>
                            {isAdmin && String(fac.status).toUpperCase() !== "INACTIVE" && (
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => {
                                  setDeleteError(null);
                                  setFacultyToDelete({
                                    id: fac.id,
                                    name: fac.name,
                                    employeeCode: fac.employeeCode,
                                  });
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-xs font-medium">
                      No faculty found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-muted/20 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Showing {filteredFaculty.length} of {rawFacultyList.length} faculty</span>
          </div>
        </Card>

      <Dialog
        open={!!facultyToDelete}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete faculty</DialogTitle>
            <DialogDescription>
              This deactivates the faculty account and cannot be undone from this screen.
            </DialogDescription>
          </DialogHeader>
          {facultyToDelete && (
            <div className="space-y-2 text-sm rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Faculty</span>
                <span className="font-medium text-foreground">{facultyToDelete.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Employee code</span>
                <span className="font-mono text-foreground">{facultyToDelete.employeeCode}</span>
              </div>
            </div>
          )}
          {deleteError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteFaculty.isPending}
              onClick={closeDeleteDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteFaculty.isPending}
              onClick={() => void handleConfirmDelete()}
            >
              {deleteFaculty.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
