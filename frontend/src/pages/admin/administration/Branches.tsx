import React, { useState } from "react";
import { MapPin, Plus, Loader2, AlertCircle, Pencil, Trash2, Power } from "lucide-react";
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
} from "@/hooks/useBranches";
import { useUsers } from "@/hooks/useUsers";
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
  email: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  managerUserId: string;
  status: "ACTIVE" | "INACTIVE";
};

const emptyForm: BranchForm = {
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  timezone: "Asia/Kolkata",
  openTime: "09:00",
  closeTime: "18:00",
  managerUserId: "",
  status: "ACTIVE",
};

const workingHoursFromForm = (form: BranchForm) => {
  if (!form.openTime && !form.closeTime) return null;
  return {
    open: form.openTime || undefined,
    close: form.closeTime || undefined,
  };
};

export const Branches: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchResponse | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [formError, setFormError] = useState("");

  const { data, isLoading, isError, refetch } = useBranches();
  const { data: usersData } = useUsers({ role: "CENTER_MANAGER", limit: 100, status: "ACTIVE" });
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();
  const deleteMutation = useDeleteBranch();

  const branches = data?.data || [];
  const managers = usersData?.data || [];

  const filtered = branches.filter(
    (b) =>
      !searchTerm.trim() ||
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditingBranch(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (branch: BranchResponse) => {
    const hours = branch.workingHours as { open?: string; close?: string } | null;
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      timezone: branch.timezone || "Asia/Kolkata",
      openTime: hours?.open || "09:00",
      closeTime: hours?.close || "18:00",
      managerUserId: branch.managerUserId || "",
      status: branch.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const payload = {
      name: form.name,
      code: form.code,
      address: form.address || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      timezone: form.timezone || undefined,
      workingHours: workingHoursFromForm(form),
      managerUserId: form.managerUserId || null,
    };
    try {
      if (editingBranch) {
        await updateMutation.mutateAsync({
          id: editingBranch.id,
          data: {
            ...payload,
            status: form.status,
          },
        });
      } else {
        await createMutation.mutateAsync(payload);
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

  const handleToggleStatus = async (branch: BranchResponse) => {
    const nextStatus = branch.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const label = nextStatus === "INACTIVE" ? "deactivate" : "activate";
    if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} branch "${branch.name}"?`)) {
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: branch.id,
        data: { status: nextStatus },
      });
    } catch {
      alert(`Failed to ${label} branch.`);
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
                <TableHead>Email</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-red-600">
                    <AlertCircle className="w-5 h-5 inline mr-2" />
                    Failed to load branches.
                    <Button variant="link" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-text-secondary">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No branches found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono">{b.code}</TableCell>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.email || "—"}</TableCell>
                    <TableCell>
                      {b.manager ? (
                        <div>
                          <div className="font-medium">{b.manager.name}</div>
                          <div className="text-xs text-text-secondary">{b.manager.email || ""}</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{b.timezone || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          b.status === "ACTIVE"
                            ? "border-green-500 text-green-700"
                            : b.status === "INACTIVE"
                              ? "border-amber-500 text-amber-700"
                              : undefined
                        }
                      >
                        {b.status || "ACTIVE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title={b.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          onClick={() => handleToggleStatus(b)}
                          disabled={updateMutation.isPending}
                        >
                          <Power
                            className={`h-4 w-4 ${
                              b.status === "ACTIVE" ? "text-amber-600" : "text-green-600"
                            }`}
                          />
                        </Button>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch-phone">Phone</Label>
                <Input
                  id="branch-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-email">Email</Label>
                <Input
                  id="branch-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch-timezone">Timezone</Label>
                <Input
                  id="branch-timezone"
                  value={form.timezone}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  placeholder="Asia/Kolkata"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-manager">Manager</Label>
                <select
                  id="branch-manager"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.managerUserId}
                  onChange={(e) => setForm((f) => ({ ...f, managerUserId: e.target.value }))}
                >
                  <option value="">No manager</option>
                  {managers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.email ? ` (${u.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch-open">Open time</Label>
                <Input
                  id="branch-open"
                  type="time"
                  value={form.openTime}
                  onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-close">Close time</Label>
                <Input
                  id="branch-close"
                  type="time"
                  value={form.closeTime}
                  onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))}
                />
              </div>
            </div>
            {editingBranch && (
              <div className="space-y-2">
                <Label htmlFor="branch-status">Status</Label>
                <select
                  id="branch-status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as "ACTIVE" | "INACTIVE",
                    }))
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}
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
