import { useState } from "react";
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

interface CounsellorOption {
  id: string;
  name: string;
}

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  counsellors: CounsellorOption[];
  onSuccess?: () => void;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  leadIds,
  counsellors,
  onSuccess,
}: BulkAssignDialogProps) {
  const [counsellorId, setCounsellorId] = useState("");
  const [notes, setNotes] = useState("");
  const bulkAssign = useBulkAssignLeads();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!counsellorId || leadIds.length === 0) return;
    bulkAssign.mutate(
      {
        leadIds,
        counsellorId,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setCounsellorId("");
          setNotes("");
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk assign leads</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            Assign <strong>{leadIds.length}</strong> selected lead
            {leadIds.length === 1 ? "" : "s"} to a counsellor.
          </p>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#2563EB] text-white"
              disabled={!counsellorId || bulkAssign.isPending}
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
