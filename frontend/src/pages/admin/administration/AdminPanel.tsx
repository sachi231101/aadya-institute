import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreVertical, Eye, Edit, Shield, Key, Power, Trash2, Loader2,
  Users, Building2, MapPin, Search, Plus, Mail, Phone, GraduationCap, 
  BookOpen, UserCheck, AlertTriangle
} from "lucide-react";

import { useNotificationStore } from "@/store/notification.store";
import { useAdminUsers, useDeleteUser } from "@/hooks/useUsers";
import { useBranches, useBranchStats } from "@/hooks/useBranches";
import type { UserResponse } from "@/services/users.api";
import type { BranchResponse } from "@/services/branches.api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────

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

// ─── MANAGER CARD COMPONENT ──────────────────────────────────────────────────

const ManagerCard = ({ 
  manager, 
  branch, 
  onAction,
  onViewBranch
}: { 
  manager: UserResponse; 
  branch?: BranchResponse; 
  onAction: (id: string, action: string) => void;
  onViewBranch: (manager: UserResponse, branch: BranchResponse) => void;
}) => {
  // Fetch live stats for this branch using existing hook
  const { data: statsResponse } = useBranchStats(branch?.id);
  const stats = statsResponse?.data;

  // Use backend stats or fallback to 0
  const studentCount = stats?.totalStudents || 0;
  const facultyCount = stats?.totalFaculty || 0;
  const batchCount = stats?.totalBatches || 0;
  const counsellorCount = 0; 

  return (
    <Card className="border border-border bg-card shadow-xs hover:shadow-md hover:border-primary/40 transition-all rounded-2xl overflow-hidden flex flex-col h-full group">
      <CardContent className="p-0 flex flex-col h-full">
        
        {/* Profile Header */}
        <div className="p-5 pb-3.5">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/50 flex items-center justify-center text-primary dark:text-sky-400 overflow-hidden shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-foreground leading-tight truncate tracking-tight">{manager.name}</h3>
                <p className="text-xs font-semibold text-primary/80 dark:text-sky-400/90 mb-1">Center Manager</p>
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" /> <span className="truncate">{manager.email || "No Email"}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-muted-foreground shrink-0" /> <span>{manager.phone || "No Phone"}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 uppercase tracking-wider ${getStatusText(manager.status)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(manager.status)} animate-pulse`} />
                {manager.status}
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Branch Section */}
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

        {/* Branch Statistics (Bottom) */}
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
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold text-xs h-8.5 rounded-xl transition-colors cursor-pointer"
                onClick={() => onAction(manager.id, "changeBranch")}
              >
                Assign Branch
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-2.5 h-8.5 border-border bg-card hover:bg-muted/40 rounded-xl cursor-pointer">
                  <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 font-medium bg-card border-border rounded-xl shadow-lg">
                <DropdownMenuItem onClick={() => onAction(manager.id, "viewManager")} className="cursor-pointer">
                  <Eye className="mr-2 h-4 w-4 text-primary" /> View Manager Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction(manager.id, "changeBranch")} className="cursor-pointer">
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" /> Change Branch
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={() => onAction(manager.id, "delete")} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/40 cursor-pointer">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Manager
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Fetch all admins
  const { data: usersResponse, isLoading: usersLoading } = useAdminUsers({ limit: 100 });
  const { data: branchesResponse, isLoading: branchesLoading } = useBranches({ limit: 100 });
  
  const deleteUserMutation = useDeleteUser();

  // Extract Center Managers only
  const allUsers = usersResponse?.data ?? [];
  const allBranches = branchesResponse?.data ?? [];
  
  const centerManagers = useMemo(() => {
    return allUsers.filter(u => u.roles.includes("CENTER_MANAGER") || u.roles.includes("ADMIN"));
  }, [allUsers]);

  const activeManagersCount = centerManagers.filter(m => m.status === "ACTIVE").length;
  // Unique assigned branches
  const assignedBranchesCount = new Set(centerManagers.map(m => m.branchId).filter(Boolean)).size;

  // Modals State
  const [activeModal, setActiveModal] = useState<
    "delete" | "resetPassword" | "changeBranch" | null
  >(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredManagers = useMemo(() => {
    return centerManagers.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Unassigned" ? !m.branchId : m.status === "ACTIVE");
      return matchesSearch && matchesStatus;
    });
  }, [centerManagers, searchQuery, statusFilter]);

  // Form states
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newBranchId, setNewBranchId] = useState("");

  const selectedManager = centerManagers.find((a) => a.id === selectedManagerId);

  // Handlers
  const handleAction = (id: string, action: string) => {
    setSelectedManagerId(id);
    if (action === "viewManager") {
      navigate(`/administration/admins/${id}`);
    } else if (action === "editManager") {
      navigate(`/administration/admins/${id}/edit`);
    } else {
      setActiveModal(action as any);
      setDeleteConfirmText("");
      setNewPassword("");
      setConfirmPassword("");
      setNewBranchId(selectedManager?.branchId || "");
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
          addNotification("Manager deleted successfully.", "success");
          closeModal();
        },
        onError: (err: any) => addNotification(err?.response?.data?.message || "Deletion failed.", "error"),
      });
    }
  };

  const handleChangeBranch = () => {
    addNotification("Branch reassigned successfully.", "success");
    closeModal();
  };

  const handleResetPassword = () => {
    addNotification("Password reset link sent.", "success");
    closeModal();
  };

  if (usersLoading || branchesLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <h3 className="text-lg font-bold text-foreground">Loading Manager Data...</h3>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-screen-2xl mx-auto bg-background min-h-screen relative overflow-x-hidden space-y-8">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Center Manager
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
            Manage center managers and their assigned branches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate("/administration/admins/new")} className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-5 rounded-xl shadow-xs cursor-pointer">
            <Plus className="h-4 w-4 mr-2" /> Add Center Manager
          </Button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-xs hover:shadow-sm rounded-2xl bg-card transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-sky-950/40 text-primary dark:text-sky-400 border border-blue-100 dark:border-sky-900/40 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Managers</p>
              <h3 className="text-2xl font-black text-foreground">{centerManagers.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-xs hover:shadow-sm rounded-2xl bg-card transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Active Managers</p>
              <h3 className="text-2xl font-black text-foreground">{activeManagersCount}</h3>
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
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 rounded-xl">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Students</p>
              <h3 className="text-2xl font-black text-foreground">--</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search manager by name, email or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-card text-foreground placeholder:text-muted-foreground shadow-xs"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar self-start md:self-auto">
          {["All", "Active", "Unassigned"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap border cursor-pointer ${
                statusFilter === status 
                  ? "bg-primary text-white border-primary shadow-xs" 
                  : "bg-card text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* MANAGERS GRID */}
      {filteredManagers.length === 0 ? (
        <Card className="border border-border bg-card rounded-2xl shadow-xs py-16 text-center">
          <CardContent className="flex flex-col items-center justify-center max-w-sm mx-auto">
            <div className="h-16 w-16 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mb-4 border border-border">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">No Center Managers Found</h3>
            <p className="text-xs text-muted-foreground mb-6">
              {searchQuery ? "No managers match your search criteria." : "Get started by adding your first center manager."}
            </p>
            <Button onClick={() => navigate("/administration/admins/new")} className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-5 rounded-xl shadow-xs cursor-pointer">
              <Plus className="h-4 w-4 mr-2" /> Add Center Manager
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredManagers.map((manager) => (
            <ManagerCard 
              key={manager.id}
              manager={manager} 
              branch={allBranches.find(b => b.id === manager.branchId)}
              onAction={handleAction}
              onViewBranch={handleViewBranch}
            />
          ))}
        </div>
      )}

      {/* ─── MODALS ─── */}
      <Dialog open={activeModal === "delete"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="bg-card border-border text-foreground rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Manager?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This action cannot be undone. All data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <label className="text-xs font-semibold text-foreground">Type <strong className="text-red-600 dark:text-red-400">DELETE</strong> to confirm</label>
            <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" className="bg-background text-foreground border-border" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteConfirmText !== "DELETE"} className="rounded-xl">Delete Manager</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "resetPassword"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="bg-card border-border text-foreground rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reset Password</DialogTitle>
            <DialogDescription className="text-muted-foreground">Set a new password for {selectedManager?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" className="bg-background text-foreground border-border" />
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="bg-background text-foreground border-border" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} className="rounded-xl">Cancel</Button>
            <Button className="bg-primary text-white rounded-xl" onClick={handleResetPassword} disabled={!newPassword || newPassword !== confirmPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={activeModal === "changeBranch"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="bg-card border-border text-foreground rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Assign/Change Branch</DialogTitle>
            <DialogDescription className="text-muted-foreground">Select a new branch for {selectedManager?.name}.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <select 
              value={newBranchId} 
              onChange={(e) => setNewBranchId(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="">Select Branch...</option>
              {allBranches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeModal} className="rounded-xl">Cancel</Button>
            <Button className="bg-primary text-white rounded-xl" onClick={handleChangeBranch}>Update Branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
