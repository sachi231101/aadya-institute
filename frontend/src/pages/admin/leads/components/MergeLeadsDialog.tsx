import { useMemo, useState } from "react";
import { Loader2, GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMergeLeads } from "@/hooks/useLeads";
import type { Lead } from "@/services/leads.api";

interface MergeLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
  onSuccess?: (primaryLeadId: string) => void;
}

export function MergeLeadsDialog({
  open,
  onOpenChange,
  leads,
  onSuccess,
}: MergeLeadsDialogProps) {
  const mergeMutation = useMergeLeads();
  const [primaryId, setPrimaryId] = useState("");

  const options = useMemo(() => leads.slice(0, 2), [leads]);

  const handleOpen = (next: boolean) => {
    if (next && options.length === 2) {
      setPrimaryId(options[0].id);
    }
    if (!next) setPrimaryId("");
    onOpenChange(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (options.length !== 2 || !primaryId) return;
    const duplicateLeadId = options.find((l) => l.id !== primaryId)?.id;
    if (!duplicateLeadId) return;
    mergeMutation.mutate(
      { primaryLeadId: primaryId, duplicateLeadId },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.(primaryId);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            Merge duplicate leads
          </DialogTitle>
        </DialogHeader>
        {options.length !== 2 ? (
          <p className="text-sm text-muted-foreground py-2">
            Select exactly two leads to merge.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              Keep one primary lead. Follow-ups, calls, and activities move to the primary;
              the duplicate is archived.
            </p>
            <div>
              <Label>Primary lead (keep)</Label>
              <select
                value={primaryId}
                onChange={(e) => setPrimaryId(e.target.value)}
                className="mt-1 w-full h-10 px-3 border rounded-md text-sm bg-background"
                required
              >
                {options.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} · {l.phoneNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              {options.map((l) => (
                <p key={l.id}>
                  <span className="font-semibold">
                    {l.id === primaryId ? "Keep: " : "Archive: "}
                  </span>
                  {l.name} — {l.phoneNumber} — {l.course?.name || l.interestedIn || "—"}
                </p>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2563EB] text-white"
                disabled={!primaryId || mergeMutation.isPending}
              >
                {mergeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Merging...
                  </>
                ) : (
                  "Merge leads"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
