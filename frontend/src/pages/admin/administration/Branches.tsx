import React, { useState } from "react";
import { MapPin, Plus, Loader2, AlertCircle, Pencil, Trash2 } from "lucide-react";
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
} from "@/hooks/useBranches";
import type { BranchResponse } from "@/services/branches.api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BranchForm = {
  name: string;
  code: string;
  address: string;
  phone: string;
};

const emptyForm: BranchForm = { name: "", code: "", address: "", phone: "" };

export const Branches: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchResponse | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [formError, setFormError] = useState("");

  const { data, isLoading, isError, refetch } = useBranches();
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();
  const deleteMutation = useDeleteBranch();

  const branches = data?.data || [];

  const filtered = branches.filter(
    (b) =>
      !searchTerm.trim() ||
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditingBranch(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (branch: BranchResponse) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address || "",
      phone: branch.phone || "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      if (editingBranch) {
        await updateMutation.mutateAsync({
          id: editingBranch.id,
          data: {
            name: form.name,
            code: form.code,
            address: form.address || undefined,
            phone: form.phone || undefined,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: form.name,
          code: form.code,
          address: form.address || undefined,
          phone: form.phone || undefined,
        });
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditingBranch(null);
    } catch {
      setFormError("Failed to save branch. Please check the details and try again.");
    }
  };

  const handleDelete = async (branch: BranchResponse) => {
    if (!window.confirm(`Delete branch "${branch.name}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(branch.id);
    } catch {
      alert("Failed to delete branch.");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Branches</h2>
          <p className="text-sm text-text-secondary">Manage Aadya Institute branch locations.</p>
        </div>
        <Button className="bg-[#1769AA] text-white" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Branch
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder="Search branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-red-600">
                    <AlertCircle className="w-5 h-5 inline mr-2" />
                    Failed to load branches.
                    <Button variant="link" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No branches found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono">{b.code}</TableCell>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.address?.split(",")?.[1]?.trim() || "—"}</TableCell>
                    <TableCell>{b.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.status || "ACTIVE"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(b)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Add Branch"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch-name">Name *</Label>
                <Input
                  id="branch-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-code">Code *</Label>
                <Input
                  id="branch-code"
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-address">Address</Label>
              <Input
                id="branch-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-phone">Phone</Label>
              <Input
                id="branch-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1769AA] text-white" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBranch ? "Save Changes" : "Create Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
