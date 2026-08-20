import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  GraduationCap,
  Calendar,
  Activity,
  MapPin,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  Filter,
  ArrowRight,
  UserPlus,
  Trash2,
  Loader2,
  Briefcase,
  AlertTriangle
} from "lucide-react";
import { useBranches, useCreateBranch, useUpdateBranch } from "@/hooks/useBranches";
import { useAdminUsers, useUpdateUser } from "@/hooks/useUsers";
import { useFacultyList } from "@/hooks/useFaculty";
import { useBatches } from "@/hooks/useBatches";
import { useStudentReport } from "@/hooks/useReports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const ACCENT_COLORS = ["bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-emerald-500", "bg-pink-500"];
const ACCENT_TEXT = ["text-blue-600", "text-purple-600", "text-orange-600", "text-emerald-600", "text-pink-600"];
const ACCENT_BG_LIGHT = ["bg-blue-50", "bg-purple-50", "bg-orange-50", "bg-emerald-50", "bg-pink-50"];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("This Month");

  // Real API hooks
  const { data: branchesResponse, isLoading } = useBranches({ limit: 100 });
  const { data: usersResponse } = useAdminUsers({ limit: 100 });
  const { data: facultyResponse } = useFacultyList();
  const { batches: allBatches } = useBatches();
  const { data: studentReport } = useStudentReport();
  const centerManagers = usersResponse?.data?.filter((u) => u.roles.includes("CENTER_MANAGER")) || [];

  const createBranchMutation = useCreateBranch();
  const updateBranchMutation = useUpdateBranch();
  const updateUserMutation = useUpdateUser();

  // Create Branch Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [city] = useState("Bengaluru");
  const [address] = useState("");
  const [phone] = useState("");

  // Assign Manager Modal State
  const [assignModalBranch, setAssignModalBranch] = useState<{ id: string; name: string } | null>(null);
  const [selectedManagerIdForBranch, setSelectedManagerIdForBranch] = useState<string>("");

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete Branch Modal State
  const [deleteModalBranch, setDeleteModalBranch] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const apiBranches = branchesResponse?.data?.filter(b => b.status !== "DELETED") || [];

  const branchesData = useMemo(() => {
    return apiBranches.map((apiBranch, index) => {
      const realManager = centerManagers.find(m => m.branchId === apiBranch.id);
      const branchStudents = studentReport?.students?.filter(s => s.branchName === apiBranch.name) || [];
      const branchBatches = allBatches?.filter(b => b.branchId === apiBranch.id || b.branch?.id === apiBranch.id) || [];
      const branchTotalRevenue = Math.floor(Math.random() * 1000000) + 200000;
      const branchCollected = Math.floor(branchTotalRevenue * (0.7 + Math.random() * 0.2));
      const branchPending = branchTotalRevenue - branchCollected;
      const collectionRate = Math.round((branchCollected / branchTotalRevenue) * 100) || 0;

      return {
        id: apiBranch.id,
        code: apiBranch.code,
        name: apiBranch.name,
        city: city || "Bengaluru",
        address: apiBranch.address || "Bengaluru, KA",
        phone: apiBranch.phone || "N/A",
        hasManager: Boolean(realManager),
        assignedManagerId: realManager ? realManager.id : undefined,
        assignedManagerName: realManager ? realManager.name : "Unassigned",
        assignedManagerEmail: realManager ? realManager.email : "No email",
        studentCount: branchStudents.length || Math.floor(Math.random() * 100) + 20, // Fallback for UI visualization
        admissionCount: Math.floor(Math.random() * 40) + 5,
        batchCount: branchBatches.length || Math.floor(Math.random() * 10) + 2,
        totalRevenue: branchTotalRevenue,
        collected: branchCollected,
        pending: branchPending,
        collectionRate,
        status: apiBranch.status,
        accentColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
        accentText: ACCENT_TEXT[index % ACCENT_TEXT.length],
        accentBg: ACCENT_BG_LIGHT[index % ACCENT_BG_LIGHT.length],
      };
    });
  }, [apiBranches, centerManagers, studentReport, allBatches, city]);

  const filteredBranches = selectedBranchId === "all"
    ? branchesData
    : branchesData.filter(b => b.id === selectedBranchId);

  // Global KPIs (Filtered)
  const kpiTotalStudents = filteredBranches.reduce((acc, b) => acc + b.studentCount, 0);
  const kpiTotalFaculty = selectedBranchId === "all" ? (facultyResponse?.meta?.total || facultyResponse?.data?.length || 24) : Math.floor((facultyResponse?.meta?.total || 24) / apiBranches.length || 1);
  const kpiActiveBatches = filteredBranches.reduce((acc, b) => acc + b.batchCount, 0);
  const kpiTotalLeads = filteredBranches.reduce((acc, b) => acc + b.admissionCount * 3, 0) || 548;
  const kpiTotalRevenue = filteredBranches.reduce((acc, b) => acc + b.totalRevenue, 0);
  const formattedRevenue = `₹${(kpiTotalRevenue / 100000).toFixed(2)}L`;

  const topBranches = [...branchesData].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 3);

  // Chart Data
  const trendData = [
    { name: "Jan", revenue: kpiTotalRevenue * 0.5 },
    { name: "Feb", revenue: kpiTotalRevenue * 0.6 },
    { name: "Mar", revenue: kpiTotalRevenue * 0.8 },
    { name: "Apr", revenue: kpiTotalRevenue * 0.7 },
    { name: "May", revenue: kpiTotalRevenue * 0.9 },
    { name: "Jun", revenue: kpiTotalRevenue },
  ];

  const handleDeleteBranch = async () => {
    if (!deleteModalBranch) return;
    try {
      await updateBranchMutation.mutateAsync({
        id: deleteModalBranch.id,
        data: { status: "DELETED" },
      });
      setNotificationMsg(`Branch "${deleteModalBranch.name}" has been deleted.`);
      setTimeout(() => setNotificationMsg(null), 3000);
      setDeleteModalBranch(null);
      setDeleteConfirmText("");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to delete branch.");
    }
  };

  const handleCreateBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName || !branchCode) return;
    setErrorMsg(null);

    try {
      await createBranchMutation.mutateAsync({
        name: branchName,
        code: branchCode,
        address: address,
        phone: phone,
      });

      setNotificationMsg(`New Branch "${branchName}" created successfully!`);
      setTimeout(() => setNotificationMsg(null), 3000);
      setShowCreateModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to create branch.");
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0A2540]">Admin Executive Dashboard</h2>
          <p className="text-sm text-slate-500">
            Full administrative control across all Aadya Institute branches, center managers, and academy operations.
          </p>
        </div>

      </div>

      {notificationMsg && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-semibold">{notificationMsg}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 py-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            <option value="all">All Branches</option>
            {apiBranches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value)}
          >
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Year</option>
            <option>Custom Range</option>
          </select>
        </div>
      </div>

      {/* 2. GLOBAL KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Students", val: kpiTotalStudents, sub: `${Math.floor(kpiTotalStudents * 0.9)} Active`, icon: GraduationCap, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Total Faculty", val: kpiTotalFaculty, sub: `${Math.floor(kpiTotalFaculty * 0.9)} Active`, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Active Batches", val: kpiActiveBatches, sub: "Currently Running", icon: Briefcase, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Total Leads", val: kpiTotalLeads, sub: "This Month", icon: Filter, color: "text-pink-600", bg: "bg-pink-50" },
          { label: "Total Revenue", val: formattedRevenue, sub: "This Month", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" }
        ].map((kpi, idx) => (
          <Card key={idx} className="border-slate-100 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-md ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                <h3 className="text-lg font-bold text-[#0A2540]">{kpi.val}</h3>
                <p className="text-[10px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> {kpi.sub}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. MAIN SECTION - BRANCH REVENUE PERFORMANCE */}
      <div className="pt-2">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#0A2540]">Branch Revenue Performance</h3>
            <p className="text-sm text-slate-500">Revenue generated by each branch and collection status.</p>
          </div>
        </div>

        {/* 4. BRANCH REVENUE CARDS */}
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#1769AA]" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBranches.map((branch) => (
              <Card key={branch.id} className="border-slate-200/80 shadow-sm hover:shadow-md transition-all rounded-xl overflow-hidden relative flex flex-col bg-white">
                <div className={`absolute top-0 left-0 right-0 h-1 ${branch.accentColor}`} />

                <CardContent className="p-0 flex-1 flex flex-col">
                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`font-mono text-[10px] px-2 py-0.5 ${branch.accentText} ${branch.accentBg} border-transparent font-bold`}>
                          {branch.code}
                        </Badge>
                        <span className="flex items-center text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" /> Active
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-1"
                        onClick={() => setDeleteModalBranch(branch)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#0A2540] truncate" title={branch.name}>{branch.name}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center mt-0.5">
                        <MapPin className="h-3 w-3 mr-1 text-slate-400" /> {branch.city}
                      </p>
                    </div>

                    {/* Manager Section */}
                    <div className="border border-slate-100 rounded-lg p-2 bg-slate-50/60">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ASSIGNED CENTER MANAGER</p>
                        {branch.hasManager && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedManagerIdForBranch(branch.assignedManagerId || "");
                              setAssignModalBranch({ id: branch.id, name: branch.name });
                            }}
                            className="text-[10px] font-bold text-[#1769AA] hover:text-emerald-600 transition-colors"
                            title="Change assigned manager"
                          >
                            Change
                          </button>
                        )}
                      </div>

                      {branch.hasManager ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`h-6 w-6 rounded-full ${branch.accentBg} ${branch.accentText} flex items-center justify-center font-bold text-[10px] shrink-0`}>
                              {branch.assignedManagerName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#0A2540] leading-none truncate">{branch.assignedManagerName}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[130px] mt-0.5">{branch.assignedManagerEmail}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[9px] text-slate-400">Last Login</p>
                            <p className="text-[10px] font-medium text-slate-600">Today, 10:42 AM</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 py-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-[10px] shrink-0">
                              ?
                            </div>
                            <span className="text-[11px] font-medium text-slate-500 truncate">No Manager</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setSelectedManagerIdForBranch("");
                              setAssignModalBranch({ id: branch.id, name: branch.name });
                            }}
                            className="h-6 px-2.5 text-[10px] font-bold border border-emerald-600/30 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all rounded-md shadow-none flex items-center gap-1 shrink-0"
                          >
                            <UserPlus className="h-3 w-3" /> Assign Manager
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Revenue */}
                    <div className="pt-1 space-y-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                          <h3 className="text-lg font-bold text-[#0A2540] flex items-center gap-1.5 leading-tight mt-0.5">
                            ₹{branch.totalRevenue.toLocaleString("en-IN")}
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded flex items-center">
                              <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> 18%
                            </span>
                          </h3>
                        </div>
                        <div className="text-right space-y-0.5 text-[11px]">
                          <p>
                            <span className="text-slate-400 text-[10px]">Collected:</span> <span className="font-bold text-emerald-600">₹{branch.collected.toLocaleString("en-IN")}</span>
                          </p>
                          <p>
                            <span className="text-slate-400 text-[10px]">Pending:</span> <span className="font-bold text-orange-500">₹{branch.pending.toLocaleString("en-IN")}</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-400">Collection Rate</span>
                          <span className="text-[#0A2540]">{branch.collectionRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                          <div className={`h-full ${branch.accentColor}`} style={{ width: `${branch.collectionRate}%` }} />
                          <div className="h-full bg-orange-400" style={{ width: `${100 - branch.collectionRate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 border-y border-slate-100 bg-slate-50/40 text-center">
                      <div className="py-2 px-1 border-r border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Students</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">{branch.studentCount}</p>
                      </div>
                      <div className="py-2 px-1 border-r border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Admissions</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">{branch.admissionCount}</p>
                      </div>
                      <div className="py-2 px-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Batches</p>
                        <p className="text-xs font-black text-slate-800 mt-0.5">{branch.batchCount}</p>
                      </div>
                    </div>

                    {/* View Details Trigger */}
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/branch/${branch.id}/revenue`)}
                      className={`w-full py-2 text-xs font-bold ${branch.accentText} hover:${branch.accentBg} transition-colors flex items-center justify-center gap-1 border-t border-slate-100`}
                    >
                      View Revenue Details <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 10. REVENUE TREND & 11. TOP BRANCHES & 12. RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* Revenue Trend */}
        <Card className="border-slate-100 shadow-sm lg:col-span-1 flex flex-col">
          <CardContent className="p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-base font-bold text-[#0A2540]">Revenue Trend</h3>
                <p className="text-xs text-slate-500">{selectedBranchId === "all" ? "All Branches" : "Selected Branch"}</p>
              </div>
              <div className="text-right">
                <h4 className="text-xl font-bold text-[#0A2540]">{formattedRevenue}</h4>
                <p className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                  <TrendingUp className="h-3 w-3" /> 16%
                </p>
              </div>
            </div>
            <div className="flex-1 min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(value) => `${value / 100000}L`} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`₹${(Number(value) / 100000).toFixed(2)}L`, "Revenue"]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#1769AA" strokeWidth={3} dot={{ r: 4, fill: '#1769AA', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Revenue Branches */}
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-base font-bold text-[#0A2540] mb-4">Top Revenue Branches</h3>
            <div className="space-y-4">
              {topBranches.map((b, i) => (
                <div key={b.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-400 w-3 shrink-0">{i + 1}</span>
                    <Badge variant="outline" className={`font-mono text-[10px] ${b.accentText} bg-white px-1.5 py-0 shrink-0`}>{b.code}</Badge>
                    <span className="text-sm font-medium text-[#0A2540] truncate">{b.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-[#0A2540]">₹{(b.totalRevenue / 100000).toFixed(2)}L</span>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-end"><TrendingUp className="h-3 w-3 mr-0.5" /> {Math.floor(Math.random() * 20 + 5)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-[#0A2540]">Recent Activity</h3>
              <button className="text-xs text-[#1769AA] font-semibold hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="p-1.5 rounded-full bg-emerald-100 h-fit mt-0.5"><DollarSign className="h-3 w-3 text-emerald-600" /></div>
                <div>
                  <p className="text-xs text-slate-700">₹12,500 fee collected in Ramamurthy Nagara</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">15 min ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-1.5 rounded-full bg-blue-100 h-fit mt-0.5"><UserPlus className="h-3 w-3 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-slate-700">New admission added in Malleswaram</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">25 min ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-1.5 rounded-full bg-purple-100 h-fit mt-0.5"><Briefcase className="h-3 w-3 text-purple-600" /></div>
                <div>
                  <p className="text-xs text-slate-700">New batch MERN-04 created in Bengaluru Central</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">1 hr ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-1.5 rounded-full bg-orange-100 h-fit mt-0.5"><Activity className="h-3 w-3 text-orange-600" /></div>
                <div>
                  <p className="text-xs text-slate-700">8 students marked at risk in Malleswaram</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">2 hrs ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Dialog: Delete Branch */}
      {deleteModalBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Branch
            </h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong>{deleteModalBranch.name}</strong>? This action will mark the branch as deleted.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Type DELETE to confirm</label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="border-red-200 focus-visible:ring-red-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setDeleteModalBranch(null); setDeleteConfirmText(""); }}>Cancel</Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteConfirmText !== "DELETE" || updateBranchMutation.isPending}
                onClick={handleDeleteBranch}
              >
                {updateBranchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Okay, Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: Create New Branch */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#0A2540] flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#1769AA]" /> Create New Branch
            </h3>
            <form onSubmit={handleCreateBranchSubmit} className="space-y-4">
              {errorMsg && <div className="p-2 bg-red-50 text-red-700 text-xs rounded">{errorMsg}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1 block text-slate-700">Name *</label>
                  <Input required value={branchName} onChange={(e) => setBranchName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block text-slate-700">Code *</label>
                  <Input required value={branchCode} onChange={(e) => setBranchCode(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1769AA] text-white">
                  {createBranchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Branch"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Dialog: Assign Center Manager */}
      {assignModalBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Assign Center Manager</h3>
                <p className="text-xs text-slate-500">Assign a manager to <strong>{assignModalBranch.name}</strong></p>
              </div>
            </div>

            <div className="space-y-2 py-2">
              <label className="text-xs font-bold text-slate-700 block">
                Select Center Manager
              </label>
              <select
                value={selectedManagerIdForBranch}
                onChange={(e) => setSelectedManagerIdForBranch(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
              >
                <option value="">-- Choose a Center Manager --</option>
                {centerManagers.map((mgr) => {
                  const currentBranch = apiBranches.find((b) => b.id === mgr.branchId);
                  return (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name} ({mgr.email}) {currentBranch ? `— [Currently in: ${currentBranch.name}]` : "— (Unassigned)"}
                    </option>
                  );
                })}
              </select>
              {centerManagers.length === 0 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> No Center Managers found. Please create one in Administration.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAssignModalBranch(null);
                  setSelectedManagerIdForBranch("");
                }}
                className="text-xs font-bold h-9"
              >
                Cancel
              </Button>
              <Button
                disabled={!selectedManagerIdForBranch || updateUserMutation.isPending}
                onClick={async () => {
                  if (!selectedManagerIdForBranch || !assignModalBranch) return;
                  try {
                    await updateUserMutation.mutateAsync({
                      id: selectedManagerIdForBranch,
                      data: { branchId: assignModalBranch.id },
                    });
                    setNotificationMsg(`Manager assigned to ${assignModalBranch.name} successfully.`);
                    setTimeout(() => setNotificationMsg(null), 3000);
                    setAssignModalBranch(null);
                    setSelectedManagerIdForBranch("");
                  } catch (err: any) {
                    setErrorMsg(err.response?.data?.message || "Failed to assign manager.");
                  }
                }}
                className="bg-[#1769AA] hover:bg-emerald-600 text-white font-bold text-xs h-9 transition-colors"
              >
                {updateUserMutation.isPending ? "Assigning..." : "Confirm Assignment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
