import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, BookOpen, Search, Plus,
  Calendar, AlertCircle, UserMinus, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBranchStore } from "@/store/branch.store";
import { useBranches } from "@/hooks/useBranches";
import { useFacultyReport } from "@/hooks/useReports";
import { useFacultyList } from "@/hooks/useFaculty";

const ProgressBar = ({ value, colorClass }: { value: number, colorClass: string }) => (
  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5">
    <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${Math.min(value, 100)}%` }} />
  </div>
);

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "ACTIVE": return "bg-emerald-100 text-emerald-700";
    case "ON_LEAVE":
    case "ON LEAVE": return "bg-amber-100 text-amber-700";
    case "INACTIVE": return "bg-slate-200 text-slate-700";
    default: return "bg-slate-100 text-slate-600";
  }
};

export const AllFaculty: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFilterTab, setSelectedFilterTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];

  const activeBranchId = selectedBranchId === "ALL" ? undefined : selectedBranchId;
  const { data: facultyReport, isLoading: isReportLoading } = useFacultyReport(activeBranchId);
  const { data: facultyListResponse, isLoading: isListLoading } = useFacultyList({ branchId: activeBranchId });

  const rawFacultyList = facultyReport?.faculty || (facultyListResponse?.data || []).map((f: any) => ({
    id: f.id,
    name: f.user?.name || "Faculty Member",
    employeeCode: f.employeeCode || f.id,
    branchName: f.branch?.name || "Aadya Branch",
    specialization: f.specialization || "Instructor",
    assignedBatchesCount: f._count?.batches || f.batches?.length || 0,
    totalStudents: 0,
    avgStudentAttendancePct: 0,
    workloadHoursPerWeek: 0,
    status: f.status || "ACTIVE",
  }));

  // Filter faculty by search, status tabs
  const filteredFaculty = rawFacultyList.filter((fac: any) => {
    const matchesSearch = 
      !searchTerm ||
      fac.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.specialization?.toLowerCase().includes(searchTerm.toLowerCase());

    const statusNorm = fac.status?.toUpperCase();
    const matchesStatus = 
      selectedFilterTab === "All" ||
      (selectedFilterTab === "Active" && statusNorm === "ACTIVE") ||
      (selectedFilterTab === "On Leave" && (statusNorm === "ON_LEAVE" || statusNorm === "ON LEAVE")) ||
      (selectedFilterTab === "High Workload" && fac.workloadHoursPerWeek >= 25) ||
      (selectedFilterTab === "Needs Attention" && (statusNorm === "INACTIVE" || fac.avgStudentAttendancePct < 70));

    return matchesSearch && matchesStatus;
  });

  const kpis = {
    onLeave: rawFacultyList.filter((f: any) => f.status?.toUpperCase() === "ON_LEAVE" || f.status?.toUpperCase() === "ON LEAVE").length,
    inactive: rawFacultyList.filter((f: any) => f.status?.toUpperCase() === "INACTIVE").length,
    activeBatches: rawFacultyList.reduce((acc: number, f: any) => acc + (f.assignedBatchesCount || 0), 0),
  };

  const filterTabs = [
    { name: "All", count: rawFacultyList.length, color: "text-[#1769AA]" },
    { name: "Active", count: rawFacultyList.filter((f: any) => f.status?.toUpperCase() === "ACTIVE").length, color: "text-emerald-600" },
    { name: "On Leave", count: kpis.onLeave, color: "text-amber-500" },
    { name: "High Workload", count: rawFacultyList.filter((f: any) => f.workloadHoursPerWeek >= 25).length, color: "text-orange-500" },
    { name: "Needs Attention", count: rawFacultyList.filter((f: any) => f.status?.toUpperCase() === "INACTIVE" || f.avgStudentAttendancePct < 70).length, color: "text-red-500" },
  ];

  const isLoading = isReportLoading || isListLoading;

  return (
    <div className="p-6 max-w-[1600px] mx-auto bg-[#f8fafc] min-h-screen relative overflow-x-hidden">
      {/* ─── FACULTY DIRECTORY CONTENT ─── */}
      <div className="w-full">
        
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-[#1769AA]" />
              Faculty Directory
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage academy professors, instructors, workload, batches and performance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="text-[#6366F1] border-[#6366F1]/30 hover:bg-[#6366F1]/5 font-bold bg-white"
              onClick={() => navigate("/admin/faculty/timetable")}
            >
              <Calendar className="h-4 w-4 mr-2 text-[#6366F1]" /> Faculty Timetable
            </Button>
            <Button className="bg-[#1769AA] hover:bg-[#125890] text-white font-medium shadow-sm" onClick={() => navigate("../add")}>
              <Plus className="h-4 w-4 mr-2" /> Add Faculty
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "On Leave", value: kpis.onLeave, sub: "Faculty on leave", icon: UserMinus, color: "text-amber-500", bg: "bg-amber-50" },
            { label: "Inactive", value: kpis.inactive, sub: "Archived or paused", icon: AlertCircle, color: "text-slate-400", bg: "bg-slate-100" },
            { label: "Active Batches", value: kpis.activeBatches, sub: "Assigned ongoing classes", icon: BookOpen, color: "text-[#1769AA]", bg: "bg-blue-50" },
          ].map((kpi, idx) => (
            <Card key={idx} className="border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">{kpi.label}</p>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">{kpi.value}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{kpi.sub}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SEARCH, FILTERS & TABS */}
        <Card className="border-slate-200 shadow-sm mb-4">
          <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search faculty by name, code or specialization..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] transition-all"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Branch Filter */}
              <select 
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="text-sm font-semibold border border-slate-200 rounded-md px-3 py-2 text-slate-700 bg-white focus:outline-none focus:border-[#1769AA]"
              >
                <option value="ALL">🌐 All Branches ({branches.length})</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>📍 {b.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="px-4 py-2 flex items-center gap-6 overflow-x-auto">
            {filterTabs.map(tab => (
              <button 
                key={tab.name}
                onClick={() => setSelectedFilterTab(tab.name)}
                className={`text-sm font-semibold py-2 transition-colors whitespace-nowrap ${
                  selectedFilterTab === tab.name 
                    ? "text-[#1769AA]" 
                    : tab.color === "text-[#1769AA]" ? "text-slate-600 hover:text-slate-900" : `${tab.color} opacity-80 hover:opacity-100`
                }`}
              >
                {selectedFilterTab === tab.name ? (
                  <span className="bg-blue-50 px-3 py-1.5 rounded-md">{tab.name} ({tab.count})</span>
                ) : (
                  <span>{tab.name} ({tab.count})</span>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* FACULTY DIRECTORY TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-4">Faculty</th>
                  <th className="px-3 py-4">Branch & Spec.</th>
                  <th className="px-3 py-4 text-center">Batches</th>
                  <th className="px-3 py-4 text-center">Students</th>
                  <th className="px-3 py-4">Attendance</th>
                  <th className="px-3 py-4 text-center">Workload</th>
                  <th className="px-3 py-4">Status</th>
                  <th className="px-4 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                      <Loader2 className="h-6 w-6 animate-spin text-[#1769AA] mx-auto mb-2" />
                      Loading faculty records from database...
                    </td>
                  </tr>
                ) : filteredFaculty.length > 0 ? (
                  filteredFaculty.map((fac: any) => (
                    <tr 
                      key={fac.id} 
                      onClick={() => navigate(`/admin/faculty/${fac.id}`)}
                      className="transition-colors cursor-pointer group hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
                            {fac.name?.charAt(0) || "F"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[13px] group-hover:text-[#1769AA] transition-colors">{fac.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{fac.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-800 text-[12px]">{fac.branchName}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[140px]">{fac.specialization}</p>
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-700">{fac.assignedBatchesCount}</td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-700">{fac.totalStudents}</td>
                      <td className="px-3 py-3 w-28">
                        {fac.avgStudentAttendancePct > 0 ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold text-slate-700">{fac.avgStudentAttendancePct}%</span>
                            </div>
                            <ProgressBar value={fac.avgStudentAttendancePct} colorClass={fac.avgStudentAttendancePct >= 85 ? "bg-emerald-500" : fac.avgStudentAttendancePct >= 70 ? "bg-orange-500" : "bg-red-500"} />
                          </>
                        ) : <span className="text-slate-400 text-xs">-</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex flex-col items-center justify-center">
                          <span className="font-bold text-slate-800 text-[12px]">{fac.workloadHoursPerWeek}h <span className="text-[10px] font-normal text-slate-500">/wk</span></span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-sm ${getStatusColor(fac.status)}`}>
                          {fac.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 px-3 text-xs border-[#1769AA]/30 text-[#1769AA] hover:bg-[#1769AA] hover:text-white transition-all font-semibold shadow-none rounded-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/faculty/${fac.id}`);
                          }}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                      No faculty members found in database for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Showing {filteredFaculty.length} of {rawFacultyList.length} faculty</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
