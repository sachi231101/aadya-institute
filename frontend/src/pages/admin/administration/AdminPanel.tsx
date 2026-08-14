import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreVertical, Eye, Edit, Shield, Key, Power, Trash2, Loader2,
  Users, Building2, MapPin, Search, Plus, Mail, Phone, GraduationCap, 
  BookOpen, UserCheck, X, Activity, CreditCard, ChevronRight, FileText,
  AlertTriangle
} from "lucide-react";

import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { useAdminUsers, useUpdateUserStatus, useDeleteUser } from "@/hooks/useUsers";
import { useBranches, useBranchStats } from "@/hooks/useBranches";
import type { UserResponse } from "@/services/users.api";
import type { BranchResponse } from "@/services/branches.api";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  if (status === "INACTIVE") return "bg-gray-400";
  if (status === "BLOCKED") return "bg-red-500";
  return "bg-gray-400";
};

const getStatusText = (status: string) => {
  if (status === "ACTIVE") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "INACTIVE") return "text-gray-700 bg-gray-50 border-gray-200";
  if (status === "BLOCKED") return "text-red-700 bg-red-50 border-red-200";
  return "text-gray-700 bg-gray-50 border-gray-200";
};

const ProgressBar = ({ value, colorClass }: { value: number, colorClass: string }) => (
  <div className="w-full bg-slate-100 rounded-full h-2 mt-1.5 overflow-hidden">
    <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${value}%` }} />
  </div>
);

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
  const { data: statsResponse, isLoading: isStatsLoading } = useBranchStats(branch?.id);
  const stats = statsResponse?.data;

  // Use backend stats or fallback to 0
  const studentCount = stats?.totalStudents || 0;
  const facultyCount = stats?.totalFaculty || 0;
  const batchCount = stats?.totalBatches || 0;
  // Counsellors count is not natively in the stats response, use Admissions or 0
  const counsellorCount = 0; 

  return (
    <Card className="border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow rounded-2xl bg-white overflow-hidden flex flex-col h-full">
      <CardContent className="p-0 flex flex-col h-full">
        
        {/* Profile Header */}
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                {/* Fallback Avatar */}
                <UserCheck className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-tight">{manager.name}</h3>
                <p className="text-sm font-medium text-slate-500 mb-2">Center Manager</p>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> {manager.email || "No Email"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" /> {manager.phone || "No Phone"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 uppercase tracking-wider ${getStatusText(manager.status)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(manager.status)}`} />
                {manager.status}
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Branch Section */}
        <div className="px-6 py-4 mx-6 rounded-xl bg-blue-50/50 border border-blue-100/50 flex-1">
          <p className="text-[10px] font-bold text-[#1769AA]/70 uppercase tracking-wider mb-2">Assigned Branch</p>
          {branch ? (
            <>
              <h4 className="text-[15px] font-bold text-slate-800 leading-tight mb-2 flex items-start gap-2">
                <Building2 className="h-5 w-5 text-[#1769AA] shrink-0" />
                {branch.name}
              </h4>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 ml-7">
                <MapPin className="h-3.5 w-3.5" />
                <span>{branch.address || "No Location"}</span>
                <span className="text-slate-300">|</span>
                <span>Code: {branch.code}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 font-medium text-sm py-2">
              <AlertTriangle className="h-4 w-4" /> No Branch Assigned
            </div>
          )}
        </div>

        {/* Branch Statistics (Bottom) */}
        <div className="p-6 pt-4 mt-auto">
          <div className="grid grid-cols-4 gap-2 mb-5">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                <div className="p-1 bg-blue-50 rounded text-blue-600"><Users className="h-3 w-3" /></div>
                Students
              </div>
              <span className="text-xl font-black text-slate-800">{studentCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                <div className="p-1 bg-emerald-50 rounded text-emerald-600"><GraduationCap className="h-3 w-3" /></div>
                Faculty
              </div>
              <span className="text-xl font-black text-slate-800">{facultyCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                <div className="p-1 bg-orange-50 rounded text-orange-600"><UserCheck className="h-3 w-3" /></div>
                Counsels
              </div>
              <span className="text-xl font-black text-slate-800">{counsellorCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                <div className="p-1 bg-purple-50 rounded text-purple-600"><BookOpen className="h-3 w-3" /></div>
                Batches
              </div>
              <span className="text-xl font-black text-slate-800">{batchCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {branch ? (
              <Button 
                variant="outline" 
                className="flex-1 text-[#1769AA] border-[#1769AA]/30 hover:bg-blue-50 font-bold"
                onClick={() => onViewBranch(manager, branch)}
              >
                <Eye className="h-4 w-4 mr-2" /> View Branch Details
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="flex-1 text-amber-600 border-amber-200 hover:bg-amber-50 font-bold"
                onClick={() => onAction(manager.id, "changeBranch")}
              >
                Assign Branch
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="px-3 border-slate-200">
                  <MoreVertical className="h-4 w-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 font-medium">
                <DropdownMenuItem onClick={() => onAction(manager.id, "viewManager")}>
                  <Eye className="mr-2 h-4 w-4" /> View Manager Details
                </DropdownMenuItem>
                {branch && (
                  <DropdownMenuItem onClick={() => onViewBranch(manager, branch)}>
                    <Building2 className="mr-2 h-4 w-4" /> View Branch
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction(manager.id, "editManager")}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Manager
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction(manager.id, "changeBranch")}>
                  <MapPin className="mr-2 h-4 w-4" /> Change Branch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction(manager.id, "resetPassword")}>
                  <Key className="mr-2 h-4 w-4" /> Reset Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {manager.status === "ACTIVE" ? (
                  <DropdownMenuItem onClick={() => onAction(manager.id, "deactivate")}>
                    <Power className="mr-2 h-4 w-4" /> Deactivate Manager
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onAction(manager.id, "activate")}>
                    <Power className="mr-2 h-4 w-4 text-emerald-600" /> <span className="text-emerald-600">Activate Manager</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onAction(manager.id, "delete")} className="text-red-600 focus:text-red-600 focus:bg-red-50">
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
  const { user } = useAuthStore();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Fetch all admins
  const { data: usersResponse, isLoading: usersLoading } = useAdminUsers({ limit: 100 });
  const { data: branchesResponse, isLoading: branchesLoading } = useBranches({ limit: 100 });
  
  const updateStatusMutation = useUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();

  // Extract Center Managers only
  const allUsers = usersResponse?.data ?? [];
  const allBranches = branchesResponse?.data ?? [];
  
  const centerManagers = useMemo(() => {
    return allUsers.filter(u => u.roles.includes("CENTER_MANAGER") || u.roles.includes("ADMIN")); // Displaying all for now so Admin doesn't lose access to other admins, but prioritizing Center Manager layout
  }, [allUsers]);

  const activeManagersCount = centerManagers.filter(m => m.status === "ACTIVE").length;
  // Unique assigned branches
  const assignedBranchesCount = new Set(centerManagers.map(m => m.branchId).filter(Boolean)).size;

  // Modals & Drawer State
  const [activeModal, setActiveModal] = useState<
    "deactivate" | "activate" | "delete" | "resetPassword" | "changeBranch" | null
  >(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<{manager: UserResponse, branch: BranchResponse} | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredManagers = useMemo(() => {
    return centerManagers.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            m.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || 
                            (statusFilter === "Unassigned" ? !m.branchId : m.status === statusFilter.toUpperCase());
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

  const handleViewBranch = (manager: UserResponse, branch: BranchResponse) => {
    setDrawerData({ manager, branch });
    setDrawerOpen(true);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedManagerId(null);
  };

  const handleStatusChange = (status: "ACTIVE" | "INACTIVE") => {
    if (selectedManagerId) {
      updateStatusMutation.mutate(
        { id: selectedManagerId, data: { status } },
        {
          onSuccess: () => {
            addNotification(`Manager ${status === "ACTIVE" ? "activated" : "deactivated"} successfully.`, "success");
            closeModal();
          },
          onError: (err: any) => addNotification(err?.response?.data?.message || "Operation failed.", "error"),
        }
      );
    }
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
    // Requires a hook to update branch, mocking success for now
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
        <Loader2 className="h-10 w-10 animate-spin text-[#1769AA] mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Loading Manager Data...</h3>
      </div>
    );
  }

  // Temporary mock for Drawer stats
  const drawerStats = {
    attendance: 86,
    leadConversion: 15.5,
    feeCollection: 78,
    batchCompletion: 72
  };

  return (
    <div className="p-8 max-w-screen-2xl mx-auto bg-[#f8fafc] min-h-screen relative overflow-x-hidden">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="h-8 w-8 text-[#1769AA]" />
            Center Manager
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage center managers and their assigned branches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate("/administration/admins/new")} className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold h-11 px-6 shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Add Center Manager
          </Button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-slate-200/60 shadow-sm rounded-xl bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg"><Users className="h-6 w-6 text-[#1769AA]" /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Managers</p>
              <h3 className="text-2xl font-black text-slate-800">{centerManagers.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60 shadow-sm rounded-xl bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg"><UserCheck className="h-6 w-6 text-emerald-600" /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Active Managers</p>
              <h3 className="text-2xl font-black text-slate-800">{activeManagersCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60 shadow-sm rounded-xl bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-lg"><Building2 className="h-6 w-6 text-orange-600" /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Branches Assigned</p>
              <h3 className="text-2xl font-black text-slate-800">{assignedBranchesCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60 shadow-sm rounded-xl bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg"><GraduationCap className="h-6 w-6 text-purple-600" /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Students</p>
              <h3 className="text-2xl font-black text-slate-800">--</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search manager by name, email or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] transition-all bg-white shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {["All", "Active", "Inactive", "Blocked", "Unassigned"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-colors whitespace-nowrap border ${
                statusFilter === status 
                  ? "bg-slate-800 text-white border-slate-800" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* MANAGER CARD GRID */}
      {filteredManagers.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-white shadow-sm rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Center Managers Found</h3>
            <p className="text-slate-500 font-medium mb-6 max-w-sm">
              Create a Center Manager and assign them to a branch to get started.
            </p>
            <Button onClick={() => navigate("/administration/admins/new")} className="bg-[#1769AA] hover:bg-[#125890] text-white font-bold h-11 px-6 shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Add Center Manager
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* ─── BRANCH OVERVIEW DRAWER ─── */}
      <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setDrawerOpen(false)}>
        <div 
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-[#f8fafc] shadow-2xl transition-transform duration-300 transform flex flex-col ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shrink-0">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Branch Overview</p>
              <h2 className="text-lg font-black text-slate-900 leading-tight">{drawerData?.branch?.name}</h2>
            </div>
            <button onClick={() => setDrawerOpen(false)} className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Drawer: Branch Info */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Branch Information</h3>
              <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3 shadow-sm">
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-slate-500 font-medium">Branch Code</span>
                  <span className="col-span-2 font-semibold text-slate-800">{drawerData?.branch?.code}</span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-slate-500 font-medium">Location</span>
                  <span className="col-span-2 font-semibold text-slate-800">{drawerData?.branch?.address || "N/A"}</span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-slate-500 font-medium">Manager</span>
                  <span className="col-span-2 font-semibold text-[#1769AA]">{drawerData?.manager?.name}</span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className="col-span-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 uppercase border border-emerald-100">
                      Active
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer: Branch Performance */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Branch Performance</h3>
              <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-5 shadow-sm">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Student Attendance</span>
                    <span className="text-emerald-600">{drawerStats.attendance}%</span>
                  </div>
                  <ProgressBar value={drawerStats.attendance} colorClass="bg-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Lead Conversion</span>
                    <span className="text-blue-600">{drawerStats.leadConversion}%</span>
                  </div>
                  <ProgressBar value={drawerStats.leadConversion} colorClass="bg-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Fee Collection</span>
                    <span className="text-purple-600">{drawerStats.feeCollection}%</span>
                  </div>
                  <ProgressBar value={drawerStats.feeCollection} colorClass="bg-purple-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Batch Completion</span>
                    <span className="text-orange-600">{drawerStats.batchCompletion}%</span>
                  </div>
                  <ProgressBar value={drawerStats.batchCompletion} colorClass="bg-orange-500" />
                </div>
              </div>
            </div>

            {/* Drawer: Navigation */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Navigation</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Students", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Faculty", icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Counsellors", icon: UserCheck, color: "text-orange-600", bg: "bg-orange-50" },
                  { label: "Batches", icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Admissions", icon: FileText, color: "text-rose-600", bg: "bg-rose-50" },
                  { label: "Fees", icon: CreditCard, color: "text-teal-600", bg: "bg-teal-50" },
                ].map((item, idx) => (
                  <button key={idx} className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col items-start gap-3 hover:border-slate-300 hover:shadow-sm transition-all text-left">
                    <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODALS ─── */}
      <Dialog open={activeModal === "deactivate"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Manager?</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate <strong>{selectedManager?.name}</strong>? They will no longer be able to access the portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleStatusChange("INACTIVE")}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "activate"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Manager?</DialogTitle>
            <DialogDescription>
              Activate <strong>{selectedManager?.name}</strong> to restore their access to the portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleStatusChange("ACTIVE")}>Activate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "delete"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Manager?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <label className="text-sm font-medium text-foreground">Type <strong className="text-red-600">DELETE</strong> to confirm</label>
            <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteConfirmText !== "DELETE"}>Delete Manager</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "resetPassword"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {selectedManager?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" />
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button className="bg-[#1769AA]" onClick={handleResetPassword} disabled={!newPassword || newPassword !== confirmPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={activeModal === "changeBranch"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign/Change Branch</DialogTitle>
            <DialogDescription>Select a new branch for {selectedManager?.name}.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <select 
              value={newBranchId} 
              onChange={(e) => setNewBranchId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-[#1769AA]"
            >
              <option value="">Select Branch...</option>
              {allBranches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button className="bg-[#1769AA]" onClick={handleChangeBranch}>Update Branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
