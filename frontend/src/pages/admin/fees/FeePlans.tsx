import React, { useMemo, useState } from "react";
import { Layers, Plus, Search, Loader2, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { useFeePlans, useCreateFeePlan, useUpdateFeePlan } from "@/hooks/useFees";
import { useCourses } from "@/hooks/useCourses";
import { useBranches } from "@/hooks/useBranches";
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
import { PermissionGate } from "@/components/permissions/PermissionGate";
import type { FeePlanTemplate } from "@/types/fee.types";

type PlanFormState = {
  name: string;
  code: string;
  branchId: string;
  courseId: string;
  totalAmount: number;
  planType: "FULL_PAYMENT" | "INSTALLMENT";
  description: string;
  installmentsJson: string;
};

const emptyForm = (): PlanFormState => ({
  name: "",
  code: "",
  branchId: "",
  courseId: "",
  totalAmount: 0,
  planType: "FULL_PAYMENT",
  description: "",
  installmentsJson: '[{"installmentNo":1,"amount":0,"dueDays":0}]',
});

export const FeePlans: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm());

  const { data, isLoading, isError, refetch } = useFeePlans({
    search: searchTerm || undefined,
  });
  const createMutation = useCreateFeePlan();
  const updateMutation = useUpdateFeePlan();
  const { courses } = useCourses();
  const { data: branchesRes } = useBranches();
  const branches = useMemo(() => {
    const raw = branchesRes?.data;
    return Array.isArray(raw) ? raw : [];
  }, [branchesRes]);

  const plans: FeePlanTemplate[] = data?.data?.data || data?.data || [];

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (plan: FeePlanTemplate) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      code: plan.code || "",
      branchId: plan.branchId || "",
      courseId: plan.courseId || "",
      totalAmount: plan.totalAmount,
      planType: (plan.planType as "FULL_PAYMENT" | "INSTALLMENT") || "FULL_PAYMENT",
      description: plan.description || "",
      installmentsJson: JSON.stringify(
        plan.installments || [{ installmentNo: 1, amount: plan.totalAmount, dueDays: 0 }],
        null,
        2
      ),
    });
    setShowModal(true);
  };

  const parseInstallments = () => {
    if (form.planType !== "INSTALLMENT") return undefined;
    try {
      const parsed = JSON.parse(form.installmentsJson);
      if (!Array.isArray(parsed)) throw new Error("Installments must be an array");
      return parsed;
    } catch {
      throw new Error("Invalid installments JSON");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const installments = parseInstallments();
      const payload = {
        name: form.name,
        code: form.code || undefined,
        branchId: form.branchId || undefined,
        courseId: form.courseId || undefined,
        totalAmount: form.totalAmount,
        planType: form.planType,
        description: form.description || undefined,
        installments,
      };
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm());
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save fee plan");
    }
  };

  const handleSoftDelete = async (plan: FeePlanTemplate) => {
    if (!window.confirm(`Soft-delete fee plan "${plan.name}"?`)) return;
    try {
      await updateMutation.mutateAsync({
        id: plan.id,
        payload: { status: "DELETED" },
      });
      refetch();
    } catch {
      alert("Failed to delete fee plan");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Fee Plans</h2>
          <p className="text-sm text-text-secondary">
            Manage course fee plan templates and installments.
          </p>
        </div>
        <PermissionGate itemKey="fees.plans" mode="write">
          <Button className="bg-[#2563EB] text-white" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Plan
          </Button>
        </PermissionGate>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search fee plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-red-600">
                    <AlertCircle className="w-5 h-5 inline mr-2" />
                    Failed to load.
                  </TableCell>
                </TableRow>
              ) : !Array.isArray(plans) || plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-text-secondary">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No fee plans found.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-sm">{p.code || "—"}</TableCell>
                    <TableCell>{p.planType || "FULL_PAYMENT"}</TableCell>
                    <TableCell>₹{p.totalAmount?.toLocaleString("en-IN")}</TableCell>
                    <TableCell>{p.course?.name || "—"}</TableCell>
                    <TableCell>{p.branch?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.status || "ACTIVE"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <PermissionGate itemKey="fees.plans" mode="write">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => handleSoftDelete(p)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">{editingId ? "Edit Fee Plan" : "Create Fee Plan"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Plan Name *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Code</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Total Amount (₹) *</Label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={form.totalAmount || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, totalAmount: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Branch</Label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                    className="w-full h-10 px-3 border rounded-md text-sm"
                  >
                    <option value="">All / Institute</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Course</Label>
                  <select
                    value={form.courseId}
                    onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
                    className="w-full h-10 px-3 border rounded-md text-sm"
                  >
                    <option value="">Any course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Plan Type</Label>
                <select
                  value={form.planType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      planType: e.target.value as "FULL_PAYMENT" | "INSTALLMENT",
                    }))
                  }
                  className="w-full h-10 px-3 border rounded-md text-sm"
                >
                  <option value="FULL_PAYMENT">Full Payment</option>
                  <option value="INSTALLMENT">Installment</option>
                </select>
              </div>
              {form.planType === "INSTALLMENT" && (
                <div>
                  <Label>Installments (JSON)</Label>
                  <textarea
                    value={form.installmentsJson}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, installmentsJson: e.target.value }))
                    }
                    className="w-full min-h-[120px] px-3 py-2 border rounded-md text-xs font-mono"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Array of {"{ installmentNo, amount, dueDays }"}
                  </p>
                </div>
              )}
              <div>
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#2563EB] text-white"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingId ? "Save Changes" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
