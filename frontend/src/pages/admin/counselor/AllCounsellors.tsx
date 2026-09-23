import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit3, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
  useDeleteUser,
  useUpdateUserPermissions,
} from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { useCounsellorPerformance } from "@/hooks/useLeads";
import type { Counselor, CounselorStatus } from "@/types/counselor.types";
import { usersApi, type UserResponse } from "@/services/users.api";
import { PermissionMatrix } from "@/components/permissions/PermissionMatrix";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { PageContainer, PageHeader, MetricGrid, FilterToolbar } from "@/components/layout";
import { usePermissions } from "@/hooks/usePermissions";
import { usePasswordRequirements } from "@/hooks/usePasswordRequirements";
import { PasswordRequirementsHint } from "@/components/forms/PasswordRequirementsHint";
import { validatePasswordAgainstPolicy } from "@/utils/password-policy";
import {
  buildPermissionsFromAccess,
  permissionsToAccessState,
  createDefaultAccessState,
  type ItemAccessState,
  type PermissionModuleDefinition,
} from "@/utils/permission-utils";
import {
  COUNSELOR_ITEM_READ_PERMISSIONS,
  COUNSELOR_ITEM_WRITE_PERMISSIONS,
} from "@/constants/counselor-item-permissions";
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

const mapUserStatus = (status: string): CounselorStatus => {
  if (status === "INACTIVE") return "INACTIVE";
  if (status === "BLOCKED") return "BLOCKED";
  return "ACTIVE";
};

const toCounselor = (u: UserResponse): Counselor => ({
  id: u.id,
  name: u.name,
  employeeCode: `CNS-${u.id.slice(-4).toUpperCase()}`,
  email: u.email || "",
  phone: u.phone || "",
  branchId: u.branchId || "",
  branchName: u.branch?.name || "—",
  assignedLeadsCount: 0,
  convertedLeadsCount: 0,
  status: mapUserStatus(u.status),
  createdAt: u.createdAt,
});

export const AllCounsellors: React.FC = () => {
  const { user } = useAuthStore();
  const { canEditItem } = usePermissions();
  const canEditCounsellors = canEditItem("counsellor.all");
  const isCenterManager =
    user?.role === "CENTER_MANAGER" ||
    Boolean(user?.roles?.includes("CENTER_MANAGER"));
  const userBranchId = user?.branchId;

  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();

  const counsellorBranchFilter = isCenterManager
    ? userBranchId || undefined
    : selectedBranchId === "ALL" || !selectedBranchId
      ? undefined
      : selectedBranchId;

  const {
    data: counsellorsResponse,
    isLoading,
    refetch: refetchCounsellors,
  } = useAdminUsers({ role: "COUNSELLOR", limit: 100, branchId: counsellorBranchFilter });

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const updateStatusMutation = useUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();
  const updatePermissionsMutation = useUpdateUserPermissions();

  const { data: catalogRes } = useQuery({
    queryKey: ["permission-catalog", "COUNSELLOR"],
    queryFn: () => usersApi.getPermissionCatalog("COUNSELLOR"),
  });
  const catalog: PermissionModuleDefinition[] = catalogRes?.data ?? [];

  const counselors = useMemo(
    () => (counsellorsResponse?.data || []).map((u) => toCounselor(u)),
    [counsellorsResponse]
  );

  const leadsBranchId = isCenterManager
    ? userBranchId || undefined
    : selectedBranchId === "ALL" || !selectedBranchId
      ? undefined
      : selectedBranchId;

  // Server-side counts (assignedCounsellorId). Avoid client-side lead list —
  // GET /leads rejects limit > 100, which previously left all counts at 0.
  const { data: performanceResponse } = useCounsellorPerformance(leadsBranchId);
  const performanceByCounsellorId = useMemo(() => {
    const rows: Array<{
      counsellorId?: string;
      totalLeads?: number;
      converted?: number;
    }> = Array.isArray(performanceResponse?.data?.counsellors)
      ? performanceResponse.data.counsellors
      : Array.isArray(performanceResponse?.data)
        ? performanceResponse.data
        : [];
    const map = new Map<string, { totalLeads: number; converted: number }>();
    for (const row of rows) {
      if (!row.counsellorId) continue;
      map.set(row.counsellorId, {
        totalLeads: Number(row.totalLeads ?? 0),
        converted: Number(row.converted ?? 0),
      });
    }
    return map;
  }, [performanceResponse]);

  const counselorsWithCounts = useMemo(() => {
    return counselors.map((c) => {
      const perf = performanceByCounsellorId.get(c.id);
      return {
        ...c,
        assignedLeadsCount: perf?.totalLeads ?? 0,
        convertedLeadsCount: perf?.converted ?? 0,
      };
    });
  }, [counselors, performanceByCounsellorId]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState<CounselorStatus>("ACTIVE");
  const [createError, setCreateError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { policy } = usePasswordRequirements();

  const [createItemAccess, setCreateItemAccess] = useState<Record<string, ItemAccessState>>({});

  useEffect(() => {
    if (catalog.length > 0 && Object.keys(createItemAccess).length === 0) {
      setCreateItemAccess(createDefaultAccessState(catalog));
    }
  }, [catalog, createItemAccess]);

  // Edit Modal State
  const [editCounselor, setEditCounselor] = useState<Counselor | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editStatus, setEditStatus] = useState<CounselorStatus>("ACTIVE");
  const [editItemAccess, setEditItemAccess] = useState<Record<string, ItemAccessState>>({});
  const [editPermissions, setEditPermissions] = useState<string[] | null>(null);
  const [editMatrixHydrated, setEditMatrixHydrated] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  useEffect(() => {
    if (!editCounselor) {
      setEditMatrixHydrated(false);
      return;
    }
    // Hydrate matrix once per open once permissions + catalog are ready
    if (editMatrixHydrated || catalog.length === 0 || editPermissions === null) return;
    setEditItemAccess(permissionsToAccessState(editPermissions, catalog));
    setEditMatrixHydrated(true);
  }, [editCounselor, catalog, editPermissions, editMatrixHydrated]);

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

  const counselorPermissionMaps = {
    read: COUNSELOR_ITEM_READ_PERMISSIONS,
    write: COUNSELOR_ITEM_WRITE_PERMISSIONS,
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;
    setCreateError(null);
    setPasswordError(null);

    const passwordToUse = password.trim();
    if (!passwordToUse) {
      setPasswordError("Password is required.");
      return;
    }
    const policyError = validatePasswordAgainstPolicy(passwordToUse, policy);
    if (policyError) {
      setPasswordError(policyError);
      return;
    }

    setIsSubmitting(true);

    const effectiveBranchId = isCenterManager ? (userBranchId || branchId) : branchId;
    if (!effectiveBranchId) {
      setCreateError("Branch assignment is required for counsellors.");
      setIsSubmitting(false);
      return;
    }

    try {
      const permissions = buildPermissionsFromAccess(
        createItemAccess,
        catalog,
        counselorPermissionMaps
      );
      const grantedModules = Object.values(createItemAccess).some((a) => a?.show);
      if (
        grantedModules &&
        !permissions.some((p) => p.startsWith("item.") && !p.endsWith(".write"))
      ) {
        setCreateError(
          "Permissions could not be built from the matrix. Wait for the catalog to load, click Grant all again, then save."
        );
        setIsSubmitting(false);
        return;
      }
      await createUserMutation.mutateAsync({
        name,
        email,
        password: passwordToUse,
        phone,
        roles: ["COUNSELLOR"],
        branchId: effectiveBranchId,
        permissions,
      });
      await refetchCounsellors();
      setShowCreateModal(false);
      resetCreateForm();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string; errors?: { field?: string; message?: string }[] } } };
      const backendErr = apiErr.response?.data;
      let errMsg = backendErr?.message || "Failed to create counsellor.";
      if (backendErr?.errors?.length) {
        errMsg = backendErr.errors.map((e) => e.message).filter(Boolean).join(". ");
        const pwdErr = backendErr.errors.find(
          (e) => e.field === "password" || e.message?.toLowerCase().includes("password")
        );
        if (pwdErr?.message) setPasswordError(pwdErr.message);
      } else if (errMsg.toLowerCase().includes("password")) {
        setPasswordError(errMsg);
      }
      setCreateError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setPasswordError(null);
    setPhone("");
    setBranchId(isCenterManager && userBranchId ? userBranchId : (branches[0]?.id || ""));
    setStatus("ACTIVE");
    setCreateError(null);
    if (catalog.length > 0) {
      setCreateItemAccess(createDefaultAccessState(catalog));
    } else {
      setCreateItemAccess({});
    }
  };

  const handleOpenEditModal = async (c: Counselor) => {
    setEditCounselor(c);
    setEditName(c.name);
    setEditEmail(c.email);
    setEditPhone(c.phone);
    setEditBranchId(c.branchId);
    setEditStatus(c.status === "BLOCKED" ? "INACTIVE" : c.status);
    setEditItemAccess(catalog.length > 0 ? createDefaultAccessState(catalog) : {});
    setEditPermissions(null);
    setEditMatrixHydrated(false);
    setEditError(null);

    try {
      const res = await usersApi.getUserById(c.id);
      if (res.success && res.data?.permissions) {
        setEditPermissions(res.data.permissions);
      } else {
        setEditPermissions([]);
      }
    } catch {
      setEditPermissions([]);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCounselor || !editName || !editEmail) return;

    if (catalog.length === 0 || !editMatrixHydrated) {
      setEditError("Permission catalog is still loading. Please wait and try again.");
      return;
    }

    const permissionsSnapshot = buildPermissionsFromAccess(
      editItemAccess,
      catalog,
      counselorPermissionMaps
    );
    const grantedModules = Object.values(editItemAccess).some((a) => a?.show);
    if (
      grantedModules &&
      !permissionsSnapshot.some((p) => p.startsWith("item.") && !p.endsWith(".write"))
    ) {
      setEditError(
        "Permissions could not be built from the matrix. Wait for the catalog to load, click Grant all again, then save."
      );
      return;
    }

    setEditError(null);
    setIsEditSubmitting(true);

    const phoneDigits = editPhone.replace(/\D/g, "");
    const normalizedPhone =
      phoneDigits.length >= 10 ? phoneDigits.slice(-10) : editPhone.trim() || undefined;

    try {
      // Permissions first — profile validation must not skip grant updates
      await updatePermissionsMutation.mutateAsync({
        id: editCounselor.id,
        data: { permissions: permissionsSnapshot },
      });

      await updateUserMutation.mutateAsync({
        id: editCounselor.id,
        data: {
          name: editName,
          email: editEmail,
          phone: normalizedPhone,
          branchId: editBranchId,
        },
      });

      if (editStatus !== editCounselor.status) {
        await updateStatusMutation.mutateAsync({
          id: editCounselor.id,
          data: {
            status: editStatus === "ACTIVE" ? "ACTIVE" : editStatus === "BLOCKED" ? "BLOCKED" : "INACTIVE",
          },
        });
      }

      await refetchCounsellors();
      setEditCounselor(null);
      setEditPermissions(null);
      setEditMatrixHydrated(false);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setEditError(
        apiErr.response?.data?.message ||
          apiErr.message ||
          "Failed to update counsellor permissions."
      );
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteCounselorId) {
      try {
        await deleteUserMutation.mutateAsync(deleteCounselorId);
        await refetchCounsellors();
      } finally {
        setDeleteCounselorId(null);
      }
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

  const metrics = [
    { label: "Total", value: totalCount },
    { label: "Active", value: activeCount },
    { label: "Assigned Leads", value: totalLeads },
    { label: "Converted", value: totalConverted },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Counsellors"
        actions={
          <PermissionGate itemKey="counsellor.all" mode="write">
            <Button
              size="sm"
              onClick={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-xs rounded-xl h-9 px-3.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Counsellor
            </Button>
          </PermissionGate>
        }
      />

      <MetricGrid columns="grid-cols-2 sm:grid-cols-4" density="compact">
        {metrics.map((kpi) => (
          <Card key={kpi.label} size="compact" className="border border-border/80 shadow-2xs bg-card rounded-xl">
            <CardContent size="compact">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </p>
              <h3 className="text-xl font-bold text-foreground mt-0.5 leading-tight tabular-nums">
                {kpi.value}
              </h3>
            </CardContent>
          </Card>
        ))}
      </MetricGrid>

      <FilterToolbar className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-[34px] text-xs bg-muted/30 border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          {!isCenterManager && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-xs font-semibold border border-border rounded-lg px-3 py-1.5 text-foreground bg-muted/30 focus:outline-none focus:bg-background focus:border-primary cursor-pointer h-[34px]"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold border border-border rounded-lg px-3 py-1.5 text-foreground bg-muted/30 focus:outline-none focus:bg-background focus:border-primary cursor-pointer h-[34px]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
      </FilterToolbar>

      <Card className="border border-border shadow-xs bg-card rounded-xl overflow-hidden">
        <div
          className={
            "min-w-0 " +
            "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
            "[&_thead]:bg-muted/50 " +
            "[&_th]:h-9 [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:font-semibold " +
            "[&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground " +
            "[&_th]:border [&_th]:border-border [&_th]:whitespace-nowrap " +
            "[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_td]:border [&_td]:border-border " +
            "[&_tbody_tr]:hover:bg-muted/30 [&_tbody_tr]:transition-colors"
          }
        >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Counsellor</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-center">Leads</TableHead>
              <TableHead className="text-center">Converted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCounselors.length > 0 ? (
              filteredCounselors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.employeeCode}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <p className="text-foreground">{c.email || "—"}</p>
                      <p>{c.phone || "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {branches.find((b) => b.id === c.branchId)?.name || c.branchName || "—"}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-sm font-medium">
                    {c.assignedLeadsCount}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-sm font-medium">
                    {c.convertedLeadsCount}
                  </TableCell>
                  <TableCell>{getStatusBadge(c.status)}</TableCell>
                  <TableCell className="text-right">
                    {canEditCounsellors && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            onClick={() => handleOpenEditModal(c)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteCounselorId(c.id)}
                            className="gap-2 text-rose-600 focus:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">
                  No counsellors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* CREATE COUNSELLOR MODAL */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl border border-border bg-background">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0 text-left">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Add Counsellor
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Create a counsellor account and set their permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {createError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Full Name *
                  </label>
                  <Input
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Email *
                  </label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Phone *
                  </label>
                  <Input
                    type="text"
                    placeholder="10-digit phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      autoComplete="new-password"
                      className="pr-9"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-xs text-destructive mt-1.5">{passwordError}</p>
                  )}
                </div>
              </div>

              <PasswordRequirementsHint />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CounselorStatus)}
                    className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Branch *
                  </label>
                  {isCenterManager ? (
                    <Input
                      value={branches.find((b) => b.id === branchId)?.name || branchId}
                      disabled
                      className="bg-muted text-foreground font-medium h-10"
                    />
                  ) : (
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      required
                      className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="" disabled>
                        Select branch
                      </option>
                      {branches.length === 0 ? (
                        <option value="" disabled>
                          Loading branches...
                        </option>
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

              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-foreground mb-1.5">Permissions</p>
                <p className="text-[11px] text-muted-foreground mb-3">
                  By default, new counsellors see Dashboard, ASK ME, and Settings. Enable Read/Edit
                  to grant more access.
                </p>
                <PermissionMatrix
                  role="COUNSELLOR"
                  value={createItemAccess}
                  onChange={setCreateItemAccess}
                  catalog={catalog}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-3.5 border-t border-border bg-muted/40 shrink-0 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <PermissionGate itemKey="counsellor.all" mode="write">
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </PermissionGate>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT COUNSELLOR MODAL */}
      <Dialog open={!!editCounselor} onOpenChange={(open) => !open && setEditCounselor(null)}>
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl border border-border bg-background">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0 text-left">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Edit Counsellor
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Update profile, branch, and permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Full Name *
                  </label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Code
                  </label>
                  <Input
                    value={editCounselor?.employeeCode || ""}
                    disabled
                    className="bg-muted font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Phone *
                  </label>
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
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as CounselorStatus)}
                    className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Branch *
                  </label>
                  {isCenterManager ? (
                    <Input
                      value={branches.find((b) => b.id === editBranchId)?.name || editBranchId}
                      disabled
                      className="bg-muted text-foreground font-medium h-10"
                    />
                  ) : (
                    <select
                      value={editBranchId}
                      onChange={(e) => setEditBranchId(e.target.value)}
                      required
                      className="w-full h-10 px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="" disabled>
                        Select branch
                      </option>
                      {branches.length === 0 ? (
                        <option value="" disabled>
                          Loading branches...
                        </option>
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

              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-foreground mb-3">Permissions</p>
                <PermissionMatrix
                  role="COUNSELLOR"
                  value={editItemAccess}
                  onChange={setEditItemAccess}
                  catalog={catalog}
                  disabled={isEditSubmitting || !editMatrixHydrated}
                />
              </div>

              {editError && (
                <p className="text-sm text-rose-600 font-medium">{editError}</p>
              )}
            </div>

            <DialogFooter className="px-6 py-3.5 border-t border-border bg-muted/40 shrink-0 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditCounselor(null)}
                disabled={isEditSubmitting}
              >
                Cancel
              </Button>
              <PermissionGate itemKey="counsellor.all" mode="write">
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white"
                  disabled={isEditSubmitting || !editMatrixHydrated}
                >
                  {isEditSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </PermissionGate>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deleteCounselorId} onOpenChange={(open) => !open && setDeleteCounselorId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Delete Counsellor
            </DialogTitle>
            <DialogDescription>
              This will remove the counsellor from active assignments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={() => setDeleteCounselorId(null)}>
              Cancel
            </Button>
            <PermissionGate itemKey="counsellor.all" mode="write">
              <Button variant="destructive" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
