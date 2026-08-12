import React, { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  UserCheck, 
  Mail, 
  Phone, 
  Building2, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  TrendingUp,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { useCounselorStore } from "@/store/counselor.store";
import type { Counselor, CounselorStatus } from "@/types/counselor.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const AllCounsellors: React.FC = () => {
  const { counselors, isLoading, fetchCounselors, addCounselor, updateCounselor, deleteCounselor } = useCounselorStore();

  useEffect(() => {
    fetchCounselors();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [branchName, setBranchName] = useState("Bengaluru Main Campus");
  const [status, setStatus] = useState<CounselorStatus>("ACTIVE");

  // Edit Modal State
  const [editCounselor, setEditCounselor] = useState<Counselor | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [editStatus, setEditStatus] = useState<CounselorStatus>("ACTIVE");

  // Delete Modal State
  const [deleteCounselorId, setDeleteCounselorId] = useState<string | null>(null);

  // Filtered List
  const filteredCounselors = counselors.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);

    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Metrics
  const totalCount = counselors.length;
  const activeCount = counselors.filter((c) => c.status === "ACTIVE").length;
  const totalLeads = counselors.reduce((acc, c) => acc + c.assignedLeadsCount, 0);
  const totalEnrolled = counselors.reduce((acc, c) => acc + c.activeStudentsCount, 0);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;

    await addCounselor({
      name,
      employeeCode: employeeCode || `CNS-${Math.floor(100 + Math.random() * 900)}`,
      email,
      phone,
      branchName,
      status,
    });

    setShowCreateModal(false);
    resetCreateForm();
  };

  const resetCreateForm = () => {
    setName("");
    setEmployeeCode("");
    setEmail("");
    setPhone("");
    setBranchName("Bengaluru Main Campus");
    setStatus("ACTIVE");
  };

  const handleOpenEditModal = (c: Counselor) => {
    setEditCounselor(c);
    setEditName(c.name);
    setEditCode(c.employeeCode);
    setEditEmail(c.email);
    setEditPhone(c.phone);
    setEditBranch(c.branchName);
    setEditStatus(c.status);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCounselor || !editName || !editEmail) return;

    await updateCounselor(editCounselor.id, {
      name: editName,
      employeeCode: editCode,
      email: editEmail,
      phone: editPhone,
      branchName: editBranch,
      status: editStatus,
    });

    setEditCounselor(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteCounselorId) {
      await deleteCounselor(deleteCounselorId);
      setDeleteCounselorId(null);
    }
  };

  const getStatusBadge = (st: CounselorStatus) => {
    switch (st) {
      case "ACTIVE":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>;
      case "ON_LEAVE":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">On Leave</Badge>;
      case "INACTIVE":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Inactive</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-[#1769AA]" />
            Counsellor Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and monitor academy counsellors, lead allocations, and student conversions.
          </p>
        </div>

        <Button
          onClick={() => {
            resetCreateForm();
            setShowCreateModal(true);
          }}
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white gap-2 transition-colors self-start md:self-auto"
        >
          <Plus size={16} /> Add Counsellor
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Counsellors</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{totalCount}</h3>
              <p className="text-xs text-muted-foreground mt-1">Registered Counsellors</p>
            </div>
            <div className="p-3 bg-[#1769AA]/10 rounded-xl text-[#1769AA]">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Staff</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{activeCount}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Available for Follow-up
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assigned Leads</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{totalLeads}</h3>
              <p className="text-xs text-muted-foreground mt-1">In Active Pipeline</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Converted Enrolments</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{totalEnrolled}</h3>
              <p className="text-xs text-muted-foreground mt-1">Active Students</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search counsellor name, code, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-bg-secondary/50 border-border/60"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 py-2 text-sm rounded-md border border-border bg-bg-primary font-medium w-full sm:w-44 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Counsellors Data Table */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-bg-tertiary/50">
            <TableRow>
              <TableHead className="font-semibold text-text-primary">Counsellor</TableHead>
              <TableHead className="font-semibold text-text-primary">Contact Info</TableHead>
              <TableHead className="font-semibold text-text-primary">Branch</TableHead>
              <TableHead className="font-semibold text-text-primary">Assigned Leads</TableHead>
              <TableHead className="font-semibold text-text-primary">Active Students</TableHead>
              <TableHead className="font-semibold text-text-primary">Status</TableHead>
              <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-text-muted">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-[#1769AA]" />
                    Loading counsellors...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCounselors.length > 0 ? (
              filteredCounselors.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1769AA]/10 text-[#1769AA] font-bold text-sm flex items-center justify-center border border-[#1769AA]/20">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-text-primary block">{c.name}</span>
                        <span className="font-mono text-xs text-[#1769AA] font-bold">{c.employeeCode}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs text-text-secondary">
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {c.email}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {c.phone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-text-primary">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> {c.branchName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {c.assignedLeadsCount} Leads
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {c.activeStudentsCount} Students
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(c.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-text-primary">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleOpenEditModal(c)} className="gap-2 cursor-pointer">
                          <Edit3 className="h-4 w-4 text-[#1769AA]" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteCounselorId(c.id)} 
                          className="gap-2 text-rose-600 focus:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" /> Delete / Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No counsellors found matching search criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* CREATE COUNSELLOR MODAL */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-text-primary">
              <UserCheck className="h-5 w-5 text-[#1769AA]" />
              Add New Counsellor
            </DialogTitle>
            <DialogDescription>
              Register a new counsellor to manage student enquiries, admissions, and batch allocations.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Full Name *</label>
              <Input
                placeholder="e.g. Kavita Nair"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Employee Code</label>
                <Input
                  placeholder="e.g. CNS-104"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CounselorStatus)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Email Address *</label>
              <Input
                type="email"
                placeholder="e.g. kavita.nair@aadya.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Phone Number *</label>
              <Input
                type="text"
                placeholder="e.g. +91 98765 11223"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Assigned Branch</label>
              <select
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="Bengaluru Main Campus">Bengaluru Main Campus</option>
                <option value="North Branch - Indiranagar">North Branch - Indiranagar</option>
              </select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#F39A16] text-white">
                Create Counsellor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT COUNSELLOR MODAL */}
      <Dialog open={!!editCounselor} onOpenChange={(open) => !open && setEditCounselor(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-text-primary">
              <Edit3 className="h-5 w-5 text-[#1769AA]" />
              Edit Counsellor Details
            </DialogTitle>
            <DialogDescription>
              Update counsellor profile settings, contact information, and operating status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Full Name *</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Employee Code</label>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as CounselorStatus)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Email Address *</label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Phone Number *</label>
              <Input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Assigned Branch</label>
              <select
                value={editBranch}
                onChange={(e) => setEditBranch(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="Bengaluru Main Campus">Bengaluru Main Campus</option>
                <option value="North Branch - Indiranagar">North Branch - Indiranagar</option>
              </select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditCounselor(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#F39A16] text-white">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deleteCounselorId} onOpenChange={(open) => !open && setDeleteCounselorId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Counsellor
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this counsellor profile? This action will remove them from active counsellor assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={() => setDeleteCounselorId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Counsellor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
