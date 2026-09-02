import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, AlertCircle } from "lucide-react";
import { useCreateAssignment } from "@/hooks/useAssignments";
import { batchesApi, type BatchData } from "@/services/batches.api";
import { formatBatchSubjectNames } from "@/utils/batch.utils";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const CreateAssignment: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateAssignment();
  const [title, setTitle] = useState("");
  const [batchId, setBatchId] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: batchesRes } = useQuery({
    queryKey: ["batches"],
    queryFn: () => batchesApi.getAll(),
  });
  const batches = batchesRes?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createMutation.mutateAsync({
        batchId,
        title,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      navigate(ROUTES.ADMIN.ASSIGNMENTS.ALL);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create assignment");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Create Assignment</h2>
        <p className="text-sm text-text-secondary">Assign work to a batch with a due date.</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
            <div>
              <Label>Title *</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Batch *</Label>
              <select required value={batchId} onChange={(e) => setBatchId(e.target.value)} className="w-full h-10 px-3 border rounded-md text-sm">
                <option value="">Select batch</option>
                {batches.map((b: BatchData) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) — {formatBatchSubjectNames(b)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Instructions</Label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-h-[100px] p-3 border rounded-md text-sm" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(ROUTES.ADMIN.ASSIGNMENTS.ALL)}>Cancel</Button>
              <Button type="submit" className="bg-[#1769AA] text-white" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
