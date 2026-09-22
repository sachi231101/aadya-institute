import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, FilterToolbar } from "@/components/layout";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBranchScopeForLists } from "@/hooks/useBranchScopeForLists";
import { useStudentList } from "@/hooks/useStudents";
import { useContinueStudent } from "@/hooks/useDiscontinuationRisk";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner, PermissionGate } from "@/components/permissions/PermissionGate";
import { CourseChips } from "@/components/common/CourseChips";
import { coursesFromStudent } from "@/utils/admission-package.utils";
import { getApiErrorMessage } from "@/utils/api-error";

function statusBadgeClass(status: string) {
  switch (status) {
    case "Active":
      return "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20";
    case "At Risk":
      return "bg-red-500/10 text-red-700 border border-red-500/20";
    case "Admission Pending":
    case "Batch Assignment Pending":
      return "bg-amber-500/10 text-amber-800 border border-amber-500/20";
    case "Completed":
      return "bg-blue-500/10 text-blue-700 border border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

export const AllStudents: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTab, setSelectedTab] = useState("All Students");
  const [searchTerm, setSearchTerm] = useState("");
  const [continueTarget, setContinueTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );
  const continueMutation = useContinueStudent();
  const { isAdmin } = usePermissions();
  const tableColSpan = isAdmin ? 8 : 7;

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : location.pathname.startsWith("/faculty")
    ? "/faculty"
    : "/admin";
  const isFacultyPortal = basePath === "/faculty";
  const isRestrictedPortal = basePath === "/center" || basePath === "/counselor";

  const {
    branches,
    allowAllBranches,
    showBranchSelector,
    selectedBranchId,
    branchIdForQuery,
    setSelectedBranchId,
  } = useBranchScopeForLists();

  const { data: liveStudentsResponse, isLoading, isError } = useStudentList({
    limit: 200,
    branchId: branchIdForQuery,
  });
  const liveStudents = liveStudentsResponse?.data || [];

  const combinedStudents = useMemo(() => {
    return liveStudents.map((s) => {
      const hasAttendance = (s.attendance?.totalClasses ?? 0) > 0;
      const isRisk =
        s.status === "DISCONTINUED" ||
        (s.attendance?.consecutiveAbsences ?? 0) >= 2 ||
        (hasAttendance && (s.attendance?.overallPercentage ?? 0) < 65);
      const isDraft =
        (s.status as string) === "DRAFT" ||
        (s as any).isDraft ||
        (s as any).admissionStatus === "PENDING" ||
        (s as any).admissions?.[0]?.status === "PENDING" ||
        (s as any).admissions?.[0]?.status === "Admission Pending";
      const hasBatch = Boolean(
        s.batchName &&
          s.batchName !== "Not assigned" &&
          s.batchName !== "—" &&
          !s.batchName.toLowerCase().includes("pending")
      );
      const isBatchPending = !isDraft && s.status === "ACTIVE" && !hasBatch;
      const computedStatus = isDraft
        ? "Admission Pending"
        : isBatchPending
          ? "Batch Assignment Pending"
          : s.status === "ACTIVE"
            ? isRisk
              ? "At Risk"
              : "Active"
            : s.status === "COMPLETED"
              ? "Completed"
              : "Dropped";
      return {
        id: s.id,
        studentCode: s.studentCode,
        name: (s as any).displayName || s.user?.name || s.studentCode,
        email: s.user?.email || "—",
        phone: s.user?.phone || "—",
        course: s.courseName || "Not assigned",
        courses: s.courses,
        batch: s.batchName || "Not assigned",
        admissionNo: s.admissionNo || "—",
        admissionDate: s.admissionDate
          ? new Date(s.admissionDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—",
        branch: s.branch?.name || "—",
        branchId: s.branchId,
        status: computedStatus,
        rawStatus: s.status,
        counsellor: s.counsellorName || "Admissions Desk",
      };
    });
  }, [liveStudents]);

  const filteredStudents = useMemo(() => {
    return combinedStudents.filter((student) => {
      const matchesBranch =
        selectedBranchId === "ALL" ||
        student.branchId === selectedBranchId ||
        branches
          .find((b) => b.id === selectedBranchId)
          ?.name.toLowerCase()
          .includes(student.branch.toLowerCase());

      const matchesSearch =
        !searchTerm ||
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone.includes(searchTerm) ||
        student.counsellor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.courses || []).some((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTab =
        selectedTab === "All Students" ||
        (selectedTab === "Active" &&
          (student.status === "Active" || student.status === "Batch Assignment Pending")) ||
        (selectedTab === "Draft" && student.status === "Admission Pending") ||
        (selectedTab === "At Risk" && student.status === "At Risk") ||
        (selectedTab === "Completed" && student.status === "Completed") ||
        (selectedTab === "Dropped" && student.status === "Dropped");

      return matchesBranch && matchesSearch && matchesTab;
    });
  }, [combinedStudents, selectedBranchId, branches, searchTerm, selectedTab]);

  const branchStudents = useMemo(() => {
    return combinedStudents.filter(
      (student) =>
        selectedBranchId === "ALL" ||
        student.branchId === selectedBranchId ||
        branches
          .find((branch) => branch.id === selectedBranchId)
          ?.name.toLowerCase()
          .includes(student.branch.toLowerCase())
    );
  }, [combinedStudents, selectedBranchId, branches]);

  const statusCards = [
    { value: "All Students", label: "All", count: branchStudents.length },
    {
      value: "Active",
      label: "Active",
      count: branchStudents.filter(
        (student) => student.status === "Active" || student.status === "Batch Assignment Pending"
      ).length,
    },
    {
      value: "Draft",
      label: "Pending",
      count: branchStudents.filter((student) => student.status === "Admission Pending").length,
    },
    {
      value: "At Risk",
      label: "At risk",
      count: branchStudents.filter((student) => student.status === "At Risk").length,
    },
    {
      value: "Completed",
      label: "Completed",
      count: branchStudents.filter((student) => student.status === "Completed").length,
    },
    {
      value: "Dropped",
      label: "Dropped",
      count: branchStudents.filter((student) => student.status === "Dropped").length,
    },
  ];

  const showToast = (message: string, tone: "success" | "error") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 4000);
  };

  const closeContinueDialog = () => {
    if (continueMutation.isPending) return;
    setContinueTarget(null);
    setContinueError(null);
  };

  const handleConfirmContinue = async () => {
    if (!continueTarget) return;
    setContinueError(null);
    try {
      const res = await continueMutation.mutateAsync(continueTarget.id);
      const result = res.data;
      const restoredMsg = result?.batchRestored
        ? result.batchCode
          ? ` Previous batch ${result.batchCode} was restored.`
          : " Previous batch enrollment was restored."
        : " Assign a batch from Student Allocation if needed.";
      showToast(`${continueTarget.name} reactivated.${restoredMsg}`, "success");
      setContinueTarget(null);
    } catch (err) {
      setContinueError(getApiErrorMessage(err, "Failed to continue student."));
    }
  };

  return (
    <PageContainer>
      {toast && (
        <div
          className={`rounded-lg p-3 text-sm font-medium border ${
            toast.tone === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      <PageHeader
        title="All Students"
        actions={
          !isFacultyPortal ? (
            <PermissionGate itemKey="admissions.all" mode="write">
              <Button
                size="sm"
                className="h-9 bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
                onClick={() => navigate(`${basePath}/admissions/direct-entry`)}
              >
                Register Student
              </Button>
            </PermissionGate>
          ) : undefined
        }
      />

      {isRestrictedPortal && (
        <ReadOnlyBanner itemKey="students.all" label="All Students" />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {statusCards.map((card) => {
          const selected = selectedTab === card.value;
          return (
            <button key={card.value} type="button" onClick={() => setSelectedTab(card.value)} className="text-left">
              <Card
                className={`border shadow-sm transition-colors ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="mt-0.5 text-xl font-semibold text-foreground tabular-nums">{card.count}</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <FilterToolbar className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, code, or phone"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          />
        </div>
        {showBranchSelector && (
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="h-9 text-sm border border-border rounded-lg px-3 text-foreground bg-background focus:outline-none focus:border-primary"
          >
            {allowAllBranches && <option value="ALL">All branches</option>}
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        )}
      </FilterToolbar>

      <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
        <div
          className={
            "min-w-0 overflow-x-auto " +
            "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
            "[&_thead]:bg-muted/50 " +
            "[&_th]:h-9 [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:font-semibold " +
            "[&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground " +
            "[&_th]:border [&_th]:border-border [&_th]:whitespace-nowrap " +
            "[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_td]:border [&_td]:border-border " +
            "[&_tbody_tr]:hover:bg-muted/30 [&_tbody_tr]:transition-colors"
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Admission Date</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin ? <TableHead>Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={tableColSpan} className="h-28 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={tableColSpan} className="h-28 text-center text-sm text-red-600">
                    Unable to load students.
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableColSpan} className="h-28 text-center text-sm text-muted-foreground">
                    No students found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow
                    key={student.id}
                    onClick={() => navigate(`${basePath}/students/${student.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <p className="font-semibold text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.studentCode}</p>
                    </TableCell>
                    <TableCell className="text-foreground">{student.phone}</TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{student.admissionNo}</TableCell>
                    <TableCell className="text-foreground">{student.admissionDate}</TableCell>
                    <TableCell>
                      <CourseChips
                        courses={coursesFromStudent({
                          courses: student.courses,
                          courseName: student.course,
                        })}
                        fallback="Not assigned"
                        maxVisible={2}
                      />
                    </TableCell>
                    <TableCell className="text-foreground">{student.batch}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-md ${statusBadgeClass(student.status)}`}
                      >
                        {student.status}
                      </span>
                    </TableCell>
                    {isAdmin ? (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {student.rawStatus === "DISCONTINUED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={continueMutation.isPending}
                            onClick={() => {
                              setContinueError(null);
                              setContinueTarget({ id: student.id, name: student.name });
                            }}
                          >
                            Continue
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog
        open={!!continueTarget}
        onOpenChange={(open) => {
          if (!open) closeContinueDialog();
        }}
      >
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Continue student?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Reactivate this student and restore previous batch if available?
            </DialogDescription>
          </DialogHeader>
          {continueTarget && (
            <p className="text-sm text-foreground">
              <span className="font-medium">{continueTarget.name}</span>
            </p>
          )}
          {continueError && (
            <p className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">
              {continueError}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={continueMutation.isPending}
              onClick={closeContinueDialog}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={continueMutation.isPending}
              onClick={handleConfirmContinue}
            >
              {continueMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Continuing...
                </>
              ) : (
                "Continue student"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
