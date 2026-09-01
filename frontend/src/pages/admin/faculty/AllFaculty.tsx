import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  <div className="w-full bg-muted rounded-full h-1.5 mt-1.5 overflow-hidden">
    <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${Math.min(value, 100)}%` }} />
  </div>
);

const getStatusBadgeClass = (status: string) => {
  switch (status?.toUpperCase()) {
    case "ACTIVE": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
    case "ON_LEAVE":
    case "ON LEAVE": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
    case "INACTIVE": return "bg-slate-500/10 text-muted-foreground border border-border";
    default: return "bg-muted text-muted-foreground border border-border";
  }
};

export const AllFaculty: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/center") ? "/center" : "/admin";
  const [selectedFilterTab, setSelectedFilterTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];

  useEffect(() => {
    if (branches.length > 0 && selectedBranchId !== "ALL" && !branches.some((b) => b.id === selectedBranchId)) {
      setSelectedBranchId("ALL");
    }
  }, [branches, selectedBranchId, setSelectedBranchId]);

  const activeBranchId =
    selectedBranchId !== "ALL" && branches.some((b) => b.id === selectedBranchId)
      ? selectedBranchId
      : undefined;
  const { data: facultyReport, isLoading: isReportLoading } = useFacultyReport(activeBranchId);
  const { data: facultyListResponse, isLoading: isListLoading } = useFacultyList({
    branchId: activeBranchId,
    limit: 100,
  });

  // Faculty Directory uses the live faculty list as source of truth so newly created
  // members appear immediately; report metrics enrich matching rows when available.
  const reportById = new Map(
    (facultyReport?.faculty || []).map((f: any) => [f.id, f])
  );

  const rawFacultyList = (facultyListResponse?.data || []).map((f: any) => {
    const report = reportById.get(f.id);
    return {
      id: f.id,
      name: f.user?.name || report?.name || "Faculty Member",
      employeeCode: f.employeeCode || report?.employeeCode || f.id,
      branchName: f.branch?.name || report?.branchName || "Aadya Branch",
      specialization: f.specialization || report?.specialization || "Instructor",
      assignedBatchesCount:
        report?.assignedBatchesCount ?? f._count?.batches ?? f.batches?.length ?? 0,
      totalStudents: report?.totalStudents ?? 0,
      avgStudentAttendancePct: report?.avgStudentAttendancePct ?? 0,
      workloadHoursPerWeek: report?.workloadHoursPerWeek ?? 0,
      status: f.status || report?.status || "ACTIVE",
    };
  });

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
    { name: "All", count: rawFacultyList.length },
    { name: "Active", count: rawFacultyList.filter((f: any) => f.status?.toUpperCase() === "ACTIVE").length },
    { name: "On Leave", count: kpis.onLeave },
    { name: "High Workload", count: rawFacultyList.filter((f: any) => f.workloadHoursPerWeek >= 25).length },
    { name: "Needs Attention", count: rawFacultyList.filter((f: any) => f.status?.toUpperCase() === "INACTIVE" || f.avgStudentAttendancePct < 70).length },
  ];

  const isLoading = isListLoading;

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen relative overflow-x-hidden space-y-6 animate-in fade-in duration-300">
      {/* ─── FACULTY DIRECTORY CONTENT ─── */}
      <div className="w-full space-y-6">

        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              Faculty Directory
            </h1>
            <p className="text-muted-foreground text-xs font-medium mt-1">
              Manage academy professors, instructors, workload, batches and performance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="text-primary border-border hover:bg-muted/40 font-bold bg-card shadow-2xs rounded-xl cursor-pointer"
              onClick={() => navigate(`${basePath}/faculty/timetable`)}
            >
              <Calendar className="h-4 w-4 mr-2 text-primary" /> Faculty Timetable
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold shadow-md rounded-xl cursor-pointer" onClick={() => navigate(`${basePath}/faculty/add`)}>
              <Plus className="h-4 w-4 mr-2" /> Add Faculty
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "On Leave", value: kpis.onLeave, sub: "Faculty on leave", icon: UserMinus, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40" },
            { label: "Inactive", value: kpis.inactive, sub: "Archived or paused", icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted/50 border border-border" },
            { label: "Active Batches", value: kpis.activeBatches, sub: "Assigned ongoing classes", icon: BookOpen, color: "text-primary dark:text-sky-400", bg: "bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/40" },
          ].map((kpi, idx) => (
            <Card key={idx} className="border border-border shadow-xs bg-card rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</p>
                  <h3 className="text-2xl font-black text-foreground leading-tight">{kpi.value}</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{kpi.sub}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SEARCH, FILTERS & TABS */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col xl:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search faculty by name, code or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-muted/30 border border-border text-foreground rounded-xl focus:outline-none focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Branch Filter */}
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="text-xs font-bold border border-border rounded-xl px-3 py-2 text-foreground bg-muted/30 focus:outline-none focus:bg-background focus:border-primary cursor-pointer"
              >
                <option value="ALL">🌐 All Branches ({branches.length})</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>📍 {b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-muted/20 flex items-center gap-2 overflow-x-auto">
            {filterTabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => setSelectedFilterTab(tab.name)}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${selectedFilterTab === tab.name
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
              >
                {tab.name} ({tab.count})
              </button>
            ))}
          </div>
        </Card>

        {/* FACULTY DIRECTORY TABLE */}
        <Card className="border border-border shadow-xs bg-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border text-[11px] font-bold text-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Faculty</th>
                  <th className="px-3 py-3.5">Branch & Spec.</th>
                  <th className="px-3 py-3.5 text-center">Batches</th>
                  <th className="px-3 py-3.5 text-center">Students</th>
                  <th className="px-3 py-3.5">Attendance</th>
                  <th className="px-3 py-3.5 text-center">Workload</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-xs font-medium">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                      Loading faculty records from database...
                    </td>
                  </tr>
                ) : filteredFaculty.length > 0 ? (
                  filteredFaculty.map((fac: any) => (
                    <tr
                      key={fac.id}
                      onClick={() => navigate(`${basePath}/faculty/${fac.id}`)}
                      className="transition-colors cursor-pointer group hover:bg-muted/30"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 shadow-2xs">
                            {fac.name?.charAt(0) || "F"}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-xs group-hover:text-primary transition-colors">{fac.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{fac.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-semibold text-foreground text-xs">{fac.branchName}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">{fac.specialization}</p>
                      </td>
                      <td className="px-3 py-3.5 text-center font-bold text-foreground text-xs">{fac.assignedBatchesCount}</td>
                      <td className="px-3 py-3.5 text-center font-bold text-foreground text-xs">{fac.totalStudents}</td>
                      <td className="px-3 py-3.5 w-28">
                        {fac.avgStudentAttendancePct > 0 ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold text-foreground">{fac.avgStudentAttendancePct}%</span>
                            </div>
                            <ProgressBar value={fac.avgStudentAttendancePct} colorClass={fac.avgStudentAttendancePct >= 85 ? "bg-emerald-500" : fac.avgStudentAttendancePct >= 70 ? "bg-orange-500" : "bg-red-500"} />
                          </>
                        ) : <span className="text-muted-foreground text-xs font-mono">-</span>}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center justify-center">
                          <span className="font-bold text-foreground text-xs">{fac.workloadHoursPerWeek}h <span className="text-[10px] font-normal text-muted-foreground">/wk</span></span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getStatusBadgeClass(fac.status)}`}>
                          {fac.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs border-border bg-card text-foreground hover:bg-primary hover:text-white transition-all font-bold shadow-2xs rounded-xl cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${basePath}/faculty/${fac.id}`);
                          }}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-xs font-medium">
                      No faculty members found in database for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3.5 bg-muted/30 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Showing {filteredFaculty.length} of {rawFacultyList.length} faculty</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
