import React, { useState } from "react";
import {
  Building2,
  Plus,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Activity,
  UserCheck,
  MapPin,
  Phone,
  DollarSign,
  CheckCircle2,
  UserPlus,
  Trash2,
  Loader2
} from "lucide-react";
import { useBranches, useCreateBranch, useUpdateBranch } from "@/hooks/useBranches";
import { useAdminUsers, useUpdateUser } from "@/hooks/useUsers";
import { useStudentList } from "@/hooks/useStudents";
import { useFacultyList } from "@/hooks/useFaculty";
import { useBatches } from "@/hooks/useBatches";
import { useFinancialReport, useStudentReport } from "@/hooks/useReports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Branch } from "@/types/branch.types";

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Real API hooks
  const { data: branchesResponse, isLoading } = useBranches({ limit: 100 });
  const { data: usersResponse } = useAdminUsers({ limit: 100 });
  const { data: studentsResponse } = useStudentList();
  const { data: facultyResponse } = useFacultyList();
  const { batches: allBatches } = useBatches();
  const { data: financialReport } = useFinancialReport();
  const { data: studentReport } = useStudentReport();

  const centerManagers = usersResponse?.data?.filter((u) => u.roles.includes("CENTER_MANAGER")) || [];

  const createBranchMutation = useCreateBranch();
  const updateBranchMutation = useUpdateBranch();
  const updateUserMutation = useUpdateUser();

  // Create Branch Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");

  // Assign Manager Modal State
  const [assignModalBranch, setAssignModalBranch] = useState<Branch | null>(null);
  const [newManagerName, setNewManagerName] = useState("");
  const [newManagerEmail, setNewManagerEmail] = useState("");

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Map Real Backend branches to UI branches
  const apiBranches = branchesResponse?.data?.filter(b => b.status !== "DELETED") || [];

  const branches: Branch[] = apiBranches.map(apiBranch => {
    const realManager = centerManagers.find(m => m.branchId === apiBranch.id);

    // Calculate branch dynamic student and batch counts
    const branchStudents = studentReport?.students?.filter(s => s.branchName === apiBranch.name) || [];
    const branchBatches = allBatches?.filter(b => b.branchId === apiBranch.id || b.branch?.id === apiBranch.id) || [];

    return {
      id: apiBranch.id,
      code: apiBranch.code,
      name: apiBranch.name,
      city: city || "Bengaluru",
      address: apiBranch.address || "Bengaluru, KA",
      phone: apiBranch.phone || "N/A",
      assignedManagerName: realManager ? realManager.name : "Unassigned Manager",
      assignedManagerEmail: realManager ? realManager.email : "Unassigned",
      studentCount: branchStudents.length > 0 ? branchStudents.length : 0,
      batchCount: branchBatches.length > 0 ? branchBatches.length : 0,
      revenueCollected: financialReport?.summary?.totalCollected || 0,
      status: apiBranch.status as any,
    };
  });

  // Global Live Metrics from PostgreSQL
  const totalStudents = studentsResponse?.meta?.total ?? studentReport?.summary?.totalStudents ?? branches.reduce((acc, b) => acc + b.studentCount, 0);
  const totalFaculty = facultyResponse?.meta?.total ?? facultyResponse?.data?.length ?? 0;
  const totalBatches = allBatches?.length ?? branches.reduce((acc, b) => acc + b.batchCount, 0);
  const totalRevenue = financialReport?.summary?.totalCollected ?? branches.reduce((acc, b) => acc + b.revenueCollected, 0);

  const handleCreateBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName || !branchCode) return;
    setErrorMsg(null);

    try {
      // Save to real backend
      const createdRes = await createBranchMutation.mutateAsync({
        name: branchName,
        code: branchCode,
        address: address,
        phone: phone,
      });

      if (managerEmail && createdRes?.data?.id) {
        const selectedUser = centerManagers.find(m => m.email === managerEmail);
        if (selectedUser) {
          await updateUserMutation.mutateAsync({
            id: selectedUser.id,
            data: { branchId: createdRes.data.id }
          });
        }
      }

      setNotificationMsg(`New Branch "${branchName}" created successfully!`);
      setTimeout(() => setNotificationMsg(null), 3000);

      setBranchName("");
      setBranchCode("");
      setAddress("");
      setPhone("");
      setManagerName("");
      setManagerEmail("");
      setShowCreateModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to create branch in backend.");
    }
  };

  const handleOpenAssignModal = (branch: Branch) => {
    setAssignModalBranch(branch);
    const validEmail = branch.assignedManagerEmail !== "Unassigned" ? branch.assignedManagerEmail : "";
    const validName = branch.assignedManagerName !== "Unassigned Manager" ? branch.assignedManagerName : "";
    setNewManagerName(validName);
    setNewManagerEmail(validEmail);
  };

  const handleAssignManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalBranch || !newManagerName || !newManagerEmail) return;

    try {
      // Find the selected user to get their ID
      const selectedUser = centerManagers.find(m => m.email === newManagerEmail);
      
      if (selectedUser) {
        // Update the user's branchId in the real backend
        await updateUserMutation.mutateAsync({ 
          id: selectedUser.id, 
          data: { branchId: assignModalBranch.id } 
        });
      }

      setNotificationMsg(`Center Manager for "${assignModalBranch.name}" updated to ${newManagerName}!`);
      setTimeout(() => setNotificationMsg(null), 3000);
      setAssignModalBranch(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to assign manager.");
    }
  };

  const handleDeleteBranch = async (branch: Branch) => {
    if (!confirm(`Are you sure you want to delete the branch "${branch.name}"?`)) return;

    try {
      // Soft delete on the backend
      await updateBranchMutation.mutateAsync({
        id: branch.id,
        data: { status: "DELETED" },
      });

      setNotificationMsg(`Branch "${branch.name}" has been deleted.`);
      setTimeout(() => setNotificationMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to delete branch.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Admin Executive Dashboard</h2>
          <p className="text-sm text-text-secondary">
            Full administrative control across all Aadya Institute branches, center manager assignments, and academy operations.
          </p>
        </div>

        <Button
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm transition-colors"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create a Branch
        </Button>
      </div>

      {notificationMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-semibold">{notificationMsg}</p>
        </div>
      )}

      {/* Global Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Students Across Branches</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalStudents}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-pink-50 text-pink-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Active Faculty Members</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalFaculty} Members</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Running Batches</p>
              <h3 className="text-2xl font-bold text-text-primary">{totalBatches} Batches</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Net Revenue</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{totalRevenue.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Branch Management Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#1769AA]" />
            Aadya Institute Branch Operations & Center Managers ({branches.length} Branches)
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-[#1769AA]" />}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branches.map((branch) => (
            <Card
              key={branch.id}
              className="border-border/50 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-[#1769AA]/30"
              onClick={() => navigate(`/admin/branch/${branch.id}/performance`)}
            >
              <CardContent className="p-6 space-y-4">
                {/* Branch Header */}
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs text-[#1769AA] bg-blue-50 border-blue-200">
                        {branch.code}
                      </Badge>
                      <Badge variant="success">
                        {branch.status}
                      </Badge>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">{branch.name}</h4>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBranch(branch);
                    }}
                    disabled={updateBranchMutation.isPending}
                  >
                    {updateBranchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Location & Contact */}
                <div className="space-y-1 text-xs text-slate-600">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span>{branch.address}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span>{branch.phone}</span>
                  </p>
                </div>

                {/* Assigned Branch Manager Info Box */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-md bg-blue-100 text-[#1769AA]">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ASSIGNED BRANCH MANAGER</p>
                      <p className="text-xs font-bold text-slate-900">{branch.assignedManagerName}</p>
                      <p className="text-[11px] text-slate-500">{branch.assignedManagerEmail}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs bg-white border-blue-200 text-[#1769AA] hover:bg-blue-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAssignModal(branch);
                    }}
                  >
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                    Assign as Manager
                  </Button>
                </div>

                {/* Branch Key Metrics Footer */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Students</span>
                    <span className="font-bold text-slate-900">{branch.studentCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Batches</span>
                    <span className="font-bold text-slate-900">{branch.batchCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Collected Fee</span>
                    <span className="font-bold text-emerald-700">₹{branch.revenueCollected.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Activity Logs & Integrations Feed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <Card className="border-border/50 bg-white shadow-sm md:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Activity className="h-5 w-5 text-[#1769AA]" />
              Admin Multi-Branch System Logs
            </h3>
            <div className="space-y-2">
              {studentReport?.students && studentReport.students.length > 0 ? (
                studentReport.students.slice(0, 3).map((s) => (
                  <div key={s.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                    <span className="text-slate-700">
                      <strong>{s.branchName}:</strong> New student admission registered for {s.name} ({s.courseName}).
                    </span>
                    <Badge variant="outline" className="text-[10px]">Active</Badge>
                  </div>
                ))
              ) : branches.length > 0 ? (
                branches.slice(0, 2).map((b) => (
                  <div key={b.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                    <span className="text-slate-700">
                      <strong>{b.name}:</strong> Branch active & operational ({b.code}). Assigned Manager: {b.assignedManagerName}.
                    </span>
                    <Badge variant="outline" className="text-[10px]">Active</Badge>
                  </div>
                ))
              ) : (
                <div className="p-3 text-xs text-slate-500 text-center">
                  No active multi-branch log entries recorded.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-purple-600" />
              Automations & Webhooks
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="font-semibold text-slate-800">Sarvam AI Calling Agent</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="font-semibold text-slate-800">WhatsApp Reminder Service</span>
                <Badge variant="success">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Dialog: Create New Branch */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#1769AA]" />
              Create New Academy Branch
            </h3>

            <form onSubmit={handleCreateBranchSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-md bg-red-50 text-red-700 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Koramangala Branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Code *</label>
                  <Input
                    type="text"
                    placeholder="e.g. BR-KRM-03"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    required
                    className="bg-white border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <Input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Address</label>
                <Input
                  type="text"
                  placeholder="e.g. 100ft Road, Koramangala, Bengaluru"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Center Manager</label>
                <select
                  className="w-full flex h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] disabled:cursor-not-allowed disabled:opacity-50 text-slate-900"
                  value={managerEmail}
                  onChange={(e) => {
                    const selectedEmail = e.target.value;
                    setManagerEmail(selectedEmail);
                    const selectedUser = centerManagers.find(m => m.email === selectedEmail);
                    if (selectedUser) {
                      setManagerName(selectedUser.name);
                    }
                  }}
                >
                  <option value="">-- Optional: Select a Manager --</option>
                  {centerManagers.map((manager) => (
                    <option key={manager.id} value={manager.email || ""}>
                      {manager.name} {manager.email ? `(${manager.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createBranchMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white flex items-center gap-2"
                  disabled={createBranchMutation.isPending}
                >
                  {createBranchMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                  ) : (
                    "Create Branch"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog: Assign Center Manager */}
      {assignModalBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-[#1769AA]" />
              Assign Center Manager
            </h3>

            <p className="text-xs text-slate-500">
              Assign or update the primary center manager responsible for operational data for <strong>{assignModalBranch.name}</strong>.
            </p>

            <form onSubmit={handleAssignManagerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Center Manager *</label>
                <select
                  className="w-full flex h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769AA] disabled:cursor-not-allowed disabled:opacity-50 text-slate-900"
                  value={newManagerEmail}
                  onChange={(e) => {
                    const selectedEmail = e.target.value;
                    setNewManagerEmail(selectedEmail);
                    const selectedUser = centerManagers.find(m => m.email === selectedEmail);
                    if (selectedUser) {
                      setNewManagerName(selectedUser.name);
                    }
                  }}
                  required
                >
                  <option value="" disabled>-- Select a Manager --</option>
                  {centerManagers.map((manager) => (
                    <option key={manager.id} value={manager.email || ""}>
                      {manager.name} {manager.email ? `(${manager.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignModalBranch(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
                >
                  Confirm Manager Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
