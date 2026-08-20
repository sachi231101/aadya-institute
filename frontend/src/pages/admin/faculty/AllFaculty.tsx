import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, GraduationCap, Clock, AlertTriangle, BookOpen, Search, Download, Plus,
  X, Mail, Phone, Calendar, CheckCircle2, AlertCircle,
  BarChart3, TrendingUp, BookMarked, MonitorPlay, Star, UserMinus
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBranchStore } from "@/store/branch.store";
import { useBranches } from "@/hooks/useBranches";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";

const getWorkloadState = (hrs: number) => {
  if (hrs > 30) return { label: "High", color: "bg-red-500", text: "text-red-600", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
  if (hrs > 20) return { label: "Moderate", color: "bg-amber-500", text: "text-amber-600", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
  return { label: "Optimal", color: "bg-emerald-500", text: "text-emerald-600", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
};

// ─── MOCK DATA & CONSTANTS ─────────────────────────────────────────────────

const ATTENDANCE_TREND = [
  { name: 'Mar', val: 84 }, { name: 'Apr', val: 91 }, { name: 'May', val: 87 },
  { name: 'Jun', val: 93 }, { name: 'Jul', val: 89 }, { name: 'Aug', val: 94 }
];

const MOCK_FACULTY = [
  {
    id: "FA001", name: "HM Adithya", email: "adithyahm0@gmail.com", phone: "8217312051", 
    specialization: "MERN Full Stack", branch: "Bengaluru Central", branchId: "b-central",
    batchesCount: 4, studentsCount: 86, attendance: 88, workloadHrs: 27, status: "Active",
    avatar: "https://i.pravatar.cc/150?u=adithya", joinDate: "12 June 2024", experience: "3.8 Years",
    rating: 4.8,
    feedback: [
      { student: "Rahul K.", text: "Excellent teaching style, explains complex React concepts very well.", rating: 5, date: "10 Aug 2026" },
      { student: "Sneha M.", text: "Very helpful during doubt sessions.", rating: 4, date: "05 Aug 2026" },
      { student: "Ankit P.", text: "Good pacing, but sometimes goes a bit fast.", rating: 4, date: "22 Jul 2026" }
    ],
    batches: [
      { id: "MERN-01", name: "MERN Full Stack", students: 24, status: "Active", progress: 72, time: "10:00 AM" },
      { id: "MERN-02", name: "MERN Full Stack", students: 18, status: "Active", progress: 45, time: "02:00 PM" },
      { id: "JS-03", name: "JavaScript", students: 22, status: "Active", progress: 85, time: "04:00 PM" },
      { id: "REACT-01", name: "React JS", students: 22, status: "Completed", progress: 100, time: "06:00 PM" }
    ],
    studentPerf: { excellent: 24, good: 38, needsImp: 17, atRisk: 7 },
    schedule: {
      MON: [{ time: "10:00 AM", batch: "MERN-01" }, { time: "02:00 PM", batch: "MERN-02" }],
      TUE: [{ time: "10:00 AM", batch: "MERN-01" }, { time: "04:00 PM", batch: "JS-03" }],
      WED: [{ time: "10:00 AM", batch: "MERN-01" }, { time: "06:00 PM", batch: "REACT-01" }]
    },
    alerts: [
      { type: "warning", text: "Faculty is handling 27 hours/week across 4 batches." },
      { type: "success", text: "Student attendance increased by 6% this month." },
      { type: "danger", text: "7 students have attendance below the configured threshold." }
    ]
  },
  {
    id: "FA002", name: "Priya Sharma", email: "priya.sharma@gmail.com", phone: "9876543210", 
    specialization: "Digital Marketing", branch: "Ramamurthy Nagar", branchId: "b-ramamurthy",
    batchesCount: 3, studentsCount: 62, attendance: 92, workloadHrs: 21, status: "Active",
    avatar: "https://i.pravatar.cc/150?u=priya", joinDate: "05 Jan 2025", experience: "5.2 Years",
    rating: 4.5,
    feedback: [
      { student: "Karan S.", text: "Great practical examples for SEO.", rating: 5, date: "01 Aug 2026" },
      { student: "Pooja D.", text: "Assignments are a bit tough.", rating: 4, date: "15 Jul 2026" }
    ],
    batches: [
      { id: "DM-01", name: "Digital Marketing", students: 25, status: "Active", progress: 60, time: "11:00 AM" }
    ],
    studentPerf: { excellent: 30, good: 20, needsImp: 10, atRisk: 2 },
    schedule: { MON: [{ time: "11:00 AM", batch: "DM-01" }] },
    alerts: [ { type: "success", text: "DM-01 is 60% complete." } ]
  },
  {
    id: "FA003", name: "Rahul Verma", email: "rahul.verma@gmail.com", phone: "9988776655", 
    specialization: "Python Programming", branch: "Bengaluru Central", branchId: "b-central",
    batchesCount: 2, studentsCount: 45, attendance: 86, workloadHrs: 16, status: "On Leave",
    avatar: "https://i.pravatar.cc/150?u=rahul", joinDate: "20 Mar 2023", experience: "4.0 Years",
    rating: 3.9,
    feedback: [],
    batches: [], studentPerf: { excellent: 10, good: 20, needsImp: 10, atRisk: 5 },
    schedule: {}, alerts: [ { type: "warning", text: "Currently on leave until Aug 25th." } ]
  },
  {
    id: "FA004", name: "Sneha Reddy", email: "sneha.reddy@gmail.com", phone: "9123456780", 
    specialization: "UI/UX Design", branch: "Malleswaram", branchId: "b-malleswaram",
    batchesCount: 1, studentsCount: 18, attendance: 98, workloadHrs: 8, status: "Active",
    avatar: "https://i.pravatar.cc/150?u=sneha", joinDate: "10 Feb 2026", experience: "2.5 Years",
    rating: 4.9,
    feedback: [
      { student: "Akash R.", text: "Amazing mentor! Loved the Figma sessions.", rating: 5, date: "12 Aug 2026" }
    ],
    batches: [], studentPerf: { excellent: 10, good: 5, needsImp: 3, atRisk: 0 },
    schedule: {}, alerts: []
  },
  {
    id: "FA005", name: "Arjun Das", email: "arjun.das@gmail.com", phone: "9871234560", 
    specialization: "Graphic Design", branch: "Ramamurthy Nagar", branchId: "b-ramamurthy",
    batchesCount: 0, studentsCount: 0, attendance: 0, workloadHrs: 0, status: "Inactive",
    avatar: "https://i.pravatar.cc/150?u=arjun", joinDate: "01 Dec 2022", experience: "6.0 Years",
    rating: 0,
    feedback: [],
    batches: [], studentPerf: { excellent: 0, good: 0, needsImp: 0, atRisk: 0 },
    schedule: {}, alerts: []
  }
];

// ─── HELPER COMPONENTS ─────────────────────────────────────────────────────

const ProgressBar = ({ value, colorClass }: { value: number, colorClass: string }) => (
  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5">
    <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${value}%` }} />
  </div>
);

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active": return "bg-emerald-100 text-emerald-700";
    case "On Leave": return "bg-amber-100 text-amber-700";
    case "Inactive": return "bg-slate-200 text-slate-700";
    default: return "bg-slate-100 text-slate-600";
  }
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export const AllFaculty: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFilterTab, setSelectedFilterTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];

  // Filter faculty by branch
  const branchFaculty = MOCK_FACULTY.filter(fac => 
    selectedBranchId === "ALL" || 
    fac.branchId === selectedBranchId ||
    branches.find(b => b.id === selectedBranchId)?.name.toLowerCase().includes(fac.branch.toLowerCase())
  );

  // Filter faculty by search, status tabs
  const filteredFaculty = branchFaculty.filter(fac => {
    const matchesSearch = 
      !searchTerm ||
      fac.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.specialization.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      selectedFilterTab === "All" ||
      (selectedFilterTab === "Active" && fac.status === "Active") ||
      (selectedFilterTab === "On Leave" && fac.status === "On Leave") ||
      (selectedFilterTab === "High Workload" && fac.workloadHrs >= 25) ||
      (selectedFilterTab === "Needs Attention" && (fac.status === "Inactive" || fac.attendance < 70));

    return matchesSearch && matchesStatus;
  });

  const kpis = {
    onLeave: branchFaculty.filter(f => f.status === "On Leave").length,
    inactive: branchFaculty.filter(f => f.status === "Inactive").length,
    activeBatches: branchFaculty.reduce((acc, f) => acc + f.batchesCount, 0),
  };

  const filterTabs = [
    { name: "All", count: branchFaculty.length, color: "text-[#1769AA]" },
    { name: "Active", count: branchFaculty.filter(f => f.status === "Active").length, color: "text-emerald-600" },
    { name: "On Leave", count: branchFaculty.filter(f => f.status === "On Leave").length, color: "text-amber-500" },
    { name: "High Workload", count: branchFaculty.filter(f => f.workloadHrs >= 25).length, color: "text-orange-500" },
    { name: "Needs Attention", count: branchFaculty.filter(f => f.status === "Inactive" || f.attendance < 70).length, color: "text-red-500" },
  ];

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
            <Button variant="outline" className="text-slate-700 border-slate-300 font-medium bg-white">
              <Download className="h-4 w-4 mr-2 text-slate-500" /> Export Report
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
            { label: "Active Batches", value: kpis.activeBatches, sub: "Ongoing classes", icon: BookOpen, color: "text-[#1769AA]", bg: "bg-blue-50" },
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
                <option value="ALL">🌐 All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>📍 {b.name}</option>
                ))}
                {branches.length === 0 && (
                  <>
                    <option value="b-central">📍 Bengaluru Central</option>
                    <option value="b-malleswaram">📍 Malleswaram</option>
                    <option value="b-ramamurthy">📍 Ramamurthy Nagar</option>
                  </>
                )}
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
                {filteredFaculty.length > 0 ? (
                  filteredFaculty.map((fac) => (
                    <tr 
                      key={fac.id} 
                      onClick={() => navigate(`/admin/faculty/${fac.id}`)}
                      className="transition-colors cursor-pointer group hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={fac.avatar} alt={fac.name} className="w-9 h-9 rounded-full border-2 border-slate-200" />
                          <div>
                            <p className="font-bold text-slate-900 text-[13px] group-hover:text-[#1769AA] transition-colors">{fac.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{fac.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-800 text-[12px]">{fac.branch}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[140px]">{fac.specialization}</p>
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-700">{fac.batchesCount}</td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-700">{fac.studentsCount}</td>
                      <td className="px-3 py-3 w-28">
                        {fac.attendance > 0 ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold text-slate-700">{fac.attendance}%</span>
                            </div>
                            <ProgressBar value={fac.attendance} colorClass={fac.attendance >= 85 ? "bg-emerald-500" : fac.attendance >= 70 ? "bg-orange-500" : "bg-red-500"} />
                          </>
                        ) : <span className="text-slate-400 text-xs">-</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex flex-col items-center justify-center">
                          <span className="font-bold text-slate-800 text-[12px]">{fac.workloadHrs}h <span className="text-[10px] font-normal text-slate-500">/wk</span></span>
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
                      No faculty members found for the selected branch / filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Showing {filteredFaculty.length} of {branchFaculty.length} faculty</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
