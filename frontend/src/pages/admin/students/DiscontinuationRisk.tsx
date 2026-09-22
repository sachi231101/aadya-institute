import React, { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  useDiscontinuationRisk,
  useDiscontinueStudent,
  useNotifyDiscontinuationRisk,
  useTriggerStudentAiCall,
} from "@/hooks/useDiscontinuationRisk";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { FilterToolbar, PageContainer, PageHeader } from "@/components/layout";
import { getApiErrorMessage } from "@/utils/api-error";

type RiskFilter = "ALL" | "CRITICAL" | "WARNING";

type RiskStudent = {
  id: string;
  name?: string;
  phone?: string | null;
  studentCode?: string;
  batchId?: string | null;
  batchName?: string;
  consecutiveAbsences?: number;
  riskLevel?: "CRITICAL" | "WARNING" | string;
  lastPresentDate?: string | null;
};

type ActionDialog =
  | { type: "whatsapp"; student: RiskStudent }
  | { type: "call"; student: RiskStudent }
  | { type: "discontinue"; student: RiskStudent }
  | null;

const tableShell = "min-w-0 overflow-x-auto";

function riskBadgeClass(isCritical: boolean) {
  return isCritical
    ? "bg-red-500/10 text-red-700 border border-red-500/20"
    : "bg-amber-500/10 text-amber-800 border border-amber-500/20";
}

function hasPhone(student: RiskStudent): boolean {
  return Boolean(student.phone?.trim());
}

export const DiscontinuationRisk: React.FC = () => {
  const {
    branches,
    allowAllBranches,
    showBranchSelector,
    selectedBranchId,
    branchIdForQuery,
    setSelectedBranchId,
  } = useBranchScopeForLists();
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);
  const [discontinueReason, setDiscontinueReason] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );

  const notifyMutation = useNotifyDiscontinuationRisk();
  const aiCallMutation = useTriggerStudentAiCall();
  const discontinueMutation = useDiscontinueStudent();

  const { data: riskResponse, isLoading, isError } = useDiscontinuationRisk(branchIdForQuery);

  const riskStudents: RiskStudent[] = riskResponse?.data || [];

  const criticalCount = riskStudents.filter((s) => (s.consecutiveAbsences || 0) >= 3).length;
  const warningCount = riskStudents.filter((s) => (s.consecutiveAbsences || 0) === 2).length;

  const filteredStudents = useMemo(() => {
    if (riskFilter === "CRITICAL") {
      return riskStudents.filter((s) => (s.consecutiveAbsences || 0) >= 3);
    }
    if (riskFilter === "WARNING") {
      return riskStudents.filter((s) => (s.consecutiveAbsences || 0) === 2);
    }
    return riskStudents;
  }, [riskStudents, riskFilter]);

  const statusCards = [
    { value: "ALL" as const, label: "At risk", count: riskStudents.length },
    { value: "CRITICAL" as const, label: "Critical", count: criticalCount },
    { value: "WARNING" as const, label: "Warning", count: warningCount },
  ];

  const showToast = (message: string, tone: "success" | "error") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 4000);
  };

  const closeDialog = () => {
    setActionDialog(null);
    setDiscontinueReason("");
  };

  const actionPending =
    notifyMutation.isPending || aiCallMutation.isPending || discontinueMutation.isPending;

  const handleConfirmWhatsApp = async () => {
    if (!actionDialog || actionDialog.type !== "whatsapp") return;
    const { student } = actionDialog;
    try {
      await notifyMutation.mutateAsync(student.id);
      showToast(`WhatsApp risk alert queued for ${student.name || "student"}.`, "success");
      closeDialog();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to send WhatsApp alert."), "error");
    }
  };

  const handleConfirmCall = async () => {
    if (!actionDialog || actionDialog.type !== "call") return;
    const { student } = actionDialog;
    try {
      await aiCallMutation.mutateAsync(student.id);
      showToast(`AI call queued for ${student.name || "student"}.`, "success");
      closeDialog();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to queue AI call."), "error");
    }
  };

  const handleConfirmDiscontinue = async () => {
    if (!actionDialog || actionDialog.type !== "discontinue") return;
    const reason = discontinueReason.trim();
    if (!reason) {
      showToast("A discontinuation reason is required.", "error");
      return;
    }
    const { student } = actionDialog;
    try {
      await discontinueMutation.mutateAsync({ id: student.id, reason });
      showToast(`${student.name || "Student"} has been discontinued.`, "success");
      closeDialog();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to discontinue student."), "error");
    }
  };

  return (
    <PageContainer>
      {toast && (
        <div
          className={`rounded-lg border p-3 flex items-center justify-between gap-3 text-sm ${
            toast.tone === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-700"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
          }`}
        >
          <span className="font-medium">{toast.message}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setToast(null)}
            className="h-7 text-xs shrink-0"
          >
            Dismiss
          </Button>
        </div>
      )}

      <PageHeader title="Discontinuation Risk" />

      <p className="text-xs text-muted-foreground">
        Students with 2+ consecutive theory absences. Approved leave does not count. At 3 absences,
        discontinuation workflow is triggered.
      </p>

      <div className="grid grid-cols-3 gap-2.5">
        {statusCards.map((card) => {
          const selected = riskFilter === card.value;
          return (
            <button
              key={card.value}
              type="button"
              onClick={() => setRiskFilter(card.value)}
              className="text-left"
            >
              <Card
                className={`border shadow-sm transition-colors ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="mt-0.5 text-xl font-semibold text-foreground tabular-nums">
                    {card.count}
                  </p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {showBranchSelector && (
        <FilterToolbar className="flex flex-col sm:flex-row sm:items-center gap-2.5">
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
        </FilterToolbar>
      )}

      {isError && (
        <p className="text-sm text-red-600">Unable to load discontinuation risk.</p>
      )}

      <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
        <div className={tableShell}>
          <Table className="border-collapse border border-border">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="border border-border bg-muted/50 h-9 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                  Student
                </TableHead>
                <TableHead className="border border-border bg-muted/50 h-9 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                  Batch
                </TableHead>
                <TableHead className="border border-border bg-muted/50 h-9 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-center">
                  Absences
                </TableHead>
                <TableHead className="border border-border bg-muted/50 h-9 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                  Last present
                </TableHead>
                <TableHead className="border border-border bg-muted/50 h-9 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                  Risk
                </TableHead>
                <TableHead className="border border-border bg-muted/50 h-9 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="border border-border h-28 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="border border-border h-28 text-center text-sm text-muted-foreground"
                  >
                    {riskStudents.length === 0
                      ? "No students at discontinuation risk."
                      : "No students in this risk level."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => {
                  const absences = student.consecutiveAbsences || 0;
                  const isCritical =
                    student.riskLevel === "CRITICAL" || absences >= 3;
                  const phoneOk = hasPhone(student);
                  return (
                    <TableRow key={student.id} className="hover:bg-muted/30">
                      <TableCell className="border border-border px-3 py-2.5">
                        <p className="font-semibold text-foreground">{student.name || "—"}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {student.studentCode || student.phone || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="border border-border px-3 py-2.5 text-foreground">
                        {student.batchName || "—"}
                      </TableCell>
                      <TableCell className="border border-border px-3 py-2.5 text-center tabular-nums font-semibold text-foreground">
                        {absences}
                      </TableCell>
                      <TableCell className="border border-border px-3 py-2.5 text-muted-foreground">
                        {student.lastPresentDate
                          ? new Date(student.lastPresentDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="border border-border px-3 py-2.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${riskBadgeClass(
                            isCritical
                          )}`}
                        >
                          {isCritical ? "Critical" : "Warning"}
                        </span>
                      </TableCell>
                      <TableCell className="border border-border px-3 py-2.5">
                        <PermissionGate itemKey="students.discontinuation" mode="write">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={!phoneOk || actionPending}
                              title={
                                phoneOk
                                  ? "Send WhatsApp risk alert"
                                  : "No phone number on student"
                              }
                              onClick={() => setActionDialog({ type: "whatsapp", student })}
                            >
                              WhatsApp
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={!phoneOk || actionPending}
                              title={
                                phoneOk ? "Queue AI call" : "No phone number on student"
                              }
                              onClick={() => setActionDialog({ type: "call", student })}
                            >
                              Call
                            </Button>
                            {isCritical && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={actionPending}
                                onClick={() =>
                                  setActionDialog({ type: "discontinue", student })
                                }
                              >
                                Discontinue
                              </Button>
                            )}
                          </div>
                        </PermissionGate>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* WhatsApp confirm */}
      <Dialog
        open={actionDialog?.type === "whatsapp"}
        onOpenChange={(open) => !open && !notifyMutation.isPending && closeDialog()}
      >
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Send WhatsApp alert</DialogTitle>
            <DialogDescription>
              Send a discontinuation risk WhatsApp message to this student.
            </DialogDescription>
          </DialogHeader>
          {actionDialog?.type === "whatsapp" && (
            <div className="space-y-2 text-sm rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Student</span>
                <span className="font-medium text-foreground">
                  {actionDialog.student.name || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-mono text-foreground">
                  {actionDialog.student.phone || "—"}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={notifyMutation.isPending}
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={notifyMutation.isPending}
              onClick={handleConfirmWhatsApp}
            >
              {notifyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send WhatsApp"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Call confirm */}
      <Dialog
        open={actionDialog?.type === "call"}
        onOpenChange={(open) => !open && !aiCallMutation.isPending && closeDialog()}
      >
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Queue AI call</DialogTitle>
            <DialogDescription>
              Enqueue an AI call to this student about discontinuation risk.
            </DialogDescription>
          </DialogHeader>
          {actionDialog?.type === "call" && (
            <div className="space-y-2 text-sm rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Student</span>
                <span className="font-medium text-foreground">
                  {actionDialog.student.name || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-mono text-foreground">
                  {actionDialog.student.phone || "—"}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={aiCallMutation.isPending}
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={aiCallMutation.isPending}
              onClick={handleConfirmCall}
            >
              {aiCallMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Queuing...
                </>
              ) : (
                "Queue call"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discontinue confirm */}
      <Dialog
        open={actionDialog?.type === "discontinue"}
        onOpenChange={(open) => !open && !discontinueMutation.isPending && closeDialog()}
      >
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-destructive">Discontinue student</DialogTitle>
            <DialogDescription>
              This marks the student as discontinued and deactivates active enrollments. This
              cannot be undone from this screen.
            </DialogDescription>
          </DialogHeader>
          {actionDialog?.type === "discontinue" && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-medium text-foreground">
                    {actionDialog.student.name || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Batch</span>
                  <span className="text-foreground">
                    {actionDialog.student.batchName || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Absences</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {actionDialog.student.consecutiveAbsences ?? 0}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discontinue-reason" className="text-xs font-semibold">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="discontinue-reason"
                  value={discontinueReason}
                  onChange={(e) => setDiscontinueReason(e.target.value)}
                  placeholder="Enter reason for discontinuation"
                  className="text-sm min-h-[88px]"
                  disabled={discontinueMutation.isPending}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={discontinueMutation.isPending}
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={discontinueMutation.isPending || !discontinueReason.trim()}
              onClick={handleConfirmDiscontinue}
            >
              {discontinueMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Discontinuing...
                </>
              ) : (
                "Discontinue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
