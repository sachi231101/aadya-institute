import React, { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useUser, useUpdateUserStatus, useUpdateUser } from "@/hooks/useUsers";
import { usersApi } from "@/services/users.api";
import {
  permissionsToAccessState,
  isBaselineOnlyPermissions,
  type PermissionModuleDefinition,
} from "@/utils/permission-utils";
import { useBranches, useBranchStats } from "@/hooks/useBranches";
import { useNotificationStore } from "@/store/notification.store";
import {
  ArrowLeft,
  User,
  Shield,
  Activity,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Loader2,
  Edit,
  Power,
  Key,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Lock,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// Map backend role names to display labels
const ROLE_DISPLAY: Record<string, string> = {
  ADMIN: "Admin",
  CENTER_MANAGER: "Center Manager",
  COUNSELLOR: "Counsellor",
  FACULTY: "Faculty",
  STUDENT: "Student",
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

export const ViewAdmin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Queries
  const { data: userResponse, isLoading, isError, refetch } = useUser(id);
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const updateStatusMutation = useUpdateUserStatus();
  const updateUserMutation = useUpdateUser();

  const admin = userResponse?.data;
  const branches = branchesResponse?.data ?? [];
  const assignedBranch = branches.find((b) => b.id === admin?.branchId);

  const isCenterManager = admin?.roles.includes("CENTER_MANAGER");
  const { data: catalogRes } = useQuery({
    queryKey: ["permission-catalog", "CENTER_MANAGER"],
    queryFn: () => usersApi.getPermissionCatalog("CENTER_MANAGER"),
    enabled: Boolean(isCenterManager),
  });
  const permissionCatalog: PermissionModuleDefinition[] = catalogRes?.data ?? [];
  const permissionAccess = useMemo(() => {
    if (!admin?.permissions || permissionCatalog.length === 0) return {};
    return permissionsToAccessState(admin.permissions, permissionCatalog);
  }, [admin?.permissions, permissionCatalog]);
  const enabledModuleCount = useMemo(() => {
    return permissionCatalog.filter((mod: PermissionModuleDefinition) =>
      mod.items.some((item) => permissionAccess[item.key]?.show)
    ).length;
  }, [permissionCatalog, permissionAccess]);

  // Fetch branch statistics if assigned
  const { data: branchStatsResponse } = useBranchStats(admin?.branchId || undefined);
  const branchStats = branchStatsResponse?.data;

  // Tabs & Modals
  const [activeTab, setActiveTab] = useState<"overview" | "permissions" | "activity">("overview");
  const [modalType, setModalType] = useState<"status" | "resetPassword" | "changeBranch" | null>(null);
  const [newBranchId, setNewBranchId] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 min-h-[50vh]">
          <Loader2 className="h-10 w-10 animate-spin text-[#1769AA] mb-4" />
          <span className="text-slate-600 font-medium">Loading manager details...</span>
        </div>
      </div>
    );
  }

  if (isError || !admin) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/administration")} className="mb-4">
          <ArrowLeft size={16} className="mr-2" /> Back to Center Managers
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
          <h2 className="text-2xl font-bold text-slate-900">Center Manager Not Found</h2>
          <p className="text-slate-500 mt-2">The center manager account you are looking for does not exist or has been removed.</p>
          <Button onClick={() => navigate("/administration")} className="mt-6 bg-[#1769AA] text-white">
            Return to Center Managers
          </Button>
        </div>
      </div>
    );
  }

  const isActive = admin.status === "ACTIVE";

  // Modal Handlers
  const handleToggleStatus = () => {
    const nextStatus = isActive ? "INACTIVE" : "ACTIVE";
    updateStatusMutation.mutate(
      { id: admin.id, data: { status: nextStatus } },
      {
        onSuccess: () => {
          addNotification(`Manager ${nextStatus === "ACTIVE" ? "activated" : "deactivated"} successfully.`, "success");
          setModalType(null);
          refetch();
        },
        onError: (err: any) => {
          addNotification(err?.response?.data?.message || "Failed to update manager status.", "error");
        },
      }
    );
  };

  const handleChangeBranchSubmit = () => {
    updateUserMutation.mutate(
      { id: admin.id, data: { branchId: newBranchId || undefined } },
      {
        onSuccess: () => {
          addNotification("Branch reassigned successfully.", "success");
          setModalType(null);
          refetch();
        },
        onError: (err: any) => {
          addNotification(err?.response?.data?.message || "Failed to reassign branch.", "error");
        },
      }
    );
  };

  const handleResetPasswordSubmit = () => {
    if (!newPassword || newPassword !== confirmPassword) {
      addNotification("Passwords do not match.", "error");
      return;
    }
    updateUserMutation.mutate(
      { id: admin.id, data: { password: newPassword } as any },
      {
        onSuccess: () => {
          addNotification("Password reset successfully.", "success");
          setModalType(null);
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err: any) => {
          addNotification(err?.response?.data?.message || "Failed to reset password.", "error");
        },
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-[#f8fafc] min-h-screen">
      {/* ─── PAGE HEADER & ACTIONS BAR ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/administration")}
            size="icon"
            className="rounded-xl border-slate-200 hover:bg-white shadow-sm"
          >
            <ArrowLeft size={18} className="text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                {admin.name}
              </h1>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                ● {admin.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Center Manager Profile & Branch Operations
            </p>
          </div>
        </div>

        {/* Action Controls Consolidated */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              setNewBranchId(admin.branchId || "");
              setModalType("changeBranch");
            }}
            className="border-slate-200 text-slate-700 hover:bg-white text-xs font-bold h-9"
          >
            <MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Change Branch
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setNewPassword("");
              setConfirmPassword("");
              setModalType("resetPassword");
            }}
            className="border-slate-200 text-slate-700 hover:bg-white text-xs font-bold h-9"
          >
            <Key className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Reset Password
          </Button>

          <Button
            variant="outline"
            onClick={() => setModalType("status")}
            className={`text-xs font-bold h-9 ${
              isActive
                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <Power className="h-3.5 w-3.5 mr-1.5" />
            {isActive ? "Deactivate Account" : "Activate Account"}
          </Button>

          <Link to={`/admin/administration/admins/${admin.id}/edit`}>
            <Button className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-bold h-9 shadow-sm">
              <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit Manager
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── GRID LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Profile & Contact Summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-[#1769AA] to-[#2582cb]" />
            <CardContent className="p-6 pt-0 relative flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center -mt-10 mb-3 text-[#1769AA]">
                <UserCheck className="h-10 w-10" />
              </div>
              
              <h2 className="text-xl font-bold text-slate-900">{admin.name}</h2>
              <p className="text-xs font-bold text-[#1769AA] uppercase tracking-wider mt-0.5 mb-2">
                Center Manager
              </p>
              
              <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                {admin.roles.map((r) => (
                  <Badge key={r} variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-mono text-[10px]">
                    {ROLE_DISPLAY[r] || r}
                  </Badge>
                ))}
              </div>

              {/* Direct Info List */}
              <div className="w-full space-y-3.5 text-left border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {admin.email || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </span>
                  <span className="font-semibold text-slate-800">
                    {admin.phone || "Not provided"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" /> Joined Date
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatDate(admin.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Last Updated
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatDate(admin.updatedAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Account Status Card */}
          <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Security & Access</h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="font-medium text-slate-600 flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-slate-400" /> Account Status
                </span>
                <span className={`font-bold ${isActive ? "text-emerald-600" : "text-slate-500"}`}>
                  {isActive ? "Active & Authorized" : "Deactivated"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="font-medium text-slate-600 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-slate-400" /> Access Tier
                </span>
                <span className="font-bold text-slate-800">Branch Level Operations</span>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Assigned Branch, Live Stats & Details Tabs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ASSIGNED BRANCH HIGHLIGHT CARD */}
          <Card className="border border-blue-100 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-blue-50/60 pb-4 border-b border-blue-100/60">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-[#1769AA] uppercase tracking-wider">
                    Assigned Center & Branch
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                    <Building2 className="h-5 w-5 text-[#1769AA]" />
                    {assignedBranch ? assignedBranch.name : "No Branch Assigned (Institute-Wide)"}
                  </h3>
                  {assignedBranch && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {assignedBranch.address || "No address provided"} • Branch Code:{" "}
                      <span className="font-mono font-bold text-slate-700">{assignedBranch.code}</span>
                    </p>
                  )}
                </div>

                {assignedBranch ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/admin/branch/${assignedBranch.id}/performance`)}
                    className="text-[#1769AA] border-[#1769AA]/30 hover:bg-blue-50 text-xs font-bold h-8"
                  >
                    View Branch <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewBranchId("");
                      setModalType("changeBranch");
                    }}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 text-xs font-bold h-8"
                  >
                    Assign Branch
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* Live Branch Stats */}
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase mb-1">
                    <Users className="h-3.5 w-3.5 text-blue-600" /> Active Students
                  </div>
                  <span className="text-2xl font-black text-slate-800">
                    {branchStats?.totalStudents ?? 0}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase mb-1">
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-600" /> Faculty Members
                  </div>
                  <span className="text-2xl font-black text-slate-800">
                    {branchStats?.totalFaculty ?? 0}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase mb-1">
                    <BookOpen className="h-3.5 w-3.5 text-purple-600" /> Active Batches
                  </div>
                  <span className="text-2xl font-black text-slate-800">
                    {branchStats?.totalBatches ?? 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── DETAILS TABS ─── */}
          <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white overflow-hidden">
            {/* Custom Tab Header */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === "overview"
                    ? "border-[#1769AA] text-[#1769AA]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                Overview & History
              </button>
              <button
                onClick={() => setActiveTab("permissions")}
                className={`py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === "permissions"
                    ? "border-[#1769AA] text-[#1769AA]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                Role & Permissions
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === "activity"
                    ? "border-[#1769AA] text-[#1769AA]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                Activity Logs
              </button>
            </div>

            <CardContent className="p-6">
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-[#1769AA]" /> Contact & Personal Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 font-medium">Full Name</span>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{admin.name}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 font-medium">Email Address</span>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{admin.email || "—"}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 font-medium">Phone Number</span>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{admin.phone || "Not specified"}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 font-medium">Account ID</span>
                        <p className="font-mono text-slate-700 text-xs mt-0.5">{admin.id}</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#1769AA]" /> Operational Authority
                    </h4>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      As a Center Manager, this user is restricted to branch-level data isolation for{" "}
                      <strong>{assignedBranch ? assignedBranch.name : "assigned center"}</strong>. They can oversee
                      admissions, batch schedules, faculty assignments, attendance compliance, and branch revenue.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: PERMISSIONS */}
              {activeTab === "permissions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-[#1769AA]" /> ERP Module Access
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Submodule Show/Editable settings for this Center Manager account
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/administration/admins/${id}/edit`)}
                      className="text-xs text-[#1769AA] border-blue-200 hover:bg-blue-50"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit Permissions
                    </Button>
                  </div>

                  {isBaselineOnlyPermissions(admin.permissions ?? []) ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                      <strong>Baseline access only.</strong> This manager can use Dashboard, ASK ME, and Settings. No operational ERP modules are assigned yet.
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      {enabledModuleCount} of {permissionCatalog.length} ERP modules have at least one enabled submodule.
                    </p>
                  )}

                  <div className="space-y-3 pt-1">
                    {permissionCatalog.map((mod: PermissionModuleDefinition) => {
                      const enabledItems = mod.items.filter((item) => permissionAccess[item.key]?.show);
                      if (enabledItems.length === 0) return null;
                      return (
                        <div
                          key={mod.key}
                          className="rounded-xl border border-emerald-200/70 bg-emerald-50/30 p-4"
                        >
                          <p className="text-sm font-bold text-slate-900 mb-2">{mod.label}</p>
                          <div className="flex flex-wrap gap-2">
                            {enabledItems.map((item) => {
                              const editable = permissionAccess[item.key]?.editable;
                              return (
                                <span
                                  key={item.key}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                    editable
                                      ? "bg-white border-emerald-300 text-emerald-800"
                                      : "bg-slate-50 border-slate-200 text-slate-700"
                                  }`}
                                >
                                  {editable ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Lock className="h-3 w-3 text-slate-400" />
                                  )}
                                  {item.label}
                                  <span className="font-semibold opacity-70">
                                    {editable ? "Editable" : "Show"}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: ACTIVITY */}
              {activeTab === "activity" && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#1769AA]" /> Recent Activity & Audit Trail
                  </h4>
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
                    <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-500">
                      Audit trail logs are recorded automatically for system logins, batch creations, and status modifications.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Modal 1: Activate / Deactivate */}
      <Dialog open={modalType === "status"} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isActive ? "Deactivate Center Manager?" : "Activate Center Manager?"}</DialogTitle>
            <DialogDescription>
              {isActive
                ? `Deactivating ${admin.name} will suspend their login access to the Aadya Institute portal immediately.`
                : `Activating ${admin.name} will restore their login access and operational privileges.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
            <Button
              variant={isActive ? "destructive" : "default"}
              className={!isActive ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              onClick={handleToggleStatus}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Processing..." : isActive ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Change Branch */}
      <Dialog open={modalType === "changeBranch"} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign / Change Branch</DialogTitle>
            <DialogDescription>
              Select the branch for <strong>{admin.name}</strong>. Their operational scope will automatically adapt to this branch.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <select
              value={newBranchId}
              onChange={(e) => setNewBranchId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
            >
              <option value="">No branch (Institute-wide)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
            <Button
              className="bg-[#1769AA] hover:bg-[#125890] text-white"
              onClick={handleChangeBranchSubmit}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Saving..." : "Update Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Reset Password */}
      <Dialog open={modalType === "resetPassword"} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new secure password for <strong>{admin.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
            <Button
              className="bg-[#1769AA] hover:bg-[#125890] text-white"
              onClick={handleResetPasswordSubmit}
              disabled={!newPassword || newPassword !== confirmPassword || updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Updating..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
