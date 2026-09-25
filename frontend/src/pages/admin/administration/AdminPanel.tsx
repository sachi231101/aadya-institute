import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreVertical, Eye, Edit, Shield, Key, Trash2, Loader2,
  Users, Building2, MapPin, Search, Plus, Mail, Phone,
  UserCheck, AlertTriangle, UserPlus, Ban, Save, Copy, Check,
} from "lucide-react";

import { useNotificationStore } from "@/store/notification.store";
import { useAdminUsers, useDeleteUser, useUpdateUserBranchAccess, useResetUserPassword } from "@/hooks/useUsers";
import { useBranches, useBranchStats } from "@/hooks/useBranches";
import {
  useInvitations,
  useCreateInvitation,
} from "@/hooks/useInvitations";
import type { UserResponse } from "@/services/users.api";
import type { BranchResponse } from "@/services/branches.api";
import { usePasswordRequirements } from "@/hooks/usePasswordRequirements";
import { validatePasswordAgainstPolicy } from "@/utils/password-policy";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageContainer, PageHeader } from "@/components/layout";

type RoleFilter = "all" | "CENTER_MANAGER" | "COUNSELLOR" | "FACULTY" | "ADMIN";

const STAFF_ROLES = ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"] as const;
const BRANCH_REQUIRED_ROLES = ["CENTER_MANAGER", "COUNSELLOR", "FACULTY"];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  CENTER_MANAGER: "Center Manager",
  COUNSELLOR: "Counsellor",
  FACULTY: "Faculty",
};

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "All Roles" },
  { key: "CENTER_MANAGER", label: "Center Manager" },
  { key: "COUNSELLOR", label: "Counsellor" },
  { key: "FACULTY", label: "Faculty" },
  { key: "ADMIN", label: "Admin" },
];

const getPrimaryRoleLabel = (roles: string[]): string => {
  if (roles.includes("ADMIN")) return ROLE_LABELS.ADMIN;
  if (roles.includes("CENTER_MANAGER")) return ROLE_LABELS.CENTER_MANAGER;
  if (roles.includes("COUNSELLOR")) return ROLE_LABELS.COUNSELLOR;
  if (roles.includes("FACULTY")) return ROLE_LABELS.FACULTY;
  return roles[0] || "Staff";
};

const isStaffUser = (user: UserResponse): boolean =>
  user.roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r));

const getStatusColor = (status: string) => {
  if (status === "ACTIVE") return "bg-emerald-500";
  if (status === "INACTIVE") return "bg-slate-400";
  if (status === "BLOCKED") return "bg-red-500";
  return "bg-slate-400";
};

const getStatusText = (status: string) => {
  if (status === "ACTIVE") return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/40";
  if (status === "INACTIVE") return "text-slate-600 dark:text-slate-400 bg-muted/40 border-border";
  if (status === "BLOCKED") return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200/60 dark:border-red-900/40";
  return "text-slate-600 dark:text-slate-400 bg-muted/40 border-border";
};

const ManagerCard = ({
  manager,
  branch,
  staffUsers,
  onAction,
}: {
  manager: UserResponse;
  branch?: BranchResponse;
  staffUsers: UserResponse[];
  onAction: (id: string, action: string) => void;
}) => {
  const { data: statsResponse } = useBranchStats(branch?.id);
  const stats = statsResponse?.data;

  const branchId = branch?.id;
  const studentCount = stats?.totalStudents ?? 0;
  const batchCount = stats?.totalBatches ?? 0;
  const facultyFromRoster = branchId
    ? staffUsers.filter((u) => u.roles.includes("FACULTY") && u.branchId === branchId).length
    : 0;
  const facultyCount = Math.max(facultyFromRoster, stats?.totalFaculty ?? 0);
  const counsellorFromRoster = branchId
    ? staffUsers.filter((u) => u.roles.includes("COUNSELLOR") && u.branchId === branchId).length
    : 0;
  const counsellorCount = Math.max(counsellorFromRoster, stats?.totalCounsellors ?? 0);

  return (
    <Card className="border border-border bg-card shadow-xs hover:shadow-md hover:border-primary/40 transition-all rounded-xl overflow-hidden flex flex-col h-full group">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="p-5 pb-3.5">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/50 flex items-center justify-center text-primary dark:text-sky-400 overflow-hidden shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground leading-tight truncate tracking-tight">{manager.name}</h3>
                <p className="text-xs font-semibold text-primary/80 dark:text-sky-400/90 mb-1">
                  {getPrimaryRoleLabel(manager.roles)}
                </p>
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />{" "}
                    <span className="truncate">{manager.email || "No Email"}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-muted-foreground shrink-0" />{" "}
                    <span>{manager.phone || "No Phone"}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-start gap-1">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 uppercase tracking-wider ${getStatusText(manager.status)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(manager.status)} animate-pulse`} />
                {manager.status}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => onAction(manager.id, "viewManager")}>
                    <Eye className="h-4 w-4 mr-2" /> View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction(manager.id, "editManager")}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction(manager.id, "changeBranch")}>
                    <Building2 className="h-4 w-4 mr-2" />{" "}
                    {branch ? "Change Branch" : "Assign Branch"}
                  </DropdownMenuItem>
                  {branch && (
                    <DropdownMenuItem
                      className="text-amber-700 focus:text-amber-700 dark:text-amber-400 dark:focus:text-amber-400 cursor-pointer"
                      onClick={() => onAction(manager.id, "removeBranch")}
                    >
                      <Ban className="h-4 w-4 mr-2" /> Remove from Branch
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onAction(manager.id, "editAccess")}>
                    <Shield className="h-4 w-4 mr-2" /> Edit Branch Access
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction(manager.id, "resetPassword")}>
                    <Key className="h-4 w-4 mr-2" /> Reset Password
                  </DropdownMenuItem>
                  {!manager.roles?.includes("ADMIN") && manager.email !== "admin@aadya.in" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                        onClick={() => onAction(manager.id, "delete")}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="px-3.5 py-3 mx-4 rounded-xl bg-muted/40 border border-border/70 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Assigned Branch
            </p>
            {branch && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-500/10 dark:text-amber-400"
                onClick={() => onAction(manager.id, "removeBranch")}
              >
                <Ban className="h-3 w-3 mr-1" />
                Remove
              </Button>
            )}
          </div>
          {branch ? (
            <>
              <h4 className="text-xs sm:text-sm font-bold text-foreground leading-tight flex items-center gap-1.5 truncate">
                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{branch.name}</span>
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{branch.address || "No Location"}</span>
                <span className="text-muted-foreground/40">|</span>
                <span className="font-mono font-semibold text-foreground/80">{branch.code}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs py-1">
                <AlertTriangle className="h-3.5 w-3.5" /> No Branch Assigned
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold rounded-lg"
                onClick={() => onAction(manager.id, "changeBranch")}
              >
                Assign
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 pt-3.5 mt-auto">
          <div className="grid grid-cols-4 gap-1.5 mb-3.5 text-center">
            <div className="flex flex-col items-center p-2 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Students</span>
              <span className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{studentCount}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Faculty</span>
              <span className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{facultyCount}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Counsels</span>
              <span className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{counsellorCount}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Batches</span>
              <span className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{batchCount}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();

  const { data: usersResponse, isLoading: usersLoading } = useAdminUsers({ limit: 100 });
  const { data: branchesResponse, isLoading: branchesLoading } = useBranches({ limit: 100 });
  const { data: invitationsResponse } = useInvitations({ limit: 50 });
  const deleteUserMutation = useDeleteUser();
  const resetPasswordMutation = useResetUserPassword();
  const { policy, requirements } = usePasswordRequirements();
  const createInvitationMutation = useCreateInvitation();
  const updateBranchAccessMutation = useUpdateUserBranchAccess();

  const allUsers = usersResponse?.data ?? [];
  const allBranches = branchesResponse?.data ?? [];
  const invitations = invitationsResponse?.data ?? [];

  const staffUsers = useMemo(() => allUsers.filter(isStaffUser), [allUsers]);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    roleName: "CENTER_MANAGER",
    branchId: "",
  });
  const [accessUserId, setAccessUserId] = useState<string | null>(null);
  const [accessBranchIds, setAccessBranchIds] = useState<string[]>([]);

  const [activeModal, setActiveModal] = useState<
    "delete" | "resetPassword" | "changeBranch" | "removeBranch" | null
  >(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [newBranchId, setNewBranchId] = useState("");

  const selectedManager = staffUsers.find((a) => a.id === selectedManagerId);

  const filteredStaff = useMemo(() => {
    return staffUsers.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (roleFilter !== "all" && !m.roles.includes(roleFilter)) return false;
      return true;
    });
  }, [staffUsers, searchQuery, roleFilter]);

  const activeStaffCount = staffUsers.filter((m) => m.status === "ACTIVE").length;
  const assignedBranchesCount = new Set(staffUsers.map((m) => m.branchId).filter(Boolean)).size;

  const handleAction = (id: string, action: string) => {
    if (action === "viewManager") {
      navigate(`/admin/administration/admins/${id}`);
      return;
    }
    if (action === "editManager") {
      navigate(`/admin/administration/admins/${id}/edit`);
      return;
    }
    if (action === "editAccess") {
      const user = staffUsers.find((m) => m.id === id);
      if (!user) return;
      setAccessUserId(user.id);
      const ids =
        user.branchAccesses?.map((b) => b.branchId) ??
        (user.branchId ? [user.branchId] : []);
      setAccessBranchIds(ids);
      return;
    }
    setSelectedManagerId(id);
    setActiveModal(action as "delete" | "resetPassword" | "changeBranch" | "removeBranch");
    setDeleteConfirmText("");
    setNewPassword("");
    setConfirmPassword("");
    setRevealedPassword(null);
    setPasswordCopied(false);
    setResetPasswordError(null);
    setNewBranchId(staffUsers.find((m) => m.id === id)?.branchId || "");
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedManagerId(null);
    setNewPassword("");
    setConfirmPassword("");
    setRevealedPassword(null);
    setPasswordCopied(false);
    setResetPasswordError(null);
  };

  const handleResetPasswordSubmit = () => {
    if (!selectedManagerId) return;
    if (!newPassword || newPassword !== confirmPassword) {
      setResetPasswordError("Passwords do not match.");
      return;
    }
    const policyError = validatePasswordAgainstPolicy(newPassword, policy);
    if (policyError) {
      setResetPasswordError(policyError);
      return;
    }
    setResetPasswordError(null);
    resetPasswordMutation.mutate(
      { id: selectedManagerId, password: newPassword },
      {
        onSuccess: (res) => {
          const temp = res.data?.temporaryPassword || newPassword;
          setRevealedPassword(temp);
          setNewPassword("");
          setConfirmPassword("");
          addNotification("Password reset successfully. Copy it now — it won't be shown again.", "success");
        },
        onError: (err: any) => {
          setResetPasswordError(
            err?.response?.data?.message || "Failed to reset password."
          );
        },
      }
    );
  };

  const handleCopyRevealedPassword = async () => {
    if (!revealedPassword) return;
    try {
      await navigator.clipboard.writeText(revealedPassword);
      setPasswordCopied(true);
      addNotification("Password copied to clipboard.", "success");
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch {
      addNotification("Could not copy password.", "error");
    }
  };

  const handleDelete = () => {
    if (selectedManagerId && deleteConfirmText === "DELETE") {
      deleteUserMutation.mutate(selectedManagerId, {
        onSuccess: () => {
          addNotification("User deleted successfully.", "success");
          closeModal();
        },
        onError: (err: any) =>
          addNotification(err?.response?.data?.message || "Deletion failed.", "error"),
      });
    }
  };

  const handleChangeBranchSubmit = () => {
    if (!selectedManagerId || !newBranchId.trim()) {
      addNotification("Please select a branch.", "error");
      return;
    }
    const user = staffUsers.find((m) => m.id === selectedManagerId);
    const existingExtra =
      user?.branchAccesses?.map((b) => b.branchId).filter((id) => id !== user.branchId) ?? [];
    const branchIds = [...new Set([newBranchId, ...existingExtra])];

    updateBranchAccessMutation.mutate(
      { id: selectedManagerId, data: { branchIds } },
      {
        onSuccess: () => {
          addNotification("Branch assigned successfully.", "success");
          closeModal();
        },
        onError: (err: any) =>
          addNotification(err?.response?.data?.message || "Failed to update branch.", "error"),
      }
    );
  };

  const handleRemoveBranchSubmit = () => {
    if (!selectedManagerId) return;
    const user = staffUsers.find((m) => m.id === selectedManagerId);
    const remaining =
      user?.branchAccesses
        ?.map((b) => b.branchId)
        .filter((id) => id !== user.branchId) ?? [];

    updateBranchAccessMutation.mutate(
      { id: selectedManagerId, data: { branchIds: remaining } },
      {
        onSuccess: () => {
          addNotification("User removed from branch.", "success");
          closeModal();
        },
        onError: (err: any) =>
          addNotification(
            err?.response?.data?.message || "Failed to remove branch assignment.",
            "error"
          ),
      }
    );
  };

  const handleInvite = () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      addNotification("Name and email are required.", "error");
      return;
    }
    if (
      BRANCH_REQUIRED_ROLES.includes(inviteForm.roleName) &&
      !inviteForm.branchId.trim()
    ) {
      addNotification("Branch assignment is required for this role.", "error");
      return;
    }
    createInvitationMutation.mutate(
      {
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        phone: inviteForm.phone.trim() || undefined,
        roleName: inviteForm.roleName,
        branchId: inviteForm.branchId || undefined,
        branchIds: inviteForm.branchId ? [inviteForm.branchId] : undefined,
      },
      {
        onSuccess: (res) => {
          const link = res.data?.inviteLink;
          addNotification(
            link
              ? "Invitation sent. Invite link available in response."
              : "Invitation created successfully.",
            "success"
          );
          if (link) {
            void navigator.clipboard?.writeText(link).catch(() => undefined);
          }
          setInviteOpen(false);
          setInviteForm({
            name: "",
            email: "",
            phone: "",
            roleName: "CENTER_MANAGER",
            branchId: "",
          });
        },
        onError: (err: any) =>
          addNotification(err?.response?.data?.message || "Invite failed.", "error"),
      }
    );
  };

  const saveAccess = () => {
    if (!accessUserId) return;
    updateBranchAccessMutation.mutate(
      { id: accessUserId, data: { branchIds: accessBranchIds } },
      {
        onSuccess: () => {
          addNotification("Branch access updated.", "success");
          setAccessUserId(null);
        },
        onError: (err: any) =>
          addNotification(err?.response?.data?.message || "Update failed.", "error"),
      }
    );
  };

  if (usersLoading || branchesLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <h3 className="text-lg font-bold text-foreground">Loading User Data...</h3>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="relative overflow-x-hidden">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2.5">
            <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            User Management
          </span>
        }
        description="Manage staff users, invitations, and branch access."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setInviteOpen(true)}
              className="font-bold h-10 px-5 rounded-xl cursor-pointer"
            >
              <UserPlus className="h-4 w-4 mr-2" /> Invite User
            </Button>
            <Button
              onClick={() => navigate("/admin/administration/admins/new")}
              className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-5 rounded-xl shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-xs hover:shadow-sm rounded-xl bg-card transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 border border-blue-100 dark:border-sky-900/40 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Staff</p>
              <h3 className="text-2xl font-bold text-foreground">{staffUsers.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-xs hover:shadow-sm rounded-xl bg-card transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Active Staff</p>
              <h3 className="text-2xl font-bold text-foreground">{activeStaffCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-xs hover:shadow-sm rounded-xl bg-card transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 rounded-xl">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Branches Assigned</p>
              <h3 className="text-2xl font-bold text-foreground">{assignedBranchesCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-xs hover:shadow-sm rounded-xl bg-card transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40 rounded-xl">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Pending Invites</p>
              <h3 className="text-2xl font-bold text-foreground">{invitations.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-card text-foreground placeholder:text-muted-foreground shadow-xs"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar self-start md:self-auto">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setRoleFilter(f.key)}
                className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all whitespace-nowrap border cursor-pointer ${
                  roleFilter === f.key
                    ? "bg-sky-50 dark:bg-sky-950/40 text-primary border-primary/40"
                    : "bg-card text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredStaff.length === 0 ? (
        <Card className="border border-border bg-card rounded-xl shadow-xs py-16 text-center">
          <CardContent className="flex flex-col items-center justify-center max-w-sm mx-auto">
            <div className="h-16 w-16 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center mb-4 border border-border">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">No Users Found</h3>
            <p className="text-xs text-muted-foreground mb-6">
              {searchQuery || roleFilter !== "all"
                ? "No users match your search criteria."
                : "Invite or add a staff user to get started."}
            </p>
            <Button onClick={() => setInviteOpen(true)} className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-5 rounded-xl shadow-xs cursor-pointer">
              <UserPlus className="h-4 w-4 mr-2" /> Invite User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredStaff.map((manager) => (
            <ManagerCard
              key={manager.id}
              manager={manager}
              branch={
                allBranches.find((b) => b.id === manager.branchId) ||
                allBranches.find((b) => b.managerUserId === manager.id)
              }
              staffUsers={staffUsers}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-card border-border text-foreground rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Invite User
            </DialogTitle>
            <DialogDescription>
              Send a 7-day invitation. The invitee sets their own password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input
                value={inviteForm.phone}
                onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={inviteForm.roleName}
                onChange={(e) => setInviteForm((f) => ({ ...f, roleName: e.target.value }))}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="CENTER_MANAGER">Center Manager</option>
                <option value="COUNSELLOR">Counsellor</option>
                <option value="FACULTY">Faculty</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Branch
                {BRANCH_REQUIRED_ROLES.includes(inviteForm.roleName) ? " *" : ""}
              </Label>
              <select
                value={inviteForm.branchId}
                onChange={(e) => setInviteForm((f) => ({ ...f, branchId: e.target.value }))}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select branch…</option>
                {allBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              className="bg-primary text-white rounded-xl"
              onClick={handleInvite}
              disabled={createInvitationMutation.isPending}
            >
              {createInvitationMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch access editor */}
      <Dialog open={!!accessUserId} onOpenChange={(open) => !open && setAccessUserId(null)}>
        <DialogContent className="bg-card border-border text-foreground rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle>Edit Branch Access</DialogTitle>
            <DialogDescription>
              Select all branches this user can access.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 py-2">
            {allBranches.map((b) => {
              const checked = accessBranchIds.includes(b.id);
              return (
                <label
                  key={b.id}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 cursor-pointer hover:bg-muted/30"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setAccessBranchIds((prev) =>
                        checked ? prev.filter((id) => id !== b.id) : [...prev, b.id]
                      )
                    }
                  />
                  <span className="text-sm font-semibold">{b.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{b.code}</span>
                </label>
              );
            })}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAccessUserId(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              className="bg-primary text-white rounded-xl"
              onClick={saveAccess}
              disabled={updateBranchAccessMutation.isPending}
            >
              {updateBranchAccessMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "delete"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="bg-card border-border text-foreground rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete User?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This action cannot be undone. All data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <label className="text-xs font-semibold text-foreground">
              Type <strong className="text-red-600 dark:text-red-400">DELETE</strong> to confirm
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="bg-background text-foreground border-border"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirmText !== "DELETE"}
              className="rounded-xl"
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "resetPassword"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="bg-card border-border text-foreground rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {revealedPassword ? "Password Reset Successfully" : "Reset Password"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {revealedPassword
                ? `Copy the new password for ${selectedManager?.name}. It will not be shown again.`
                : `Set a new password for ${selectedManager?.name}.`}
            </DialogDescription>
          </DialogHeader>

          {revealedPassword ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                  New Password (shown once)
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 font-mono text-sm font-semibold text-foreground bg-card border border-border rounded-lg px-3 py-2 break-all">
                    {revealedPassword}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyRevealedPassword}
                    className="shrink-0 gap-1.5"
                  >
                    {passwordCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {passwordCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button className="bg-primary text-white rounded-xl w-full sm:w-auto" onClick={closeModal}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setResetPasswordError(null);
                    }}
                    placeholder="New Password"
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Confirm Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setResetPasswordError(null);
                    }}
                    placeholder="Confirm Password"
                    className="bg-background text-foreground border-border"
                  />
                </div>
                {requirements.length > 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    {requirements.join(" · ")}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Min 8 characters, at least one uppercase letter and one number.
                  </p>
                )}
                {resetPasswordError && (
                  <p className="text-xs font-semibold text-rose-600">{resetPasswordError}</p>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeModal} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  className="bg-primary text-white rounded-xl"
                  onClick={handleResetPasswordSubmit}
                  disabled={
                    !newPassword ||
                    newPassword !== confirmPassword ||
                    resetPasswordMutation.isPending
                  }
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "changeBranch"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="bg-card border-border text-foreground rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {selectedManager?.branchId ? "Change Branch" : "Assign Branch"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select a branch for {selectedManager?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <select
              value={newBranchId}
              onChange={(e) => setNewBranchId(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="">Select Branch...</option>
              {allBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} className="rounded-xl">
              Cancel
            </Button>
            <Button
              className="bg-primary text-white rounded-xl"
              onClick={handleChangeBranchSubmit}
              disabled={!newBranchId || updateBranchAccessMutation.isPending}
            >
              {updateBranchAccessMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Update Branch"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "removeBranch"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="bg-card border-border text-foreground rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Ban className="h-5 w-5" /> Remove from Branch?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Remove{" "}
              <span className="font-semibold text-foreground">{selectedManager?.name}</span> from{" "}
              <span className="font-semibold text-foreground">
                {selectedManager?.branch?.name || "their assigned branch"}
              </span>
              . They will no longer have access scoped to that branch.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400">
            Center Managers and Counsellors normally need a branch. You can assign a different
            branch afterward from Change Branch.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} className="rounded-xl">
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              onClick={handleRemoveBranchSubmit}
              disabled={updateBranchAccessMutation.isPending}
            >
              {updateBranchAccessMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove from Branch"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
