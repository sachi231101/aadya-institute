import React, { useState } from "react";
import { Layers, Plus, Search, Loader2, AlertCircle } from "lucide-react";
import { useFeePlans, useCreateFeePlan } from "@/hooks/useFees";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const FeePlans: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);

  const { data, isLoading, isError, refetch } = useFeePlans({ search: searchTerm || undefined });
  const createMutation = useCreateFeePlan();

  const plans = data?.data?.data || data?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ name, totalAmount });
      setShowModal(false);
      setName("");
      setTotalAmount(0);
      refetch();
    } catch {
      alert("Failed to create fee plan");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Fee Plans</h2>
          <p className="text-sm text-text-secondary">Manage course fee plan templates and installments.</p>
        </div>
        <Button className="bg-[#1769AA] text-white" onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Plan
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input placeholder="Search fee plans..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-red-600"><AlertCircle className="w-5 h-5 inline mr-2" />Failed to load.</TableCell></TableRow>
              ) : !Array.isArray(plans) || plans.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-text-secondary"><Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />No fee plans found.</TableCell></TableRow>
              ) : (
                plans.map((p: { id: string; name: string; code?: string; totalAmount: number; status?: string; course?: { name: string } }) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-sm">{p.code || "—"}</TableCell>
                    <TableCell>₹{p.totalAmount?.toLocaleString("en-IN")}</TableCell>
                    <TableCell>{p.course?.name || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{p.status || "ACTIVE"}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">Create Fee Plan</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Plan Name *</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Total Amount (₹) *</Label><Input type="number" required min={1} value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))} /></div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1769AA] text-white" disabled={createMutation.isPending}>Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
