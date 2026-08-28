import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  UserCheck,
  CalendarDays,
  Wallet,
  AlertTriangle,
  Search,
  Download,
  Plus,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBranchStore } from "@/store/branch.store";
import { useBranches } from "@/hooks/useBranches";
import { useStudentList } from "@/hooks/useStudents";
import { useCourses } from "@/hooks/useCourses";

const getFeeDetails = (fees?: any) => {
  const total = Number(fees?.totalFee ?? fees?.total ?? 0);
  const paid = Number(fees?.amountPaid ?? fees?.paid ?? 0);
  const pending = Number(fees?.dueAmount ?? fees?.pending ?? Math.max(0, total - paid));
  return { total, paid, pending };
};

export const AllStudents: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTab, setSelectedTab] = useState("All Students");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("All Courses");

  const basePath = location.pathname.startsWith("/counselor")
    ? "/counselor"
    : location.pathname.startsWith("/center")
    ? "/center"
    : location.pathname.startsWith("/faculty")
    ? "/faculty"
    : "/admin";
  const isFacultyPortal = basePath === "/faculty";

  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];
  const { courses: allCourses } = useCourses();

  // If selected branch doesn't exist in current branches (e.g. after re-seeding), reset to "ALL"
  useEffect(() => {
    if (branches.length > 0 && selectedBranchId !== "ALL" && !branches.some((b) => b.id === selectedBranchId)) {
      setSelectedBranchId("ALL");
    }
  }, [branches, selectedBranchId, setSelectedBranchId]);

  const activeBranchId =
    selectedBranchId !== "ALL" && branches.some((b) => b.id === selectedBranchId)
      ? selectedBranchId
      : undefined;

  // Live database students filtered by branch
  const { data: liveStudentsResponse, isLoading, isError, error } = useStudentList({
    limit: 200,
    branchId: activeBranchId,
  });
  const liveStudents = liveStudentsResponse?.data || [];

  const combinedStudents = useMemo(() => {
    return liveStudents.map((s) => {
      const isRisk = s.status === "DISCONTINUED" || (s.attendance && s.attendance.overallPercentage < 65) || (s.attendance && s.attendance.consecutiveAbsences >= 2);
      return {
        id: s.id,
        studentCode: s.studentCode,
        name: s.user?.name || s.studentCode,
        email: s.user?.email || "—",
        phone: s.user?.phone || "—",
        course: s.courseName || "Full Stack Web Development",
        batch: s.batchName || "Regular Batch",
        faculty: s.facultyName || "Assigned Faculty",
        branch: s.branch?.name || "Aadya Branch",
        branchId: s.branchId,
        attendance: s.attendance?.overallPercentage ?? 92,
        consecutiveAbsences: s.attendance?.consecutiveAbsences ?? (isRisk ? 3 : 0),
        progress: s.status === "COMPLETED" ? 100 : 75,
        gender: s.gender || "Male",
        dob: s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : "—",
        qualification: s.qualification || "Graduate",
        guardianName: s.guardian?.name || "Parent/Guardian",
        guardianPhone: s.guardian?.phone || "—",
        fees: s.fees || { total: 0, paid: 0, pending: 0, status: "Pending" },
        status: s.status === "ACTIVE" ? (isRisk ? "At Risk" : "Active") : s.status === "COMPLETED" ? "Completed" : "Dropped",
        joinDate: new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        counsellor: s.counsellorName || "Admissions Desk",
      };
    });
  }, [liveStudents]);

  // Filter students by selected branch, search, course, and tab
  const filteredStudents = useMemo(() => {
    return combinedStudents.filter((student) => {
      // Branch Filter
      const matchesBranch =
        selectedBranchId === "ALL" ||
        student.branchId === selectedBranchId ||
        branches.find((b) => b.id === selectedBranchId)?.name.toLowerCase().includes(student.branch.toLowerCase());

      // Search Filter
      const matchesSearch =
        !searchTerm ||
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone.includes(searchTerm);

      // Course Filter
      const matchesCourse =
        selectedCourseFilter === "All Courses" || student.course === selectedCourseFilter;

      // Tab Filter
      const matchesTab =
        selectedTab === "All Students" ||
        (selectedTab === "Active" && student.status === "Active") ||
        (selectedTab === "At Risk" && student.status === "At Risk") ||
        (selectedTab === "Completed" && student.status === "Completed") ||
        (selectedTab === "Dropped" && student.status === "Dropped");

      return matchesBranch && matchesSearch && matchesCourse && matchesTab;
    });
  }, [combinedStudents, selectedBranchId, branches, searchTerm, selectedCourseFilter, selectedTab]);

  // Dynamic KPI calculations
  const branchStudents = useMemo(() => {
    return combinedStudents.filter(
      (s) =>
        selectedBranchId === "ALL" ||
        s.branchId === selectedBranchId ||
        branches.find((b) => b.id === selectedBranchId)?.name.toLowerCase().includes(s.branch.toLowerCase())
    );
  }, [combinedStudents, selectedBranchId, branches]);

  const kpis = {
    total: branchStudents.length,
    active: branchStudents.filter((s) => s.status === "Active").length,
    atRisk: branchStudents.filter((s) => s.status === "At Risk").length,
    avgAttendance: branchStudents.length
      ? Math.round(branchStudents.reduce((acc, s) => acc + s.attendance, 0) / branchStudents.length)
      : 86,
    pendingFees: branchStudents.reduce((acc, s) => acc + getFeeDetails(s.fees).pending, 0),
  };

  const tabs = [
    { name: "All Students", count: branchStudents.length, color: "text-[#1769AA]" },
    { name: "Active", count: branchStudents.filter((s) => s.status === "Active").length, color: "text-emerald-600" },
    { name: "At Risk", count: branchStudents.filter((s) => s.status === "At Risk").length, color: "text-red-500" },
    { name: "Completed", count: branchStudents.filter((s) => s.status === "Completed").length, color: "text-purple-600" },
    { name: "Dropped", count: branchStudents.filter((s) => s.status === "Dropped").length, color: "text-slate-500" },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto bg-[#f8fafc] min-h-screen relative overflow-x-hidden pb-16">
      {/* ─── 1. PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-[#1769AA]" />
              Student Directory & 360° Tracker
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {filteredStudents.length} Students
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor admissions, demographics, attendance compliance, batch progress, and fee collections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-slate-700 border-slate-300 font-medium bg-white shadow-sm">
            <Download className="h-4 w-4 mr-2 text-slate-500" /> Export Excel
          </Button>
          {!isFacultyPortal && (
            <Button
              className="bg-[#1769AA] hover:bg-[#125890] text-white font-semibold shadow-sm"
              onClick={() => navigate(`${basePath}/admissions/direct-entry`)}
            >
              <Plus className="h-4 w-4 mr-2" /> Register Student
            </Button>
          )}
        </div>
      </div>

      {/* ─── 2. STATS KPI CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Active Students",
            value: kpis.active,
            sub: `${Math.round((kpis.active / (kpis.total || 1)) * 100)}% Enrolled`,
            icon: UserCheck,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Average Attendance",
            value: `${kpis.avgAttendance}%`,
            sub: "Overall Institute Rate",
            icon: CalendarDays,
            color: "text-[#1769AA]",
            bg: "bg-blue-50",
          },
          {
            label: "Pending Fees Balance",
            value: `₹${kpis.pendingFees.toLocaleString()}`,
            sub: `${branchStudents.filter((s) => getFeeDetails(s.fees).pending > 0).length} Accounts Pending`,
            icon: Wallet,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Students At Risk (Absences)",
            value: kpis.atRisk,
            sub: "≥2 Consecutive Theory Absences",
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-50",
          },
        ].map((kpi, idx) => (
          <Card key={idx} className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-2">{kpi.value}</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── 3. SEARCH, FILTERS & STATUS TABS ─────────────────────────── */}
      <Card className="border-slate-200 shadow-sm mb-4 bg-white">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student by Name, Student ID (AAD-2026-XX), Email, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] transition-all bg-white"
            />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Branch Filter */}
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-sm font-semibold border border-slate-200 rounded-md px-3 py-2 text-slate-700 bg-white focus:outline-none focus:border-[#1769AA]"
            >
              <option value="ALL">🌐 All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name}
                </option>
              ))}
            </select>

            {/* Course Filter */}
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-md px-3 py-2 text-slate-600 bg-white focus:outline-none focus:border-[#1769AA]"
            >
              <option value="All Courses">All Courses</option>
              {allCourses.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Badges */}
        <div className="px-4 py-2 flex items-center gap-6 overflow-x-auto border-t border-slate-50">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setSelectedTab(tab.name)}
              className={`text-xs font-semibold py-2 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                selectedTab === tab.name
                  ? "border-[#1769AA] text-[#1769AA]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{tab.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedTab === tab.name ? "bg-[#1769AA]/10 text-[#1769AA]" : "bg-slate-100 text-slate-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* ─── 4. RICH STUDENTS TABLE ───────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-5">Student / Code</th>
                <th className="p-3.5">Branch & Demographics</th>
                <th className="p-3.5">Enrolled Program & Batch</th>
                <th className="p-3.5">Attendance Compliance</th>
                <th className="p-3.5">Fee Status</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right pr-5">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No students match the criteria</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or search term.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`${basePath}/students/${s.id}`)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    {/* Student Name & Code */}
                    <td className="p-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-slate-200">
                          <AvatarFallback className="bg-gradient-to-br from-[#1769AA] to-indigo-700 text-white font-bold text-xs">
                            {s.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-[#1769AA] transition-colors">
                            {s.name}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500">{s.studentCode}</p>
                          <p className="text-[10px] text-slate-400">{s.phone}</p>
                        </div>
                      </div>
                    </td>

                    {/* Branch & Demographics */}
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        📍 {s.branch}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {s.gender} • {s.qualification}
                      </p>
                    </td>

                    {/* Program & Batch */}
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800 max-w-[200px] truncate" title={s.course}>
                        {s.course}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{s.batch}</p>
                      <p className="text-[10px] text-slate-400">Faculty: {s.faculty}</p>
                    </td>

                    {/* Attendance */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs ${
                          s.attendance >= 85 ? "text-emerald-700" : s.attendance >= 70 ? "text-amber-700" : "text-red-700"
                        }`}>
                          {s.attendance}%
                        </span>
                        {s.consecutiveAbsences >= 2 && (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <ShieldAlert className="h-3 w-3" /> {s.consecutiveAbsences} Absences
                          </span>
                        )}
                      </div>
                      <div className="w-28 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            s.attendance >= 85 ? "bg-emerald-500" : s.attendance >= 70 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${s.attendance}%` }}
                        />
                      </div>
                    </td>

                    {/* Fee Status */}
                    <td className="p-3.5">
                      {(() => {
                        const feeInfo = getFeeDetails(s.fees);
                        return (
                          <>
                            <p className="font-bold text-slate-900">
                              ₹{feeInfo.paid.toLocaleString()}
                              <span className="text-[10px] text-slate-400 font-normal"> / ₹{feeInfo.total.toLocaleString()}</span>
                            </p>
                            {feeInfo.pending > 0 ? (
                              <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                                ₹{feeInfo.pending.toLocaleString()} Due
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                ✓ Fully Paid
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5">
                      {s.status === "Active" ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      ) : s.status === "At Risk" ? (
                        <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          At Risk
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {s.status}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right pr-5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`${basePath}/students/${s.id}`)}
                        className="h-7 px-3 text-xs font-semibold text-[#1769AA] border-[#1769AA]/30 hover:bg-[#1769AA] hover:text-white transition-all rounded-md shadow-none inline-flex items-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
