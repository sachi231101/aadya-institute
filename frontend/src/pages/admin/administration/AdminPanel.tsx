import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreVertical, Eye, Edit, Shield, Key, Trash2, Loader2,
  Users, Building2, MapPin, Search, Plus, Mail, Phone,
  UserCheck, AlertTriangle, UserPlus, Ban, Save,
} from "lucide-react";

import { useNotificationStore } from "@/store/notification.store";
import { useAdminUsers, useDeleteUser, useUpdateUserBranchAccess } from "@/hooks/useUsers";
import { useBranches, useBranchStats } from "@/hooks/useBranches";
import {
  useInvitations,
  useCreateInvitation,
  useRevokeInvitation,
} from "@/hooks/useInvitations";
import type { UserResponse } from "@/services/users.api";
import type { BranchResponse } from "@/services/branches.api";

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

type TabKey = "all" | "active" | "inactive" | "invitations" | "access";
type RoleFilter = "all" | "CENTER_MANAGER" | "COUNSELLOR" | "FACULTY" | "ADMIN";

const STAFF_ROLES = ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"] as const;
const BRANCH_REQUIRED_ROLES = ["CENTER_MANAGER", "COUNSELLOR", "FACULTY"];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  CENTER_MANAGER: "Center Manager",
  COUNSELLOR: "Counsellor",
  FACULTY: "Faculty",
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "invitations", label: "Pending Invitations" },
  { key: "access", label: "User Access" },
];

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
  onAction,
  onViewBranch,
}: {
  manager: UserResponse;
  branch?: BranchResponse;
  onAction: (id: string, action: string) => void;
  onViewBranch: (manager: UserResponse, branch: BranchResponse) => void;
}) => {
  const { data: statsResponse } = useBranchStats(branch?.id);
  const stats = statsResponse?.data;

  const studentCount = stats?.totalStudents || 0;
  const facultyCount = stats?.totalFaculty || 0;
  const batchCount = stats?.totalBatches || 0;
  const counsellorCount = 0;

  return (
    <Card className="border border-border bg-card shadow-xs hover:shadow-md hover:border-primary/40 transition-all rounded-2xl overflow-hidden flex flex-col h-full group">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="p-5 pb-3.5">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/50 flex items-center justify-center text-primary dark:text-sky-400 overflow-hidden shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-foreground leading-tight truncate tracking-tight">{manager.name}</h3>
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
                    <Building2 className="h-4 w-4 mr-2" /> Change Branch
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction(manager.id, "resetPassword")}>
                    <Key className="h-4 w-4 mr-2" /> Reset Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => onAction(manager.id, "delete")}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="px-3.5 py-3 mx-4 rounded-xl bg-muted/40 border border-border/70 flex-1 space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assigned Branch</p>
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
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs py-1">
              <AlertTriangle className="h-3.5 w-3.5" /> No Branch Assigned
            </div>
          )}
        </div>

        <div className="p-4 pt-3.5 mt-auto">
          <div className="grid grid-cols-4 gap-1.5 mb-3.5 text-center">
            <div className="flex flex-col items-center p-2 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Students</span>
              <span className="text-xs sm:text-sm font-black text-foreground mt-0.5">{studentCount}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Faculty</span>
              <span className="text-xs sm:text-sm font-black text-foreground mt-0.5">{facultyCount}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Counsels</span>
              <span className="text-xs sm:text-sm font-black text-foreground mt-0.5">{counsellorCount}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-xl bg-muted/30 border border-border/60">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Batches</span>
              <span className="text-xs sm:text-sm font-black text-foreground mt-0.5">{batchCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {branch ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-primary border-border hover:bg-primary/10 font-bold text-xs h-8.5 rounded-xl transition-colors cursor-pointer"
                onClick={() => onViewBranch(manager, branch)}
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" /> View Branch
              </Button>
            ) : null}
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
  const { data: invitationsResponse, isLoading: invitationsLoading } = useInvitations({ limit: 50 });
  const deleteUserMutation = useDeleteUser();
  const createInvitationMutation = useCreateInvitation();
  const revokeInvitationMutation = useRevokeInvitation();
  const updateBranchAccessMutation = useUpdateUserBranchAccess();

  const allUsers = usersResponse?.data ?? [];
  const allBranches = branchesResponse?.data ?? [];
  const invitations = invitationsResponse?.data ?? [];

  const staffUsers = useMemo(() => allUsers.filter(isStaffUser), [allUsers]);

  const accessUsers = useMemo(
    () =>
      staffUsers.filter(
        (u) =>
          u.roles.includes("CENTER_MANAGER") ||
          u.roles.includes("COUNSELLOR") ||
          u.roles.includes("ADMIN")
      ),
    [staffUsers]
  );

  const [tab, setTab] = useState<TabKey>("all");
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
    "delete" | "resetPassword" | "changeBranch" | null
  >(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      if (tab === "active") return m.status === "ACTIVE";
      if (tab === "inactive") return m.status === "INACTIVE" || m.status === "BLOCKED";
      return true;
    });
  }, [staffUsers, searchQuery, tab, roleFilter]);

  const activeStaffCount = staffUsers.filter((m) => m.status === "ACTIVE").length;
  const assignedBranchesCount = new Set(staffUsers.map((m) => m.branchId).filter(Boolean)).size;

  const handleAction = (id: string, action: string) => {
    setSelectedManagerId(id);
    if (action === "viewManager") {
      navigate(`/admin/administration/admins/${id}`);
    } else if (action === "editManager") {
      navigate(`/admin/administration/admins/${id}/edit`);
    } else {
      setActiveModal(action as any);
      setDeleteConfirmText("");
      setNewPassword("");
      setConfirmPassword("");
      setNewBranchId(staffUsers.find((m) => m.id === id)?.branchId || "");
    }
  };

  const handleViewBranch = (_manager: UserResponse, branch: BranchResponse) => {
    navigate(`/admin/branch/${branch.id}/performance`);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedManagerId(null);
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
          setTab("invitations");
        },
        onError: (err: any) =>
          addNotification(err?.response?.data?.message || "Invite failed.", "error"),
      }
    );
  };

  const openAccessEditor = (user: UserResponse) => {
    setAccessUserId(user.id);
    const ids =
      user.branchAccesses?.map((b) => b.branchId) ??
      (user.branchId ? [user.branchId] : []);
    setAccessBranchIds(ids);
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
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <h3 className="text-lg font-bold text-foreground">Loading User Data...</h3>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-screen-2xl mx-auto bg-background min-h-screen relative overflow-x-hidden space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            User Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
            Manage staff users, invitations, and branch access.
          </p>
        </div>
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
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-xs hover:shadow-sm rounded-2xl bg-card transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 border border-blue-100 dark:border-sky-900/40 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Staff</p>
              <h3 className="text-2xl font-black text-foreground">{staffUsers.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-xs hover:shadow-sm rounded-2xl bg-card transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Active Staff</p>
              <h3 className="text-2xl font-black text-foreground">{activeStaffCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-xs hover:shadow-sm rounded-2xl bg-card transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 rounded-xl">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Branches Assigned</p>
              <h3 className="text-2xl font-black text-foreground">{assignedBranchesCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-xs hover:shadow-sm rounded-2xl bg-card transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40 rounded-xl">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Pending Invites</p>
              <h3 className="text-2xl font-black text-foreground">{invitations.length}</h3>
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
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap border cursor-pointer ${
                  tab === t.key
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-card text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {(tab === "all" || tab === "active" || tab === "inactive") && (
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
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
        )}
      </div>

      {(tab === "all" || tab === "active" || tab === "inactive") && (
        filteredStaff.length === 0 ? (
          <Card className="border border-border bg-card rounded-2xl shadow-xs py-16 text-center">
            <CardContent className="flex flex-col items-center justify-center max-w-sm mx-auto">
              <div className="h-16 w-16 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mb-4 border border-border">
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
                branch={allBranches.find((b) => b.id === manager.branchId)}
                onAction={handleAction}
                onViewBranch={handleViewBranch}
              />
            ))}
          </div>
        )
      )}

      {tab === "invitations" && (
        <Card className="border border-border rounded-2xl shadow-xs overflow-hidden">
          <CardContent className="p-0">
            {invitationsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Mail className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="font-bold text-foreground">No pending invitations</p>
                <Button onClick={() => setInviteOpen(true)} className="rounded-xl font-bold">
                  <UserPlus className="h-4 w-4 mr-2" /> Invite User
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-bold">Name</th>
                      <th className="px-4 py-3 font-bold">Email</th>
                      <th className="px-4 py-3 font-bold">Role</th>
                      <th className="px-4 py-3 font-bold">Branch</th>
                      <th className="px-4 py-3 font-bold">Expires</th>
                      <th className="px-4 py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations
                      .filter((inv) => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          inv.name.toLowerCase().includes(q) ||
                          inv.email.toLowerCase().includes(q)
                        );
                      })
                      .map((inv) => (
                        <tr key={inv.id} className="border-b border-border/60 hover:bg-muted/20">
                          <td className="px-4 py-3 font-semibold text-foreground">{inv.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{inv.email}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-border bg-muted/40">
                              {inv.roleName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {inv.branch?.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                              disabled={revokeInvitationMutation.isPending}
                              onClick={() =>
                                revokeInvitationMutation.mutate(inv.id, {
                                  onSuccess: () =>
                                    addNotification("Invitation revoked.", "success"),
                                  onError: (err: any) =>
                                    addNotification(
                                      err?.response?.data?.message || "Revoke failed.",
                                      "error"
                                    ),
                                })
                              }
                            >
                              <Ban className="h-3.5 w-3.5 mr-1.5" /> Revoke
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "access" && (
        <Card className="border border-border rounded-2xl shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-bold">User</th>
                    <th className="px-4 py-3 font-bold">Roles</th>
                    <th className="px-4 py-3 font-bold">Primary Branch</th>
                    <th className="px-4 py-3 font-bold">Extra Branches</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessUsers
                    .filter((u) => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        u.name.toLowerCase().includes(q) ||
                        u.email?.toLowerCase().includes(q)
                      );
                    })
                    .map((user) => (
                      <tr key={user.id} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold">
                          {user.roles.map((r) => ROLE_LABELS[r] || r).join(", ")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {user.branch?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {(user.branchAccesses ?? [])
                            .map((b) => b.branch?.name || b.branchId)
                            .join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => openAccessEditor(user)}
                          >
                            <Building2 className="h-3.5 w-3.5 mr-1.5" /> Edit Access
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-card border-border text-foreground rounded-2xl shadow-2xl">
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
        <DialogContent className="bg-card border-border text-foreground rounded-2xl shadow-2xl">
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
        <DialogContent className="bg-card border-border text-foreground rounded-2xl shadow-2xl">
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
        <DialogContent className="bg-card border-border text-foreground rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reset Password</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set a new password for {selectedManager?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              className="bg-background text-foreground border-border"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="bg-background text-foreground border-border"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} className="rounded-xl">
              Cancel
            </Button>
            <Button
              className="bg-primary text-white rounded-xl"
              onClick={() => {
                addNotification("Password reset link sent.", "success");
                closeModal();
              }}
              disabled={!newPassword || newPassword !== confirmPassword}
            >
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "changeBranch"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="bg-card border-border text-foreground rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Assign/Change Branch</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select a new branch for {selectedManager?.name}.
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
              onClick={() => {
                addNotification("Branch reassigned successfully.", "success");
                closeModal();
              }}
            >
              Update Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
