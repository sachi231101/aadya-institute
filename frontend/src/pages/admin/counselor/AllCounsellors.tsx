import React, { useState, useEffect, useMemo } from "react";
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
  Loader2,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { useCounselorStore } from "@/store/counselor.store";
import { useBranches } from "@/hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { useUpdateUserPermissions } from "@/hooks/useUsers";
import { useLeads } from "@/hooks/useLeads";
import type { Lead } from "@/services/leads.api";
import type { Counselor, CounselorStatus } from "@/types/counselor.types";
import {
  COUNSELLOR_MODULE_OPTIONS,
  ALL_COUNSELLOR_MODULE_KEYS,
} from "@/constants/module-permissions";
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
  const {
    counselors,
    isLoading,
    fetchCounselors,
    addCounselor,
    updateCounselor,
    deleteCounselor,
  } = useCounselorStore();
  const { user } = useAuthStore();
  const isCenterManager = user?.role === "CENTER_MANAGER";
  const userBranchId = user?.branchId;

  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();

  const leadsBranchId = isCenterManager
    ? userBranchId || undefined
    : selectedBranchId === "ALL" || !selectedBranchId
      ? undefined
      : selectedBranchId;

  const { data: leadsResponse } = useLeads({ limit: 500, branchId: leadsBranchId });
  const allLeads: Lead[] = (leadsResponse?.data as Lead[]) || [];

  useEffect(() => {
    if (isCenterManager) {
      fetchCounselors(userBranchId || undefined);
    } else {
      fetchCounselors(selectedBranchId === "ALL" ? undefined : selectedBranchId);
    }
  }, [isCenterManager, userBranchId, selectedBranchId, fetchCounselors]);

  const counselorsWithCounts = useMemo(() => {
    return counselors.map((c) => {
      const mine = allLeads.filter(
        (l) => l.assignedCounsellorId === c.id || l.assignedCounsellor?.id === c.id
      );
      return {
        ...c,
        assignedLeadsCount: mine.length,
        convertedLeadsCount: mine.filter((l) => l.stage === "CONVERTED").length,
      };
    });
  }, [counselors, allLeads]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState<CounselorStatus>("ACTIVE");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Module permissions state (create)
  const [selectedModules, setSelectedModules] = useState<string[]>([...ALL_COUNSELLOR_MODULE_KEYS]);
  const toggleCreateModule = (key: string) =>
    setSelectedModules((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  // Edit Modal State
  const [editCounselor, setEditCounselor] = useState<Counselor | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editStatus, setEditStatus] = useState<CounselorStatus>("ACTIVE");
  const [editModules, setEditModules] = useState<string[]>([...ALL_COUNSELLOR_MODULE_KEYS]);
  const toggleEditModule = (key: string) =>
    setEditModules((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  const updatePermissionsMutation = useUpdateUserPermissions();

  // Delete Modal State
  const [deleteCounselorId, setDeleteCounselorId] = useState<string | null>(null);

  // Branch-filtered Counselors
  const branchCounselors = counselorsWithCounts.filter((c) => {
    if (isCenterManager) return true;
    return (
      selectedBranchId === "ALL" ||
      c.branchId === selectedBranchId ||
      branches.find((b) => b.id === selectedBranchId)?.name.toLowerCase().includes(c.branchName?.toLowerCase() || "")
    );
  });

  // Filtered List (Search + Status + Branch)
  const filteredCounselors = branchCounselors.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);

    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Metrics
  const totalCount = branchCounselors.length;
  const activeCount = branchCounselors.filter((c) => c.status === "ACTIVE").length;
  const totalLeads = branchCounselors.reduce((acc, c) => acc + c.assignedLeadsCount, 0);
  const totalConverted = branchCounselors.reduce((acc, c) => acc + c.convertedLeadsCount, 0);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;
    setCreateError(null);
    setIsSubmitting(true);

    const selectedBranch = branches.find((b) => b.id === branchId);

    const created = await addCounselor({
      name,
      email,
      password: password || undefined,
      phone,
      branchId: branchId || (branches[0]?.id || ""),
      branchName: selectedBranch?.name || branches[0]?.name || "—",
      status,
      modulePermissions: selectedModules,
    });

    setIsSubmitting(false);

    if (created) {
      setShowCreateModal(false);
      resetCreateForm();
    } else {
      const storeErr = useCounselorStore.getState().error;
      setCreateError(storeErr || "Failed to create counsellor.");
    }
  };

  const resetCreateForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setBranchId(isCenterManager && userBranchId ? userBranchId : (branches[0]?.id || ""));
    setStatus("ACTIVE");
    setCreateError(null);
    setSelectedModules([...ALL_COUNSELLOR_MODULE_KEYS]);
  };

  const handleOpenEditModal = async (c: Counselor) => {
    setEditCounselor(c);
    setEditName(c.name);
    setEditEmail(c.email);
    setEditPhone(c.phone);
    setEditBranchId(c.branchId);
    setEditStatus(c.status === "BLOCKED" ? "INACTIVE" : c.status);

    // Fetch the user's current module permissions from the API
    try {
      const { usersApi } = await import("@/services/users.api");
      const res = await usersApi.getUserById(c.id);
      if (res.success && res.data?.modulePermissions?.length > 0) {
        setEditModules(res.data.modulePermissions);
      } else {
        setEditModules([...ALL_COUNSELLOR_MODULE_KEYS]);
      }
    } catch {
      setEditModules([...ALL_COUNSELLOR_MODULE_KEYS]);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCounselor || !editName || !editEmail) return;

    await updateCounselor(editCounselor.id, {
      name: editName,
      email: editEmail,
      phone: editPhone,
      branchId: editBranchId,
      branchName: branches.find((b) => b.id === editBranchId)?.name,
      status: editStatus,
    });

    // Also update module permissions
    try {
      await updatePermissionsMutation.mutateAsync({
        id: editCounselor.id,
        data: { modulePermissions: editModules },
      });
    } catch {
      // Permission update failed — still close modal
    }

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
      case "BLOCKED":
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Blocked</Badge>;
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
              <h3 className="text-2xl font-bold text-text-primary mt-1">{totalConverted}</h3>
              <p className="text-xs text-muted-foreground mt-1">Converted Leads</p>
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
          {!isCenterManager && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-10 px-3 py-2 text-sm rounded-md border border-border bg-bg-primary font-semibold w-full sm:w-52 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
            >
              <option value="ALL">🌐 All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name}
                </option>
              ))}
              {branches.length === 0 && (
                <>
                  <option value="b-central">📍 Bengaluru Central</option>
                  <option value="b-malleswaram">📍 Malleswaram</option>
                  <option value="b-ramamurthy">📍 Ramamurthy Nagar</option>
                </>
              )}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 py-2 text-sm rounded-md border border-border bg-bg-primary font-medium w-full sm:w-44 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
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
              <TableHead className="font-semibold text-text-primary">Converted</TableHead>
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
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> {branches.find(b => b.id === c.branchId)?.name || "Unknown Branch"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {c.assignedLeadsCount} Leads
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {c.convertedLeadsCount} Converted
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
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200 bg-white">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white shrink-0 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <UserCheck className="h-5 w-5 text-[#1769AA]" />
              Add New Counsellor
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register a new counsellor to manage student enquiries, admissions, and batch allocations.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-in fade-in">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name *</label>
                  <Input
                    placeholder="e.g. Kavita Nair"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <Input
                    type="email"
                    placeholder="e.g. kavita.nair@aadya.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <Input
                    type="text"
                    placeholder="e.g. 9876511223 (10 digits)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Account Password</label>
                  <Input
                    type="password"
                    placeholder="Password@123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Operating Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CounselorStatus)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Branch</label>
                  {isCenterManager ? (
                    <Input
                      value={branches.find((b) => b.id === branchId)?.name || branchId}
                      disabled
                      className="bg-slate-100 text-slate-700 font-medium h-10"
                    />
                  ) : (
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      required
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                    >
                      <option value="" disabled>Select a branch</option>
                      {branches.length === 0 ? (
                        <option value="" disabled>Loading branches...</option>
                      ) : (
                        branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </div>
              </div>

              {/* ─── Module Permissions Section ─── */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-blue-100 text-[#1769AA] flex items-center justify-center">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Module Permissions</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedModules([...ALL_COUNSELLOR_MODULE_KEYS])}
                      className="text-[11px] font-bold text-[#1769AA] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedModules([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800 flex items-center gap-1.5 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>Only checked modules will be visible in the Counsellor portal sidebar.</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {COUNSELLOR_MODULE_OPTIONS.map((mod) => {
                    const isChecked = selectedModules.includes(mod.key);
                    const Icon = mod.icon;
                    return (
                      <div
                        key={mod.key}
                        onClick={() => toggleCreateModule(mod.key)}
                        className={`group flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${isChecked
                          ? "bg-blue-50/50 border-[#1769AA]/40 shadow-2xs"
                          : "bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100"
                          }`}
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-[#1769AA] border-[#1769AA] text-white" : "border-slate-300 bg-white"
                            }`}
                        >
                          {isChecked && (
                            <svg className="h-2.5 w-2.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${isChecked ? "bg-blue-100 text-[#1769AA]" : "bg-slate-100 text-slate-400"
                            }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-bold block truncate ${isChecked ? "text-slate-900" : "text-slate-600"}`}>
                            {mod.label}
                          </span>
                          <p className="text-[10px] text-slate-400 truncate">{mod.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#F39A16] text-white gap-2 font-bold" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create Counsellor"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT COUNSELLOR MODAL */}
      <Dialog open={!!editCounselor} onOpenChange={(open) => !open && setEditCounselor(null)}>
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200 bg-white">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white shrink-0 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Edit3 className="h-5 w-5 text-[#1769AA]" />
              Edit Counsellor Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update counsellor profile settings, contact information, and operating status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name *</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Display Code</label>
                  <Input
                    value={editCounselor?.employeeCode || ""}
                    disabled
                    className="bg-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <Input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as CounselorStatus)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Branch</label>
                  {isCenterManager ? (
                    <Input
                      value={branches.find((b) => b.id === editBranchId)?.name || editBranchId}
                      disabled
                      className="bg-slate-100 text-slate-700 font-medium h-10"
                    />
                  ) : (
                    <select
                      value={editBranchId}
                      onChange={(e) => setEditBranchId(e.target.value)}
                      required
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                    >
                      <option value="" disabled>Select a branch</option>
                      {branches.length === 0 ? (
                        <option value="" disabled>Loading branches...</option>
                      ) : (
                        branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </div>
              </div>

              {/* ─── Module Permissions Section ─── */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-blue-100 text-[#1769AA] flex items-center justify-center">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Module Permissions</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditModules([...ALL_COUNSELLOR_MODULE_KEYS])}
                      className="text-[11px] font-bold text-[#1769AA] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setEditModules([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {COUNSELLOR_MODULE_OPTIONS.map((mod) => {
                    const isChecked = editModules.includes(mod.key);
                    const Icon = mod.icon;
                    return (
                      <div
                        key={mod.key}
                        onClick={() => toggleEditModule(mod.key)}
                        className={`group flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${isChecked
                          ? "bg-blue-50/50 border-[#1769AA]/40 shadow-2xs"
                          : "bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100"
                          }`}
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-[#1769AA] border-[#1769AA] text-white" : "border-slate-300 bg-white"
                            }`}
                        >
                          {isChecked && (
                            <svg className="h-2.5 w-2.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${isChecked ? "bg-blue-100 text-[#1769AA]" : "bg-slate-100 text-slate-400"
                            }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-bold block truncate ${isChecked ? "text-slate-900" : "text-slate-600"}`}>
                            {mod.label}
                          </span>
                          <p className="text-[10px] text-slate-400 truncate">{mod.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditCounselor(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1769AA] hover:bg-[#F39A16] text-white font-bold">
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
