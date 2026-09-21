import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBulkAssignLeads } from "@/hooks/useLeads";
import { getApiErrorMessage } from "@/utils/api-error";

interface CounsellorOption {
  id: string;
  name: string;
}

export interface BulkAssignLeadSummary {
  id: string;
  name: string;
  assignedCounsellor?: { id: string; name: string } | null;
  assignedCounsellorId?: string | null;
}

interface BulkAssignResultItem {
  leadId: string;
  success: boolean;
  error?: string;
  alreadyAssigned?: boolean;
  previousCounsellorId?: string | null;
}

interface BulkAssignResponseData {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkAssignResultItem[];
}

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: BulkAssignLeadSummary[];
  counsellors: CounsellorOption[];
  onSuccess?: (summary: { succeeded: number; failed: number; total: number }) => void;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  leads,
  counsellors,
  onSuccess,
}: BulkAssignDialogProps) {
  const [counsellorId, setCounsellorId] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmReassign, setConfirmReassign] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [failureSummary, setFailureSummary] = useState<BulkAssignResultItem[]>([]);
  const bulkAssign = useBulkAssignLeads();

  const alreadyAssignedLeads = useMemo(
    () =>
      leads.filter(
        (l) => Boolean(l.assignedCounsellorId || l.assignedCounsellor?.id)
      ),
    [leads]
  );
  const unassignedCount = leads.length - alreadyAssignedLeads.length;
  const alreadyAssignedCount = alreadyAssignedLeads.length;
  const needsReassignConfirm = alreadyAssignedCount > 0;

  useEffect(() => {
    if (!open) {
      setCounsellorId("");
      setNotes("");
      setConfirmReassign(false);
      setFormError(null);
      setFailureSummary([]);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFailureSummary([]);
    if (!counsellorId || leads.length === 0) return;
    if (needsReassignConfirm && !confirmReassign) {
      setFormError(
        `Confirm reassignment of ${alreadyAssignedCount} already-assigned lead${
          alreadyAssignedCount === 1 ? "" : "s"
        }.`
      );
      return;
    }

    bulkAssign.mutate(
      {
        leadIds: leads.map((l) => l.id),
        counsellorId,
        notes: notes || undefined,
      },
      {
        onSuccess: (response) => {
          const data = (response?.data ?? response) as BulkAssignResponseData;
          const failed = data?.failed ?? 0;
          const succeeded = data?.succeeded ?? 0;
          const total = data?.total ?? leads.length;
          const failedItems = (data?.results ?? []).filter((r) => !r.success);

          if (failed > 0) {
            setFailureSummary(failedItems);
            setFormError(
              `${succeeded} assigned, ${failed} failed. Fix failures below and retry if needed.`
            );
            onSuccess?.({ succeeded, failed, total });
            return;
          }

          setCounsellorId("");
          setNotes("");
          setConfirmReassign(false);
          onOpenChange(false);
          onSuccess?.({ succeeded, failed, total });
        },
        onError: (err: unknown) => {
          setFormError(getApiErrorMessage(err, "Bulk assign failed"));
        },
      }
    );
  };

  const leadNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const lead of leads) map.set(lead.id, lead.name);
    return map;
  }, [leads]);

  const canSubmit =
    Boolean(counsellorId) &&
    leads.length > 0 &&
    (!needsReassignConfirm || confirmReassign) &&
    !bulkAssign.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk assign leads</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            Assign <strong>{leads.length}</strong> selected lead
            {leads.length === 1 ? "" : "s"} to a counsellor.
          </p>
          <p className="text-sm text-muted-foreground">
            {unassignedCount} unassigned, {alreadyAssignedCount} already assigned.
          </p>

          {needsReassignConfirm && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 space-y-2">
              <p className="text-sm text-amber-900">
                Reassign {alreadyAssignedCount} already-assigned lead
                {alreadyAssignedCount === 1 ? "" : "s"}?
              </p>
              <label className="flex items-start gap-2 text-sm text-amber-950">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={confirmReassign}
                  onChange={(e) => {
                    setConfirmReassign(e.target.checked);
                    if (e.target.checked) setFormError(null);
                  }}
                />
                <span>
                  I confirm reassigning {alreadyAssignedCount} already-assigned lead
                  {alreadyAssignedCount === 1 ? "" : "s"}.
                </span>
              </label>
            </div>
          )}

          <div>
            <Label>Counsellor</Label>
            <select
              value={counsellorId}
              onChange={(e) => setCounsellorId(e.target.value)}
              className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
              required
            >
              <option value="">Select counsellor</option>
              {counsellors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              placeholder="Assignment notes"
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          {failureSummary.length > 0 && (
            <ul className="max-h-32 overflow-y-auto rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
              {failureSummary.map((item) => (
                <li key={item.leadId}>
                  <span className="font-medium">
                    {leadNameById.get(item.leadId) || item.leadId}
                  </span>
                  {": "}
                  {item.error || "Assignment failed"}
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-white"
              disabled={!canSubmit}
            >
              {bulkAssign.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Assigning...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
